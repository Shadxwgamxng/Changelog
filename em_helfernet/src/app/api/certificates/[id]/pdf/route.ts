import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME } from "@/server/env";
import { ctxFromToken } from "@/server/auth";
import { HttpError } from "@/server/errors";
import { certificateForDownload } from "@/server/services/courses";
import { renderCertificatePdf } from "@/server/certificate-pdf";
import { audit } from "@/server/audit";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await ctxFromToken((await cookies()).get(COOKIE_NAME)?.value);
  if (!ctx) return NextResponse.json({ error: "Bitte melde dich an." }, { status: 401 });
  try {
    const cert = await certificateForDownload(ctx, (await params).id);
    const pdf = await renderCertificatePdf(cert);
    await audit(ctx, { action: "certificate.download", entityType: "Certificate", entityId: cert.id, summary: `Zertifikat ${cert.number} heruntergeladen` });
    return new NextResponse(new Uint8Array(pdf), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="Zertifikat-${cert.number}.pdf"`, "cache-control": "private, no-store" } });
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    return NextResponse.json({ error: e instanceof HttpError ? e.message : "Fehler" }, { status });
  }
}
