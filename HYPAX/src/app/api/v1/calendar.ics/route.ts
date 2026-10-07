import { NextResponse, type NextRequest } from "next/server";
import { apiCtx, errorResponse } from "@/server/api";
import { CALENDAR_TYPES, exportCalendarIcs, type CalendarType } from "@/server/services/calendar";
import { startOfBerlinDay } from "@/lib/dates";

export const dynamic = "force-dynamic";

/** Kalender-Export (iCalendar) der aktuell gefilterten Ansicht – erfordert Anmeldung. */
export async function GET(req: NextRequest) {
  try {
    const ctx = await apiCtx(req);
    const q = req.nextUrl.searchParams;
    const day = (v: string | null, d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v ?? "") ? v! : d);
    const today = new Date().toISOString().slice(0, 10);
    const from = startOfBerlinDay(day(q.get("from"), today));
    const to = new Date(startOfBerlinDay(day(q.get("to"), new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10))).getTime() + 86_399_000);
    const types = q.getAll("t").filter((t): t is CalendarType => (CALENDAR_TYPES as readonly string[]).includes(t));
    const ics = await exportCalendarIcs(ctx, { from, to: new Date(Math.min(to.getTime(), from.getTime() + 400 * 86_400_000)), types, unitId: q.get("unit") ?? undefined, mine: q.get("mine") === "1" });
    return new NextResponse(ics, { headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": 'attachment; filename="hypax-kalender.ics"', "cache-control": "private, no-store" } });
  } catch (e) { return errorResponse(e); }
}
