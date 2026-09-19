import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

/**
 * Merge multiple PDF files into a single unified PDF
 */
export async function mergePdfFiles(files: File[]): Promise<Blob> {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const mergedBytes = await mergedPdf.save();
  return new Blob([mergedBytes as any], { type: "application/pdf" });
}

/**
 * Split a PDF into page ranges or multiple files
 */
export async function splitPdfFile(
  file: File,
  ranges: { startPage: number; endPage: number }[]
): Promise<{ filename: string; blob: Blob; pageCount: number }[]> {
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer);
  const totalPages = sourcePdf.getPageCount();
  const results: { filename: string; blob: Blob; pageCount: number }[] = [];

  const baseName = file.name.replace(/\.[^/.]+$/, "");

  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    const start = Math.max(1, Math.min(r.startPage, totalPages)) - 1;
    const end = Math.max(start + 1, Math.min(r.endPage, totalPages));

    const pageIndices: number[] = [];
    for (let p = start; p < end; p++) {
      pageIndices.push(p);
    }

    if (pageIndices.length > 0) {
      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);
      copiedPages.forEach((page) => newPdf.addPage(page));

      const pdfBytes = await newPdf.save();
      results.push({
        filename: `${baseName}_part_${i + 1}_pages_${start + 1}-${end}.pdf`,
        blob: new Blob([pdfBytes as any], { type: "application/pdf" }),
        pageCount: pageIndices.length,
      });
    }
  }

  return results;
}

/**
 * Convert plain text or markdown to clean, readable PDF
 */
export async function textToPdf(title: string, content: string): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const fontSize = 11;
  const margin = 50;
  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const maxLineWidth = pageWidth - margin * 2;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // Header Title
  page.drawText(title || "Document", {
    x: margin,
    y: y - 18,
    size: 20,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.15),
  });
  y -= 45;

  // Line rule
  page.drawLine({
    start: { x: margin, y: y },
    end: { x: pageWidth - margin, y: y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.85),
  });
  y -= 25;

  const lines = content.split("\n");
  for (const rawLine of lines) {
    const isHeading = rawLine.startsWith("#");
    const cleanText = rawLine.replace(/^#+\s*/, "");
    const currentFont = isHeading ? boldFont : font;
    const currentSize = isHeading ? 14 : fontSize;
    const lineHeight = isHeading ? 22 : 16;

    // Simple word wrapping
    const words = cleanText.split(" ");
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const textWidth = currentFont.widthOfTextAtSize(testLine, currentSize);

      if (textWidth > maxLineWidth) {
        if (y < margin + 40) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
        page.drawText(currentLine, {
          x: margin,
          y,
          size: currentSize,
          font: currentFont,
          color: rgb(0.15, 0.15, 0.15),
        });
        y -= lineHeight;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      if (y < margin + 40) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      page.drawText(currentLine, {
        x: margin,
        y,
        size: currentSize,
        font: currentFont,
        color: rgb(0.15, 0.15, 0.15),
      });
      y -= lineHeight;
    }

    if (rawLine.trim() === "") {
      y -= 8;
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as any], { type: "application/pdf" });
}

/**
 * Generate a clean standard Word (.docx compatible) file from text/extracted document
 */
export function createWordDocumentBlob(title: string, textContent: string): Blob {
  // We produce a standard HTML-based Word document with MSO markup that opens cleanly in MS Word and Google Docs
  const safeTitle = escapeXml(title || "Document");
  const paragraphs = textContent
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "<p>&nbsp;</p>";
      if (trimmed.startsWith("# ")) {
        return `<h1 style="font-family: Calibri, sans-serif; font-size: 22pt; color: #1E293B; margin-top: 18pt; margin-bottom: 6pt;">${escapeXml(trimmed.replace("# ", ""))}</h1>`;
      }
      if (trimmed.startsWith("## ")) {
        return `<h2 style="font-family: Calibri, sans-serif; font-size: 16pt; color: #334155; margin-top: 14pt; margin-bottom: 4pt;">${escapeXml(trimmed.replace("## ", ""))}</h2>`;
      }
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        return `<li style="font-family: Calibri, sans-serif; font-size: 11pt; line-height: 1.5; color: #1E293B;">${escapeXml(trimmed.substring(2))}</li>`;
      }
      return `<p style="font-family: Calibri, sans-serif; font-size: 11pt; line-height: 1.5; color: #1E293B; margin-bottom: 8pt;">${escapeXml(trimmed)}</p>`;
    })
    .join("\n");

  const docHtml = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset="utf-8">
<title>${safeTitle}</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
@page {
  size: 8.5in 11.0in;
  margin: 1.0in 1.0in 1.0in 1.0in;
  mso-header-margin: .5in;
  mso-footer-margin: .5in;
}
body {
  font-family: Calibri, Arial, sans-serif;
  font-size: 11pt;
  line-height: 1.5;
  color: #1E293B;
}
table {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 12pt;
}
th, td {
  border: 1px solid #CBD5E1;
  padding: 6pt 10pt;
  text-align: left;
}
th {
  background-color: #F1F5F9;
  font-weight: bold;
}
</style>
</head>
<body>
<div style="mso-element:header" id="h1">
  <p style="text-align:right; font-size:9pt; color:#64748B;">Generated with OmniConverter File Suite</p>
</div>
<h1 style="font-family: Calibri, sans-serif; font-size: 24pt; color: #0F172A; border-bottom: 2px solid #E2E8F0; padding-bottom: 6pt; margin-bottom: 16pt;">${safeTitle}</h1>
${paragraphs}
</body>
</html>`;

  return new Blob([docHtml], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
