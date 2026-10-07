// Tabellenexport: CSV, Excel (xlsx) und PDF.
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { toCsv } from "@/lib/csv";

export type ExportFormat = "csv" | "xlsx" | "pdf";
export interface Table { title: string; subtitle?: string; header: string[]; rows: (string | number | null)[][]; footer?: string }

export const FORMATS: Record<ExportFormat, { mime: string; ext: string }> = {
  csv: { mime: "text/csv; charset=utf-8", ext: "csv" },
  xlsx: { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ext: "xlsx" },
  pdf: { mime: "application/pdf", ext: "pdf" },
};

export function isFormat(f: string): f is ExportFormat { return f in FORMATS; }

export async function exportTable(format: ExportFormat, t: Table): Promise<Buffer> {
  if (format === "csv") return Buffer.from(toCsv(t.header, t.rows));
  if (format === "xlsx") return xlsx(t);
  return pdf(t);
}

async function xlsx(t: Table): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "HYPAX";
  const ws = wb.addWorksheet(t.title.slice(0, 30).replace(/[\\/?*[\]:]/g, " "));
  ws.addRow(t.header);
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0500A" } };
  for (const r of t.rows) {
    // Text, der wie eine Formel aussieht, als reinen Text ablegen (Formel-Injektion)
    ws.addRow(r.map((c) => (typeof c === "string" && /^[=+\-@]/.test(c) ? `'${c}` : c)));
  }
  ws.columns.forEach((col, i) => {
    const max = Math.max(t.header[i]?.length ?? 8, ...t.rows.slice(0, 200).map((r) => String(r[i] ?? "").length));
    col.width = Math.min(60, Math.max(10, max + 2));
  });
  ws.views = [{ state: "frozen", ySplit: 1 }];
  return Buffer.from(await wb.xlsx.writeBuffer());
}

function pdf(t: Table): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: t.header.length > 5 ? "landscape" : "portrait", margin: 36, info: { Title: t.title, Producer: "HYPAX", Creator: "HYPAX" } });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = doc.page.margins.left, usable = doc.page.width - left - doc.page.margins.right;
    doc.fillColor("#cc3f00").font("Helvetica-Bold").fontSize(16).text(t.title, left, doc.y);
    doc.fillColor("#4d586a").font("Helvetica").fontSize(9).text([t.subtitle, `Erstellt am ${new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}`].filter(Boolean).join(" · "));
    doc.moveDown(0.8);

    // Spaltenbreite proportional zur Textlänge, mit Mindestbreite
    const lens = t.header.map((h, i) => Math.max(h.length, ...t.rows.slice(0, 100).map((r) => String(r[i] ?? "").length), 4));
    const total = lens.reduce((a, b) => a + Math.min(b, 40), 0);
    const widths = lens.map((l) => Math.max(40, (Math.min(l, 40) / total) * usable));
    const scale = usable / widths.reduce((a, b) => a + b, 0);
    const w = widths.map((x) => x * scale);

    const drawRow = (cells: string[], bold: boolean, shade: boolean) => {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(8.5);
      const h = Math.max(...cells.map((c, i) => doc.heightOfString(c, { width: w[i] - 6 }))) + 6;
      if (doc.y + h > doc.page.height - doc.page.margins.bottom - 20) { doc.addPage(); drawRow(t.header, true, true); }
      const y = doc.y;
      if (shade) doc.rect(left, y, usable, h).fill(bold ? "#cc3f00" : "#f1f3f6");
      doc.fillColor(bold ? "#ffffff" : "#141a26");
      let x = left;
      cells.forEach((c, i) => { doc.text(c, x + 3, y + 3, { width: w[i] - 6 }); x += w[i]; });
      doc.y = y + h;
    };
    drawRow(t.header, true, true);
    t.rows.forEach((r, idx) => drawRow(r.map((c) => (c == null ? "" : String(c))), false, idx % 2 === 1));
    if (!t.rows.length) { doc.fillColor("#6b7788").font("Helvetica-Oblique").text("Keine Daten im gewählten Zeitraum.", left, doc.y + 6); }
    if (t.footer) { doc.moveDown(); doc.fillColor("#384255").font("Helvetica-Bold").fontSize(9).text(t.footer, left); }
    doc.end();
  });
}
