import { NextResponse, type NextRequest } from "next/server";
import { personalIcsByToken } from "@/server/services/calendar";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Persönlicher Abo-Feed: Authentifizierung über den geheimen Token in der URL (für Kalender-Apps ohne Login). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "?";
  if (!rateLimit(`ics:${ip}`, 120, 60_000).ok) return new NextResponse("Zu viele Anfragen", { status: 429 });
  const token = (await params).token.replace(/\.ics$/, "");
  const ics = await personalIcsByToken(token);
  if (!ics) return new NextResponse("Nicht gefunden", { status: 404 });
  return new NextResponse(ics, { headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "private, max-age=300" } });
}
