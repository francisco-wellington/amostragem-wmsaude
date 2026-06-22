import React, { useMemo, useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '../../components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
  ComposedChart,
  Legend,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';
import { 
  Package, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  MapPin,
  MapPinOff,
  Building2,
  CalendarDays,
  FilterX,
  PlusCircle,
  RefreshCw,
  Eye,
  Info,
  Calendar,
  ClipboardList,
  Search,
  AlertCircle,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';
import { cn } from '../../lib/utils';
import { ButtonLoading } from '../../shared/components/LoadingUI';
import { InspectionSession, InventoryItem, CorrectiveAction, InspectionResult } from '../../shared/types';
import { useTheme } from '../../shared/components/ThemeProvider';
import { Skeleton } from '../../components/ui/skeleton';
import { useLiveQuery } from 'dexie-react-hooks';
import { offlineDb } from '../../shared/services/offlineDb';

const DeltaIndicator = ({ value, label, type = 'percent' }: { value: number, label: string, type?: 'percent' | 'point' }) => {
  const isPositive = value > 0;
  const isZero = value === 0;
  
  if (isZero) return null;

  return (
    <div className={cn(
      "flex items-center gap-1 text-[10px] font-bold mt-1",
      isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
    )}>
      {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      <span>{Math.abs(value).toFixed(1)}{type === 'percent' ? '%' : ''}</span>
      <span className="opacity-50 font-normal">vs ano ant.</span>
    </div>
  );
};

interface DashboardViewProps {
  sessions: InspectionSession[];
  inventory: InventoryItem[];
  actions: CorrectiveAction[];
  onNavigate: (tab: string, params?: any) => void;
  onRefresh?: () => void;
  isVisitor?: boolean;
  isLoading?: boolean;
  isMonitorMode?: boolean;
  onToggleMonitorMode?: () => void;
}

export default function DashboardView({ 
  sessions, 
  inventory, 
  actions, 
  onNavigate, 
  onRefresh, 
  isVisitor, 
  isLoading,
  isMonitorMode = false,
  onToggleMonitorMode
}: DashboardViewProps) {
  const { theme } = useTheme();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedSessionDetails, setSelectedSessionDetails] = useState<InspectionSession | null>(null);
  const [localityFilter, setLocalityFilter] = useState<string>('Todas');
  const [cityFilter, setCityFilter] = useState<string>('Todas');
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<InventoryItem | null>(null);

  // Dynamic global search on inventory
  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.trim().length < 2) return [];
    const q = searchQuery.toLowerCase().trim();
    return inventory.filter(item => {
      const pat = (item.Patrimônio || item.Patrimonio || '').toLowerCase();
      const desc = (item.Descrição || item.Descricao || '').toLowerCase();
      const brand = (item.Marca || '').toLowerCase();
      const model = (item.Modelo || '').toLowerCase();
      const city = (item.Cidade || '').toLowerCase();
      const loc = (item.Localidade || '').toLowerCase();
      return pat.includes(q) || desc.includes(q) || brand.includes(q) || model.includes(q) || city.includes(q) || loc.includes(q);
    }).slice(0, 8);
  }, [searchQuery, inventory]);

  // Retrieve individual details, latest audit, and full audit list for active asset selection
  const assetAuditHistory = useMemo(() => {
    if (!selectedAsset) return { latest: null, history: [] };
    const patNumber = selectedAsset.Patrimônio || selectedAsset.Patrimonio;
    
    const history = sessions
      .filter(s => s.completed && s.results && s.results[patNumber])
      .map(s => {
        const res = s.results[patNumber];
        return {
          sessionId: s.id,
          locality: s.locality,
          city: s.city || 'N/A',
          date: s.date,
          sampleMode: s.sampleMode,
          inspectorName: s.inspectorName || 'Gestor WM',
          status: res.status,
          notes: res.notes,
          evidence: res.evidence,
          timestamp: res.timestamp
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
    return {
      latest: history[0] || null,
      history
    };
  }, [selectedAsset, sessions]);

  // Find corrective activities associated with selected asset
  const assetActions = useMemo(() => {
    if (!selectedAsset) return [];
    const patNumber = selectedAsset.Patrimônio || selectedAsset.Patrimonio;
    return actions.filter(a => a.patrimony === patNumber);
  }, [selectedAsset, actions]);

  // Trend Data Calculation (Last 6 Months)
  const trendData = useMemo(() => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = d.toLocaleDateString('pt-BR', { month: 'short' });
      const year = d.getFullYear();
      const monthIndex = d.getMonth();
      
      const monthSessions = sessions.filter(s => {
        const sDate = new Date(s.date);
        return sDate.getFullYear() === year && sDate.getMonth() === monthIndex && s.completed;
      });
      
      let totalItems = 0;
      let conformeItems = 0;
      
      monthSessions.forEach(s => {
        const results = s.results || {};
        Object.values(results).forEach((r: any) => {
          totalItems++;
          if (r.status === 'conforme') conformeItems++;
        });
      });
      
      const rate = totalItems > 0 ? (conformeItems / totalItems) * 100 : 0;
      
      months.push({
        month: monthLabel,
        rate: parseFloat(rate.toFixed(1)),
        fullDate: d
      });
    }
    
    return months;
  }, [sessions]);

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

  const draftSessions = useLiveQuery(
    () => offlineDb.getDraftSessions(inventory[0]?.userId || 'public'), // This is a bit weak, should be proper uid
    [inventory]
  ) || [];

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
      const results = Object.values(s.results || {}) as InspectionResult[];
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

  // BI Comparison Metrics (Current Year vs Previous Year)
  const biMetrics = useMemo(() => {
    const currentYearNum = yearFilter === 'Todas' ? new Date().getFullYear() : parseInt(yearFilter);
    const previousYearNum = currentYearNum - 1;

    const getStatsForYear = (year: number) => {
      let total = 0;
      let conforme = 0;
      const yearSessions = sessions.filter(s => {
        const d = new Date(s.date);
        return d.getFullYear() === year && s.completed;
      });
      
      yearSessions.forEach(s => {
        const results = Object.values(s.results || {}) as InspectionResult[];
        results.forEach(r => {
          total++;
          if (r.status === 'conforme') conforme++;
        });
      });
      
      return {
        total,
        conforme,
        rate: total > 0 ? (conforme / total) * 100 : 0,
        sessionsCount: yearSessions.length
      };
    };

    const current = getStatsForYear(currentYearNum);
    const previous = getStatsForYear(previousYearNum);

    // Calculate non-compliant UBS (localities where the latest session rate < 85%)
    // Since inspectedLocalities already gives the latest session for each locality in the filtered scope
    const nonCompliantUbsCount = inspectedLocalities.filter(item => {
      let ubsTotal = 0;
      let ubsConforme = 0;
      const results = Object.values(item.lastSession.results || {}) as InspectionResult[];
      results.forEach(r => {
        ubsTotal++;
        if (r.status === 'conforme') ubsConforme++;
      });
      const rate = ubsTotal > 0 ? (ubsConforme / ubsTotal) * 100 : 0;
      return rate < 85;
    }).length;

    const calcDelta = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    return {
      conformityDelta: current.rate - previous.rate,
      inspectionsDelta: calcDelta(current.sessionsCount, previous.sessionsCount),
      totalDelta: calcDelta(current.total, previous.total),
      current,
      previous,
      year: currentYearNum,
      nonCompliantUbsCount
    };
  }, [sessions, yearFilter, inspectedLocalities]);

  const lastSession = useMemo(() => {
    const completed = filteredSessions.filter(s => s.completed);
    if (completed.length === 0) return null;
    return completed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }, [filteredSessions]);
  
  const chartData = useMemo(() => {
    const cityMap = new Map<string, { total: number, conforme: number }>();
    
    // Initialize all cities
    localityLookup.cities.forEach(city => {
      cityMap.set(city, { total: 0, conforme: 0 });
    });

    // Calculate city-level compliance using sessions for the selected year
    sessions.forEach(s => {
      if (!s.completed) return;
      
      const sessionYear = new Date(s.date).getFullYear().toString();
      if (yearFilter !== 'Todas' && sessionYear !== yearFilter) return;

      const city = s.city || localityLookup.localityToCity.get(s.locality);
      if (city && cityMap.has(city)) {
        const stats = cityMap.get(city)!;
        const results = Object.values(s.results || {}) as InspectionResult[];
        results.forEach(r => {
          stats.total++;
          if (r.status === 'conforme') stats.conforme++;
        });
      }
    });

    return Array.from(cityMap.entries())
      .map(([name, stats]) => ({
        name,
        rate: stats.total > 0 ? parseFloat(((stats.conforme / stats.total) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.rate - a.rate);
  }, [sessions, localityLookup.cities, localityLookup.localityToCity, yearFilter]);

  // BI Radar Data (Performance by Top 6 Cities)
  const radarData = useMemo(() => {
    const cityPerformance = chartData.slice(0, 6).map(city => {
      const cityLocalities = Array.from(localityLookup.cityToLocalities.get(city.name) || []);
      const cityTotalItems = inventory.filter(i => i.Cidade === city.name).length;
      
      const citySessions = sessions.filter(s => {
        const c = s.city || localityLookup.localityToCity.get(s.locality);
        return c === city.name && s.completed;
      });

      // Calculate Coverage (Localities with at least one session vs total city localities)
      const uniqueInspected = new Set(citySessions.map(s => s.locality));
      const coverageRate = cityLocalities.length > 0 ? (uniqueInspected.size / cityLocalities.length) * 100 : 0;
      
      // Calculate Activity (sessions / items ratio, normalized to 100)
      const activityScore = cityTotalItems > 0 ? Math.min((citySessions.length / cityTotalItems) * 500, 100) : 0;

      return {
        subject: city.name,
        conformity: city.rate,
        coverage: coverageRate,
        activity: activityScore,
        fullMark: 100,
      };
    });

    return cityPerformance;
  }, [chartData, localityLookup, inventory, sessions]);

  if (isLoading) {
    return (
      <div className="space-y-8 pb-10">
        {/* Skeleton Filters */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        </div>
        
        {/* Skeleton Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="border-none shadow-sm h-32">
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-4 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Skeleton Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Skeleton className="lg:col-span-1 h-[400px] w-full rounded-2xl" />
          <Skeleton className="lg:col-span-2 h-[400px] w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 text-slate-900 dark:text-slate-100">
      {/* Barra de Controle de Visitante / Monitoramento */}
      {isVisitor && (
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white p-6 rounded-2xl shadow-md border border-blue-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="p-3 bg-white/10 rounded-xl text-blue-100 shrink-0">
              <Maximize2 className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider bg-blue-500/40 text-blue-100 px-2 py-0.5 rounded-md">Modo Visitante</span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">Monitoramento Ativo</span>
              </div>
              <h3 className="text-sm font-bold tracking-tight">Modo de TV / Monitoramento Físico</h3>
              <p className="text-xs text-blue-100/80 max-w-xl">
                Otimize a visualização ocultando os menus e filtros de navegação para focar apenas nas métricas estruturais de BI de campo.
              </p>
            </div>
          </div>
          <Button 
            onClick={onToggleMonitorMode}
            className={cn(
              "font-bold text-xs px-5 py-2.5 rounded-xl border shadow-sm transition-all shrink-0 flex items-center justify-center gap-2",
              isMonitorMode 
                ? "bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-400 font-black" 
                : "bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/30"
            )}
          >
            {isMonitorMode ? (
              <>
                <Minimize2 className="w-4 h-4" />
                Sair do Tela Cheia
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4" />
                Ativar Tela Cheia
              </>
            )}
          </Button>
        </div>
      )}

      {/* Modern Filters */}
      {!isMonitorMode && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
          {/* Drafts Alert */}
          {draftSessions.length > 0 && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3 text-amber-800 dark:text-amber-200">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                  <ClipboardList className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-bold">Resumo de Trabalho em Aberto</p>
                  <p className="text-xs opacity-80">Existem {draftSessions.length} auditorias pendentes salva localmente.</p>
                </div>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="bg-white dark:bg-slate-800 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900"
                onClick={() => onNavigate('history')}
              >
                Ver Todas
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Filtros de Auditoria</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all min-w-[160px] flex justify-center"
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
                className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
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
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Building2 className="w-3.5 h-3.5" />
                <label className="text-[10px] font-bold uppercase tracking-wider">Cidade</label>
              </div>
              <Select value={cityFilter} onValueChange={(val) => {
                setCityFilter(val);
                setLocalityFilter('Todas');
              }}>
                <SelectTrigger className="w-full bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-500 transition-colors h-11 text-slate-900 dark:text-slate-100">
                  <SelectValue placeholder="Todas as cidades" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                  <SelectItem value="Todas">Todas as cidades</SelectItem>
                  {cities.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <MapPin className="w-3.5 h-3.5" />
                <label className="text-[10px] font-bold uppercase tracking-wider">Unidade / Localidade</label>
              </div>
              <Select value={localityFilter} onValueChange={setLocalityFilter}>
                <SelectTrigger className="w-full bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-500 transition-colors h-11 text-slate-900 dark:text-slate-100">
                  <SelectValue placeholder="Todas as localidades" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                  <SelectItem value="Todas">Todas as localidades</SelectItem>
                  {localities.map(loc => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <CalendarDays className="w-3.5 h-3.5" />
                <label className="text-[10px] font-bold uppercase tracking-wider">Ano de Amostragem</label>
              </div>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-full bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-500 transition-colors h-11 text-slate-900 dark:text-slate-100">
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                  <SelectItem value="Todas">Todo o histórico</SelectItem>
                  {years.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Busca Global de Ativos */}
      {!isMonitorMode && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-400">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Busca Global de Ativos</h2>
              <p className="text-slate-400 dark:text-slate-500 text-xs">Pesquise por Patrimônio, Descrição, Marca, Modelo ou Cidade/Unidade</p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5 text-slate-400 dark:text-slate-500" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-24 py-3 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-blue-300 dark:hover:border-blue-500 transition-colors text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none"
              placeholder="Digite o número do patrimônio, descrição, marca ou município..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">Limpar</span>
              </button>
            )}
          </div>

          {/* Lista Autocomplete de Resultados */}
          {searchQuery.trim().length >= 2 && (
            <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950 shadow-xl divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[350px] overflow-y-auto z-20 position-relative">
              {searchResults.length > 0 ? (
                searchResults.map((item, idx) => (
                  <button
                    key={`${item.Patrimônio || item.Patrimonio || 'desconhecido'}-${idx}`}
                    className="w-full text-left p-4 hover:bg-slate-50/80 dark:hover:bg-slate-900/40 flex items-center justify-between gap-4 transition-colors"
                    onClick={() => {
                      setSelectedAsset(item);
                      setSearchQuery('');
                    }}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl shrink-0">
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-xs font-black text-blue-600 dark:text-blue-400">#{item.Patrimônio || item.Patrimonio}</span>
                          {item.Marca && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase bg-slate-50 dark:bg-slate-900 px-1.5 py-0.2 rounded">
                              {item.Marca} {item.Modelo}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl">
                          {item.Descrição || item.Descricao}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{item.Cidade}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">{item.Localidade}</div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                  Nenhum ativo patrimonial encontrado para a pesquisa "{searchQuery}".
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6">
        <Card 
          className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden group hover:shadow-md transition-all duration-300 relative"
          role="region"
          aria-label={`Total de Patrimônio: ${totalItems}`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
          <CardContent className="pt-6 2xl:pt-10 2xl:pb-8 relative z-10">
            <div className="flex flex-col gap-4">
              <div className="p-3 2xl:p-4 bg-blue-100/50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl w-fit">
                <Package className="w-5 h-5 2xl:w-6 2xl:h-6" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] 2xl:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Patrimônio</p>
                <h3 className="text-2xl 2xl:text-4xl font-black text-[#3f4c6a] dark:text-slate-100 leading-none">{totalItems}</h3>
                <DeltaIndicator value={biMetrics.totalDelta} label="Itens" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden group hover:shadow-md transition-all duration-300 relative"
          role="region"
          aria-label={`Total de Unidades: ${totalLocalities}`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
          <CardContent className="pt-6 2xl:pt-10 2xl:pb-8 relative z-10">
            <div className="flex flex-col gap-4">
              <div className="p-3 2xl:p-4 bg-indigo-100/50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl w-fit">
                <Building2 className="w-5 h-5 2xl:w-6 2xl:h-6" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] 2xl:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Unidades</p>
                <h3 className="text-2xl 2xl:text-4xl font-black text-[#3f4c6a] dark:text-slate-100 leading-none">{totalLocalities}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden group hover:shadow-md transition-all duration-300 relative ring-1 ring-amber-100/50 dark:ring-amber-900/20"
          role="region"
          aria-label={`Unidades Pendentes: ${pendingLocalities.length}`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
          <CardContent className="pt-6 2xl:pt-10 2xl:pb-8 relative z-10">
            <div className="flex flex-col gap-4">
              <div className="p-3 2xl:p-4 bg-amber-100/50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-xl w-fit">
                <MapPinOff className="w-5 h-5 2xl:w-6 2xl:h-6" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] 2xl:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Uni. Pendentes</p>
                <h3 className="text-2xl 2xl:text-4xl font-black text-[#3f4c6a] dark:text-amber-400 leading-none">{pendingLocalities.length}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden group hover:shadow-md transition-all duration-300 relative"
          role="region"
          aria-label={`Taxa de Conformidade: ${conformityRate.toFixed(1)}%`}
        >
          <div className={cn(
            "absolute top-0 right-0 w-24 h-24 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110",
            conformityRate >= 85 ? "bg-green-500/5" : "bg-red-500/5"
          )} />
          <CardContent className="pt-6 2xl:pt-10 2xl:pb-8 relative z-10">
            <div className="flex flex-col gap-4">
              <div className={cn(
                "p-3 2xl:p-4 rounded-xl w-fit",
                conformityRate >= 85 ? "bg-green-100/50 dark:bg-green-900/40 text-green-600 dark:text-green-400" : "bg-red-100/50 dark:bg-red-900/40 text-red-600 dark:text-red-400"
              )}>
                {conformityRate >= 85 ? <CheckCircle2 className="w-5 h-5 2xl:w-6 2xl:h-6" aria-hidden="true" /> : <AlertTriangle className="w-5 h-5 2xl:w-6 2xl:h-6" aria-hidden="true" />}
              </div>
              <div className="space-y-1">
                <p className="text-[10px] 2xl:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Conformidade</p>
                <h3 className={cn(
                  "text-2xl 2xl:text-4xl font-black leading-none",
                  conformityRate >= 85 ? "text-green-600 dark:text-green-400" : "text-[#3f4c6a] dark:text-red-400"
                )}>{conformityRate.toFixed(1)}%</h3>
                <DeltaIndicator value={biMetrics.conformityDelta} label="Pontos" type="point" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden group hover:shadow-md transition-all duration-300 relative"
          role="region"
          aria-label={`Total de Inspeções: ${completedInspections}`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
          <CardContent className="pt-6 2xl:pt-10 2xl:pb-8 relative z-10">
            <div className="flex flex-col gap-4">
              <div className="p-3 2xl:p-4 bg-purple-100/50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-xl w-fit">
                <TrendingUp className="w-5 h-5 2xl:w-6 2xl:h-6" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] 2xl:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Inspeções</p>
                <h3 className="text-2xl 2xl:text-4xl font-black text-[#3f4c6a] dark:text-slate-100 leading-none">{completedInspections}</h3>
                <DeltaIndicator value={biMetrics.inspectionsDelta} label="Auditorias" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden group hover:shadow-md transition-all duration-300 relative"
          role="region"
          aria-label={`Ações Corretivas Pendentes: ${pendingActions}`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
          <CardContent className="pt-6 2xl:pt-10 2xl:pb-8 relative z-10">
            <div className="flex flex-col gap-4">
              <div className="p-3 2xl:p-4 bg-orange-100/50 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 rounded-xl w-fit">
                <XCircle className="w-5 h-5 2xl:w-6 2xl:h-6" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] 2xl:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Ações Pendentes</p>
                <h3 className="text-2xl 2xl:text-4xl font-black text-[#3f4c6a] dark:text-slate-100 leading-none">{pendingActions}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* BI Board: Summary of insights */}
        {!isMonitorMode && (
          <Card className="lg:col-span-3 border-none bg-blue-600 dark:bg-blue-700 text-white shadow-lg shadow-blue-200 dark:shadow-none overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full -ml-32 -mb-32 blur-3xl" />
            
            <CardContent className="p-6 2xl:p-8 relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-blue-100">
                    <TrendingUp className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-widest">Business Intelligence - {biMetrics.year}</span>
                  </div>
                  <h2 className="text-2xl 2xl:text-3xl font-black">
                    Análise de Desempenho e Metas
                  </h2>
                  <p className="text-blue-100/80 text-sm max-w-2xl">
                    {biMetrics.nonCompliantUbsCount > 0 
                      ? `Atualmente identificamos ${biMetrics.nonCompliantUbsCount} unidades (UBS) com conformidade abaixo da meta de 85%. Priorizar ações corretivas nestes locais é fundamental para a melhoria dos indicadores.`
                      : `Excelente desempenho! Todas as unidades auditadas no período de ${biMetrics.year} estão operando acima da meta de conformidade de 85%.`}
                  </p>
                </div>
                <div className="flex gap-4 sm:gap-8 shrink-0">
                  <div className="text-center">
                    <div className="text-3xl 2xl:text-4xl font-black">{biMetrics.nonCompliantUbsCount}</div>
                    <div className="text-[10px] text-blue-100 font-bold uppercase">UBS Não Conforme</div>
                  </div>
                  <div className="w-px h-12 bg-white/20 self-center" />
                  <div className="text-center">
                    <div className="text-3xl 2xl:text-4xl font-black">
                      {biMetrics.conformityDelta >= 0 ? '+' : ''}{biMetrics.conformityDelta.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-blue-100 font-bold uppercase">Var. Conformidade</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Conformidade por Cidade - Main BI Chart */}
        <Card className="lg:col-span-2 border-none shadow-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg font-semibold dark:text-white">Performance por Município</CardTitle>
              <CardDescription className="dark:text-slate-400">Comparativo total de conformidade entre as cidades</CardDescription>
            </div>
            <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800">
              Todas as Cidades
            </Badge>
          </CardHeader>
          <CardContent className="h-[400px] 2xl:h-[600px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ bottom: 80, top: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#f1f5f9'} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                  height={80}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} unit="%" />
                <Tooltip 
                  cursor={{ fill: theme === 'dark' ? '#1e293b' : '#f8fafc' }}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                  }}
                />
                <Legend verticalAlign="top" align="right" height={36}/>
                <Bar name="Taxa Conformidade" dataKey="rate" radius={[6, 6, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.rate >= 85 ? '#10b981' : (entry.rate >= 70 ? '#f59e0b' : '#ef4444')} />
                  ))}
                </Bar>
                <Line name="Meta (85%)" type="monotone" dataKey={() => 85} stroke="#64748b" strokeDasharray="5 5" dot={false} strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Radar Chart for Multi-dimensional BI */}
        <Card className="lg:col-span-1 border-none shadow-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col h-full">
          <CardHeader>
            <CardTitle className="text-lg font-semibold dark:text-white">Equilíbrio de Performance</CardTitle>
            <CardDescription className="dark:text-slate-400">Análise 360° das principais cidades</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Conformidade"
                  dataKey="conformity"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.4}
                />
                <Radar
                  name="Cobertura"
                  dataKey="coverage"
                  stroke="#2563eb"
                  fill="#2563eb"
                  fillOpacity={0.2}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                  }}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
          <div className="px-6 pb-6 text-[10px] text-slate-400 flex items-center gap-1">
             <Info className="w-3 h-3" />
             <span>Mede conformidade vs cobertura territorial</span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Trend Chart - Now next to Localities */}
        <Card className="lg:col-span-2 border-none shadow-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp className="w-24 h-24 rotate-12" />
          </div>
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              Tendência de Conformidade
            </CardTitle>
            <CardDescription>Média mensal nos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] 2xl:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#f1f5f9'} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                    fontSize: '12px'
                  }}
                  formatter={(val: number) => [`${val}%`, 'Conformidade']}
                />
                <Area 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="#2563eb" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRate)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
          <div className="px-6 pb-6 pt-2">
             <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span className="flex items-center gap-1">
                   <Calendar className="w-3 h-3" />
                   Ultimos 180 dias
                </span>
                <span className={cn(
                   "px-2 py-0.5 rounded-full",
                   trendData.length > 0 && trendData[trendData.length - 1].rate >= trendData[0].rate ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                )}>
                   {trendData.length > 0 && trendData[trendData.length - 1].rate >= trendData[0].rate ? "Melhoria Contínua" : "Atenção Necessária"}
                </span>
             </div>
          </div>
        </Card>

        {/* Localities List */}
        <Card className="lg:col-span-1 border-none shadow-sm bg-white dark:bg-slate-900 flex flex-col h-full text-slate-900 dark:text-slate-100">
          <CardHeader>
            <CardTitle className="text-lg font-semibold dark:text-white">Localidades Inspecionadas</CardTitle>
            <CardDescription className="dark:text-slate-400">Unidades que já passaram por auditoria</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <ScrollArea className="h-[250px] 2xl:h-[450px] 3xl:h-[550px] pr-4">
              {inspectedLocalities.length > 0 ? (
                <div className="space-y-2">
                  {inspectedLocalities.map((item) => {
                    const isSelected = item.locality === localityFilter;
                    const results = Object.values(item.lastSession.results || {}) as InspectionResult[];
                    const conforme = results.filter(r => r.status === 'conforme').length;
                    const rate = results.length > 0 ? (conforme / results.length) * 100 : 0;

                    return (
                      <div 
                        key={`${item.locality}|${item.city}`} 
                        ref={isSelected ? highlightedRef : null}
                        className={cn(
                          "group flex items-center gap-3 p-3 rounded-lg border transition-all duration-300 cursor-pointer",
                          isSelected 
                            ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 shadow-sm ring-1 ring-blue-100 dark:ring-blue-900/40" 
                            : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-700 hover:bg-white dark:hover:bg-slate-800"
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
                            isSelected ? "text-blue-900 dark:text-blue-100" : "text-slate-700 dark:text-slate-300"
                          )}>
                            {item.locality}
                          </span>
                          <span className={cn(
                            "text-[10px] font-bold uppercase",
                            isSelected ? "text-blue-400 dark:text-blue-500" : "text-slate-400 dark:text-slate-500"
                          )}>
                            {item.city} • {rate.toFixed(0)}% Conformidade
                          </span>
                        </div>
                        <Eye className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-8">
                  <MapPin className="w-8 h-8 text-slate-200 dark:text-slate-800 mb-2" />
                  <p className="text-slate-500 dark:text-slate-400 text-xs">Nenhuma localidade inspecionada.</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {/* Pending Localities List */}
        <Card className="md:col-span-2 border-none shadow-sm bg-white dark:bg-slate-900 flex flex-col h-full text-slate-900 dark:text-slate-100">
          <CardHeader>
            <CardTitle className="text-lg font-semibold dark:text-white">Localidades Não Inspecionadas</CardTitle>
            <CardDescription className="dark:text-slate-400">Unidades que ainda aguardam auditoria no período selecionado</CardDescription>
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
                            ? "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 shadow-sm ring-1 ring-amber-100 dark:ring-amber-900/40" 
                            : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 shadow-sm"
                        )}
                      >
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          isSelected ? "bg-amber-600 animate-pulse" : "bg-slate-300 dark:bg-slate-600"
                        )} />
                        <div className="flex flex-col overflow-hidden">
                          <span className={cn(
                            "text-sm font-medium truncate",
                            isSelected ? "text-amber-900 dark:text-amber-100" : "text-slate-700 dark:text-slate-300"
                          )}>
                            {item.locality}
                          </span>
                          <span className={cn(
                            "text-[10px] font-bold uppercase",
                            isSelected ? "text-amber-400 dark:text-amber-500" : "text-slate-400 dark:text-slate-500"
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
                              isSelected ? "text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50" : "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50"
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
                  <CheckCircle2 className="w-12 h-12 text-green-100 dark:text-green-900/20 mb-4" />
                  <p className="text-slate-900 dark:text-slate-100 font-bold">Todas as unidades foram inspecionadas!</p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Excelente trabalho de cobertura.</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-none shadow-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
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
                    <span className="font-semibold text-slate-900 dark:text-white">{lastSession.locality}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-slate-500">Data</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {new Date(lastSession.date).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-slate-500">Responsável</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {lastSession.inspectorName || 'Desconhecido'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-slate-500">Resultado</span>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const results = Object.values(lastSession.results || {}) as InspectionResult[];
                      const conforme = results.filter(r => r.status === 'conforme').length;
                      const rate = (conforme / lastSession.items.length) * 100;
                      
                      if (!lastSession.completed) {
                        return (
                          <>
                            <Badge className="bg-amber-500 hover:bg-amber-600">
                              INCOMPLETO
                            </Badge>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{rate.toFixed(1)}%</span>
                          </>
                        );
                      }

                      return (
                        <>
                          <Badge variant={rate >= 85 ? 'default' : 'destructive'} className={rate >= 85 ? 'bg-green-500' : ''}>
                            {rate >= 85 ? 'APROVADO' : 'REPROVADO'}
                          </Badge>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{rate.toFixed(1)}%</span>
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
                    const results = Object.values(selectedSessionDetails.results || {}) as InspectionResult[];
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
                  {selectedSessionDetails.items.map((item, idx) => {
                    const result = selectedSessionDetails.results[item.Patrimônio] as InspectionResult;
                    return (
                      <div key={`${item.Patrimônio || 'desconhecido'}-${idx}`} className="p-4 flex items-start gap-4 hover:bg-slate-50/50 transition-colors">
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

      {/* Dialog para Detalhes Globais do Ativo */}
      <Dialog open={!!selectedAsset} onOpenChange={(open) => !open && setSelectedAsset(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl dark:bg-slate-900 text-slate-900 dark:text-slate-100">
          {selectedAsset && (
            <>
              {/* Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-950/40">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md">Ativo Patrimonial</span>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Patrimônio: {selectedAsset.Patrimônio || selectedAsset.Patrimonio}</span>
                    </div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-snug break-words">
                      {selectedAsset.Descrição || selectedAsset.Descricao}
                    </h2>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedAsset(null)} 
                    className="text-slate-405 hover:text-slate-600 dark:hover:text-slate-300 shrink-0"
                  >
                    Fechar
                  </Button>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Ficha Cadastral do Ativo */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" />
                      Ficha Cadastral
                    </h3>
                    <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 p-4 rounded-xl space-y-3 text-sm">
                      <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/50">
                        <span className="text-slate-500 dark:text-slate-400">Marca / Fabricante</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{selectedAsset.Marca || 'Não informada'}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/50">
                        <span className="text-slate-500 dark:text-slate-400">Modelo</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{selectedAsset.Modelo || 'Não especificado'}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/50">
                        <span className="text-slate-500 dark:text-slate-400">Município Alocado</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{selectedAsset.Cidade}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/50">
                        <span className="text-slate-500 dark:text-slate-400">Unidade (UBS)</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{selectedAsset.Localidade}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-400 dark:text-slate-400">Subsetor / Setor</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">{selectedAsset.Localização || 'Geral'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Estado Operacional Atual / Resultados da última auditoria */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Status de Auditoria
                    </h3>
                    
                    {assetAuditHistory.latest ? (
                      <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl space-y-4 bg-white dark:bg-slate-900/40">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase">Última Auditoria</span>
                          <Badge className={cn(
                            "text-[10px] px-2.5 py-0.5 font-bold uppercase",
                            assetAuditHistory.latest.status === 'conforme' ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50" :
                            assetAuditHistory.latest.status === 'nao_conforme' ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50" :
                            assetAuditHistory.latest.status === 'nao_localizado' ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50" :
                            "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50"
                          )}>
                            {assetAuditHistory.latest.status === 'conforme' ? 'CONFORME' : 
                             assetAuditHistory.latest.status === 'nao_conforme' ? 'NÃO CONFORME' :
                             assetAuditHistory.latest.status === 'nao_localizado' ? 'NÃO LOCALIZADO' : 'LOC. INCORRETA'}
                          </Badge>
                        </div>

                        <div className="text-xs space-y-2 text-slate-600 dark:text-slate-300">
                          <div className="flex justify-between">
                            <span>Data:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{new Date(assetAuditHistory.latest.date).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Auditor:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{assetAuditHistory.latest.inspectorName}</span>
                          </div>
                          {assetAuditHistory.latest.notes && (
                            <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg italic">
                              "{assetAuditHistory.latest.notes}"
                            </div>
                          )}
                          {assetAuditHistory.latest.evidence && (
                            <div className="mt-2 shrink-0">
                              <span className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">Evidência Fotográfica</span>
                              <img 
                                src={assetAuditHistory.latest.evidence} 
                                alt={`Evidência do patrimônio ${selectedAsset.Patrimônio || selectedAsset.Patrimonio}`}
                                className="w-full h-32 object-cover rounded-lg border border-slate-100 dark:border-slate-800"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="border border-dashed border-slate-200 dark:border-slate-800 p-6 rounded-xl text-center space-y-2 bg-slate-50/50 dark:bg-slate-900/10">
                        <Package className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Ativo Sem Histórico</p>
                        <p className="text-[11px] text-slate-400">Este patrimônio ainda não participou de nenhuma amostragem ou auditoria finalizada.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Histórico Temporal de Auditorias */}
                {assetAuditHistory.history.length > 0 && (
                  <div className="space-y-4 pt-2">
                    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Linha do Tempo de Auditoria ({assetAuditHistory.history.length})
                    </h3>
                    <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-50 dark:divide-slate-800/55 bg-white dark:bg-slate-950/20 max-h-[180px] overflow-y-auto">
                      {assetAuditHistory.history.map((hist, idx) => (
                        <div key={idx} className="p-3 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/10 transition-colors text-xs">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {new Date(hist.date).toLocaleDateString('pt-BR')}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">•</span>
                              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                                Amostragem {hist.sampleMode}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Realizado por {hist.inspectorName} na unidade {hist.locality} ({hist.city})
                            </p>
                            {hist.notes && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
                                "{hist.notes}"
                              </p>
                            )}
                          </div>
                          <Badge className={cn(
                            "text-[9px] px-2 py-0 h-5 font-bold uppercase shrink-0",
                            hist.status === 'conforme' ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/30" :
                            hist.status === 'nao_conforme' ? "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/30" :
                            hist.status === 'nao_localizado' ? "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30" :
                            "bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800/30"
                          )}>
                            {hist.status === 'conforme' ? 'CONFORME' : 
                             hist.status === 'nao_conforme' ? 'NÃO CONFORME' : 
                             hist.status === 'nao_localizado' ? 'NÃO LOCALIZADO' : 'LOC. INCORRETA'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Plano de Ação Relacionado se houver não-conformidade */}
                {assetActions.length > 0 && (
                  <div className="space-y-4 pt-2">
                    <h3 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Planos de Ação Requeridos
                    </h3>
                    <div className="border border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/10 rounded-xl overflow-hidden divide-y divide-amber-100 dark:divide-amber-900/20">
                      {assetActions.map((act) => (
                        <div key={act.id} className="p-3 flex items-center justify-between gap-4 text-xs">
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">
                              Correção: {act.description}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              Gerado em {new Date(act.date).toLocaleDateString('pt-BR')} na unidade {act.locality}
                            </span>
                          </div>
                          <Badge className={cn(
                            "text-[9px] px-2 py-0.5 font-bold uppercase shrink-0",
                            act.resolved 
                              ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/30" 
                              : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/30 animate-pulse"
                          )}>
                            {act.resolved ? `Resolvida em ${act.resolutionDate ? new Date(act.resolutionDate).toLocaleDateString('pt-BR') : ''}` : 'Pendente de Resolução'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Município: {selectedAsset.Cidade} • UBS: {selectedAsset.Localidade}</p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedAsset(null)} className="text-slate-500 dark:text-slate-400">
                    Fechar
                  </Button>
                  {!isVisitor && assetActions.some(a => !a.resolved) && (
                    <Button 
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm font-bold"
                      onClick={() => {
                        setSelectedAsset(null);
                        onNavigate('corrective-actions');
                      }}
                    >
                      Ver Inconformidades
                      <ArrowRight className="w-3.5 h-3.5 ml-2" />
                    </Button>
                  )}
                  {assetAuditHistory.history.length === 0 && !isVisitor && (
                    <Button 
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-bold"
                      onClick={() => {
                        const targetCity = selectedAsset.Cidade;
                        const targetLocality = selectedAsset.Localidade;
                        setSelectedAsset(null);
                        setCityFilter(targetCity);
                        setLocalityFilter(targetLocality);
                        onNavigate('new-sampling');
                      }}
                    >
                      Iniciar Auditoria Local
                      <ArrowRight className="w-3.5 h-3.5 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
