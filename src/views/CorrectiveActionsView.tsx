import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Search,
  ExternalLink,
  Camera,
  ChevronLeft,
  ChevronRight,
  Building2,
  MapPin,
  CalendarDays,
  Filter
} from 'lucide-react';
import { CorrectiveAction, InventoryItem } from '../types';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { OverlayLoading } from '../components/LoadingUI';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CorrectiveActionsViewProps {
  actions: CorrectiveAction[];
  inventory: InventoryItem[];
  onUpdateAction: (action: CorrectiveAction) => Promise<void>;
  isVisitor?: boolean;
}

export default function CorrectiveActionsView({ actions, inventory, onUpdateAction, isVisitor }: CorrectiveActionsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<CorrectiveAction | null>(null);
  const [actionText, setActionText] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedLocality, setSelectedLocality] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');

  const itemsPerPage = 8;

  // Derivando valores únicos para os filtros
  const cities = Array.from(new Set(actions.map(a => a.city).filter(Boolean))) as string[];
  const localities = Array.from(new Set(actions.filter(a => selectedCity === 'all' || a.city === selectedCity).map(a => a.locality)));
  
  const years = Array.from(new Set(actions.map(a => new Date(a.date).getFullYear().toString()))).sort((a, b) => b.localeCompare(a));
  const months = [
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
  
  const filteredActions = actions.filter(action => {
    const searchLower = searchTerm.toLowerCase();
    const actionDate = new Date(action.date);
    
    const matchesSearch = (
      action.patrimony.toLowerCase().includes(searchLower) ||
      action.description.toLowerCase().includes(searchLower) ||
      action.locality.toLowerCase().includes(searchLower) ||
      (action.city && action.city.toLowerCase().includes(searchLower))
    );

    const matchesCity = selectedCity === 'all' || action.city === selectedCity;
    const matchesLocality = selectedLocality === 'all' || action.locality === selectedLocality;
    const matchesMonth = selectedMonth === 'all' || actionDate.getMonth().toString() === selectedMonth;
    const matchesYear = selectedYear === 'all' || actionDate.getFullYear().toString() === selectedYear;

    return matchesSearch && matchesCity && matchesLocality && matchesMonth && matchesYear;
  }).sort((a, b) => (a.resolved === b.resolved ? 0 : a.resolved ? 1 : -1));

  const totalPages = Math.ceil(filteredActions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedActions = filteredActions.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when filtering
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCity, selectedLocality, selectedMonth, selectedYear]);

  const handleAction = async (resolved: boolean) => {
    if (!selectedAction) return;
    setIsResolving(true);
    try {
      await onUpdateAction({
        ...selectedAction,
        notes: actionText,
        resolved: resolved,
        resolutionDate: resolved ? (selectedAction.resolutionDate || new Date().toISOString()) : selectedAction.resolutionDate
      });
      toast.success(resolved ? 'Ação marcada como resolvida!' : 'Observação atualizada!');
      setSelectedAction(null);
      setActionText('');
    } catch (error) {
      console.error('Erro ao atualizar ação:', error);
      toast.error('Erro ao salvar as alterações.');
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      <div className="flex flex-col gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
              <Filter className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Filtros de Ações</h2>
          </div>

          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Search className="w-3.5 h-3.5" />
                <label className="text-[10px] font-bold uppercase tracking-wider">Buscar Patrimônio</label>
              </div>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <Input 
                  placeholder="Patrimônio, descrição ou localidade..." 
                  className="pl-10 h-11 dark:bg-slate-950 dark:border-slate-800 dark:text-white focus-visible:ring-1 focus-visible:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 lg:flex lg:items-end gap-3 flex-wrap">
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
                    {actions.filter(a => !a.resolved).length} Pendentes
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="dark:bg-slate-800 dark:text-slate-200 border-none shadow-xl">
                  <p>Total de itens aguardando resolução.</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger render={<div />}>
                  <Badge variant="outline" className="bg-white dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400">
                    {actions.filter(a => a.resolved).length} Resolvidas
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="dark:bg-slate-800 dark:text-slate-200 border-none shadow-xl">
                  <p>Total de itens com inconformidades resolvidas.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
              <TableRow className="border-slate-100 dark:border-slate-800">
                <TableHead className="w-[150px] dark:text-slate-400">Patrimônio</TableHead>
                <TableHead className="dark:text-slate-400">Descrição / Localidade</TableHead>
                <TableHead className="w-[150px] dark:text-slate-400">Status</TableHead>
                <TableHead className="w-[150px] dark:text-slate-400">Data</TableHead>
                <TableHead className="text-right dark:text-slate-400">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedActions.length > 0 ? (
                paginatedActions.map((action) => {
                  return (
                    <TableRow key={action.id} className="group border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <TableCell className="font-mono font-bold dark:text-slate-200">{action.patrimony}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900 dark:text-slate-100">{action.description}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {action.city ? `${action.city} - ` : ''}{action.locality}
                          </span>
                          {action.notes && (
                            <span className="text-xs text-red-600 dark:text-blue-400 mt-1 italic">Obs: {action.notes}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger render={<div />}>
                            {action.resolved ? (
                              <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 border-green-200 dark:border-green-800/50 border-none">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Resolvido
                              </Badge>
                            ) : (
                              <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 border-orange-200 dark:border-orange-800/50 border-none">
                                <Clock className="w-3 h-3 mr-1" />
                                Pendente
                              </Badge>
                            )}
                          </TooltipTrigger>
                          <TooltipContent className="dark:bg-slate-800 dark:text-slate-200 border-none shadow-xl">
                            <p>{action.resolved ? 'A inconformidade deste item já foi tratada e resolvida.' : 'Item aguardando análise ou ação técnica para correção.'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 dark:text-slate-500">
                        {new Date(action.date).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger 
                            render={
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
                                onClick={() => {
                                  setSelectedAction(action);
                                  setActionText(action.notes || '');
                                }}
                              />
                            }
                          >
                            {action.resolved || isVisitor ? 'Ver Detalhes' : 'Resolver'}
                            <ExternalLink className="w-4 h-4 ml-2" />
                          </DialogTrigger>
                          <DialogContent className="max-w-md dark:bg-slate-900 border-none">
                            <DialogHeader>
                              <DialogTitle className="dark:text-white">Ação Corretiva - {action.patrimony}</DialogTitle>
                              <CardDescription className="dark:text-slate-400">{action.description}</CardDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="grid grid-cols-1 gap-4 text-sm">
                                <div className="flex flex-col gap-1 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                                  <span className="text-slate-500 dark:text-slate-500 font-bold uppercase text-[10px]">Localidade</span>
                                  <span className="font-medium dark:text-slate-200">
                                    {action.city ? `${action.city} - ` : ''}{action.locality}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="observation" className="text-xs font-bold uppercase text-slate-500 dark:text-slate-500">
                                  Observações / Ações Tomadas
                                </Label>
                                <Textarea
                                  id="observation"
                                  placeholder="Descreva as observações ou o que foi feito para corrigir este item..."
                                  className="min-h-[120px] text-sm dark:bg-slate-900 dark:border-slate-800 dark:text-white"
                                  value={actionText}
                                  onChange={(e) => setActionText(e.target.value)}
                                  disabled={isVisitor}
                                />
                              </div>

                              {action.resolved && action.resolutionDate && (
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-900/30 text-green-800 dark:text-green-400 text-xs flex gap-2">
                                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                                  <span>Resolvido em {new Date(action.resolutionDate).toLocaleString('pt-BR')}</span>
                                </div>
                              )}
                            </div>
                            {!isVisitor && (
                              <DialogFooter className="flex-col sm:flex-row gap-2">
                                <Button 
                                  variant="outline"
                                  className="flex-1 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                                  onClick={() => handleAction(false)}
                                >
                                  Salvar Observação
                                </Button>
                                {!action.resolved && (
                                  <Button 
                                    className="flex-1 bg-green-600 hover:bg-green-700 border-none"
                                    onClick={() => handleAction(true)}
                                  >
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Resolver Agora
                                  </Button>
                                )}
                              </DialogFooter>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                      <AlertCircle className="w-8 h-8 mb-2" />
                      <p>Nenhuma ação corretiva encontrada.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Mostrando {startIndex + 1} até {Math.min(startIndex + itemsPerPage, filteredActions.length)} de {filteredActions.length} registros
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-slate-400"
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
                className="h-8 w-8 p-0 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-slate-400"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
      <OverlayLoading show={isResolving} message="Registrando resolução da ação..." />
    </div>
  );
}
