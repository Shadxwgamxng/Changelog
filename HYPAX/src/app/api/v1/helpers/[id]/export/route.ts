import { NextResponse, type NextRequest } from "next/server";
import { apiCtx, errorResponse } from "@/server/api";
import { exportHelperData } from "@/server/services/helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await apiCtx(req);
    const id = (await params).id;
    const data = await exportHelperData(ctx, id);
    return new NextResponse(JSON.stringify(data, null, 2), { headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="datenauskunft-${id}.json"`, "cache-control": "private, no-store" } });
  } catch (e) { return errorResponse(e); }
}
