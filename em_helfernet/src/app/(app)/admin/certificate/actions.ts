"use server";
import { action, checked, str } from "@/server/action";
import { resetCertificateTemplate, saveCertificateTemplate, type ImageSlot, type UploadedImage } from "@/server/services/certificate-template";

async function image(f: FormData, slot: ImageSlot): Promise<UploadedImage | null | undefined> {
  if (checked(f, `${slot}Remove`)) return null;
  const file = f.get(`${slot}File`);
  if (!(file instanceof File) || file.size === 0) return undefined;
  return { mime: file.type, data: Buffer.from(await file.arrayBuffer()) };
}

export const saveTemplateAction = action(async (ctx, f) => {
  const images: Partial<Record<ImageSlot, UploadedImage | null>> = {};
  for (const slot of ["logo", "background", "sig1", "sig2"] as const) {
    const img = await image(f, slot);
    if (img !== undefined) images[slot] = img;
  }
  await saveCertificateTemplate(ctx, {
    orgName: str(f, "orgName"), title: str(f, "title"), body: String(f.get("body") ?? ""), footerText: str(f, "footerText"),
    accentColor: str(f, "accentColor"), textColor: str(f, "textColor"), font: str(f, "font"), logoMode: str(f, "logoMode"),
    showFrame: checked(f, "showFrame"), showQr: checked(f, "showQr"),
    sig1Mode: str(f, "sig1Mode"), sig2Mode: str(f, "sig2Mode"), signatureFont: str(f, "signatureFont"), signatureInk: str(f, "signatureInk"), signatureForm: str(f, "signatureForm"),
    sig1Label: str(f, "sig1Label"), sig1Name: str(f, "sig1Name"), sig2Label: str(f, "sig2Label"), sig2Name: str(f, "sig2Name"), images,
  });
  return "Vorlage gespeichert. Die Vorschau zeigt den neuen Stand.";
});
export const resetTemplateAction = action(async (ctx) => { await resetCertificateTemplate(ctx); return "Auf Standard zurückgesetzt."; });
