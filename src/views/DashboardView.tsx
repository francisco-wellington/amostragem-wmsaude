import React, { useMemo, useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  Package, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  TrendingUp,
  ArrowRight,
  MapPin,
  Building2,
  CalendarDays,
  FilterX,
  PlusCircle,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { InspectionSession, InventoryItem, CorrectiveAction, InspectionResult } from '../types';

interface DashboardViewProps {
  sessions: InspectionSession[];
  inventory: InventoryItem[];
  actions: CorrectiveAction[];
  onNavigate: (tab: string, params?: any) => void;
  onRefresh?: () => void;
  isVisitor?: boolean;
}

export default function DashboardView({ sessions, inventory, actions, onNavigate, onRefresh, isVisitor }: DashboardViewProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localityFilter, setLocalityFilter] = useState<string>('Todas');
  const [cityFilter, setCityFilter] = useState<string>('Todas');
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());

  // Get all unique cities for the filter
  const cities = useMemo(() => {
    const unique = new Set(inventory.map(item => item.Cidade).filter(Boolean));
    return Array.from(unique).sort();
  }, [inventory]);

  // Get all unique localities for the filter, potentially filtered by city
  const localities = useMemo(() => {
    const source = cityFilter === 'Todas' 
      ? inventory 
      : inventory.filter(item => item.Cidade === cityFilter);
    const unique = new Set(source.map(item => item.Localidade).filter(Boolean));
    return Array.from(unique).sort();
  }, [inventory, cityFilter]);

  // Get available years from sessions
  const years = useMemo(() => {
    const uniqueYears = new Set(sessions.map(s => new Date(s.date).getFullYear().toString()));
    // Always include current year
    uniqueYears.add(new Date().getFullYear().toString());
    return Array.from(uniqueYears).sort((a, b) => b.localeCompare(a));
  }, [sessions]);

  // Filter sessions based on locality, city, and year
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const sessionDate = new Date(s.date);
      const sessionYear = sessionDate.getFullYear().toString();
      
      const matchesYear = yearFilter === 'Todas' || sessionYear === yearFilter;
      const matchesLocality = localityFilter === 'Todas' || s.locality === localityFilter;
      
      // For city matching in sessions, we use the stored city or fallback to inventory lookup
      let matchesCity = true;
      if (cityFilter !== 'Todas') {
        if (s.city) {
          matchesCity = s.city === cityFilter;
        } else {
          // Fallback for older sessions: check if ANY item in this session's items belongs to the filtered city
          // or if the locality exists in that city in the inventory
          const itemInCity = s.items.some(item => item.Cidade === cityFilter) || 
                            inventory.some(item => item.Localidade === s.locality && item.Cidade === cityFilter);
          matchesCity = itemInCity;
        }
      }
      
      return matchesYear && matchesLocality && matchesCity;
    });
  }, [sessions, localityFilter, cityFilter, yearFilter, inventory]);

  // Filter inventory based on locality and city
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesCity = cityFilter === 'Todas' || item.Cidade === cityFilter;
      const matchesLocality = localityFilter === 'Todas' || item.Localidade === localityFilter;
      return matchesCity && matchesLocality;
    });
  }, [inventory, cityFilter, localityFilter]);

  // Filter actions based on locality and city
  const filteredActions = useMemo(() => {
    return actions.filter(a => {
      const matchesCity = cityFilter === 'Todas' || a.locality.includes(cityFilter); // Fallback check
      const matchesLocality = localityFilter === 'Todas' || a.locality === localityFilter;
      
      // Better city check for actions if locality is unique
      let cityMatch = matchesCity;
      if (cityFilter !== 'Todas') {
        const item = inventory.find(i => i.Localidade === a.locality);
        if (item) cityMatch = item.Cidade === cityFilter;
      }

      return cityMatch && matchesLocality;
    });
  }, [actions, cityFilter, localityFilter, inventory]);

  const totalItems = filteredInventory.length;
  const totalInspections = filteredSessions.length;
  const completedInspections = filteredSessions.filter(s => s.completed).length;
  const pendingActions = filteredActions.filter(a => !a.resolved).length;

  // Calculate total unique localities in filtered inventory
  const totalLocalities = useMemo(() => {
    return new Set(filteredInventory.map(item => `${item.Cidade}|${item.Localidade}`).filter(Boolean)).size;
  }, [filteredInventory]);

  // Get list of unique localities already inspected (filtered)
  const inspectedLocalities = useMemo(() => {
    const uniqueMap = new Map<string, { locality: string; city: string }>();
    
    filteredSessions.filter(s => s.completed).forEach(s => {
      const city = s.city || inventory.find(i => i.Localidade === s.locality)?.Cidade || 'unknown';
      const key = `${s.locality}|${city}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, { locality: s.locality, city });
      }
    });

    return Array.from(uniqueMap.values()).sort((a, b) => a.locality.localeCompare(b.locality));
  }, [filteredSessions, inventory]);

  // Calculate localities not yet inspected
  const pendingLocalities = useMemo(() => {
    const allLocalitiesMap = new Map<string, { locality: string; city: string }>();
    filteredInventory.forEach(item => {
      const key = `${item.Localidade}|${item.Cidade}`;
      if (!allLocalitiesMap.has(key)) {
        allLocalitiesMap.set(key, { locality: item.Localidade, city: item.Cidade });
      }
    });

    const inspectedKeys = new Set(inspectedLocalities.map(item => `${item.locality}|${item.city}`));

    const pending = Array.from(allLocalitiesMap.values()).filter(item => {
      const key = `${item.locality}|${item.city}`;
      return !inspectedKeys.has(key);
    });

    return pending.sort((a, b) => a.locality.localeCompare(b.locality));
  }, [filteredInventory, inspectedLocalities]);

  // Calculate overall conformity (filtered)
  const allResults = filteredSessions.flatMap(s => Object.values(s.results) as InspectionResult[]);
  const totalVerified = allResults.length;
  const totalConforme = allResults.filter(r => r.status === 'conforme').length;
  const conformityRate = totalVerified > 0 ? (totalConforme / totalVerified) * 100 : 0;

  const lastSession = filteredSessions.filter(s => s.completed).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  
  const chartData = filteredSessions.filter(s => s.completed).slice(-5).map(s => {
    const results = Object.values(s.results) as InspectionResult[];
    const conforme = results.filter(r => r.status === 'conforme').length;
    const rate = results.length > 0 ? (conforme / results.length) * 100 : 0;
    return {
      name: s.locality,
      rate: parseFloat(rate.toFixed(1))
    };
  });

  return (
    <div className="space-y-8">
      {/* Modern Filters */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Filtros de Auditoria</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-blue-600 transition-colors"
              onClick={async () => {
                if (onRefresh) {
                  setIsRefreshing(true);
                  await onRefresh();
                  setTimeout(() => setIsRefreshing(false), 1000);
                }
              }}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
              Sincronizar Planilha
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-slate-400 hover:text-red-500 transition-colors"
              onClick={() => {
                setLocalityFilter('Todas');
                setCityFilter('Todas');
                setYearFilter(new Date().getFullYear().toString());
              }}
            >
              <FilterX className="w-4 h-4 mr-2" />
              Limpar Filtros
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-500">
              <Building2 className="w-3.5 h-3.5" />
              <label className="text-[10px] font-bold uppercase tracking-wider">Cidade</label>
            </div>
            <Select value={cityFilter} onValueChange={(val) => {
              setCityFilter(val);
              setLocalityFilter('Todas');
            }}>
              <SelectTrigger className="w-full bg-slate-50/50 border-slate-200 hover:border-blue-300 transition-colors h-11">
                <SelectValue placeholder="Todas as cidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas">Todas as cidades</SelectItem>
                {cities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-500">
              <MapPin className="w-3.5 h-3.5" />
              <label className="text-[10px] font-bold uppercase tracking-wider">Unidade / Localidade</label>
            </div>
            <Select value={localityFilter} onValueChange={setLocalityFilter}>
              <SelectTrigger className="w-full bg-slate-50/50 border-slate-200 hover:border-blue-300 transition-colors h-11">
                <SelectValue placeholder="Todas as localidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas">Todas as localidades</SelectItem>
                {localities.map(loc => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-500">
              <CalendarDays className="w-3.5 h-3.5" />
              <label className="text-[10px] font-bold uppercase tracking-wider">Ano de Amostragem</label>
            </div>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-full bg-slate-50/50 border-slate-200 hover:border-blue-300 transition-colors h-11">
                <SelectValue placeholder="Selecione o ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas">Todo o histórico</SelectItem>
                {years.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Patrimônio</p>
                <h3 className="text-2xl font-bold text-slate-900">{totalItems}</h3>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                <Package className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Localidades</p>
                <h3 className="text-2xl font-bold text-slate-900">{totalLocalities}</h3>
              </div>
              <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                <MapPin className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Conformidade Geral</p>
                <h3 className="text-2xl font-bold text-slate-900">{conformityRate.toFixed(1)}%</h3>
              </div>
              <div className={`p-3 rounded-xl ${conformityRate >= 85 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                {conformityRate >= 85 ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Inspeções Realizadas</p>
                <h3 className="text-2xl font-bold text-slate-900">{completedInspections}</h3>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Ações Pendentes</p>
                <h3 className="text-2xl font-bold text-slate-900">{pendingActions}</h3>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl text-orange-600">
                <XCircle className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <Card className="lg:col-span-2 border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Conformidade por Localidade (Últimas 5)</CardTitle>
            <CardDescription>Percentual de itens conformes na amostra</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} unit="%" />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.rate >= 85 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Localities List */}
        <Card className="border-none shadow-sm bg-white flex flex-col h-full">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Localidades Inspecionadas</CardTitle>
            <CardDescription>Unidades que já passaram por auditoria</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <ScrollArea className="h-[250px] pr-4">
              {inspectedLocalities.length > 0 ? (
                <div className="space-y-2">
                  {inspectedLocalities.map((item) => (
                    <div key={item.locality} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-medium text-slate-700 truncate">{item.locality}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{item.city}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-8">
                  <MapPin className="w-8 h-8 text-slate-200 mb-2" />
                  <p className="text-slate-500 text-xs">Nenhuma localidade inspecionada.</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pending Localities List */}
        <Card className="lg:col-span-2 border-none shadow-sm bg-white flex flex-col h-full">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Localidades Não Inspecionadas</CardTitle>
            <CardDescription>Unidades que ainda aguardam auditoria no período selecionado</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <ScrollArea className="h-[300px] pr-4">
              {pendingLocalities.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pendingLocalities.map((item) => (
                    <div key={`${item.locality}-${item.city}`} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="w-2 h-2 rounded-full bg-slate-300" />
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-medium text-slate-700 truncate">{item.locality}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{item.city}</span>
                      </div>
                      {!isVisitor && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="ml-auto text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-0 h-8 w-8"
                          onClick={() => onNavigate('new-sampling', { city: item.city, locality: item.locality })}
                        >
                          <PlusCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <CheckCircle2 className="w-12 h-12 text-green-100 mb-4" />
                  <p className="text-slate-900 font-bold">Todas as unidades foram inspecionadas!</p>
                  <p className="text-slate-500 text-sm">Excelente trabalho de cobertura.</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Última Inspeção</CardTitle>
          </CardHeader>
          <CardContent>
            {lastSession ? (
              <div className="space-y-6">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-slate-500">Cidade / Localidade</span>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-blue-600 uppercase">
                      {lastSession.city || inventory.find(i => i.Localidade === lastSession.locality)?.Cidade || 'N/A'}
                    </span>
                    <span className="font-semibold text-slate-900">{lastSession.locality}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-slate-500">Data</span>
                  <span className="font-semibold text-slate-900">
                    {new Date(lastSession.date).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-slate-500">Responsável</span>
                  <span className="font-semibold text-slate-900">
                    {lastSession.inspectorName || 'Desconhecido'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-slate-500">Resultado</span>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const results = Object.values(lastSession.results) as InspectionResult[];
                      const conforme = results.filter(r => r.status === 'conforme').length;
                      const rate = (conforme / lastSession.items.length) * 100;
                      
                      if (!lastSession.completed) {
                        return (
                          <>
                            <Badge className="bg-amber-500 hover:bg-amber-600">
                              INCOMPLETO
                            </Badge>
                            <span className="text-sm font-medium text-slate-700">{rate.toFixed(1)}%</span>
                          </>
                        );
                      }

                      return (
                        <>
                          <Badge variant={rate >= 85 ? 'default' : 'destructive'} className={rate >= 85 ? 'bg-green-500' : ''}>
                            {rate >= 85 ? 'APROVADO' : 'REPROVADO'}
                          </Badge>
                          <span className="text-sm font-medium text-slate-700">{rate.toFixed(1)}%</span>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full mt-4 group"
                  onClick={() => onNavigate('history')}
                >
                  Ver Histórico
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-8">
                <Package className="w-12 h-12 text-slate-200 mb-4" />
                <p className="text-slate-500 text-sm">Nenhuma inspeção realizada ainda.</p>
                {!isVisitor && (
                  <Button 
                    variant="link" 
                    className="mt-2 text-blue-600"
                    onClick={() => onNavigate('new-sampling')}
                  >
                    Iniciar agora
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
