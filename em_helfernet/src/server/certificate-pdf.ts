// Zertifikat als PDF (DIN A4 hochkant) nach der frei konfigurierbaren Vorlage, mit QR-Code zum Prüf-Link.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import type { Certificate } from "@prisma/client";
import { env } from "./env";
import { certificateVars, fillPlaceholders, renderBody, type CertFont } from "@/lib/certificate-template";
import { getCertificateTemplate, type TemplateData } from "./services/certificate-template";

const buf = (b: Uint8Array) => Buffer.from(b);
const MUTED = "#5b6676";
const FONTS: Record<CertFont, { regular: string; bold: string }> = {
  Helvetica: { regular: "Helvetica", bold: "Helvetica-Bold" },
  Times: { regular: "Times-Roman", bold: "Times-Bold" },
  Courier: { regular: "Courier", bold: "Courier-Bold" },
};

let efPath: string | null | undefined;
function efLogoPath(): string | null {
  if (efPath !== undefined) return efPath;
  try { efPath = readFileSync(join(process.cwd(), "public/brand/ef-mark.svg"), "utf8").match(/<path[^>]*\sd="([^"]+)"/)?.[1] ?? null; } catch { efPath = null; }
  return efPath;
}

export const certificateUrl = (code: string) => `${env.appUrl}/zertifikat/${code}`;

