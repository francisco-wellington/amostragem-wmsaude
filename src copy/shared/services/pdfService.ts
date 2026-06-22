import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InventoryItem, InspectionSession, InspectionResult } from '../types';

const LOGO_WM_SAUDE = 'https://raw.githubusercontent.com/francisco-wellington/logos-wm/ac3c8394a54a53584815e1d98d699464508d3e10/Logo_azul_new.png';
const SIGNATURE_URL = 'https://raw.githubusercontent.com/francisco-wellington/logos-wm/5be37e1127535771706123808bcc2d017fd33f86/1.jpg';
const BACKGROUND_URL = 'https://raw.githubusercontent.com/francisco-wellington/logos-wm/c6317263abe358d9b4c1ba11792a13907388b2e0/timbrado.jpg';
// Logo Nutec - Using placeholder or checking if user can provide via props/config
const LOGO_NUTEC = ''; 

export class PdfService {
  /**
   * Converte uma imagem de URL para DataURL (Base64)
   */
  private static async getBase64FromUrl(url: string): Promise<string> {
    if (!url) return '';
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error('Error loading logo:', e);
      return '';
    }
  }

  /**
   * Gera o Termo de Devolução personalizado (Versão Simplificada)
   */
  static async generateReturnTerm(item: InventoryItem, inspectorName: string, date: string) {
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 25; // Standard safety margin
    const contentWidth = pageWidth - (margin * 2);

    // Background Image (Timbrado)
    const backgroundImg = await this.getBase64FromUrl(BACKGROUND_URL);
    if (backgroundImg) {
      try {
        doc.addImage(backgroundImg, 'JPEG', 0, 0, pageWidth, pageHeight);
      } catch (e) {
        console.error('Error adding background image:', e);
      }
    }

    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TERMO DE DEVOLUÇÃO', pageWidth / 2, 35, { align: 'center' });

    // Equipment Table
    autoTable(doc, {
      startY: 45,
      margin: { left: margin, right: margin },
      head: [['EQUIPAMENTO', 'PATRIMÔNIO', 'NÚMERO DE SÉRIE']],
      body: [[
        item.Descrição || `${item.Marca} ${item.Modelo}`,
        item.Patrimônio,
        item.Modelo || '---'
      ]],
      theme: 'grid',
      headStyles: { 
        fillColor: [240, 240, 240], 
        textColor: [0, 0, 0], 
        halign: 'center',
        lineWidth: 0.1,
        lineColor: [0, 0, 0]
      },
      bodyStyles: { 
        halign: 'center',
        lineWidth: 0.1,
        lineColor: [0, 0, 0]
      },
      styles: {
        font: 'helvetica',
        fontSize: 10,
        cellPadding: 4
      }
    });

    const currentY = (doc as any).lastAutoTable.finalY + 20;

    // Subtitle
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DECLARAÇÃO DE RECOLHIMENTO DE EQUIPAMENTOS', pageWidth / 2, currentY, { align: 'center' });
    
    // Body Text - Updated with City name
    const city = item.Cidade || 'Município';
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const bodyText = `Declaro para fins de RESPONSABILIDADE, que na data de hoje, estou devolvendo os equipamentos acima descritos, anteriormente recebido em perfeitas condições de uso. Declaro ainda que o equipamento foi utilizado exclusivamente para as atividades relacionados ao ${city}, e que zelou-se pela sua guarda e conservação durante o período de uso. Estou ciente de que a propriedade do equipamento pertence à WM SAÚDE – Apoio a Gestão de Saúde e Tecnologia do Piauí Ltda, e que o mesmo foi inspecionado e conferido para devolução em conformidade com as políticas internas de uso de equipamentos.`;
    
    const splitText = doc.splitTextToSize(bodyText, contentWidth);
    doc.text(splitText, margin, currentY + 12, { align: 'justify', maxWidth: contentWidth });

    // Date and Signature
    const dateFormatted = new Date(date).toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    const signatureY = currentY + 75;
    doc.text(`${city}-PI, ${dateFormatted}.`, pageWidth - margin, signatureY, { align: 'right' });

    doc.line(pageWidth / 2 - 40, signatureY + 30, pageWidth / 2 + 40, signatureY + 30);
    doc.text('Colaborador(a)', pageWidth / 2, signatureY + 35, { align: 'center' });
    

    // Signature Image
    const signatureImg = await this.getBase64FromUrl(SIGNATURE_URL);
    if (signatureImg) {
      try {
        // Positioned below "Colaborador(a)"
        // Centered horizontally
        const imgWidth = 100;
        const imgHeight = 25;
        doc.addImage(signatureImg, 'JPEG', (pageWidth / 2) - (imgWidth / 2), signatureY + 60, imgWidth, imgHeight);
      } catch (e) {
        console.error('Error adding signature image:', e);
      }
    }

    const fileName = `Termo_Devolucao_${item.Patrimônio}.pdf`;
    doc.save(fileName);
  }

  /**
   * Refatorado do HistoryView para centralizar a lógica de relatórios
   */
  static async generateInspectionReport(session: InspectionSession) {
    const doc = new jsPDF();
    const dateStr = new Date(session.date).toLocaleDateString('pt-BR');
    
    // Header logic (similiar to existing in HistoryView but we can improve it with the company logo)
    const logoWm = await this.getBase64FromUrl(LOGO_WM_SAUDE);
    if (logoWm) {
      doc.addImage(logoWm, 'PNG', 14, 10, 40, 12);
    }

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Inspeção Patrimonial', 14, 35);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Localidade: ${session.locality}`, 14, 45);
    doc.text(`Cidade: ${session.city || 'N/A'}`, 14, 51);
    doc.text(`Data: ${dateStr}`, 14, 57);
    doc.text(`Método: ${session.sampleMode.toUpperCase()}${session.isTabletOnly ? ' - TABLETS' : ''}`, 14, 63);
    doc.text(`Responsável: ${session.inspectorName || 'N/A'}`, 14, 69);

    const results = Object.values(session.results || {});
    const conforme = results.filter(r => r.status === 'conforme').length;
    const rate = results.length > 0 ? (conforme / session.items.length) * 100 : 0;
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Conformidade: ${rate.toFixed(1)}%`, 14, 78);
    doc.text(`Status: ${!session.completed ? 'INCOMPLETO' : (rate >= 85 ? 'APROVADO' : 'REPROVADO')}`, 14, 84);

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
        result?.notes || ''
      ];
    });

    autoTable(doc, {
      startY: 90,
      head: [['Patrimônio', 'Descrição', 'Status', 'Observações']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [11, 77, 162] }, // WM Saúde Blue
    });

    // Add images if they exist
    const itemsWithEvidence = session.items.filter(item => session.results[item.Patrimônio]?.evidence);
    if (itemsWithEvidence.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.text('Anexo Fotográfico', 14, 20);
      
      let yPos = 30;
      for (const item of itemsWithEvidence) {
        const result = session.results[item.Patrimônio];
        if (result?.evidence) {
          if (yPos > 240) {
            doc.addPage();
            yPos = 20;
          }
          doc.setFontSize(10);
          doc.text(`Item: ${item.Patrimônio} - ${item.Descrição}`, 14, yPos);
          try {
            doc.addImage(result.evidence, 'JPEG', 14, yPos + 5, 60, 45);
            yPos += 60;
          } catch (e) {
            yPos += 20;
          }
        }
      }
    }

    const fileName = `Relatorio_${session.locality.replace(/\s+/g, '_')}_${new Date(session.date).toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  }
}
