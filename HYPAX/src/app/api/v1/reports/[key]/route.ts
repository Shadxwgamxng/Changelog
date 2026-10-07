import { NextResponse, type NextRequest } from "next/server";
import { apiCtx, errorResponse } from "@/server/api";
import { exportReport, REPORT_KEYS, type ReportKey } from "@/server/services/reports";
import { isFormat } from "@/server/export";
import { berlinParts, parseDateOnly } from "@/lib/dates";
import { badRequest } from "@/server/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  try {
    const ctx = await apiCtx(req);
    const { key } = await params;
    const q = req.nextUrl.searchParams;
    const format = q.get("format") ?? "csv";
    if (!(REPORT_KEYS as readonly string[]).includes(key) || !isFormat(format)) throw badRequest("Ungültiger Bericht oder Format.");
    const y = berlinParts(new Date()).y;
    const from = parseDateOnly(q.get("from") ?? "") ?? parseDateOnly(`${y}-01-01`)!;
    const to = parseDateOnly(q.get("to") ?? "") ?? parseDateOnly(new Date().toISOString().slice(0, 10))!;
    const r = await exportReport(ctx, key as ReportKey, { from, to, unitId: q.get("unit") || undefined }, format);
    return new NextResponse(new Uint8Array(r.buffer), { headers: { "content-type": r.mime, "content-disposition": `attachment; filename="${r.filename}"`, "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
  } catch (e) { return errorResponse(e); }
}
