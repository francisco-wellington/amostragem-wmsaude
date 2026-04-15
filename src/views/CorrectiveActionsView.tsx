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
  Camera
} from 'lucide-react';
import { CorrectiveAction, InventoryItem } from '../types';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CorrectiveActionsViewProps {
  actions: CorrectiveAction[];
  inventory: InventoryItem[];
  onUpdateAction: (action: CorrectiveAction) => void;
}

export default function CorrectiveActionsView({ actions, inventory, onUpdateAction }: CorrectiveActionsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<CorrectiveAction | null>(null);
  const [actionText, setActionText] = useState('');

  const filteredActions = actions.filter(action => {
    const searchLower = searchTerm.toLowerCase();
    return (
      action.patrimony.toLowerCase().includes(searchLower) ||
      action.description.toLowerCase().includes(searchLower) ||
      action.locality.toLowerCase().includes(searchLower)
    );
  }).sort((a, b) => (a.resolved === b.resolved ? 0 : a.resolved ? 1 : -1));

  const handleResolve = (action: CorrectiveAction) => {
    onUpdateAction({
      ...action,
      resolved: true,
      resolutionDate: new Date().toISOString()
    });
    setSelectedAction(null);
    setActionText('');
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
            {filteredActions.length > 0 ? (
              filteredActions.map((action) => {
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
                              }}
                            >
                              {action.resolved ? 'Ver Detalhes' : 'Resolver'}
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
                              <div className="flex flex-col gap-1">
                                <span className="text-slate-500 font-bold uppercase text-[10px]">Localidade</span>
                                <span>{action.locality}</span>
                              </div>
                              {action.notes && (
                                <div className="flex flex-col gap-1 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                  <span className="text-blue-500 font-bold uppercase text-[10px]">Observação da Inspeção</span>
                                  <span className="text-blue-800 italic">"{action.notes}"</span>
                                </div>
                              )}
                            </div>

                            {action.resolved && action.resolutionDate && (
                              <div className="p-3 bg-green-50 rounded-lg border border-green-100 text-green-800 text-xs flex gap-2">
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                <span>Resolvido em {new Date(action.resolutionDate).toLocaleString('pt-BR')}</span>
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            {!action.resolved && (
                              <Button 
                                className="w-full bg-blue-600 hover:bg-blue-700"
                                onClick={() => handleResolve(action)}
                              >
                                Marcar como Resolvido
                              </Button>
                            )}
                          </DialogFooter>
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
      </Card>
    </div>
  );
}