export async function renderCertificatePdf(c: Certificate, template?: TemplateData): Promise<Buffer> {
  const t = template ?? (await getCertificateTemplate());
  const f = FONTS[(t.font as CertFont)] ?? FONTS.Helvetica;
  const vars = certificateVars(c, t.orgName);
  const url = certificateUrl(c.code);
  const doc = new PDFDocument({ size: "A4", layout: "portrait", margin: 0, info: { Title: `${t.title} ${c.number}`, Author: vars.organisation ?? c.unitName, Producer: "HelferNet", Creator: "HelferNet" } });
  const chunks: Buffer[] = [];
  doc.on("data", (b: Buffer) => chunks.push(b));
  const done = new Promise<Buffer>((res) => doc.on("end", () => res(Buffer.concat(chunks))));
  const W = doc.page.width, H = doc.page.height; // 595 × 842
  const M = 56; // Innenrand

  // Hintergrund (vollflächig) und Rahmen
  if (t.background) doc.image(buf(t.background), 0, 0, { width: W, height: H });
  if (t.showFrame) {
    doc.rect(0, 0, W, 10).fill(t.accentColor);
    doc.rect(24, 30, W - 48, H - 54).lineWidth(0.8).strokeColor("#d9dde3").stroke();
  }

  // Logo
  let y = 64;
  if (t.logoMode === "STANDARD" && efLogoPath()) {
    const w = 84;
    doc.save().translate(W / 2 - w / 2, y).scale(w / 702).path(efLogoPath()!).fill(t.accentColor, "even-odd").restore();
    y += 64;
  } else if (t.logoMode === "EIGENES" && t.logo) {
    doc.image(buf(t.logo), W / 2 - 90, y, { fit: [180, 90], align: "center", valign: "center" });
    y += 100;
  }
  // Kopf
  doc.fillColor(MUTED).font(f.regular).fontSize(11).text(vars.organisation ?? "", M, y + 6, { width: W - 2 * M, align: "center" });
  y = doc.y + 18;
  doc.fillColor(t.textColor).font(f.bold).fontSize(40).text(c.revokedAt ? `${t.title} (widerrufen)` : t.title, M, y, { width: W - 2 * M, align: "center" });
  y = doc.y + 6;
  doc.moveTo(W / 2 - 40, y).lineTo(W / 2 + 40, y).lineWidth(2).strokeColor(t.accentColor).stroke();
  y += 28;

  // Text – vertikal mittig zwischen Kopf und Unterschriften
  const sizes = { h1: 28, h2: 18, h3: 14, text: 13.5 } as const;
  const lines = renderBody(t.body, vars);
  const sigTop = H - 330;
  const measure = (l: (typeof lines)[number]) => {
    if (l.style === "gap") return 16;
    doc.font(l.style === "text" ? f.regular : f.bold).fontSize(sizes[l.style]);
    return doc.heightOfString(l.text, { width: W - 2 * M, align: "center" }) + (l.style === "h1" ? 22 : 6);
  };
  const total = lines.reduce((sum, l) => sum + measure(l), 0);
  y = Math.max(y, y + (sigTop - y - total) / 2);
  for (const line of lines) {
    if (line.style === "gap") { y += 16; continue; }
    const bold = line.style !== "text";
    doc.font(bold ? f.bold : f.regular).fontSize(sizes[line.style]).fillColor(line.style === "text" ? MUTED : t.textColor);
    doc.text(line.text, M, y, { width: W - 2 * M, align: "center" });
    y = doc.y + (line.style === "h1" ? 8 : 6);
    if (line.style === "h1") { doc.moveTo(W / 2 - 150, y).lineTo(W / 2 + 150, y).lineWidth(0.8).strokeColor(t.accentColor).stroke(); y += 14; }
  }

  // Unterschriften
  const sigs = [
    { label: t.sig1Label, name: t.sig1Name, img: t.sig1Image },
    { label: t.sig2Label, name: t.sig2Name, img: t.sig2Image },
  ].filter((s) => s.label || s.name || s.img);
  const sigY = H - 250;
  const colW = 200;
  sigs.forEach((s, i) => {
    const x = sigs.length === 1 ? W / 2 - colW / 2 : i === 0 ? M + 10 : W - M - 10 - colW;
    if (s.img) doc.image(buf(s.img), x + 20, sigY - 58, { fit: [colW - 40, 52], align: "center", valign: "bottom" });
    doc.moveTo(x, sigY).lineTo(x + colW, sigY).lineWidth(0.8).strokeColor(t.textColor).stroke();
    const name = s.name ? fillPlaceholders(s.name, vars).trim() : "";
    if (name) doc.fillColor(t.textColor).font(f.bold).fontSize(10.5).text(name, x, sigY + 6, { width: colW, align: "center" });
    if (s.label) doc.fillColor(MUTED).font(f.regular).fontSize(9).text(s.label, x, name ? doc.y + 1 : sigY + 6, { width: colW, align: "center" });
  });

  // Fuß: Ort/Datum + Nummer links, QR rechts, Fußtext unten mittig
  const footY = H - 150;
  doc.fillColor(t.textColor).font(f.bold).fontSize(10).text(`Ausgestellt am ${vars.ausgestellt_am}`, M, footY + 12, { width: 300 });
  doc.fillColor(MUTED).font(f.regular).fontSize(9).text(`Zertifikatsnummer: ${c.number}`, M, doc.y + 3, { width: 300 });
  if (t.showQr) {
    const qr = await QRCode.toBuffer(url, { margin: 1, width: 280, errorCorrectionLevel: "M", color: { dark: "#1d2430", light: "#ffffff" } });
    doc.image(qr, W - M - 72, footY - 4, { width: 72 });
    doc.fontSize(7).fillColor(MUTED).text("Echtheit prüfen:", W - M - 260, footY + 72, { width: 260, align: "right" });
    doc.text(url, W - M - 300, doc.y + 1, { width: 300, align: "right", link: url });
  } else {
    doc.fontSize(8).fillColor(MUTED).text(`Prüfung: ${url}`, M, doc.y + 3, { width: 400, link: url });
  }
  if (t.footerText) doc.fillColor(MUTED).font(f.regular).fontSize(8).text(fillPlaceholders(t.footerText, vars), M, H - 52, { width: W - 2 * M, align: "center" });

  if (c.revokedAt) {
    doc.save().rotate(-35, { origin: [W / 2, H / 2] }).fillColor("#c62828").opacity(0.16).font("Helvetica-Bold").fontSize(80).text("WIDERRUFEN", 0, H / 2 - 40, { width: W, align: "center" }).restore();
  }
  doc.end();
  return done;
}
