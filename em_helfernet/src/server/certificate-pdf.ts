// Zertifikat als PDF (A4 quer) mit QR-Code zum öffentlichen Prüf-Link.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import type { Certificate } from "@prisma/client";
import { env } from "./env";

const BRAND = "#f0500a";
const INK = "#1d2430";
const MUTED = "#5b6676";
let logoPath: string | null | undefined;
function efLogoPath(): string | null {
  if (logoPath !== undefined) return logoPath;
  try { logoPath = readFileSync(join(process.cwd(), "public/brand/ef-mark.svg"), "utf8").match(/<path[^>]*\sd="([^"]+)"/)?.[1] ?? null; } catch { logoPath = null; }
  return logoPath;
}

const day = (d: Date) => d.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric" });

export const certificateUrl = (code: string) => `${env.appUrl}/zertifikat/${code}`;

export async function renderCertificatePdf(c: Certificate): Promise<Buffer> {
  const url = certificateUrl(c.code);
  const qr = await QRCode.toBuffer(url, { margin: 1, width: 300, errorCorrectionLevel: "M", color: { dark: INK, light: "#ffffff" } });
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0, info: { Title: `Zertifikat ${c.number}`, Author: c.unitName, Producer: "HelferNet", Creator: "HelferNet" } });
  const chunks: Buffer[] = [];
  doc.on("data", (b: Buffer) => chunks.push(b));
  const done = new Promise<Buffer>((res) => doc.on("end", () => res(Buffer.concat(chunks))));
  const W = doc.page.width, H = doc.page.height;

  // Rahmen
  doc.rect(0, 0, W, 10).fill(BRAND);
  doc.rect(28, 34, W - 56, H - 62).lineWidth(0.8).strokeColor("#d9dde3").stroke();

  // Logo + Kopf
  const logo = efLogoPath();
  if (logo) {
    doc.save().translate(W / 2 - 34, 58).scale(68 / 702).path(logo).fill(BRAND, "even-odd").restore();
  }
  doc.fillColor(MUTED).font("Helvetica").fontSize(11).text(c.unitName, 0, 112, { width: W, align: "center" });
  doc.fillColor(INK).font("Helvetica-Bold").fontSize(38).text(c.revokedAt ? "Zertifikat (widerrufen)" : "Zertifikat", 0, 140, { width: W, align: "center" });
  doc.fillColor(MUTED).font("Helvetica").fontSize(13).text("Hiermit wird bescheinigt, dass", 0, 200, { width: W, align: "center" });
  doc.fillColor(INK).font("Helvetica-Bold").fontSize(28).text(c.holderName, 60, 228, { width: W - 120, align: "center" });
  doc.moveTo(W / 2 - 170, 266).lineTo(W / 2 + 170, 266).lineWidth(1).strokeColor(BRAND).stroke();
  const period = day(c.courseStartsAt) === day(c.courseEndsAt) ? `am ${day(c.courseStartsAt)}` : `vom ${day(c.courseStartsAt)} bis ${day(c.courseEndsAt)}`;
  doc.fillColor(MUTED).font("Helvetica").fontSize(13).text(`${period} erfolgreich am Lehrgang`, 0, 282, { width: W, align: "center" });
  doc.fillColor(INK).font("Helvetica-Bold").fontSize(20).text(`„${c.courseTitle}“`, 60, 304, { width: W - 120, align: "center" });
  doc.fillColor(MUTED).font("Helvetica").fontSize(13).text(c.qualificationName ? `teilgenommen und die Qualifikation „${c.qualificationName}“ erworben hat.` : "teilgenommen hat.", 60, 336, { width: W - 120, align: "center" });
  if (c.validUntil) doc.fontSize(11).text(`Gültig bis ${day(c.validUntil)}`, 0, 360, { width: W, align: "center" });

  // Fuß: Aussteller links, QR rechts
  const footY = H - 150;
  doc.fillColor(INK).font("Helvetica-Bold").fontSize(11).text(`Ausgestellt am ${day(c.issuedAt)}`, 70, footY);
  doc.font("Helvetica").fillColor(MUTED).fontSize(10);
  if (c.instructors) doc.text(`Lehrgangsleitung: ${c.instructors}`, 70, footY + 18, { width: 420 });
  doc.text(`Ausgestellt durch: ${c.issuedByName}`, 70, doc.y + 2, { width: 420 });
  doc.text(`Zertifikatsnummer: ${c.number}`, 70, doc.y + 2, { width: 420 });
  doc.image(qr, W - 70 - 92, footY - 8, { width: 92 });
  doc.fontSize(7.5).fillColor(MUTED).text("Echtheit prüfen:", W - 70 - 200, footY + 88, { width: 200, align: "right" });
  doc.text(url, W - 70 - 300, doc.y + 1, { width: 300, align: "right", link: url });
  if (c.revokedAt) {
    doc.save().rotate(-18, { origin: [W / 2, H / 2] }).fillColor("#c62828").opacity(0.18).font("Helvetica-Bold").fontSize(90).text("WIDERRUFEN", 0, H / 2 - 50, { width: W, align: "center" }).restore();
  }
  doc.end();
  return done;
}
