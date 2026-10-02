import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { readUpload } from "@/lib/uploads";

export const runtime = "nodejs";

/** Liefert hochgeladene Bilder nur an angemeldete Benutzer aus. */
export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Nicht angemeldet", { status: 401 });
  const { path } = await ctx.params;
  const file = await readUpload(path);
  if (!file) return new NextResponse("Nicht gefunden", { status: 404 });
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "Cache-Control": "private, max-age=86400, immutable",
    },
  });
}
