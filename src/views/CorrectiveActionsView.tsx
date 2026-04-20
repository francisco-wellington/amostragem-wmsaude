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
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Search,
  ExternalLink,
  Camera,
  ChevronLeft,
  ChevronRight
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
  const itemsPerPage = 8;
  
  const filteredActions = actions.filter(action => {
    const searchLower = searchTerm.toLowerCase();
    return (
      action.patrimony.toLowerCase().includes(searchLower) ||
      action.description.toLowerCase().includes(searchLower) ||
      action.locality.toLowerCase().includes(searchLower)
    );
  }).sort((a, b) => (a.resolved === b.resolved ? 0 : a.resolved ? 1 : -1));

  const totalPages = Math.ceil(filteredActions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedActions = filteredActions.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when filtering
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Buscar por patrimônio, descrição ou localidade..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-white">
            {actions.filter(a => !a.resolved).length} Pendentes
          </Badge>
          <Badge variant="outline" className="bg-white">
            {actions.filter(a => a.resolved).length} Resolvidas
          </Badge>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[150px]">Patrimônio</TableHead>
              <TableHead>Descrição / Localidade</TableHead>
              <TableHead className="w-[150px]">Status</TableHead>
              <TableHead className="w-[150px]">Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedActions.length > 0 ? (
              paginatedActions.map((action) => {
                return (
                  <TableRow key={action.id} className="group">
                    <TableCell className="font-mono font-bold">{action.patrimony}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">{action.description}</span>
                        <span className="text-xs text-slate-500">{action.locality}</span>
                        {action.notes && (
                          <span className="text-xs text-blue-600 mt-1 italic">Obs: {action.notes}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {action.resolved ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Resolvido
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200">
                          <Clock className="w-3 h-3 mr-1" />
                          Pendente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(action.date).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger 
                          render={
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedAction(action);
                                setActionText(action.notes || '');
                              }}
                            >
                              {action.resolved || isVisitor ? 'Ver Detalhes' : 'Resolver'}
                              <ExternalLink className="w-4 h-4 ml-2" />
                            </Button>
                          }
                        />
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Ação Corretiva - {action.patrimony}</DialogTitle>
                            <CardDescription>{action.description}</CardDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="grid grid-cols-1 gap-4 text-sm">
                              <div className="flex flex-col gap-1 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-slate-500 font-bold uppercase text-[10px]">Localidade</span>
                                <span className="font-medium">{action.locality}</span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="observation" className="text-xs font-bold uppercase text-slate-500">
                                Observações / Ações Tomadas
                              </Label>
                              <Textarea
                                id="observation"
                                placeholder="Descreva as observações ou o que foi feito para corrigir este item..."
                                className="min-h-[120px] text-sm"
                                value={actionText}
                                onChange={(e) => setActionText(e.target.value)}
                                disabled={isVisitor}
                              />
                            </div>

                            {action.resolved && action.resolutionDate && (
                              <div className="p-3 bg-green-50 rounded-lg border border-green-100 text-green-800 text-xs flex gap-2">
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                <span>Resolvido em {new Date(action.resolutionDate).toLocaleString('pt-BR')}</span>
                              </div>
                            )}
                          </div>
                          {!isVisitor && (
                            <DialogFooter className="flex-col sm:flex-row gap-2">
                              <Button 
                                variant="outline"
                                className="flex-1"
                                onClick={() => handleAction(false)}
                              >
                                Salvar Observação
                              </Button>
                              {!action.resolved && (
                                <Button 
                                  className="flex-1 bg-green-600 hover:bg-green-700"
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
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mb-2" />
                    <p>Nenhuma ação corretiva encontrada.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 bg-slate-50 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              Mostrando {startIndex + 1} até {Math.min(startIndex + itemsPerPage, filteredActions.length)} de {filteredActions.length} registros
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-xs font-bold text-slate-700 min-w-[3rem] text-center">
                Pág. {currentPage} de {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
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
