import Link from "next/link";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import clsx from "clsx";
import { requireCtx } from "@/server/session";
import { visibleUnits } from "@/server/context";
import { CALENDAR_TYPES, CALENDAR_TYPE_LABEL, calendarEntries, type CalendarEntry, type CalendarType } from "@/server/services/calendar";
import { Card, Empty, PageHeader } from "@/components/ui";
import { berlinDateKey, fmtLong, fmtTime, startOfBerlinDay } from "@/lib/dates";

export const metadata = { title: "Kalender" };
const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const DOW = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const chip: Record<CalendarType, string> = {
  DIENST: "bg-brand-50 text-brand-700", VERANSTALTUNG: "bg-info-soft text-info", AUSBILDUNG: "bg-ok-soft text-ok",
  BESPRECHUNG: "bg-warn-soft text-warn", FAHRZEUG: "bg-surface-2 text-fg-muted ring-1 ring-inset ring-line", MATERIAL: "bg-surface-2 text-fg-muted ring-1 ring-inset ring-line",
};
const dot: Record<CalendarType, string> = { DIENST: "bg-brand-500", VERANSTALTUNG: "bg-info", AUSBILDUNG: "bg-ok", BESPRECHUNG: "bg-warn", FAHRZEUG: "bg-fg-subtle", MATERIAL: "bg-fg-subtle" };

type SP = { view?: string; date?: string; t?: string | string[]; unit?: string; mine?: string };
const addDays = (key: string, n: number) => new Date(new Date(key + "T00:00:00Z").getTime() + n * 86_400_000).toISOString().slice(0, 10);
const dow = (key: string) => (new Date(key + "T00:00:00Z").getUTCDay() + 6) % 7;

