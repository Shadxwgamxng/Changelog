import type { NextRequest } from "next/server";
import { apiCtx, assertSameOrigin, errorResponse, json } from "@/server/api";
import { badRequest, notFound } from "@/server/errors";
import { dispatch } from "@/server/rest";

export const dynamic = "force-dynamic";
const MAX_BODY = 1_000_000;

async function handle(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    assertSameOrigin(req);
    const ctx = await apiCtx(req);
    let body: unknown = undefined;
    if (!["GET", "HEAD"].includes(req.method)) {
      const text = await req.text();
      if (text.length > MAX_BODY) throw badRequest("Anfrage zu groß.");
      if (text) { try { body = JSON.parse(text); } catch { throw badRequest("Ungültiges JSON."); } }
    }
    const r = await dispatch(req.method, (await params).path, { ctx, q: req.nextUrl.searchParams, body });
    if (!r) throw notFound("Unbekannter Endpunkt.");
    return json(r.data, r.status);
  } catch (e) { return errorResponse(e); }
}
export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
