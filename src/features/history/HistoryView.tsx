import React, { useState, useMemo } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { 
  History, 
  CheckCircle2, 
  XCircle, 
  Clock,
  FileDown,
  Calendar,
  MapPin,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Eye,
  Camera,
  Info,
  Filter,
  Search,
  Building2,
  CalendarDays,
  Trash2,
  X,
  User,
  FileText
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '../../components/ui/tooltip';
import { InspectionSession, InspectionResult, InventoryItem } from '../../shared/types';
import { PdfService } from '../../shared/services/pdfService';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { cn } from '../../lib/utils';
import { OverlayLoading } from '../../shared/components/LoadingUI';
import { Skeleton } from '../../components/ui/skeleton';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useLiveQuery } from 'dexie-react-hooks';
import { offlineDb } from '../../shared/services/offlineDb';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';
import { ScrollArea } from '../../components/ui/scroll-area';

interface HistoryViewProps {
  sessions: InspectionSession[];
  onEditSession?: (session: InspectionSession) => void;
  onDeleteSession?: (sessionId: string) => void;
  isVisitor?: boolean;
  isLoading?: boolean;
}

export default function HistoryView({ sessions, onEditSession, onDeleteSession, isVisitor, isLoading }: HistoryViewProps) {
  const localDrafts = useLiveQuery(
    () => offlineDb.getDraftSessions('any'), // Just get all for now, filter below
    []
  ) || [];

  const allSessions = useMemo(() => {
    // Merge remote sessions and local drafts, priority to existing session in list
    const combined = [...sessions];
    
    localDrafts.forEach(draft => {
      const exists = combined.some(s => s.id === draft.id);
      if (!exists) {
        combined.push({
          ...draft,
          completed: false // Local drafts are by definition incomplete for this view
        });
      }
    });
    
    return combined;
  }, [sessions, localDrafts]);

  const [isExporting, setIsExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const selectedSession = allSessions.find(s => s.id === selectedSessionId) || null;
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedLocality, setSelectedLocality] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');

  // Derivando valores únicos para os filtros
  const cities = Array.from(new Set(allSessions.map(s => s.city).filter(Boolean))) as string[];
  const localities = Array.from(new Set(allSessions.filter(s => selectedCity === 'all' || s.city === selectedCity).map(s => s.locality)));
  
  const years = Array.from(new Set(allSessions.map(s => new Date(s.date).getFullYear().toString()))).sort((a, b) => (b as string).localeCompare(a as string));
  const months = [
// ...
    { value: '0', label: 'Janeiro' },
    { value: '1', label: 'Fevereiro' },
    { value: '2', label: 'Março' },
    { value: '3', label: 'Abril' },
    { value: '4', label: 'Maio' },
    { value: '5', label: 'Junho' },
    { value: '6', label: 'Julho' },
    { value: '7', label: 'Agosto' },
    { value: '8', label: 'Setembro' },
    { value: '9', label: 'Outubro' },
    { value: '10', label: 'Novembro' },
    { value: '11', label: 'Dezembro' },
  ];

  const filteredSessions = allSessions.filter(session => {
    const searchLower = searchTerm.toLowerCase();
    const sessionDate = new Date(session.date);
    
    const matchesSearch = (
      session.locality.toLowerCase().includes(searchLower) ||
      (session.city && session.city.toLowerCase().includes(searchLower)) ||
      (session.inspectorName && session.inspectorName.toLowerCase().includes(searchLower)) ||
      (session.items && session.items.some(item => item.Patrimônio?.toLowerCase().includes(searchLower)))
    );

    const matchesCity = selectedCity === 'all' || session.city === selectedCity;
    const matchesLocality = selectedLocality === 'all' || session.locality === selectedLocality;
    const matchesMonth = selectedMonth === 'all' || sessionDate.getMonth().toString() === selectedMonth;
    const matchesYear = selectedYear === 'all' || sessionDate.getFullYear().toString() === selectedYear;

    return matchesSearch && matchesCity && matchesLocality && matchesMonth && matchesYear;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSessions = filteredSessions.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when filtering
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCity, selectedLocality, selectedMonth, selectedYear]);

  const exportToPDF = async (session: InspectionSession) => {
    setIsExporting(true);
    try {
      await PdfService.generateInspectionReport(session);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar o relatório PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportTermo = async (item: InventoryItem, session: InspectionSession) => {
    setIsExporting(true);
    try {
      await PdfService.generateReturnTerm(item, session.inspectorName || 'Desconhecido', session.date);
      toast.success('Termo de devolução gerado!');
    } catch (error) {
      console.error('Error generating term:', error);
      toast.error('Erro ao gerar o termo de devolução.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCSV = (session: InspectionSession) => {
    const data = session.items.map((item) => {
      const result = session.results[item.Patrimônio];
      return {
        'Patrimônio': item.Patrimônio,
        'Descrição': item.Descrição,
        'Marca': item.Marca || '',
        'Modelo': item.Modelo || '',
        'Localidade': session.locality,
        'Localização Esperada': item.Localização || '',
        'Status da Inspeção': result ? (
          result.status === 'conforme' ? 'Conforme' :
          result.status === 'nao_conforme' ? 'Não Conforme' :
          result.status === 'nao_localizado' ? 'Não Localizado' :
          'Localização Incorreta'
        ) : 'Pendente',
        'Observações': result?.notes || '',
        'Data da Verificação': result ? new Date(result.timestamp).toLocaleString('pt-BR') : '',
        'Possui Foto': result?.evidence ? 'Sim' : 'Não'
      };
    });

    const csv = Papa.unparse(data, {
      delimiter: ';', // Use semicolon for better Excel compatibility in many regions
      header: true,
    });

    // Add BOM (Byte Order Mark) for UTF-8 so Excel opens it with correct encoding
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const dateStr = new Date(session.date).toISOString().split('T')[0];
    
    link.setAttribute('href', url);
    link.setAttribute('download', `Relatorio_Inspecao_${session.locality.replace(/\s+/g, '_')}_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-none shadow-sm h-32">
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-4 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-[120px] w-full rounded-2xl" />
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 dark:bg-slate-800/50">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <div className="p-4 space-y-4">
             {[...Array(5)].map((_, i) => (
               <Skeleton key={i} className="h-16 w-full" />
             ))}
          </div>
        </Card>
      </div>
    );
  }

  const totalInspections = allSessions.length;
  const approvedCount = allSessions.filter(s => {
    const results = Object.values(s.results || {}) as InspectionResult[];
    const conforme = results.filter(r => r.status === 'conforme').length;
    const rate = results.length > 0 ? (conforme / results.length) * 100 : 0;
    return s.completed && rate >= 85;
  }).length;
  const reprovedCount = allSessions.filter(s => {
    const results = Object.values(s.results || {}) as InspectionResult[];
    const conforme = results.filter(r => r.status === 'conforme').length;
    const rate = results.length > 0 ? (conforme / results.length) * 100 : 0;
    return s.completed && rate < 85;
  }).length;
  const incompleteCount = allSessions.filter(s => !s.completed).length;

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100 pb-10">
      {/* Stats Summary - Added to use space better */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <Card className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden group hover:shadow-md transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100/50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
                <History className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Inspeções</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 leading-none">{totalInspections}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden group hover:shadow-md transition-all duration-300 ring-1 ring-green-100/50 dark:ring-green-900/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100/50 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded-xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Aprovadas</p>
                <h3 className="text-2xl font-black text-green-600 dark:text-green-400 leading-none">
                  {approvedCount}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden group hover:shadow-md transition-all duration-300 ring-1 ring-red-100/50 dark:ring-red-900/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100/50 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Reprovadas</p>
                <h3 className="text-2xl font-black text-red-600 dark:text-red-400 leading-none">
                  {reprovedCount}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden group hover:shadow-md transition-all duration-300 ring-1 ring-amber-100/50 dark:ring-amber-900/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100/50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-xl">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Incompletas</p>
                <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 leading-none">
                  {incompleteCount}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
              <Filter className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Filtros do Histórico</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:flex lg:flex-row gap-4">
            <div className="flex-1 space-y-2 md:col-span-3 lg:col-span-1">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Search className="w-3.5 h-3.5" />
                <label className="text-[10px] font-bold uppercase tracking-wider">Buscar</label>
              </div>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <Input 
                  placeholder="Localidade, cidade, responsável ou patrimônio..." 
                  className="pl-10 h-11 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus-visible:ring-1 focus-visible:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:flex lg:items-end gap-3 flex-wrap md:col-span-3 lg:col-span-1">
              <div className="space-y-2 lg:w-[180px]">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Building2 className="w-3.5 h-3.5" />
                  <label className="text-[10px] font-bold uppercase tracking-wider">Cidade</label>
                </div>
                <Select value={selectedCity} onValueChange={(val) => { setSelectedCity(val); setSelectedLocality('all'); }}>
                  <SelectTrigger className="h-11 w-full dark:bg-slate-950 dark:border-slate-800 focus:ring-1 focus:ring-blue-500">
                    <SelectValue placeholder="Cidade">
                      {selectedCity === 'all' ? 'Todas' : selectedCity}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-950 dark:border-slate-800">
                    <SelectItem value="all">Todas as cidades</SelectItem>
                    {cities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 lg:w-[180px]">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <MapPin className="w-3.5 h-3.5" />
                  <label className="text-[10px] font-bold uppercase tracking-wider">Localidade</label>
                </div>
                <Select value={selectedLocality} onValueChange={setSelectedLocality}>
                  <SelectTrigger className="h-11 w-full dark:bg-slate-950 dark:border-slate-800 focus:ring-1 focus:ring-blue-500">
                    <SelectValue placeholder="Localidade">
                      {selectedLocality === 'all' ? 'Todas' : selectedLocality}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-950 dark:border-slate-800">
                    <SelectItem value="all">Todas as localidades</SelectItem>
                    {localities.map(loc => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 lg:w-[150px]">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <CalendarDays className="w-3.5 h-3.5" />
                  <label className="text-[10px] font-bold uppercase tracking-wider">Mês</label>
                </div>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="h-11 w-full dark:bg-slate-950 dark:border-slate-800 focus:ring-1 focus:ring-blue-500">
                    <SelectValue placeholder="Mês">
                      {selectedMonth === 'all' ? 'Todos' : months.find(m => m.value === selectedMonth)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-950 dark:border-slate-800">
                    <SelectItem value="all">Todos os meses</SelectItem>
                    {months.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 lg:w-[110px]">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <CalendarDays className="w-3.5 h-3.5" />
                  <label className="text-[10px] font-bold uppercase tracking-wider">Ano</label>
                </div>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="h-11 w-full dark:bg-slate-950 dark:border-slate-800 focus:ring-1 focus:ring-blue-500">
                    <SelectValue placeholder="Ano">
                      {selectedYear === 'all' ? 'Todos' : selectedYear}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-950 dark:border-slate-800">
                    <SelectItem value="all">Todos os anos</SelectItem>
                    {years.map(y => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              {(selectedCity !== 'all' || selectedLocality !== 'all' || selectedMonth !== 'all' || selectedYear !== 'all' || searchTerm) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setSelectedCity('all');
                    setSelectedLocality('all');
                    setSelectedMonth('all');
                    setSelectedYear('all');
                    setSearchTerm('');
                  }}
                  className="text-xs text-slate-500 hover:text-red-600 h-8"
                >
                  Limpar Filtros
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger render={<div />}>
                  <Badge variant="outline" className="bg-white dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400">
                    {sessions.length} Inspeções Totais
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="dark:bg-slate-800 dark:text-slate-200 border-none shadow-xl">
                  <p>Total de auditorias registradas no sistema.</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger render={<div />}>
                  <Badge variant="outline" className="bg-white dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400">
                    {filteredSessions.length} Resultados
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="dark:bg-slate-800 dark:text-slate-200 border-none shadow-xl">
                  <p>Inspeções que correspondem aos filtros atuais.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold dark:text-white">Histórico de Inspeções</CardTitle>
              <CardDescription className="dark:text-slate-400">Registro completo de todas as auditorias realizadas.</CardDescription>
            </div>
            <History className="w-6 h-6 text-slate-400 dark:text-slate-500" />
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
              <TableRow className="border-slate-100 dark:border-slate-800">
                <TableHead className="dark:text-slate-400">Data</TableHead>
                <TableHead className="dark:text-slate-400">Localidade</TableHead>
                <TableHead className="dark:text-slate-400 hidden xl:table-cell">Responsável</TableHead>
                <TableHead className="dark:text-slate-400 hidden md:table-cell">Amostra</TableHead>
                <TableHead className="dark:text-slate-400">Conformidade</TableHead>
                <TableHead className="dark:text-slate-400 hidden sm:table-cell">Status Final</TableHead>
                <TableHead className="text-right dark:text-slate-400">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSessions.length > 0 ? (
                paginatedSessions.map((session) => {
                  const results = Object.values(session.results || {}) as InspectionResult[];
                  const conforme = results.filter(r => r.status === 'conforme').length;
                  const rate = results.length > 0 ? (conforme / results.length) * 100 : 0;
                  const isApproved = rate >= 85;

                  return (
                    <TableRow key={session.id} className="border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                          <span className="text-sm font-medium dark:text-slate-200">
                            {new Date(session.date).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                            <span className="text-sm font-medium dark:text-slate-200">{session.locality}</span>
                          </div>
                          {session.city && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase ml-6">{session.city}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{session.inspectorName || '---'}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="text-[10px] uppercase dark:border-slate-700 dark:text-slate-400">
                          {session.sampleMode} ({session.items.length}){session.isTabletOnly ? ' - Tablets' : ''}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full", isApproved ? "bg-green-500" : "bg-red-500")} 
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold dark:text-slate-300">{rate.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {localDrafts.some(d => d.id === session.id) && (
                          <Badge variant="outline" className="mr-2 border-blue-200 text-blue-600 dark:border-blue-900 dark:text-blue-400">
                             LOCAL
                          </Badge>
                        )}
                        {!session.completed ? (
                          <Badge className="bg-amber-500 hover:bg-amber-600 border-none">
                            <Clock className="w-3 h-3 mr-1" />
                            RASCUNHO
                          </Badge>
                        ) : isApproved ? (
                          <Badge className="bg-green-500 hover:bg-green-600 border-none">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            APROVADO
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="border-none">
                            <XCircle className="w-3 h-3 mr-1" />
                            REPROVADO
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                            onClick={() => setSelectedSessionId(session.id)}
                            aria-label={`Visualizar detalhes da inspeção em ${session.locality}`}
                          >
                            <Eye className="w-4 h-4 mr-2" aria-hidden="true" />
                            Ver
                          </Button>
                          {!isVisitor && (
                            <div className="flex gap-1" role="group" aria-label="Ações de edição">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                onClick={() => onEditSession?.(session)}
                                aria-label="Editar esta inspeção"
                              >
                                <Edit3 className="w-4 h-4 mr-2" aria-hidden="true" />
                                Editar
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={() => setSessionToDelete(session.id)}
                                aria-label="Excluir esta inspeção"
                              >
                                <Trash2 className="w-4 h-4" aria-hidden="true" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-400 dark:text-slate-600">
                    Nenhuma inspeção encontrada no histórico.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {filteredSessions.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 gap-4">
            <div className="flex items-center gap-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Mostrando {startIndex + 1} até {Math.min(startIndex + itemsPerPage, filteredSessions.length)} de {filteredSessions.length} registros
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">Exibir:</span>
                <Select 
                  value={itemsPerPage.toString()} 
                  onValueChange={(val) => {
                    setItemsPerPage(parseInt(val));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-7 w-[70px] text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                    {[5, 10, 15, 25, 50, 100].map(size => (
                      <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 min-w-[3rem] text-center">
                  Pág. {currentPage} de {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
      
      <OverlayLoading show={isExporting} message="Gerando arquivo PDF..." />

      <Dialog open={!!sessionToDelete} onOpenChange={(open) => !open && setSessionToDelete(null)}>
        <DialogContent className="sm:max-w-[425px] dark:bg-slate-900 border-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600 dark:text-red-400">Excluir Inspeção?</DialogTitle>
            <DialogDescription className="pt-2 text-slate-500 dark:text-slate-400">
              Tem certeza que deseja excluir esta inspeção? Esta ação é irreversível e removerá todos os dados e referências desta auditoria.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button variant="outline" className="flex-1 dark:border-slate-700 dark:text-slate-300" onClick={() => setSessionToDelete(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              className="flex-1 bg-red-600 hover:bg-red-700 text-white border-none"
              onClick={() => {
                if (sessionToDelete && onDeleteSession) {
                  onDeleteSession(sessionToDelete);
                  setSessionToDelete(null);
                }
              }}
            >
              Sim, Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedSessionId} onOpenChange={(open) => !open && setSelectedSessionId(null)}>
        <DialogContent className="max-w-[900px] w-full sm:w-[95vw] h-full sm:h-[720px] max-h-[95vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl dark:bg-slate-900 rounded-none sm:rounded-[2rem]">
          {selectedSession && (
            <>
              <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none mb-2">Relatório Detalhado</h2>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                      <MapPin className="w-3 h-3 sm:w-4 h-4" />
                      {selectedSession.locality}
                    </span>
                    <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
                    <span className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-500 font-bold">
                      <Calendar className="w-3 h-3 sm:w-4 h-4" />
                      {new Date(selectedSession.date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="hidden sm:flex border-slate-200 h-10 px-4 font-bold text-xs bg-white hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700" 
                    onClick={() => exportToPDF(selectedSession)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Gerar PDF
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSelectedSessionId(null)} 
                    className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                    aria-label="Fechar detalhes do relatório"
                  >
                    <X className="w-5 h-5 sm:w-6 h-6" aria-hidden="true" />
                  </Button>
                </div>
              </div>
              
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-50/50 dark:bg-slate-950/40">
                {/* Sidebar com Info e Gráfico */}
                <div className="w-full md:w-64 lg:w-80 border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto shrink-0 shadow-lg shadow-slate-100/50 dark:shadow-none scrollbar-hide">
                  <section className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Informações Gerais</h3>
                    <div className="space-y-4">
                      <div className="group">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Responsável</p>
                        <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold truncate">{selectedSession.inspectorName || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="group">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Modalidade</p>
                        <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
                          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <Info className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold uppercase tracking-tight truncate">{selectedSession.sampleMode}</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-5">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Desempenho Geral</h3>
                    <div className="relative h-[180px] w-full flex items-center justify-center overflow-hidden">
                      <ResponsiveContainer width="100%" height={180} minWidth={0}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Conforme', value: Object.values(selectedSession.results || {}).filter((r: any) => r.status === 'conforme').length },
                              { name: 'Não Conforme', value: Object.values(selectedSession.results || {}).filter((r: any) => r.status !== 'conforme').length }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={8}
                            dataKey="value"
                            strokeWidth={0}
                          >
                            <Cell fill="#10b981" />
                            <Cell fill="#ef4444" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">
                          {(() => {
                            const results = Object.values(selectedSession.results || {}) as InspectionResult[];
                            const conformeCount = results.filter(r => r.status === 'conforme').length;
                            const total = selectedSession.items.length || 1;
                            return Math.round((conformeCount / total) * 100);
                          })()}%
                        </span>
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter mt-1.5">Taxa Global</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                       <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50">
                         <p className="text-[9px] font-black text-green-600 uppercase mb-0.5">Conforme</p>
                         <p className="text-lg font-black text-green-700 dark:text-green-300">
                           {Object.values(selectedSession.results || {}).filter((r: any) => r.status === 'conforme').length}
                         </p>
                       </div>
                       <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50">
                         <p className="text-[9px] font-black text-red-600 uppercase mb-0.5">Inconforme</p>
                         <p className="text-lg font-black text-red-700 dark:text-red-300">
                           {Object.values(selectedSession.results || {}).filter((r: any) => r.status !== 'conforme').length}
                         </p>
                       </div>
                    </div>
                  </section>
                </div>

                {/* Área Principal - Lista de Itens com Grid Dinâmico */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                  <div className="px-6 sm:px-10 py-4 sm:py-6 border-b border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg sticky top-0 z-10 flex items-center justify-between">
                    <div>
                      <h3 className="text-[10px] sm:text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-[0.25em]">Listagem de Ativos</h3>
                      <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tight">{selectedSession.items.length} ITENS VERIFICADOS</p>
                    </div>
                  </div>
 
                  <ScrollArea className="flex-1 min-h-0">
                    <div className="p-6 sm:p-10 flex flex-col gap-3 pb-20">
                      {selectedSession.items.map((item, index) => {
                        const result = selectedSession.results[item.Patrimônio] as InspectionResult | undefined;
                        return (
                          <div 
                            key={`${item.Patrimônio || 'desconhecido'}-${index}`} 
                            className="group relative bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 hover:border-blue-400 dark:hover:border-blue-700 hover:shadow-lg transition-all duration-300 flex items-center gap-4 sm:gap-6 shadow-sm"
                          >
                            <div className={cn(
                              "shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 shadow-inner",
                              result?.status === 'conforme' ? "bg-green-50 dark:bg-green-900/30 text-green-600" :
                              result?.status === 'nao_conforme' ? "bg-red-50 dark:bg-red-900/30 text-red-600" :
                              result?.status === 'localizacao_incorreta' ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600" :
                              "bg-slate-50 dark:bg-slate-800 text-slate-300"
                            )}>
                              {result?.status === 'conforme' ? <CheckCircle2 className="w-6 h-6" /> : 
                               result?.status === 'nao_conforme' ? <XCircle className="w-6 h-6" /> : 
                               result?.status === 'localizacao_incorreta' ? <MapPin className="w-6 h-6" /> : 
                               <Clock className="w-6 h-6" />}
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col gap-1">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tighter shrink-0">{item.Patrimônio}</span>
                                
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2">
                                    {result?.conservationState && (
                                      <div className={cn(
                                        "flex items-center gap-1 text-[8px] font-black uppercase tracking-tighter py-1 px-2 rounded-lg",
                                        result.conservationState === 'otimo' && "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400",
                                        result.conservationState === 'bom' && "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400",
                                        result.conservationState === 'regular' && "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400"
                                      )}>
                                        <span>
                                          {result.conservationState === 'otimo' && '⭐ ÓTIMO'}
                                          {result.conservationState === 'bom' && '👍 BOM'}
                                          {result.conservationState === 'regular' && '⚠️ REGULAR'}
                                        </span>
                                      </div>
                                    )}
                                    {result?.evidence && (
                                      <div className="hidden xs:flex items-center gap-1 text-[8px] font-black text-blue-600 uppercase tracking-tighter py-1 px-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                                        <Camera className="w-3 h-3" />
                                        <span>FOTO</span>
                                      </div>
                                    )}
                                    <Tooltip>
                                      <TooltipTrigger render={<div />}>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            exportTermo(item, selectedSession);
                                          }}
                                          aria-label="Gerar Termo de Devolução"
                                        >
                                          <FileDown className="w-4 h-4" aria-hidden="true" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-[10px] font-bold">Gerar Termo de Devolução</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                  {result ? (
                                    <Badge className={cn(
                                      "text-[8px] sm:text-[10px] font-black uppercase tracking-tighter px-2 sm:px-3 py-1 border-none min-w-[80px] justify-center",
                                      result.status === 'conforme' ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" :
                                      result.status === 'nao_conforme' ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" :
                                      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                                    )}>
                                      {result.status.replace('_', ' ')}
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-[8px] sm:text-[10px] font-black uppercase tracking-tighter px-2 sm:px-3 py-1 opacity-50 min-w-[80px] justify-center">Pendente</Badge>
                                  )}
                                </div>
                              </div>
                              
                              <p className="text-xs font-semibold text-slate-500 truncate">{item.Descrição}</p>
                              
                              {result?.notes && (
                                <p className="mt-1 text-[10px] text-slate-400 italic font-medium truncate">"{result.notes}"</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
