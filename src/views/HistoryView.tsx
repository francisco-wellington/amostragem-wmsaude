import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  SelectValue,
} from '@/components/ui/select';
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
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InspectionSession, InspectionResult } from '../types';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { cn } from '@/lib/utils';
import { OverlayLoading } from '../components/LoadingUI';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Dialog, 
  DialogContent, 
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HistoryViewProps {
  sessions: InspectionSession[];
  onEditSession?: (session: InspectionSession) => void;
  isVisitor?: boolean;
}

export default function HistoryView({ sessions, onEditSession, isVisitor }: HistoryViewProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedSession, setSelectedSession] = useState<InspectionSession | null>(null);
  
  const sortedSessions = [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const totalPages = Math.ceil(sortedSessions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSessions = sortedSessions.slice(startIndex, startIndex + itemsPerPage);

  const exportToPDF = async (session: InspectionSession) => {
    setIsExporting(true);
    // Allow UI to update before heavy PDF work
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const doc = new jsPDF();
    const dateStr = new Date(session.date).toLocaleDateString('pt-BR');
    
    // Header
    doc.setFontSize(18);
    doc.text('Relatório de Inspeção Patrimonial', 14, 20);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Localidade: ${session.locality}`, 14, 30);
    doc.text(`Cidade: ${session.city || 'N/A'}`, 14, 36);
    doc.text(`Data: ${dateStr}`, 14, 42);
    doc.text(`Método: ${session.sampleMode.toUpperCase()}`, 14, 48);
    doc.text(`Responsável: ${session.inspectorName || 'N/A'}`, 14, 54);

    const results = Object.values(session.results);
    const conforme = results.filter(r => r.status === 'conforme').length;
    const rate = results.length > 0 ? (conforme / session.items.length) * 100 : 0;
    
    doc.text(`Conformidade: ${rate.toFixed(1)}%`, 14, 60);
    doc.text(`Status: ${!session.completed ? 'INCOMPLETO' : (rate >= 85 ? 'APROVADO' : 'REPROVADO')}`, 14, 66);

    const tableData = session.items.map((item) => {
      const result = session.results[item.Patrimônio];
      const statusText = result ? (
        result.status === 'conforme' ? 'Conforme' :
        result.status === 'nao_conforme' ? 'Não Conforme' :
        result.status === 'nao_localizado' ? 'Não Localizado' :
        'Loc. Incorreta'
      ) : 'Pendente';

      return [
        item.Patrimônio,
        item.Descrição,
        statusText,
        result?.notes || '',
        result?.evidence ? 'Sim' : 'Não'
      ];
    });

    autoTable(doc, {
      startY: 70,
      head: [['Patrimônio', 'Descrição', 'Status', 'Observações', 'Foto']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] }, // blue-600
    });

    // Add images on new pages if they exist
    const itemsWithEvidence = session.items.filter(item => session.results[item.Patrimônio]?.evidence);
    
    if (itemsWithEvidence.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.text('Anexo Fotográfico', 14, 20);
      
      let yPos = 30;
      itemsWithEvidence.forEach((item, index) => {
        const result = session.results[item.Patrimônio];
        if (result?.evidence) {
          // Check if we need a new page
          if (yPos > 240) {
            doc.addPage();
            yPos = 20;
          }

          doc.setFontSize(10);
          doc.setTextColor(0);
          doc.text(`Item: ${item.Patrimônio} - ${item.Descrição}`, 14, yPos);
          
          try {
            // Evidence is base64
            doc.addImage(result.evidence, 'JPEG', 14, yPos + 5, 60, 45);
            yPos += 60;
          } catch (e) {
            doc.text('[Erro ao carregar imagem]', 14, yPos + 10);
            yPos += 20;
          }
        }
      });
    }

    const fileName = `Relatorio_${session.locality.replace(/\s+/g, '_')}_${new Date(session.date).toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar o relatório PDF.');
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

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Histórico de Inspeções</CardTitle>
              <CardDescription>Registro completo de todas as auditorias realizadas.</CardDescription>
            </div>
            <History className="w-6 h-6 text-slate-400" />
          </div>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Localidade</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Amostra</TableHead>
              <TableHead>Conformidade</TableHead>
              <TableHead>Status Final</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSessions.length > 0 ? (
              paginatedSessions.map((session) => {
                const results = Object.values(session.results);
                const conforme = results.filter(r => r.status === 'conforme').length;
                const rate = results.length > 0 ? (conforme / results.length) * 100 : 0;
                const isApproved = rate >= 85;

                return (
                  <TableRow key={session.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium">
                          {new Date(session.date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium">{session.locality}</span>
                        </div>
                        {session.city && (
                          <span className="text-[10px] text-slate-400 font-bold uppercase ml-6">{session.city}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600 font-medium">{session.inspectorName || '---'}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {session.sampleMode} ({session.items.length})
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full", isApproved ? "bg-green-500" : "bg-red-500")} 
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold">{rate.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {!session.completed ? (
                        <Badge className="bg-amber-500 hover:bg-amber-600">
                          <Clock className="w-3 h-3 mr-1" />
                          INCOMPLETO
                        </Badge>
                      ) : isApproved ? (
                        <Badge className="bg-green-500 hover:bg-green-600">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          APROVADO
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
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
                          className="text-slate-600 hover:text-slate-700 hover:bg-slate-50"
                          onClick={() => setSelectedSession(session)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver
                        </Button>
                        {!isVisitor && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => onEditSession?.(session)}
                          >
                            <Edit3 className="w-4 h-4 mr-2" />
                            Editar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-slate-400">
                  Nenhuma inspeção encontrada no histórico.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {sortedSessions.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-50 border-t border-slate-100 gap-4">
            <div className="flex items-center gap-4">
              <div className="text-xs text-slate-500">
                Mostrando {startIndex + 1} até {Math.min(startIndex + itemsPerPage, sortedSessions.length)} de {sortedSessions.length} registros
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-slate-400">Exibir:</span>
                <Select 
                  value={itemsPerPage.toString()} 
                  onValueChange={(val) => {
                    setItemsPerPage(parseInt(val));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-7 w-[70px] text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
            )}
          </div>
        )}
      </Card>
      
      <OverlayLoading show={isExporting} message="Gerando arquivo PDF..." />

      <Dialog open={!!selectedSession} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
          {selectedSession && (
            <>
              <div className="p-6 border-b border-slate-100 shrink-0 bg-white">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                      Detalhes da Inspeção
                    </h2>
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <MapPin className="w-4 h-4" />
                      <span className="font-medium">{selectedSession.locality}</span>
                      <span className="text-slate-300">•</span>
                      <span>{selectedSession.city || 'Desconhecido'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-900">
                      {new Date(selectedSession.date).toLocaleDateString('pt-BR')}
                    </span>
                    <Badge variant="secondary" className="block mt-1 text-[10px] uppercase font-bold bg-slate-100 text-slate-600 border-none">
                      {selectedSession.sampleMode}
                    </Badge>
                  </div>
                </div>

                {/* Simplified Status Summary */}
                <div className="flex items-center gap-4 mt-6 p-3 bg-slate-50 rounded-xl">
                  {(() => {
                    const results = Object.values(selectedSession.results) as InspectionResult[];
                    const conforme = results.filter(r => r.status === 'conforme').length;
                    const total = selectedSession.items.length;
                    const verified = results.length;
                    const rate = total > 0 ? (conforme / total) * 100 : 0;
                    const nonConforme = results.filter(r => r.status !== 'conforme').length;

                    return (
                      <>
                        <div className="flex-1 px-4 border-r border-slate-200 text-center sm:text-left">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Conformidade</p>
                          <p className={cn(
                            "text-lg font-bold",
                            rate >= 85 ? "text-green-600" : "text-red-600"
                          )}>{rate.toFixed(1)}%</p>
                        </div>
                        <div className="flex-1 px-4 border-r border-slate-200 text-center sm:text-left">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Total Itens</p>
                          <p className="text-lg font-bold text-slate-900">{total}</p>
                        </div>
                        <div className="flex-1 px-4 text-center sm:text-left">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Não Conformidade</p>
                          <p className="text-lg font-bold text-amber-600">{nonConforme}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <ScrollArea className="flex-1 bg-white">
                <div className="divide-y divide-slate-50">
                  {selectedSession.items.map((item) => {
                    const result = selectedSession.results[item.Patrimônio];
                    return (
                      <div key={item.Patrimônio} className="p-4 flex items-start gap-4 hover:bg-slate-50/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-bold text-slate-900">{item.Patrimônio}</span>
                            <span className="text-[10px] text-slate-400 font-medium truncate">{item.Localização}</span>
                          </div>
                          <p className="text-xs text-slate-500 truncate mb-2">{item.Descrição}</p>
                          
                          {result?.notes && (
                            <div className="mt-2 p-2 bg-slate-50 rounded italic text-[11px] text-slate-600 border-l-2 border-slate-200 bg-quote">
                              "{result.notes}"
                            </div>
                          )}
                          
                          {result?.evidence && (
                            <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-blue-600 uppercase">
                              <Camera className="w-3 h-3" />
                              Evidência Disponível
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-2">
                          {result ? (
                            <Badge className={cn(
                              "text-[10px] font-bold uppercase border-none",
                              result.status === 'conforme' ? "bg-green-100 text-green-700 hover:bg-green-100" :
                              "bg-red-100 text-red-700 hover:bg-red-100"
                            )}>
                              {result.status.replace('_', ' ')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] uppercase text-slate-400">
                              Pendente
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Responsável</p>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">{selectedSession.inspectorName || 'Desconhecido'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedSession(null)} className="h-8">
                    Fechar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      exportToCSV(selectedSession);
                    }}
                    className="h-8 border-slate-200 text-slate-600"
                  >
                    <FileDown className="w-3 h-3 mr-2 text-slate-400" />
                    CSV
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => {
                      exportToPDF(selectedSession);
                    }}
                    className="h-8 bg-blue-600 hover:bg-blue-700"
                  >
                    <FileDown className="w-3 h-3 mr-2" />
                    PDF
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
