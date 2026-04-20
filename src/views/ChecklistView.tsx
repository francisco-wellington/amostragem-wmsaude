import React, { useState, useRef } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  XCircle, 
  MapPin, 
  Camera, 
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Save,
  CheckSquare,
  Package,
  Eye,
  User
} from 'lucide-react';
import { 
  InspectionSession, 
  InspectionStatus, 
  InspectionResult 
} from '../types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OverlayLoading } from '../components/LoadingUI';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ChecklistViewProps {
  session: InspectionSession | null;
  onUpdateSession: (session: InspectionSession) => void;
  onCompleteSession: (session: InspectionSession) => void;
  onCancelSession: () => void;
}

export default function ChecklistView({ session, onUpdateSession, onCompleteSession, onCancelSession }: ChecklistViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!session) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center">
        <Package className="w-16 h-16 text-slate-200 mb-4" />
        <h3 className="text-xl font-bold text-slate-900">Nenhuma inspeção ativa</h3>
        <p className="text-slate-500 mt-2">Inicie uma nova amostragem para começar a verificação.</p>
      </div>
    );
  }

  const handleFinalize = async () => {
    if (!session) return;
    setIsFinalizing(true);
    try {
      await onCompleteSession(session);
    } catch (error) {
      console.error('Erro ao finalizar:', error);
      toast.error('Ocorreu um erro ao salvar a inspeção.');
    } finally {
      setIsFinalizing(false);
    }
  };

  const currentItem = session.items[currentIndex];
  const currentResult = session.results[currentItem.Patrimônio];
  const totalItems = session.items.length;
  const verifiedItems = Object.keys(session.results).length;
  const progress = (verifiedItems / totalItems) * 100;

  const handleStatusChange = (status: InspectionStatus) => {
    const newResults = { ...session.results };
    
    newResults[currentItem.Patrimônio] = {
      ...newResults[currentItem.Patrimônio],
      itemId: currentItem.Patrimônio,
      status,
      timestamp: new Date().toISOString()
    };

    onUpdateSession({ ...session, results: newResults });
  };

  const handleNotesChange = (notes: string) => {
    const newResults = { ...session.results };
    newResults[currentItem.Patrimônio] = {
      ...newResults[currentItem.Patrimônio],
      itemId: currentItem.Patrimônio,
      notes,
      timestamp: new Date().toISOString()
    };
    onUpdateSession({ ...session, results: newResults });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const newResults = { ...session.results };
      newResults[currentItem.Patrimônio] = {
        ...newResults[currentItem.Patrimônio],
        itemId: currentItem.Patrimônio,
        evidence: base64String,
        timestamp: new Date().toISOString()
      };
      onUpdateSession({ ...session, results: newResults });
      toast.success('Foto anexada com sucesso!');
    };
    reader.readAsDataURL(file);
  };

  const nextItem = () => {
    if (currentIndex < totalItems - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsSummaryOpen(true);
    }
  };

  const prevItem = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const isComplete = verifiedItems === totalItems;

  const getStatusColor = (status?: InspectionStatus) => {
    switch (status) {
      case 'conforme': return 'bg-green-500';
      case 'nao_conforme': return 'bg-red-500';
      case 'nao_localizado': return 'bg-slate-700';
      case 'localizacao_incorreta': return 'bg-orange-500';
      default: return 'bg-slate-200';
    }
  };

  const getStatusLabel = (status: InspectionStatus) => {
    switch (status) {
      case 'conforme': return 'Conforme';
      case 'nao_conforme': return 'Não Conforme';
      case 'nao_localizado': return 'Não Localizado';
      case 'localizacao_incorreta': return 'Localização Incorreta';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header & Progress */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{session.locality}</h2>
            <p className="text-sm text-slate-500">
              {session.sampleMode === 'aleatoria' && 'Amostragem Aleatória (30%)'}
              {session.sampleMode === 'completo' && 'Inspeção Completa (100%)'}
              {session.sampleMode === 'manual' && 'Seleção Manual'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-2xl font-bold text-blue-600">{verifiedItems}</span>
              <span className="text-slate-400 font-medium"> / {totalItems}</span>
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Itens Verificados</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-red-500 border-red-200 hover:bg-red-50"
              onClick={() => setIsCancelDialogOpen(true)}
            >
              Cancelar
            </Button>
          </div>
        </div>
        <Progress value={progress} className="h-2 bg-slate-200" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Item List Sidebar */}
        <Card className="lg:col-span-1 border-none shadow-sm bg-white overflow-hidden flex flex-col h-[300px] lg:h-[600px]">
          <CardHeader className="py-4 border-b border-slate-50 shrink-0">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Lista da Amostra</CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-2 space-y-1">
              {session.items.map((item, index) => (
                <button
                  key={item.Patrimônio}
                  onClick={() => setCurrentIndex(index)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left",
                    currentIndex === index ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200" : "hover:bg-slate-50 text-slate-600"
                  )}
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    getStatusColor(session.results[item.Patrimônio]?.status)
                  )} />
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-xs font-bold truncate">{item.Patrimônio}</span>
                    <span className="text-[10px] opacity-70 truncate">{item.Descrição}</span>
                  </div>
                  {session.results[item.Patrimônio] && (
                    <CheckSquare className="w-4 h-4 ml-auto text-blue-500 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Active Item Form */}
        <Card className="lg:col-span-2 border-none shadow-lg bg-white overflow-hidden flex flex-col">
          <div className={cn("h-1 w-full", getStatusColor(currentResult?.status))} />
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className="font-mono">{currentItem.Patrimônio}</Badge>
              <span className="text-xs text-slate-400">Item {currentIndex + 1} de {totalItems}</span>
            </div>
            <CardTitle className="text-xl leading-tight">{currentItem.Descrição}</CardTitle>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
              <div className="flex items-center gap-2 text-slate-500">
                <User className="w-4 h-4 text-blue-500" />
                <span className="text-sm">Responsável: <strong>{currentItem['RESPONSÁVEL'] || currentItem['Responsável'] || 'Não informado'}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <MapPin className="w-4 h-4 text-blue-500" />
                <span className="text-sm">Localização Esperada: <strong>{currentItem.Localização || 'Não informada'}</strong></span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Status da Verificação</label>
              <div className="grid grid-cols-2 gap-3">
                {(['conforme', 'nao_conforme', 'nao_localizado', 'localizacao_incorreta'] as InspectionStatus[]).map((status) => (
                  <Button
                    key={status}
                    variant={currentResult?.status === status ? 'default' : 'outline'}
                    className={cn(
                      "h-auto py-4 flex flex-col gap-1 items-center justify-center text-center",
                      currentResult?.status === status && status === 'conforme' && "bg-green-600 hover:bg-green-700",
                      currentResult?.status === status && status === 'nao_conforme' && "bg-red-600 hover:bg-red-700",
                      currentResult?.status === status && status === 'nao_localizado' && "bg-slate-800 hover:bg-slate-900",
                      currentResult?.status === status && status === 'localizacao_incorreta' && "bg-orange-600 hover:bg-orange-700"
                    )}
                    onClick={() => handleStatusChange(status)}
                  >
                    {status === 'conforme' && <CheckCircle2 className="w-5 h-5 mb-1" />}
                    {status === 'nao_conforme' && <XCircle className="w-5 h-5 mb-1" />}
                    {status === 'nao_localizado' && <Eye className="w-5 h-5 mb-1" />}
                    {status === 'localizacao_incorreta' && <MapPin className="w-5 h-5 mb-1" />}
                    <span className="text-xs font-bold">{getStatusLabel(status)}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Observações</Label>
              <Textarea 
                placeholder="Digite observações relevantes sobre este item..."
                value={currentResult?.notes || ''}
                onChange={(e) => handleNotesChange(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Evidência Fotográfica (Opcional)</Label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all",
                  currentResult?.evidence ? "border-green-200 bg-green-50" : "border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                )}
              >
                {currentResult?.evidence ? (
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-inner">
                    <img src={currentResult.evidence} alt="Evidência" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Camera className="text-white w-8 h-8" />
                      <span className="text-white text-xs font-bold ml-2">Trocar Foto</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-white rounded-full shadow-sm text-slate-400">
                      <Camera className="w-8 h-8" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-700">Tirar ou Anexar Foto</p>
                      <p className="text-xs text-slate-500 mt-1">Clique para capturar evidência</p>
                    </div>
                  </>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  capture="environment"
                  onChange={handleFileUpload} 
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="p-6 border-t border-slate-50 flex justify-between bg-slate-50/50">
            <Button variant="ghost" onClick={prevItem} disabled={currentIndex === 0}>
              <ChevronLeft className="w-5 h-5 mr-2" />
              Anterior
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 px-8"
              onClick={nextItem}
              disabled={!currentResult}
            >
              {currentIndex === totalItems - 1 ? 'Revisar e Finalizar' : 'Próximo Item'}
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Summary Dialog */}
      <Dialog open={isSummaryOpen} onOpenChange={setIsSummaryOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Resumo da Inspeção</DialogTitle>
            <CardDescription>Verifique os resultados antes de finalizar a auditoria.</CardDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase font-bold">Total Verificado</p>
                  <p className="text-2xl font-bold">{verifiedItems} / {totalItems}</p>
                </div>
                {(() => {
                  const conforme = Object.values(session.results).filter(r => r.status === 'conforme').length;
                  const rate = (conforme / totalItems) * 100;
                  return (
                    <div className={cn("p-4 rounded-xl border", rate >= 85 ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100")}>
                      <p className="text-xs text-slate-500 uppercase font-bold">Conformidade</p>
                      <p className={cn("text-2xl font-bold", rate >= 85 ? "text-green-600" : "text-red-600")}>{rate.toFixed(1)}%</p>
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-700 uppercase tracking-wider">Detalhamento</p>
                <ScrollArea className="h-[300px] border rounded-xl bg-white">
                  <div className="divide-y">
                    {session.items.map((item) => {
                      const res = session.results[item.Patrimônio];
                      return (
                        <div key={item.Patrimônio} className="flex flex-col p-3 bg-white">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold">{item.Patrimônio}</span>
                              <span className="text-[10px] text-slate-500 truncate max-w-[200px] md:max-w-[350px]">{item.Descrição}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              {res?.evidence && <Camera className="w-4 h-4 text-blue-500" />}
                              <Badge className={cn("text-[10px]", getStatusColor(res?.status))}>
                                {res ? getStatusLabel(res.status) : 'Pendente'}
                              </Badge>
                            </div>
                          </div>
                          {res?.notes && (
                            <p className="text-[10px] text-slate-600 mt-1 italic border-l-2 border-slate-200 pl-2">
                              Obs: {res.notes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setIsSummaryOpen(false)}>Voltar</Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              disabled={!isComplete || isFinalizing}
              onClick={handleFinalize}
            >
              <Save className="w-4 h-4 mr-2" />
              Finalizar e Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <OverlayLoading show={isFinalizing} message="Finalizando e registrando inspeção..." />

      {/* Cancel Confirmation Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Inspeção?</DialogTitle>
            <CardDescription>
              Tem certeza que deseja cancelar esta inspeção? Todo o progresso desta sessão será perdido.
            </CardDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>Continuar Inspeção</Button>
            <Button variant="destructive" onClick={onCancelSession}>Sim, Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
