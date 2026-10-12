import { Download } from "lucide-react";
import { requireCtx } from "@/server/session";
import { hasAnywhere, visibleUnits } from "@/server/context";
import { REPORT_KEYS, REPORT_LABEL, buildReport, type ReportKey } from "@/server/services/reports";
import { Card, Empty, PageHeader, Tabs } from "@/components/ui";
import { berlinParts, parseDateOnly, toDateOnly } from "@/lib/dates";
import { forbidden } from "@/server/errors";

export const metadata = { title: "Berichte" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ r?: string; from?: string; to?: string; unit?: string }> }) {
  const ctx = await requireCtx();
  if (!hasAnywhere(ctx, "report.view")) throw forbidden();
  const sp = await searchParams;
  const key = (REPORT_KEYS as readonly string[]).includes(sp.r ?? "") ? (sp.r as ReportKey) : "hours";
  const y = berlinParts(new Date()).y;
  const from = parseDateOnly(sp.from ?? "") ?? parseDateOnly(`${y}-01-01`)!;
  const to = parseDateOnly(sp.to ?? "") ?? parseDateOnly(new Date().toISOString().slice(0, 10))!;
  const [table, units] = await Promise.all([buildReport(ctx, key, { from, to, unitId: sp.unit || undefined }), visibleUnits(ctx)]);
  const qs = (extra: Record<string, string>) => new URLSearchParams({ r: key, from: toDateOnly(from), to: toDateOnly(to), ...(sp.unit ? { unit: sp.unit } : {}), ...extra }).toString();
  const canExport = hasAnywhere(ctx, "report.export");
  return (
    <>
      <PageHeader title="Berichte & Statistiken" actions={canExport && <>{(["pdf", "xlsx", "csv"] as const).map((f) => <a key={f} className="btn btn-sm" href={`/api/v1/reports/${key}?${qs({ format: f })}`}><Download className="h-3.5 w-3.5" />{f.toUpperCase()}</a>)}</>} />
      <Tabs tabs={REPORT_KEYS.map((k) => ({ key: k, label: REPORT_LABEL[k].replace(" (Dienststunden)", ""), href: `/reports?${new URLSearchParams({ r: k, from: toDateOnly(from), to: toDateOnly(to), ...(sp.unit ? { unit: sp.unit } : {}) })}` }))} active={key} />
      <form className="card card-pad mb-4 flex flex-wrap items-end gap-3"><input type="hidden" name="r" value={key} /><label className="block"><span className="label">Von</span><input type="date" name="from" defaultValue={toDateOnly(from)} className="input" /></label><label className="block"><span className="label">Bis</span><input type="date" name="to" defaultValue={toDateOnly(to)} className="input" /></label><label className="block"><span className="label">Einheit</span><select name="unit" defaultValue={sp.unit ?? ""} className="input !w-64"><option value="">Alle sichtbaren</option>{units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label><button className="btn btn-primary">Aktualisieren</button></form>
      <Card title={table.title} pad={false}>
        <p className="px-4 pt-1 text-xs text-fg-subtle">{table.subtitle}</p>
        {table.rows.length === 0 ? <div className="p-4"><Empty title="Keine Daten im Zeitraum" /></div> : <div className="overflow-x-auto"><table className="tbl"><thead><tr>{table.header.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={j > 0 && typeof c === "number" ? "tabular-nums" : ""}>{c ?? ""}</td>)}</tr>)}</tbody></table></div>}
        {table.footer && <p className="border-t border-line px-4 py-3 text-sm font-medium">{table.footer}</p>}
      </Card>
    </>
  );
}
