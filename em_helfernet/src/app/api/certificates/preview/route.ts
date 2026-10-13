import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME } from "@/server/env";
import { ctxFromToken } from "@/server/auth";
import { renderCertificatePdf } from "@/server/certificate-pdf";
import { sampleCertificate } from "@/server/services/certificate-template";

export const dynamic = "force-dynamic";

/** Vorschau mit Beispieldaten nach der gespeicherten Vorlage (nur Systemadministration). */
export async function GET(req: Request) {
  const ctx = await ctxFromToken((await cookies()).get(COOKIE_NAME)?.value);
  if (!ctx?.all) return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  const c = sampleCertificate();
  if (new URL(req.url).searchParams.get("widerrufen")) Object.assign(c, { revokedAt: new Date(), revokeReason: "Beispiel" });
  const pdf = await renderCertificatePdf(c);
  return new NextResponse(new Uint8Array(pdf), { headers: { "content-type": "application/pdf", "content-disposition": 'inline; filename="Zertifikat-Vorschau.pdf"', "cache-control": "no-store" } });
}
