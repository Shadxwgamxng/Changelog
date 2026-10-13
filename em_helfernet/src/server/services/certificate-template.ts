// Zertifikat-Vorlage: laden/speichern (nur Systemadministration), Bilder prüfen.
import type { Certificate, CertificateTemplate } from "@prisma/client";
import { prisma } from "../db";
import { audit } from "../audit";
import { badRequest, forbidden } from "../errors";
import { sniffMatches } from "../storage";
import type { Ctx } from "../context";
import { CERT_FONTS, DEFAULT_CERT_TEMPLATE, SIGNATURE_FONTS, SIGNATURE_MODES, isHexColor } from "@/lib/certificate-template";

export type TemplateData = Omit<CertificateTemplate, "id" | "updatedAt">;
const ID = "default";
export const MAX_TEMPLATE_IMAGE = 3 * 1024 * 1024;

export async function getCertificateTemplate(): Promise<TemplateData> {
  const t = await prisma.certificateTemplate.findUnique({ where: { id: ID } });
  if (t) return t;
  return { ...DEFAULT_CERT_TEMPLATE, logo: null, logoMime: null, background: null, backgroundMime: null, sig1Image: null, sig1Mime: null, sig2Image: null, sig2Mime: null };
}

export interface UploadedImage { mime: string; data: Buffer }
export type ImageSlot = "logo" | "background" | "sig1" | "sig2";
export interface TemplateInput {
  orgName?: string; title: string; body: string; footerText?: string; accentColor: string; textColor: string; font: string; logoMode: string;
  showFrame: boolean; showQr: boolean; sig1Mode?: string; sig2Mode?: string; signatureFont?: string; signatureInk?: string; signatureForm?: string; sig1Label?: string; sig1Name?: string; sig2Label?: string; sig2Name?: string;
  images?: Partial<Record<ImageSlot, UploadedImage | null>>; // null = entfernen
}

function checkImage(slot: string, img: UploadedImage) {
  if (img.data.length > MAX_TEMPLATE_IMAGE) throw badRequest(`Bild „${slot}“ ist größer als 3 MB.`);
  if (img.mime !== "image/png" && img.mime !== "image/jpeg") throw badRequest(`Bild „${slot}“: nur PNG oder JPG.`);
  if (!sniffMatches(img.mime, img.data)) throw badRequest(`Bild „${slot}“: Der Inhalt passt nicht zum Dateityp.`);
}

const opt = (v: string | undefined, max: number) => (v?.trim() ? v.trim().slice(0, max) : null);

export async function saveCertificateTemplate(ctx: Ctx, input: TemplateInput) {
  if (!ctx.all) throw forbidden("Die Zertifikat-Vorlage kann nur die Systemadministration ändern.");
  const title = input.title.trim();
  if (!title || title.length > 80) throw badRequest("Bitte einen Titel (bis 80 Zeichen) angeben.");
  if (!input.body.trim() || input.body.length > 3000) throw badRequest("Bitte einen Text (bis 3000 Zeichen) angeben.");
  if (!isHexColor(input.accentColor) || !isHexColor(input.textColor)) throw badRequest("Farben bitte als #RRGGBB angeben.");
  if (!(input.font in CERT_FONTS)) throw badRequest("Unbekannte Schrift.");
  if (!["STANDARD", "EIGENES", "KEINES"].includes(input.logoMode)) throw badRequest("Unbekannte Logo-Einstellung.");
  const sig1Mode = input.sig1Mode ?? "AUTO", sig2Mode = input.sig2Mode ?? "AUTO";
  const signatureFont = input.signatureFont ?? "GREAT_VIBES", signatureInk = input.signatureInk ?? "#1a3a8a", signatureForm = input.signatureForm ?? "KURZ";
  if (!(sig1Mode in SIGNATURE_MODES) || !(sig2Mode in SIGNATURE_MODES)) throw badRequest("Unbekannte Unterschrift-Einstellung.");
  if (!(signatureFont in SIGNATURE_FONTS)) throw badRequest("Unbekannte Handschrift.");
  if (!isHexColor(signatureInk)) throw badRequest("Tintenfarbe bitte als #RRGGBB angeben.");
  if (signatureForm !== "VOLL" && signatureForm !== "KURZ") throw badRequest("Unbekannte Namensform.");
  const data: Record<string, unknown> = {
    orgName: opt(input.orgName, 120), title, body: input.body.replace(/\r\n?/g, "\n"), footerText: opt(input.footerText, 300),
    accentColor: input.accentColor, textColor: input.textColor, font: input.font, logoMode: input.logoMode, showFrame: input.showFrame, showQr: input.showQr,
    sig1Mode, sig2Mode, signatureFont, signatureInk, signatureForm,
    sig1Label: opt(input.sig1Label, 60), sig1Name: opt(input.sig1Name, 120), sig2Label: opt(input.sig2Label, 60), sig2Name: opt(input.sig2Name, 120),
  };
  for (const [slot, img] of Object.entries(input.images ?? {}) as [ImageSlot, UploadedImage | null][]) {
    const [field, mimeField] = slot === "logo" ? ["logo", "logoMime"] : slot === "background" ? ["background", "backgroundMime"] : [`${slot}Image`, `${slot}Mime`];
    if (img) checkImage(slot, img);
    data[field] = img ? img.data : null;
    data[mimeField] = img ? img.mime : null;
  }
  const current = await getCertificateTemplate();
  const merged = { ...current, ...data } as TemplateData;
  if (merged.logoMode === "EIGENES" && !merged.logo) throw badRequest("Für „eigenes Logo“ bitte ein Bild hochladen.");
  if (merged.sig1Mode === "BILD" && !merged.sig1Image) throw badRequest("Unterschrift links: Für „eigenes Bild“ bitte ein Bild hochladen.");
  if (merged.sig2Mode === "BILD" && !merged.sig2Image) throw badRequest("Unterschrift rechts: Für „eigenes Bild“ bitte ein Bild hochladen.");
  await prisma.certificateTemplate.upsert({ where: { id: ID }, create: { id: ID, ...merged }, update: data });
  await audit(ctx, { action: "certificate.template", entityType: "CertificateTemplate", entityId: ID, summary: "Zertifikat-Vorlage geändert" });
}

export async function resetCertificateTemplate(ctx: Ctx) {
  if (!ctx.all) throw forbidden();
  await prisma.certificateTemplate.deleteMany({ where: { id: ID } });
  await audit(ctx, { action: "certificate.template_reset", entityType: "CertificateTemplate", entityId: ID, summary: "Zertifikat-Vorlage auf Standard zurückgesetzt" });
}

/** Beispiel-Zertifikat für die Vorschau. */
export function sampleCertificate(): Certificate {
  const now = new Date();
  const start = new Date(now.getTime() - 3 * 86_400_000), end = new Date(now.getTime() - 2 * 86_400_000);
  return {
    id: "vorschau", number: `HN-${now.getFullYear()}-00042`, code: "VORSCHAU0000", participantId: null, courseId: null, helperQualificationId: null,
    holderName: "Max Mustermann", courseTitle: "Sanitätshelfer-Lehrgang", qualificationName: "Sanitätshelfer", unitName: "Musterorganisation",
    courseStartsAt: start, courseEndsAt: end, issuedAt: now, validUntil: new Date(end.getTime() + 730 * 86_400_000), issuedByName: "Anna Ausbilder",
    instructors: "Anna Ausbilder, Ben Beispiel", revokedAt: null, revokeReason: null,
  };
}
