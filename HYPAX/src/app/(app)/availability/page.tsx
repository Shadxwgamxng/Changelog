import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireCtx } from "@/server/session";
import { hasAnywhere, unitsWith } from "@/server/context";
import { getAvailability, unitAvailabilityMatrix } from "@/server/services/availability";
import { Badge, Card, PageHeader, Tabs } from "@/components/ui";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { AVAILABILITY_EMOJI, AVAILABILITY_LABEL, AVAILABILITY_REASON_LABEL } from "@/lib/constants";
import { berlinParts, fmtDate, parseDateOnly } from "@/lib/dates";
import { availabilityTone } from "@/lib/ui-maps";
import { clearAvailabilityAction, setAvailabilityAction } from "./actions";
import { listShifts } from "@/server/services/shifts";
import clsx from "clsx";

export const metadata = { title: "Verfügbarkeit" };
const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const cellTone = { VERFUEGBAR: "bg-ok-soft text-ok", EINGESCHRAENKT: "bg-warn-soft text-warn", NICHT_VERFUEGBAR: "bg-danger-soft text-danger" } as const;

export default async function AvailabilityPage({ searchParams }: { searchParams: Promise<{ m?: string; tab?: string; unit?: string; from?: string }> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const canTeam = hasAnywhere(ctx, "availability.view_others");
  const tab = sp.tab === "team" && canTeam ? "team" : ctx.helperId ? "meine" : "team";
  const tabs = [...(ctx.helperId ? [{ key: "meine", label: "Meine Verfügbarkeit", href: "/availability" }] : []), ...(canTeam ? [{ key: "team", label: "Team-Übersicht", href: "/availability?tab=team" }] : [])];
  return (
    <>
      <PageHeader title="Verfügbarkeit" subtitle="🟢 verfügbar · 🟡 eingeschränkt · 🔴 nicht verfügbar · ⚪ keine Angabe" />
      {tabs.length > 1 && <Tabs tabs={tabs} active={tab} />}
      {tab === "meine" ? <Mine ctx={ctx} month={sp.m} /> : <Team ctx={ctx} unit={sp.unit} from={sp.from} />}
    </>
  );
}

async function Mine({ ctx, month }: { ctx: Awaited<ReturnType<typeof requireCtx>>; month?: string }) {
  const now = berlinParts(new Date());
  const m = /^\d{4}-\d{2}$/.test(month ?? "") ? month! : `${now.y}-${String(now.m).padStart(2, "0")}`;
  const [y, mo] = m.split("-").map(Number);
  const first = new Date(Date.UTC(y, mo - 1, 1)), last = new Date(Date.UTC(y, mo, 0));
  const lead = (first.getUTCDay() + 6) % 7;
  const gridStart = new Date(first.getTime() - lead * 86_400_000), gridEnd = new Date(gridStart.getTime() + 42 * 86_400_000 - 86_400_000);
  const entries = await getAvailability(ctx, ctx.helperId!, gridStart, gridEnd);
  const myShifts = await listShifts(ctx, { from: gridStart, to: gridEnd, mine: true });
  const shiftDays = new Set(myShifts.filter((s) => s.myStatus === "BESTAETIGT").map((s) => s.startsAt.toISOString().slice(0, 10)));
  const at = (d: Date) => entries.find((e) => e.startDate <= d && e.endDate >= d);
  const prev = new Date(Date.UTC(y, mo - 2, 1)).toISOString().slice(0, 7), next = new Date(Date.UTC(y, mo, 1)).toISOString().slice(0, 7);
  const today = parseDateOnly(new Date().toISOString().slice(0, 10))!;
  const upcoming = entries.filter((e) => e.endDate >= today);
  void last;
  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <Card className="lg:col-span-3" title={`${MONTHS[mo - 1]} ${y}`} action={<div className="flex gap-1"><Link href={`?m=${prev}`} className="btn btn-ghost btn-sm" aria-label="Vorheriger Monat"><ChevronLeft className="h-4 w-4" /></Link><Link href="?" className="btn btn-ghost btn-sm">Heute</Link><Link href={`?m=${next}`} className="btn btn-ghost btn-sm" aria-label="Nächster Monat"><ChevronRight className="h-4 w-4" /></Link></div>}>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase text-fg-subtle">{["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => <div key={d}>{d}</div>)}</div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: 42 }, (_, i) => {
            const d = new Date(gridStart.getTime() + i * 86_400_000);
            const e = at(d), key = d.toISOString().slice(0, 10), inMonth = d.getUTCMonth() === mo - 1;
            return (
              <div key={key} title={e ? AVAILABILITY_LABEL[e.status] + (e.reason ? ` · ${AVAILABILITY_REASON_LABEL[e.reason as keyof typeof AVAILABILITY_REASON_LABEL]}` : "") : "Keine Angabe"}
                className={clsx("relative flex aspect-square min-h-[44px] flex-col items-center justify-center rounded-lg text-sm", e ? cellTone[e.status] : "bg-surface-2 text-fg-muted", !inMonth && "opacity-40", key === today.toISOString().slice(0, 10) && "ring-2 ring-info")}>
                <span className="font-medium">{d.getUTCDate()}</span>
                <span className="text-[10px] leading-none" aria-hidden>{e ? AVAILABILITY_EMOJI[e.status] : ""}</span>
                {shiftDays.has(key) && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brand-600" title="Dienst" />}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-fg-subtle"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-brand-600" /> = du bist an diesem Tag eingeteilt. Gründe (Urlaub, Arbeit, Krankheit …) sieht nur du – andere sehen ausschließlich den Status.</p>
      </Card>
      <div className="space-y-5 lg:col-span-2">
        <Card title="Zeitraum eintragen">
          <ActionForm action={setAvailabilityAction} className="space-y-4">
            <fieldset><legend className="label">Status</legend>
              <div className="grid grid-cols-3 gap-2">
                {(["VERFUEGBAR", "EINGESCHRAENKT", "NICHT_VERFUEGBAR"] as const).map((s, i) => (
                  <label key={s} className="cursor-pointer"><input type="radio" name="status" value={s} defaultChecked={i === 2} className="peer sr-only" /><span className={clsx("flex min-h-[64px] flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-line px-1 text-center text-xs font-medium transition peer-focus-visible:ring-2 peer-focus-visible:ring-info", s === "VERFUEGBAR" && "peer-checked:border-ok peer-checked:bg-ok-soft", s === "EINGESCHRAENKT" && "peer-checked:border-warn peer-checked:bg-warn-soft", s === "NICHT_VERFUEGBAR" && "peer-checked:border-danger peer-checked:bg-danger-soft")}><span className="text-xl" aria-hidden>{AVAILABILITY_EMOJI[s]}</span>{s === "EINGESCHRAENKT" ? "Eingeschränkt" : s === "VERFUEGBAR" ? "Verfügbar" : "Nicht verfügbar"}</span></label>
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-3"><label className="block"><span className="label">Von</span><input type="date" name="startDate" className="input" required defaultValue={today.toISOString().slice(0, 10)} /></label><label className="block"><span className="label">Bis (inkl.)</span><input type="date" name="endDate" className="input" /></label></div>
            <label className="block"><span className="label">Grund (privat)</span><select name="reason" className="input"><option value="">— keiner —</option>{Object.entries(AVAILABILITY_REASON_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label className="block"><span className="label">Notiz (privat)</span><input name="note" className="input" maxLength={300} /></label>
            <SubmitButton>Speichern</SubmitButton>
          </ActionForm>
        </Card>
        <Card title="Kommende Einträge">
          {upcoming.length === 0 ? <p className="text-sm text-fg-muted">Keine Einträge – für alle Tage gilt „Keine Angabe“.</p> : (
            <ul className="divide-y divide-line">{upcoming.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span><Badge tone={availabilityTone[e.status]}>{AVAILABILITY_EMOJI[e.status]} {AVAILABILITY_LABEL[e.status]}</Badge> <span className="ml-1">{fmtDate(e.startDate)}{e.endDate.getTime() !== e.startDate.getTime() ? ` – ${fmtDate(e.endDate)}` : ""}</span>{e.reason && <span className="ml-1 text-fg-muted">· {AVAILABILITY_REASON_LABEL[e.reason as keyof typeof AVAILABILITY_REASON_LABEL]}</span>}</span>
                <ActionButton action={clearAvailabilityAction} fields={{ startDate: e.startDate.toISOString().slice(0, 10), endDate: e.endDate.toISOString().slice(0, 10) }} variant="ghost" label="Zurücksetzen" />
              </li>))}</ul>
          )}
        </Card>
      </div>
    </div>
  );
}

async function Team({ ctx, unit, from }: { ctx: Awaited<ReturnType<typeof requireCtx>>; unit?: string; from?: string }) {
  const units = await unitsWith(ctx, "availability.view_others");
  const unitId = unit && units.some((u) => u.id === unit) ? unit : units[0]?.id;
  if (!unitId) return <p className="text-fg-muted">Keine Einheit mit Einsicht.</p>;
  const start = parseDateOnly(from ?? "") ?? parseDateOnly(new Date().toISOString().slice(0, 10))!;
  const end = new Date(start.getTime() + 13 * 86_400_000);
  const m = await unitAvailabilityMatrix(ctx, unitId, start, end);
  const shiftDay = (d: string) => new Date(d + "T00:00:00Z");
  const shift = (n: number) => new Date(start.getTime() + n * 86_400_000).toISOString().slice(0, 10);
  const sums = m.days.map((_, i) => ({ ok: m.rows.filter((r) => r.cells[i] === "VERFUEGBAR").length, lim: m.rows.filter((r) => r.cells[i] === "EINGESCHRAENKT").length }));
  return (
    <>
      <form className="card card-pad mb-4 flex flex-wrap items-end gap-3"><label className="block"><span className="label">Einheit</span><select name="unit" defaultValue={unitId} className="input !w-64">{units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label><input type="hidden" name="tab" value="team" /><label className="block"><span className="label">Ab</span><input type="date" name="from" defaultValue={start.toISOString().slice(0, 10)} className="input" /></label><button className="btn">Anzeigen</button><Link className="btn btn-ghost" href={`?tab=team&unit=${unitId}&from=${shift(-14)}`}>← 2 Wochen</Link><Link className="btn btn-ghost" href={`?tab=team&unit=${unitId}&from=${shift(14)}`}>2 Wochen →</Link></form>
      <Card pad={false}>
        <div className="overflow-x-auto">
          <table className="tbl text-xs"><thead><tr><th className="sticky left-0 bg-surface">Helfer</th>{m.days.map((d) => <th key={d} className="text-center"><span className="block">{fmtDate(shiftDay(d)).slice(0, 5)}</span></th>)}</tr></thead>
            <tbody>
              {m.rows.map((r) => <tr key={r.helperId}><td className="sticky left-0 whitespace-nowrap bg-surface font-medium"><Link href={`/helpers/${r.helperId}`} className="hover:underline">{r.name}</Link></td>{r.cells.map((c, i) => <td key={i} className="p-1 text-center"><span className={clsx("flex h-8 min-w-8 items-center justify-center rounded-md", c ? cellTone[c] : "bg-surface-2 text-fg-subtle")} title={c ? AVAILABILITY_LABEL[c] : "Keine Angabe"}>{c ? AVAILABILITY_EMOJI[c] : "·"}</span></td>)}</tr>)}
              <tr className="font-semibold"><td className="sticky left-0 bg-surface">Verfügbar</td>{sums.map((s, i) => <td key={i} className="text-center tabular-nums">{s.ok}{s.lim ? <span className="text-warn">+{s.lim}</span> : ""}</td>)}</tr>
            </tbody>
          </table>
        </div>
      </Card>
      <p className="mt-3 text-xs text-fg-subtle">Aus Datenschutzgründen werden nur Status, aber keine Gründe angezeigt.</p>
    </>
  );
}
