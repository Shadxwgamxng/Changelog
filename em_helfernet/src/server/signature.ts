// Erzeugt eine handschriftliche Unterschrift aus einem Namen (freie Handschrift-Schriften, SIL OFL 1.1).
import { join } from "node:path";
import { seedOf, signatureText, type SignatureFont } from "@/lib/certificate-template";

const FONT_FILES: Record<SignatureFont, { pkg: string; size: number }> = {
  GREAT_VIBES: { pkg: "great-vibes", size: 30 },
  SAINT_DELAFIELD: { pkg: "mrs-saint-delafield", size: 40 },
  MUELLERHOFF: { pkg: "herr-von-muellerhoff", size: 40 },
};

function fontPath(font: SignatureFont): string {
  const f = FONT_FILES[font] ?? FONT_FILES.GREAT_VIBES;
  return join(process.cwd(), "node_modules", "@fontsource", f.pkg, "files", `${f.pkg}-latin-400-normal.woff`);
}

/**
 * Zeichnet die Unterschrift so, dass sie auf der Linie bei `lineY` (Breite `width` ab `x`) „aufsitzt“.
 * Neigung, Versatz und Schwung ergeben sich stabil aus dem Namen – dieselbe Person unterschreibt immer gleich.
 */
export function drawSignature(doc: PDFKit.PDFDocument, o: { name: string; x: number; lineY: number; width: number; font: SignatureFont; ink: string; form: "VOLL" | "KURZ" }) {
  const text = signatureText(o.name, o.form);
  if (!text) return;
  const r = seedOf(text);
  const r2 = seedOf(text + "#");
  const fontName = `sig-${o.font}`;
  doc.registerFont(fontName, fontPath(o.font));
  let size = (FONT_FILES[o.font] ?? FONT_FILES.GREAT_VIBES).size;
  doc.font(fontName).fontSize(size);
  const maxW = o.width - 24;
  while (doc.widthOfString(text, { wordSpacing: 5 }) > maxW && size > 14) doc.fontSize(--size);
  const w = doc.widthOfString(text, { wordSpacing: 5 });
  const x = o.x + (o.width - w) / 2 + (r - 0.5) * 18;
  // Grundlinie der Schrift knapp über der Unterschriftslinie
  const ascender = ((doc as unknown as { _font?: { ascender?: number } })._font?.ascender ?? 800) / 1000 * size;
  const baseline = o.lineY - 5;
  const top = baseline - ascender;
  const angle = -1.5 - r2 * 4.5; // leicht ansteigend
  doc.save().rotate(angle, { origin: [x, baseline] });
  doc.fillColor(o.ink).text(text, x, top, { lineBreak: false, wordSpacing: 5 });
  // Schwung unter dem Namen (Form abhängig vom Namen), beginnt unter dem ersten Buchstaben
  const dip = 4 + r * 5;
  const sx = x + w * (0.04 + r2 * 0.12);
  doc.moveTo(sx, baseline + 5)
    .bezierCurveTo(sx + w * 0.35, baseline + 7 + dip, x + w * (0.85 + r * 0.1), baseline + 7, x + w + 14 + r2 * 12, baseline - 5 - dip * 0.4)
    .lineWidth(0.8 + r * 0.5).strokeColor(o.ink).stroke();
  doc.restore();
}
