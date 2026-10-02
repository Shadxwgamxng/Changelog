import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, LayoutGrid, List } from "lucide-react";
import type { EventType } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { dayKey, fmtDateLong, fmtMonthYear, fmtTime, localToDate } from "@/lib/dates";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { AttendanceBadge, EventStatusBadge } from "@/components/features/badges";
import { pickEnum, pickString } from "@/components/ui/filter-bar";
import { listEvents, type EventListItem } from "@/server/queries/events";

export const metadata: Metadata = { title: "Kalender" };

const TYPE_STYLES: Record<EventType, { chip: string; dot: string }> = {
  SPIELTAG: { chip: "border-accent-600/60 bg-accent-900/70 text-accent-300", dot: "bg-accent-400" },
  TRAINING: { chip: "border-info/40 bg-info/10 text-info", dot: "bg-info" },
  BESPRECHUNG: { chip: "border-warn/40 bg-warn/10 text-warn", dot: "bg-warn" },
  SONSTIGES: { chip: "border-line bg-elevated text-muted", dot: "bg-subtle" },
};

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/** Reine Kalenderarithmetik auf "YYYY-MM-DD"-Schlüsseln (unabhängig von Zeitzonen). */
const keyToUtc = (key: string) => Date.parse(`${key}T00:00:00Z`);
const utcToKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const addKeyDays = (key: string, n: number) => utcToKey(keyToUtc(key) + n * 86_400_000);
const monthParam = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function CalendarPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const sp = await searchParams;
  const view = pickEnum(sp.view, ["month", "list"] as const) ?? "month";
  const todayKey = dayKey(new Date());
  const m = /^(\d{4})-(\d{2})$/.exec(pickString(sp.m, 7) ?? "");
  let year = m ? Number(m[1]) : Number(todayKey.slice(0, 4));
  let month = m ? Number(m[2]) : Number(todayKey.slice(5, 7));
  if (month < 1 || month > 12 || year < 2000 || year > 2100) {
    year = Number(todayKey.slice(0, 4));
    month = Number(todayKey.slice(5, 7));
  }

  const firstKey = `${year}-${String(month).padStart(2, "0")}-01`;
  const weekdayOfFirst = (new Date(keyToUtc(firstKey)).getUTCDay() + 6) % 7; // Montag = 0
  const gridStart = addKeyDays(firstKey, -weekdayOfFirst);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const weeks = Math.ceil((weekdayOfFirst + daysInMonth) / 7);
  const gridEnd = addKeyDays(gridStart, weeks * 7);

  const events = await listEvents(user.id, { from: localToDate(`${gridStart}T00:00`)!, to: localToDate(`${gridEnd}T00:00`)! });
  const byDay = new Map<string, EventListItem[]>();
  for (const e of events) {
    const startKey = dayKey(e.startsAt);
    const endKey = e.endsAt ? dayKey(e.endsAt) : startKey;
    for (let k = startKey, guard = 0; k <= endKey && guard < 31; k = addKeyDays(k, 1), guard++) {
      byDay.set(k, [...(byDay.get(k) ?? []), e]);
    }
  }

  const prev = month === 1 ? monthParam(year - 1, 12) : monthParam(year, month - 1);
  const next = month === 12 ? monthParam(year + 1, 1) : monthParam(year, month + 1);
  const monthLabel = fmtMonthYear(localToDate(`${firstKey}T12:00`)!);
  const href = (params: { m?: string; view?: string }) => `/calendar?m=${params.m ?? monthParam(year, month)}&view=${params.view ?? view}`;
  const monthEvents = events.filter((e) => dayKey(e.startsAt).startsWith(monthParam(year, month)));

  const list = (
    <div className="space-y-3">
      {monthEvents.length === 0 ? (
        <Card>
          <EmptyState title="Keine Termine in diesem Monat" />
        </Card>
      ) : (
        monthEvents.map((e) => (
          <Link key={e.id} href={`/events/${e.id}`} className="panel flex items-start gap-4 p-4 transition-colors hover:border-accent-600/60">
            <div className="w-14 shrink-0 text-center">
              <p className="font-display text-3xl font-semibold leading-none">{dayKey(e.startsAt).slice(8)}</p>
              <p className="label-caps mt-1">{new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", month: "short" }).format(e.startsAt)}</p>
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <Badge className={TYPE_STYLES[e.type].chip}>{EVENT_TYPE_LABELS[e.type]}</Badge>
                <EventStatusBadge status={e.effectiveStatus} />
                {e.mine && <AttendanceBadge status={e.mine} />}
              </div>
              <p className={cn("font-semibold", e.effectiveStatus === "CANCELLED" && "line-through opacity-60")}>{e.title}</p>
              <p className="text-sm text-muted">
                {fmtDateLong(e.startsAt)} · {fmtTime(e.startsAt)} · {e.location}
              </p>
            </div>
          </Link>
        ))
      )}
    </div>
  );

  return (
    <>
      <PageHeader
        eyebrow="Planung"
        title="Kalender"
        actions={
          <div className="flex rounded-md border border-line bg-surface p-0.5" role="group" aria-label="Ansicht">
            <Link href={href({ view: "month" })} aria-current={view === "month"} className={cn("flex items-center gap-1.5 rounded px-3 py-1.5 text-sm", view === "month" ? "bg-elevated text-fg" : "text-muted hover:text-fg")}>
              <LayoutGrid className="h-4 w-4" /> Monat
            </Link>
            <Link href={href({ view: "list" })} aria-current={view === "list"} className={cn("flex items-center gap-1.5 rounded px-3 py-1.5 text-sm", view === "list" ? "bg-elevated text-fg" : "text-muted hover:text-fg")}>
              <List className="h-4 w-4" /> Liste
            </Link>
          </div>
        }
      />

      <div className="mb-4 flex items-center justify-between gap-2">
        <Link href={href({ m: prev })} className={buttonClass("secondary", "md", "px-3")} aria-label="Vorheriger Monat">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold uppercase tracking-wide">{monthLabel}</h2>
          <Link href={href({ m: monthParam(Number(todayKey.slice(0, 4)), Number(todayKey.slice(5, 7))) })} className="text-xs text-accent-300 hover:underline">
            Heute
          </Link>
        </div>
        <Link href={href({ m: next })} className={buttonClass("secondary", "md", "px-3")} aria-label="Nächster Monat">
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {view === "list" ? (
        list
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="grid grid-cols-7 border-b border-line bg-elevated/50">
              {WEEKDAYS.map((d) => (
                <div key={d} className="label-caps px-2 py-2 text-center">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: weeks * 7 }, (_, i) => {
                const key = addKeyDays(gridStart, i);
                const inMonth = key.slice(0, 7) === monthParam(year, month);
                const dayEvents = byDay.get(key) ?? [];
                const isToday = key === todayKey;
                return (
                  <div key={key} className={cn("min-h-16 border-b border-r border-line/60 p-1 sm:min-h-28 sm:p-1.5", !inMonth && "bg-bg/60", i % 7 === 6 && "border-r-0")}>
                    <p className={cn("mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs", isToday ? "bg-accent-500 font-bold text-bg" : inMonth ? "text-fg" : "text-subtle")}>{Number(key.slice(8))}</p>
                    {/* Desktop: Chips */}
                    <div className="hidden space-y-1 sm:block">
                      {dayEvents.slice(0, 3).map((e) => (
                        <Link key={e.id} href={`/events/${e.id}`} title={e.title} className={cn("block truncate rounded border px-1.5 py-0.5 text-[11px] font-medium", TYPE_STYLES[e.type].chip, e.effectiveStatus === "CANCELLED" && "line-through opacity-60")}>
                          {dayKey(e.startsAt) === key ? `${fmtTime(e.startsAt).slice(0, 5)} ` : ""}
                          {e.title}
                        </Link>
                      ))}
                      {dayEvents.length > 3 && <p className="px-1 text-[11px] text-subtle">+{dayEvents.length - 3} weitere</p>}
                    </div>
                    {/* Mobil: Punkte */}
                    <div className="flex flex-wrap gap-1 sm:hidden">
                      {dayEvents.slice(0, 4).map((e) => (
                        <Link key={e.id} href={`/events/${e.id}`} aria-label={e.title} className={cn("h-2.5 w-2.5 rounded-full", TYPE_STYLES[e.type].dot)} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Legende">
            {(Object.keys(TYPE_STYLES) as EventType[]).map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <span className={cn("h-2.5 w-2.5 rounded-full", TYPE_STYLES[t].dot)} /> {EVENT_TYPE_LABELS[t]}
              </li>
            ))}
          </ul>
          <div className="mt-6 sm:hidden">
            <h2 className="label-caps mb-3">Termine im Monat</h2>
            {list}
          </div>
        </>
      )}
    </>
  );
}