export default async function CalendarPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const view = (["month", "week", "day", "list"].includes(sp.view ?? "") ? sp.view : "month") as "month" | "week" | "day" | "list";
  const todayKey = berlinDateKey(new Date());
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? "") ? sp.date! : todayKey;
  const types = ((Array.isArray(sp.t) ? sp.t : sp.t ? [sp.t] : []).filter((t) => (CALENDAR_TYPES as readonly string[]).includes(t))) as CalendarType[];
  const mine = sp.mine === "1";

  let from: string, to: string, prev: string, next: string, title: string;
  if (view === "month") {
    const [y, m] = date.split("-").map(Number);
    const first = `${y}-${String(m).padStart(2, "0")}-01`;
    from = addDays(first, -dow(first)); to = addDays(from, 41);
    prev = addDays(first, -1).slice(0, 8) + "01"; next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
    title = `${MONTHS[m - 1]} ${y}`;
  } else if (view === "week") {
    from = addDays(date, -dow(date)); to = addDays(from, 6); prev = addDays(from, -7); next = addDays(from, 7);
    title = `${from.slice(8)}.${from.slice(5, 7)}. – ${to.slice(8)}.${to.slice(5, 7)}.${to.slice(0, 4)}`;
  } else if (view === "day") {
    from = to = date; prev = addDays(date, -1); next = addDays(date, 1); title = fmtLong(startOfBerlinDay(date));
  } else {
    from = date; to = addDays(date, 59); prev = addDays(date, -60); next = addDays(date, 60); title = "Nächste 60 Tage";
  }
  const entries = await calendarEntries(ctx, { from: startOfBerlinDay(from), to: new Date(startOfBerlinDay(addDays(to, 1)).getTime() - 1), types, unitId: sp.unit || undefined, mine });
  const units = await visibleUnits(ctx);

  const byDay = new Map<string, CalendarEntry[]>();
  for (const e of entries) {
    const endKey = berlinDateKey(new Date(Math.max(e.start.getTime(), e.end.getTime() - 1)));
    for (let k = berlinDateKey(e.start), n = 0; k <= endKey && n < 14; k = addDays(k, 1), n++) byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }
  const qs = (o: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    const merged = { view, date, unit: sp.unit, mine: mine ? "1" : undefined, ...o };
    for (const [k, v] of Object.entries(merged)) if (v) u.set(k, v);
    for (const t of types) u.append("t", t);
    return `?${u}`;
  };
  const icsHref = `/api/v1/calendar.ics?from=${from}&to=${to}${types.map((t) => `&t=${t}`).join("")}${sp.unit ? `&unit=${sp.unit}` : ""}${mine ? "&mine=1" : ""}`;

  const Item = ({ e, compact }: { e: CalendarEntry; compact?: boolean }) => (
    <Link href={e.link} title={`${e.title}${e.unitName ? ` – ${e.unitName}` : ""}`} className={clsx("block truncate rounded-md px-1.5 py-0.5 text-[11.5px] font-medium leading-tight transition hover:opacity-80", chip[e.type], e.status === "ABGESAGT" && "line-through opacity-60", e.mine && "ring-2 ring-inset ring-ok/50")}>
      {!e.allDay && !compact && <span className="mr-1 tabular-nums opacity-70">{fmtTime(e.start)}</span>}{e.title}
    </Link>
  );

  return (
    <>
      <PageHeader title="Kalender" subtitle="Dienste, Veranstaltungen, Ausbildung, Einsätze, Fahrzeuge und Material auf einen Blick." actions={<a href={icsHref} className="btn btn-sm"><Download className="h-4 w-4" />iCalendar-Export</a>} />
      <Card className="mb-4" pad={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
          <div className="flex items-center gap-1">
            <Link href={qs({ date: prev })} className="btn btn-ghost !px-2" aria-label="Zurück"><ChevronLeft className="h-5 w-5" /></Link>
            <Link href={qs({ date: todayKey })} className="btn btn-sm">Heute</Link>
            <Link href={qs({ date: next })} className="btn btn-ghost !px-2" aria-label="Weiter"><ChevronRight className="h-5 w-5" /></Link>
            <h2 className="ml-2 text-lg font-semibold">{title}</h2>
          </div>
          <div className="flex rounded-lg border border-line-strong p-0.5" role="tablist" aria-label="Ansicht">
            {([["month", "Monat"], ["week", "Woche"], ["day", "Tag"], ["list", "Liste"]] as const).map(([k, l]) => <Link key={k} href={qs({ view: k })} role="tab" aria-selected={view === k} className={clsx("min-h-[36px] rounded-lg px-3 py-1.5 text-sm font-medium", view === k ? "bg-brand-600 text-white" : "text-fg-muted hover:bg-surface-2")}>{l}</Link>)}
          </div>
        </div>
        <form className="flex flex-wrap items-center gap-2 border-t border-line p-3 sm:px-4" aria-label="Filter">
          <input type="hidden" name="view" value={view} /><input type="hidden" name="date" value={date} />
          <label className="flex min-h-[36px] cursor-pointer items-center"><input type="checkbox" name="mine" value="1" defaultChecked={mine} className="peer sr-only" /><span className="rounded-full border border-line-strong px-3 py-1 text-[13px] text-fg-muted peer-checked:border-ok peer-checked:bg-ok-soft peer-checked:font-medium peer-checked:text-ok">Eigene Dienste</span></label>
          {CALENDAR_TYPES.map((t) => <label key={t} className="flex min-h-[36px] cursor-pointer items-center"><input type="checkbox" name="t" value={t} defaultChecked={types.includes(t)} className="peer sr-only" /><span className="flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1 text-[13px] text-fg-muted peer-checked:border-fg-subtle peer-checked:bg-surface-2 peer-checked:font-medium peer-checked:text-fg"><span className={clsx("h-2 w-2 rounded-full", dot[t])} />{CALENDAR_TYPE_LABEL[t]}</span></label>)}
          <select name="unit" defaultValue={sp.unit ?? ""} className="input !min-h-[36px] !w-auto !py-0 text-[13px]" aria-label="Einheit"><option value="">Alle Einheiten</option>{units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
          <button className="btn btn-sm">Filter anwenden</button>
        </form>
      </Card>

      {view === "month" && (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-line bg-surface-2 text-center text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">{DOW.map((d) => <div key={d} className="py-2">{d}</div>)}</div>
          <div className="grid grid-cols-7">
            {Array.from({ length: 42 }, (_, i) => {
              const k = addDays(from, i), list = byDay.get(k) ?? [], inMonth = k.slice(0, 7) === date.slice(0, 7);
              return (
                <div key={k} className={clsx("min-h-[84px] border-b border-r border-line p-1 sm:min-h-[104px]", !inMonth && "bg-surface-2/60")}>
                  <Link href={qs({ view: "day", date: k })} className={clsx("mb-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-medium", k === todayKey ? "bg-brand-600 text-white" : inMonth ? "text-fg" : "text-fg-subtle")}>{Number(k.slice(8))}</Link>
                  <div className="space-y-0.5">
                    <div className="hidden space-y-0.5 sm:block">{list.slice(0, 3).map((e) => <Item key={e.id} e={e} compact />)}</div>
                    <div className="flex flex-wrap gap-0.5 sm:hidden">{list.slice(0, 6).map((e) => <span key={e.id} className={clsx("h-2 w-2 rounded-full", dot[e.type])} />)}</div>
                    {list.length > 3 && <Link href={qs({ view: "day", date: k })} className="hidden px-1 text-[11px] text-fg-subtle hover:underline sm:block">+{list.length - 3} weitere</Link>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "week" && (
        <div className="grid gap-3 md:grid-cols-7">
          {Array.from({ length: 7 }, (_, i) => { const k = addDays(from, i), list = byDay.get(k) ?? []; return (
            <div key={k} className={clsx("card min-h-[120px] p-2", k === todayKey && "ring-2 ring-brand-500/60")}>
              <Link href={qs({ view: "day", date: k })} className="mb-2 block text-xs font-semibold text-fg-muted">{DOW[i]} {k.slice(8)}.{k.slice(5, 7)}.</Link>
              <div className="space-y-1">{list.map((e) => <Item key={e.id} e={e} />)}{list.length === 0 && <p className="text-xs text-fg-subtle">–</p>}</div>
            </div>); })}
        </div>
      )}

      {(view === "day" || view === "list") && (
        <div className="space-y-5">
          {[...byDay.entries()].filter(([k]) => k >= from && k <= to).sort(([a], [b]) => a.localeCompare(b)).map(([k, list]) => (
            <section key={k}>
              <h3 className="mb-2 text-sm font-semibold text-fg-muted">{fmtLong(startOfBerlinDay(k))}</h3>
              <ul className="space-y-2">{list.map((e) => (
                <li key={e.id}><Link href={e.link} className="card flex items-center gap-3 px-4 py-3 transition hover:shadow-pop"><span className={clsx("h-10 w-1.5 shrink-0 rounded-full", dot[e.type])} /><span className="min-w-0 flex-1"><span className={clsx("block truncate font-medium", e.status === "ABGESAGT" && "line-through")}>{e.title}</span><span className="text-sm text-fg-muted">{e.allDay ? "ganztägig" : `${fmtTime(e.start)}–${fmtTime(e.end)}`} · {CALENDAR_TYPE_LABEL[e.type]}{e.unitName ? ` · ${e.unitName}` : ""}{e.location ? ` · ${e.location}` : ""}</span></span>{e.mine && <span className="badge badge-ok">Zugesagt</span>}{e.status === "ANGEFRAGT" && <span className="badge badge-warn">Angefragt</span>}{e.status === "ENTWURF" && <span className="badge badge-neutral">Entwurf</span>}{e.status === "ABGESAGT" && <span className="badge badge-danger">Abgesagt</span>}</Link></li>
              ))}</ul>
            </section>
          ))}
          {entries.length === 0 && <Empty title="Keine Einträge" text="In diesem Zeitraum gibt es nichts, das zu deinen Filtern passt." />}
        </div>
      )}
    </>
  );
}
