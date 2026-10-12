import { NextResponse, type NextRequest } from "next/server";
import { apiCtx, errorResponse } from "@/server/api";
import { downloadDocument } from "@/server/services/documents";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await apiCtx(req);
    const v = req.nextUrl.searchParams.get("version");
    const { data, filename, mime } = await downloadDocument(ctx, (await params).id, v ? Number(v) : undefined);
    return new NextResponse(new Uint8Array(data), { headers: {
      "content-type": mime, "content-length": String(data.length),
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "x-content-type-options": "nosniff", "cache-control": "private, no-store", "content-security-policy": "default-src 'none'; sandbox",
    } });
  } catch (e) { return errorResponse(e); }
}
