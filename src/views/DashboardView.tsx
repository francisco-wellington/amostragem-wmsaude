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
  MapPinOff,
  Building2,
  CalendarDays,
  FilterX,
  PlusCircle,
  RefreshCw,
  Eye,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ButtonLoading } from '../components/LoadingUI';
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
  const [selectedSessionDetails, setSelectedSessionDetails] = useState<InspectionSession | null>(null);
  const [localityFilter, setLocalityFilter] = useState<string>('Todas');
  const [cityFilter, setCityFilter] = useState<string>('Todas');
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());

  // Refs for scrolling to highlighted items
  const highlightedRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (localityFilter !== 'Todas' && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [localityFilter]);

  // Optimization: Pre-calculate locality-to-city and city-to-localities lookups
  const localityLookup = useMemo(() => {
    const localityToCity = new Map<string, string>();
    const cityToLocalities = new Map<string, Set<string>>();
    const uniqueCities = new Set<string>();

    inventory.forEach(item => {
      if (item.Cidade) {
        uniqueCities.add(item.Cidade);
        if (item.Localidade) {
          localityToCity.set(item.Localidade, item.Cidade);
          
          if (!cityToLocalities.has(item.Cidade)) {
            cityToLocalities.set(item.Cidade, new Set());
          }
          cityToLocalities.get(item.Cidade)!.add(item.Localidade);
        }
      }
    });

    return { 
      localityToCity, 
      cityToLocalities, 
      cities: Array.from(uniqueCities).sort() 
    };
  }, [inventory]);

  const cities = localityLookup.cities;

  // Get all unique localities for the filter, potentially filtered by city
  const localities = useMemo(() => {
    if (cityFilter === 'Todas') {
      const all = Array.from(localityLookup.localityToCity.keys());
      return all.sort();
    }
    const filtered = localityLookup.cityToLocalities.get(cityFilter);
    return filtered ? Array.from(filtered).sort() : [];
  }, [localityLookup, cityFilter]);

  // Get available years from sessions
  const years = useMemo(() => {
    const uniqueYears = new Set<string>();
    sessions.forEach(s => {
      const year = new Date(s.date).getFullYear().toString();
      uniqueYears.add(year);
    });
    // Always include current year
    uniqueYears.add(new Date().getFullYear().toString());
    return Array.from(uniqueYears).sort((a, b) => b.localeCompare(a));
  }, [sessions]);

  // Filter sessions based on locality, city, and year
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const sessionDate = new Date(s.date);
      const sessionYear = sessionDate.getFullYear().toString();
      
      if (yearFilter !== 'Todas' && sessionYear !== yearFilter) return false;
      if (localityFilter !== 'Todas' && s.locality !== localityFilter) return false;
      
      if (cityFilter !== 'Todas') {
        const sessionCity = s.city || localityLookup.localityToCity.get(s.locality);
        if (sessionCity !== cityFilter) return false;
      }
      
      return true;
    });
  }, [sessions, localityFilter, cityFilter, yearFilter, localityLookup]);

  // Filter inventory based on locality and city
  const filteredInventory = useMemo(() => {
    if (cityFilter === 'Todas' && localityFilter === 'Todas') return inventory;
    
    return inventory.filter(item => {
      if (cityFilter !== 'Todas' && item.Cidade !== cityFilter) return false;
      if (localityFilter !== 'Todas' && item.Localidade !== localityFilter) return false;
      return true;
    });
  }, [inventory, cityFilter, localityFilter]);

  // Filter actions based on locality and city
  const filteredActions = useMemo(() => {
    return actions.filter(a => {
      if (localityFilter !== 'Todas' && a.locality !== localityFilter) return false;
      
      if (cityFilter !== 'Todas') {
        const city = localityLookup.localityToCity.get(a.locality);
        if (city && city !== cityFilter) return false;
        if (!city && !a.locality.includes(cityFilter)) return false; // Fallback
      }

      return true;
    });
  }, [actions, cityFilter, localityFilter, localityLookup]);

  const totalItems = filteredInventory.length;
  const totalInspections = filteredSessions.length;
  const completedInspections = filteredSessions.filter(s => s.completed).length;
  const pendingActions = filteredActions.filter(a => !a.resolved).length;

  // Calculate total unique localities in filtered inventory - Optimized
  const totalLocalities = useMemo(() => {
    if (cityFilter === 'Todas' && localityFilter === 'Todas') {
      return localityLookup.localityToCity.size;
    }
    
    const unique = new Set<string>();
    filteredInventory.forEach(item => {
      if (item.Localidade && item.Cidade) {
        unique.add(`${item.Localidade}|${item.Cidade}`);
      }
    });
    return unique.size;
  }, [filteredInventory, cityFilter, localityFilter, localityLookup]);

  // Get list of unique localities already inspected (filtered)
  const inspectedLocalities = useMemo(() => {
    const uniqueMap = new Map<string, { locality: string; city: string; lastSession: InspectionSession }>();
    
    // Sort sessions by date descending to get the latest one first
    const sortedDesc = [...filteredSessions]
      .filter(s => s.completed)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    sortedDesc.forEach(s => {
      const city = s.city || localityLookup.localityToCity.get(s.locality) || 'unknown';
      const key = `${s.locality}|${city}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, { locality: s.locality, city, lastSession: s });
      }
    });

    return Array.from(uniqueMap.values()).sort((a, b) => a.locality.localeCompare(b.locality));
  }, [filteredSessions, localityLookup]);

  // Calculate localities not yet inspected - Highly Optimized
  const pendingLocalities = useMemo(() => {
    const inspectedKeys = new Set(inspectedLocalities.map(item => `${item.locality}|${item.city}`));
    const pending: { locality: string; city: string }[] = [];
    const seenLocalities = new Set<string>();

    filteredInventory.forEach(item => {
      if (!item.Localidade || !item.Cidade) return;
      const key = `${item.Localidade}|${item.Cidade}`;
      
      if (!seenLocalities.has(key)) {
        seenLocalities.add(key);
        if (!inspectedKeys.has(key)) {
          pending.push({ locality: item.Localidade, city: item.Cidade });
        }
      }
    });

    return pending.sort((a, b) => a.locality.localeCompare(b.locality));
  }, [filteredInventory, inspectedLocalities]);

  // Calculate overall conformity (filtered) - Optimized to single pass
  const conformityStats = useMemo(() => {
    let totalVerified = 0;
    let totalConforme = 0;
    
    filteredSessions.forEach(s => {
      const results = Object.values(s.results) as InspectionResult[];
      results.forEach(r => {
        totalVerified++;
        if (r.status === 'conforme') totalConforme++;
      });
    });
    
    return {
      totalVerified,
      totalConforme,
      rate: totalVerified > 0 ? (totalConforme / totalVerified) * 100 : 0
    };
  }, [filteredSessions]);

  const conformityRate = conformityStats.rate;

  const lastSession = useMemo(() => {
    const completed = filteredSessions.filter(s => s.completed);
    if (completed.length === 0) return null;
    return completed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }, [filteredSessions]);
  
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
    <div className="space-y-8 pb-10">
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
              className="text-slate-400 hover:text-blue-600 transition-all min-w-[160px] flex justify-center"
              onClick={async () => {
                if (onRefresh) {
                  setIsRefreshing(true);
                  await onRefresh();
                  setTimeout(() => setIsRefreshing(false), 2000);
                }
              }}
              disabled={isRefreshing}
            >
              <ButtonLoading 
                loading={isRefreshing} 
                success={false} 
                loadingText="Sincronizando..."
              >
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sincronizar Planilha
                </>
              </ButtonLoading>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardContent className="pt-6 2xl:pt-10 2xl:pb-8 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
              <div>
                <p className="text-sm 2xl:text-base font-medium text-slate-500">Total Patrimônio</p>
                <h3 className="text-2xl 2xl:text-4xl font-bold text-slate-900">{totalItems}</h3>
              </div>
              <div className="p-3 2xl:p-5 bg-blue-50 rounded-2xl text-blue-600">
                <Package className="w-6 h-6 2xl:w-8 2xl:h-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardContent className="pt-6 2xl:pt-10 2xl:pb-8 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
              <div>
                <p className="text-sm 2xl:text-base font-medium text-slate-500">Total Unidades</p>
                <h3 className="text-2xl 2xl:text-4xl font-bold text-slate-900">{totalLocalities}</h3>
              </div>
              <div className="p-3 2xl:p-5 bg-indigo-50 rounded-2xl text-indigo-600">
                <Building2 className="w-6 h-6 2xl:w-8 2xl:h-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden ring-1 ring-amber-100">
          <CardContent className="pt-6 2xl:pt-10 2xl:pb-8 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
              <div>
                <p className="text-sm 2xl:text-base font-medium text-slate-500">Uni. Pendentes</p>
                <h3 className="text-2xl 2xl:text-4xl font-bold text-amber-600">{pendingLocalities.length}</h3>
              </div>
              <div className="p-3 2xl:p-5 bg-amber-50 rounded-2xl text-amber-600">
                <MapPinOff className="w-6 h-6 2xl:w-8 2xl:h-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardContent className="pt-6 2xl:pt-10 2xl:pb-8 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
              <div>
                <p className="text-sm 2xl:text-base font-medium text-slate-500">Conformidade</p>
                <h3 className="text-2xl 2xl:text-4xl font-bold text-slate-900">{conformityRate.toFixed(1)}%</h3>
              </div>
              <div className={`p-3 2xl:p-5 rounded-2xl ${conformityRate >= 85 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                {conformityRate >= 85 ? <CheckCircle2 className="w-6 h-6 2xl:w-8 2xl:h-8" /> : <AlertTriangle className="w-6 h-6 2xl:w-8 2xl:h-8" />}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardContent className="pt-6 2xl:pt-10 2xl:pb-8 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
              <div>
                <p className="text-sm 2xl:text-base font-medium text-slate-500">Inspeções</p>
                <h3 className="text-2xl 2xl:text-4xl font-bold text-slate-900">{completedInspections}</h3>
              </div>
              <div className="p-3 2xl:p-5 bg-purple-50 rounded-2xl text-purple-600">
                <TrendingUp className="w-6 h-6 2xl:w-8 2xl:h-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardContent className="pt-6 2xl:pt-10 2xl:pb-8 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
              <div>
                <p className="text-sm 2xl:text-base font-medium text-slate-500">Ações Pendentes</p>
                <h3 className="text-2xl 2xl:text-4xl font-bold text-slate-900">{pendingActions}</h3>
              </div>
              <div className="p-3 2xl:p-5 bg-orange-50 rounded-2xl text-orange-600">
                <XCircle className="w-6 h-6 2xl:w-8 2xl:h-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 3xl:grid-cols-4 gap-8">
        {/* Chart */}
        <Card className="lg:col-span-2 3xl:col-span-3 border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Conformidade por Localidade (Últimas 5)</CardTitle>
            <CardDescription>Percentual de itens conformes na amostra</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] 2xl:h-[500px] 3xl:h-[600px]">
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
            <ScrollArea className="h-[250px] 2xl:h-[450px] 3xl:h-[550px] pr-4">
              {inspectedLocalities.length > 0 ? (
                <div className="space-y-2">
                  {inspectedLocalities.map((item) => {
                    const isSelected = item.locality === localityFilter;
                    const results = Object.values(item.lastSession.results) as InspectionResult[];
                    const conforme = results.filter(r => r.status === 'conforme').length;
                    const rate = results.length > 0 ? (conforme / results.length) * 100 : 0;

                    return (
                      <div 
                        key={item.locality} 
                        ref={isSelected ? highlightedRef : null}
                        className={cn(
                          "group flex items-center gap-3 p-3 rounded-lg border transition-all duration-300 cursor-pointer",
                          isSelected 
                            ? "bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-100" 
                            : "bg-slate-50 border-slate-100 hover:border-blue-200 hover:bg-white"
                        )}
                        onClick={() => setSelectedSessionDetails(item.lastSession)}
                      >
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          isSelected ? "bg-blue-600 animate-pulse" : "bg-green-500"
                        )} />
                        <div className="flex flex-col overflow-hidden flex-1">
                          <span className={cn(
                            "text-sm font-medium truncate",
                            isSelected ? "text-blue-900" : "text-slate-700"
                          )}>
                            {item.locality}
                          </span>
                          <span className={cn(
                            "text-[10px] font-bold uppercase",
                            isSelected ? "text-blue-400" : "text-slate-400"
                          )}>
                            {item.city} • {rate.toFixed(0)}% Conformidade
                          </span>
                        </div>
                        <Eye className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                      </div>
                    );
                  })}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 3xl:grid-cols-4 gap-8">
        {/* Pending Localities List */}
        <Card className="lg:col-span-2 3xl:col-span-3 border-none shadow-sm bg-white flex flex-col h-full">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Localidades Não Inspecionadas</CardTitle>
            <CardDescription>Unidades que ainda aguardam auditoria no período selecionado</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <ScrollArea className="h-[300px] 2xl:h-[500px] 3xl:h-[600px] pr-4">
              {pendingLocalities.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pendingLocalities.map((item) => {
                    const isSelected = item.locality === localityFilter;
                    return (
                      <div 
                        key={`${item.locality}-${item.city}`} 
                        ref={isSelected ? highlightedRef : null}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-all duration-300",
                          isSelected 
                            ? "bg-amber-50 border-amber-200 shadow-sm ring-1 ring-amber-100" 
                            : "bg-slate-50 border-slate-100"
                        )}
                      >
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          isSelected ? "bg-amber-600 animate-pulse" : "bg-slate-300"
                        )} />
                        <div className="flex flex-col overflow-hidden">
                          <span className={cn(
                            "text-sm font-medium truncate",
                            isSelected ? "text-amber-900" : "text-slate-700"
                          )}>
                            {item.locality}
                          </span>
                          <span className={cn(
                            "text-[10px] font-bold uppercase",
                            isSelected ? "text-amber-400" : "text-slate-400"
                          )}>
                            {item.city}
                          </span>
                        </div>
                        {!isVisitor && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className={cn(
                              "ml-auto p-0 h-8 w-8",
                              isSelected ? "text-amber-700 hover:bg-amber-100" : "text-blue-600 hover:bg-blue-50"
                            )}
                            onClick={() => onNavigate('new-sampling', { city: item.city, locality: item.locality })}
                          >
                            <PlusCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
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

      <Dialog open={!!selectedSessionDetails} onOpenChange={(open) => !open && setSelectedSessionDetails(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
          {selectedSessionDetails && (
            <>
              <div className="p-6 border-b border-slate-100 shrink-0 bg-white">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                      Detalhes da Inspeção
                    </h2>
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <MapPin className="w-4 h-4" />
                      <span className="font-medium">{selectedSessionDetails.locality}</span>
                      <span className="text-slate-300">•</span>
                      <span>{selectedSessionDetails.city}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-900">
                      {new Date(selectedSessionDetails.date).toLocaleDateString('pt-BR')}
                    </span>
                    <Badge variant="secondary" className="block mt-1 text-[10px] uppercase font-bold bg-slate-100 text-slate-600 border-none">
                      {selectedSessionDetails.sampleMode}
                    </Badge>
                  </div>
                </div>

                {/* Simplified Status Summary */}
                <div className="flex items-center gap-4 mt-6 p-3 bg-slate-50 rounded-xl">
                  {(() => {
                    const results = Object.values(selectedSessionDetails.results) as InspectionResult[];
                    const conforme = results.filter(r => r.status === 'conforme').length;
                    const total = results.length;
                    const rate = total > 0 ? (conforme / total) * 100 : 0;
                    const errors = results.filter(r => r.status !== 'conforme').length;

                    return (
                      <>
                        <div className="flex-1 px-4 border-r border-slate-200">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Conformidade</p>
                          <p className={cn(
                            "text-lg font-bold",
                            rate >= 85 ? "text-green-600" : "text-red-600"
                          )}>{rate.toFixed(1)}%</p>
                        </div>
                        <div className="flex-1 px-4 border-r border-slate-200">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Total Itens</p>
                          <p className="text-lg font-bold text-slate-900">{total}</p>
                        </div>
                        <div className="flex-1 px-4">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Não Conformidade</p>
                          <p className="text-lg font-bold text-amber-600">{errors}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="flex-1 overflow-auto bg-white">
                <div className="divide-y divide-slate-50">
                  {selectedSessionDetails.items.map((item) => {
                    const result = selectedSessionDetails.results[item.Patrimônio] as InspectionResult;
                    return (
                      <div key={item.Patrimônio} className="p-4 flex items-start gap-4 hover:bg-slate-50/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-bold text-slate-900">{item.Patrimônio}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{item.Localização}</span>
                          </div>
                          <p className="text-xs text-slate-500 truncate">{item.Descrição}</p>
                          {result?.notes && (
                            <p className="text-[11px] text-amber-600 mt-1 italic leading-relaxed bg-amber-50/50 px-2 py-1 rounded">
                              "{result.notes}"
                            </p>
                          )}
                        </div>
                        <div className="shrink-0">
                          {result ? (
                            <Badge className={cn(
                              "text-[10px] px-2 py-0 h-6 font-bold uppercase",
                              result.status === 'conforme' ? "bg-green-100 text-green-700 border-green-200" :
                              result.status === 'nao_conforme' ? "bg-amber-100 text-amber-700 border-amber-200" :
                              "bg-red-100 text-red-700 border-red-200"
                            )}>
                              {result.status.replace('_', ' ')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-2 py-0 h-6 font-bold uppercase text-slate-300">Pendente</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
                <p className="text-[10px] text-slate-400 font-medium">Responsável: {selectedSessionDetails.inspectorName || 'Gestor WM'}</p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedSessionDetails(null)} className="text-slate-500">
                    Fechar
                  </Button>
                  <Button 
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 shadow-sm"
                    onClick={() => {
                      setSelectedSessionDetails(null);
                      onNavigate('history');
                    }}
                  >
                    Histórico Completo
                    <ArrowRight className="w-3.5 h-3.5 ml-2" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
