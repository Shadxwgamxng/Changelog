import { requireCtx } from "@/server/session";
import { hasAnywhere, visibleUnits } from "@/server/context";
import { hoursReport, ownHours } from "@/server/services/stats";
import { BarChart, Donut, HBars } from "@/components/charts";
import { Card, Empty, PageHeader, Stat, Tabs } from "@/components/ui";
import { berlinParts, fmtHours, parseDateOnly } from "@/lib/dates";
import Link from "next/link";

export const metadata = { title: "Dienststunden" };
const MON = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

export default async function HoursPage({ searchParams }: { searchParams: Promise<{ tab?: string; year?: string; unit?: string }> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const year = Number(sp.year) || berlinParts(new Date()).y;
  const canTeam = hasAnywhere(ctx, "report.view");
  const tab = sp.tab === "einheit" && canTeam ? "einheit" : ctx.helperId ? "meine" : "einheit";
  const tabs = [...(ctx.helperId ? [{ key: "meine", label: "Meine Stunden", href: `/hours?year=${year}` }] : []), ...(canTeam ? [{ key: "einheit", label: "Einheit / Team", href: `/hours?tab=einheit&year=${year}` }] : [])];
  const years = [year - 1, year, year + 1].filter((y) => y <= berlinParts(new Date()).y + 0 || y === year);
  return (
    <>
      <PageHeader title="Dienststunden" subtitle="Werden automatisch beim Abschluss eines Dienstes gebucht." actions={<div className="flex gap-1">{years.map((y) => <Link key={y} href={`/hours?${tab === "einheit" ? "tab=einheit&" : ""}year=${y}`} className={`btn btn-sm ${y === year ? "btn-primary" : ""}`}>{y}</Link>)}</div>} />
      {tabs.length > 1 && <Tabs tabs={tabs} active={tab} />}
      {tab === "meine" ? <Mine ctx={ctx} year={year} /> : <Team ctx={ctx} year={year} unit={sp.unit} />}
    </>
  );
}

async function Mine({ ctx, year }: { ctx: Awaited<ReturnType<typeof requireCtx>>; year: number }) {
  const h = await ownHours(ctx, year);
  if (!h.shifts) return <Empty title={`Keine Dienststunden ${year}`} text="Sobald abgeschlossene Dienste verbucht sind, erscheinen sie hier." />;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="Dienststunden" value={fmtHours(h.totalMinutes)} /><Stat label="Dienste" value={h.shifts} /><Stat label="Ausbildung" value={fmtHours(h.trainingMinutes)} /><Stat label="Ø pro Dienst" value={fmtHours(h.totalMinutes / Math.max(h.shifts, 1))} /></div>
      <Card title={`Stunden pro Monat ${year}`}><BarChart data={h.byMonth.map((m) => ({ label: MON[Number(m.month.slice(5)) - 1], value: m.minutes / 60 }))} /></Card>
      <Card title="Nach Dienstart"><Donut data={h.byKind.map((k) => ({ label: k.label, value: Math.round(k.minutes / 6) / 10 }))} center={<><span className="text-lg font-semibold">{fmtHours(h.totalMinutes)}</span></>} /></Card>
    </div>
  );
}

async function Team({ ctx, year, unit }: { ctx: Awaited<ReturnType<typeof requireCtx>>; year: number; unit?: string }) {
  const units = await visibleUnits(ctx);
  const r = await hoursReport(ctx, { from: parseDateOnly(`${year}-01-01`)!, to: parseDateOnly(`${year}-12-31`)!, unitId: unit || undefined });
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  return (
    <div className="space-y-5">
      <form className="card card-pad flex flex-wrap items-end gap-3"><input type="hidden" name="tab" value="einheit" /><input type="hidden" name="year" value={year} /><label className="block"><span className="label">Einheit</span><select name="unit" defaultValue={unit ?? ""} className="input !w-64"><option value="">Alle sichtbaren</option>{units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label><button className="btn">Anzeigen</button></form>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="Dienststunden" value={fmtHours(r.totalMinutes)} /><Stat label="Besetzungen" value={r.shiftCount} /><Stat label="Ausbildungsstunden" value={fmtHours(r.trainingMinutes)} /><Stat label="Einsatzstunden" value={fmtHours(r.incidentMinutes)} sub={`${r.incidentCount} Einsätze`} /></div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Stunden pro Monat"><BarChart data={months.map((m) => ({ label: MON[Number(m.slice(5)) - 1], value: (r.byMonth.find((x) => x.month === m)?.minutes ?? 0) / 60 }))} /></Card>
        <Card title="Nach Dienstart">{r.byKind.length ? <Donut data={r.byKind.map((k) => ({ label: k.label, value: Math.round(k.minutes / 6) / 10 }))} /> : <p className="text-sm text-fg-muted">Keine Daten.</p>}</Card>
        <Card title="Stunden pro Einheit">{r.byUnit.length ? <HBars data={r.byUnit.map((u) => ({ label: u.unit, value: u.minutes }))} format={fmtHours} /> : <p className="text-sm text-fg-muted">Keine Daten.</p>}</Card>
        <Card title="Top-Helfer nach Stunden" pad={false}><ul className="divide-y divide-line">{r.helpers.slice(0, 10).map((h) => <li key={h.helperId} className="flex justify-between gap-3 px-4 py-2 text-sm"><Link href={`/helpers/${h.helperId}?tab=dienste`} className="hover:underline">{h.name}</Link><span className="tabular-nums text-fg-muted">{fmtHours(h.minutes)} · {h.shifts} Dienste</span></li>)}{!r.helpers.length && <li className="p-4 text-sm text-fg-muted">Keine Daten.</li>}</ul></Card>
      </div>
    </div>
  );
}
