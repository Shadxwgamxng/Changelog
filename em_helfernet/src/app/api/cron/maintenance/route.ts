import { NextResponse, type NextRequest } from "next/server";
import { safeEqual } from "@/lib/crypto";
import { runMaintenance } from "@/server/services/maintenance";

export const dynamic = "force-dynamic";

/** Täglicher Wartungslauf per HTTP (z. B. externer Cron): Authorization: Bearer $CRON_SECRET */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || secret.length < 16 || !safeEqual(given, secret)) return NextResponse.json({ error: "Nicht erlaubt" }, { status: 403 });
  return NextResponse.json(await runMaintenance());
}
