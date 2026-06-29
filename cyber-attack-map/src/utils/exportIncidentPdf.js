import { jsPDF } from 'jspdf';
import siteIcon from '../assets/images/icon.webp';
import { SLARK } from '../theme/slarkColors.js';

const MARGIN = 44;
const HEADER_H = 78;
const FOOTER_H = 40;

function rgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

async function loadLogoPngDataUrl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const size = 128;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('canvas'));
        return;
      }
      ctx.drawImage(img, 0, 0, size, size);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = src;
  });
}

function drawPageChrome(pdf, pageWidth, pageHeight, pageNum, totalPages, logoDataUrl, labels) {
  const primary = rgb(SLARK.primary);
  const navy = rgb(SLARK.darkNavy);

  pdf.setFillColor(navy.r, navy.g, navy.b);
  pdf.rect(0, 0, pageWidth, HEADER_H, 'F');
  pdf.setFillColor(primary.r, primary.g, primary.b);
  pdf.rect(0, HEADER_H - 3, pageWidth, 3, 'F');

  const textX = logoDataUrl ? MARGIN + 46 : MARGIN;
  if (logoDataUrl) {
    pdf.addImage(logoDataUrl, 'PNG', MARGIN, 16, 34, 34);
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.setTextColor(248, 250, 252);
  pdf.text(labels.brandName.toUpperCase(), textX, 32);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(148, 163, 184);
  pdf.text(labels.reportTitle.toUpperCase(), textX, 46);

  pdf.setFontSize(8);
  pdf.text(labels.generatedAt, pageWidth - MARGIN, 38, { align: 'right' });

  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.6);
  pdf.line(MARGIN, pageHeight - FOOTER_H, pageWidth - MARGIN, pageHeight - FOOTER_H);

  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(8.5);
  pdf.setTextColor(primary.r, primary.g, primary.b);
  pdf.text(labels.footerBy, pageWidth / 2, pageHeight - 20, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(107, 114, 128);
  pdf.text(`${labels.page} ${pageNum} / ${totalPages}`, pageWidth - MARGIN, pageHeight - 20, { align: 'right' });
}

/**
 * @param {{
 *   attack: object;
 *   labels: Record<string, string>;
 *   logText: string;
 *   readout: string;
 *   activity: string;
 *   categoryLabel: string;
 * }} opts
 */
export async function exportIncidentPdf({ attack, labels, logText, readout, activity, categoryLabel }) {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;
  const bottomLimit = pageHeight - FOOTER_H - 12;
  const primary = rgb(SLARK.primary);

  let logoDataUrl = null;
  try {
    logoDataUrl = await loadLogoPngDataUrl(siteIcon);
  } catch {
    logoDataUrl = null;
  }

  let y = HEADER_H + 18;

  const ensureSpace = (need) => {
    if (y + need > bottomLimit) {
      pdf.addPage();
      y = HEADER_H + 18;
    }
  };

  const writeTitleBlock = () => {
    ensureSpace(56);
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(MARGIN, y, contentWidth, 52, 6, 6, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(31, 41, 55);
    pdf.text(labels.title, MARGIN + 14, y + 22);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text(labels.subtitle, MARGIN + 14, y + 38);

    pdf.setFillColor(primary.r, primary.g, primary.b);
    pdf.roundedRect(pageWidth - MARGIN - 88, y + 12, 74, 20, 4, 4, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    pdf.text(categoryLabel.toUpperCase(), pageWidth - MARGIN - 51, y + 25, { align: 'center' });

    y += 64;
  };

  const writeSection = (title, rows) => {
    const rowH = 26;
    const sectionH = 28 + rows.length * rowH + 10;
    ensureSpace(sectionH + 8);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(primary.r, primary.g, primary.b);
    pdf.text(title.toUpperCase(), MARGIN, y);
    y += 10;

    pdf.setDrawColor(226, 232, 240);
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(MARGIN, y, contentWidth, sectionH - 18, 5, 5, 'FD');

    let rowY = y + 16;
    for (let i = 0; i < rows.length; i++) {
      const [label, value] = rows[i];
      if (i > 0) {
        pdf.setDrawColor(241, 245, 249);
        pdf.line(MARGIN + 10, rowY - 8, MARGIN + contentWidth - 10, rowY - 8);
      }
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text(label.toUpperCase(), MARGIN + 12, rowY);

      pdf.setFont('courier', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(31, 41, 55);
      const lines = pdf.splitTextToSize(String(value || '—'), contentWidth - 130);
      pdf.text(lines[0] || '—', MARGIN + 120, rowY);
      rowY += rowH;
    }
    y += sectionH - 6;
  };

  const writeMonoBlock = (title, text) => {
    ensureSpace(40);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(primary.r, primary.g, primary.b);
    pdf.text(title.toUpperCase(), MARGIN, y);
    y += 12;

    pdf.setFont('courier', 'normal');
    pdf.setFontSize(7.5);
    const lines = pdf.splitTextToSize(String(text || '—'), contentWidth - 24);
    const padX = MARGIN + 12;
    const lineH = 10;
    let i = 0;

    while (i < lines.length) {
      ensureSpace(48);
      const blockStart = y;
      const maxLines = Math.max(1, Math.floor((bottomLimit - blockStart - 18) / lineH));
      const chunk = lines.slice(i, i + maxLines);
      const blockH = chunk.length * lineH + 18;

      pdf.setFillColor(15, 23, 42);
      pdf.setDrawColor(51, 65, 85);
      pdf.roundedRect(MARGIN, blockStart, contentWidth, blockH, 5, 5, 'FD');

      pdf.setTextColor(226, 232, 240);
      let lineY = blockStart + 14;
      for (const line of chunk) {
        pdf.text(line, padX, lineY);
        lineY += lineH;
      }
      y = blockStart + blockH + 14;
      i += chunk.length;
    }
  };

  writeTitleBlock();

  writeSection(labels.overview, [
    [labels.attacker, labels.attackerValue],
    [labels.region, labels.regionValue],
    [labels.time, labels.timeValue],
    [labels.geoLocation, labels.geoLocationValue],
    [labels.geoCoordinates, labels.geoCoordinatesValue],
  ]);

  writeSection(labels.requestBlock, [
    [labels.method, labels.methodValue],
    [labels.path, labels.pathValue],
    ['User-Agent', labels.userAgentValue],
    ['X-Forwarded-For', labels.forwardedForValue],
  ]);

  writeSection(labels.detectionBlock, [
    [labels.activity, activity],
    [labels.target, labels.targetValue],
    [labels.detectType, labels.detectTypeValue],
    [labels.confidence, labels.confidenceValue],
    [labels.mitigation, labels.mitigationValue],
    [labels.blocked, labels.blockedValue],
  ]);

  writeSection(labels.responseBlock, [
    [labels.statusCode, labels.statusCodeValue],
    [labels.responseTime, labels.responseTimeValue],
    [labels.requests1m, labels.requests1mValue],
  ]);

  writeSection(labels.intelBlock, [
    ['ISP', labels.ispValue],
    [labels.blocked, labels.blockedValue],
  ]);

  writeMonoBlock(labels.logTitle, logText);
  writeMonoBlock(labels.technical, readout);

  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    drawPageChrome(pdf, pageWidth, pageHeight, i, totalPages, logoDataUrl, labels);
  }

  const safeId = String(attack.requestId || attack.incidentId || attack.id || 'incident').replace(/[^\w.-]+/g, '_');
  pdf.save(`slark-incident-${safeId}.pdf`);
}
