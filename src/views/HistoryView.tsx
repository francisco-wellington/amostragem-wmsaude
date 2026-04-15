import React from 'react';
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
  History, 
  CheckCircle2, 
  XCircle, 
  Clock,
  FileDown,
  Calendar,
  MapPin,
  Edit3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InspectionSession } from '../types';
import Papa from 'papaparse';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface HistoryViewProps {
  sessions: InspectionSession[];
  onEditSession?: (session: InspectionSession) => void;
  isVisitor?: boolean;
}

export default function HistoryView({ sessions, onEditSession, isVisitor }: HistoryViewProps) {
  const sortedSessions = [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const exportToPDF = (session: InspectionSession) => {
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
            {sortedSessions.length > 0 ? (
              sortedSessions.map((session) => {
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
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => exportToPDF(session)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <FileDown className="w-4 h-4 mr-2" />
                          PDF
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => exportToCSV(session)}
                        >
                          <FileDown className="w-4 h-4 mr-2" />
                          CSV
                        </Button>
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
      </Card>
    </div>
  );
}
