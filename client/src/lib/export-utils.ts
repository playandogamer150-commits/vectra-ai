import yaml from 'js-yaml';
import { jsPDF } from 'jspdf';

interface ExportData {
  prompt?: string;
  seed?: string;
  aspectRatio?: string;
  profile?: string;
  blueprint?: string;
  filters?: Record<string, string>;
  imageUrls?: string[];
  generatedAt: string;
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

export function exportToJSON(data: ExportData, filename: string = 'promptforge-export'): void {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  downloadBlob(blob, `${filename}.json`);
}

export function exportToYAML(data: ExportData, filename: string = 'promptforge-export'): void {
  const yamlContent = yaml.dump(data, { lineWidth: -1 });
  const blob = new Blob([yamlContent], { type: 'text/yaml' });
  downloadBlob(blob, `${filename}.yaml`);
}

export async function exportToPDF(
  data: ExportData, 
  filename: string = 'promptforge-export',
  translations: { title: string; prompt: string; seed: string; aspectRatio: string; profile: string; blueprint: string; filters: string; generatedAt: string; images: string; }
): Promise<void> {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let yPosition = 20;

  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(translations.title, margin, yPosition);
  yPosition += 15;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100);
  pdf.text(`${translations.generatedAt}: ${data.generatedAt}`, margin, yPosition);
  yPosition += 15;

  pdf.setTextColor(0);
  
  if (data.prompt) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(translations.prompt, margin, yPosition);
    yPosition += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    const promptLines = pdf.splitTextToSize(data.prompt, maxWidth);
    pdf.text(promptLines, margin, yPosition);
    yPosition += promptLines.length * 5 + 10;
  }

  if (data.seed) {
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${translations.seed}:`, margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(data.seed, margin + 30, yPosition);
    yPosition += 10;
  }

  if (data.aspectRatio) {
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${translations.aspectRatio}:`, margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(data.aspectRatio, margin + 50, yPosition);
    yPosition += 10;
  }

  if (data.profile) {
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${translations.profile}:`, margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(data.profile, margin + 30, yPosition);
    yPosition += 10;
  }

  if (data.blueprint) {
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${translations.blueprint}:`, margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(data.blueprint, margin + 35, yPosition);
    yPosition += 10;
  }

  if (data.filters && Object.keys(data.filters).length > 0) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(translations.filters, margin, yPosition);
    yPosition += 8;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    Object.entries(data.filters).forEach(([key, value]) => {
      pdf.text(`• ${key}: ${value}`, margin + 5, yPosition);
      yPosition += 6;
    });
    yPosition += 5;
  }

  if (data.imageUrls && data.imageUrls.length > 0) {
    if (yPosition > 250) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(translations.images, margin, yPosition);
    yPosition += 10;

    for (let i = 0; i < data.imageUrls.length; i++) {
      try {
        const imgData = await loadImageAsBase64(data.imageUrls[i]);
        const imgWidth = 80;
        const imgHeight = 80;
        
        if (yPosition + imgHeight > pdf.internal.pageSize.getHeight() - 20) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 10;
      } catch (error) {
        console.error('Failed to load image for PDF:', error);
        pdf.setFont('helvetica', 'italic');
        pdf.text(`[Image ${i + 1}: Failed to load]`, margin, yPosition);
        yPosition += 10;
      }
    }
  }

  pdf.save(`${filename}.pdf`);
}

async function loadImageAsBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
