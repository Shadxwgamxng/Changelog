import { requireCtx } from "@/server/session";
import { listAudit } from "@/server/services/audit-log";
import { Card, Empty, PageHeader } from "@/components/ui";
import { fmtDateTime } from "@/lib/dates";
import Link from "next/link";

export const metadata = { title: "Audit-Log" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string; actor?: string; page?: string }> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const r = await listAudit(ctx, { q: sp.q, entityType: sp.type || undefined, actor: sp.actor || undefined, page });
  const pages = Math.ceil(r.total / r.pageSize);
  const qs = (p: number) => `?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(sp.type ? { type: sp.type } : {}), ...(sp.actor ? { actor: sp.actor } : {}), page: String(p) })}`;
  return (
    <>
      <PageHeader title="Audit-Log" subtitle={`${r.total} Einträge · unveränderlich (per Datenbank erzwungen), Aufbewahrung nach Löschkonzept`} />
      <form className="card card-pad mb-4 flex flex-wrap gap-3" role="search"><input name="q" defaultValue={sp.q} className="input !w-56" placeholder="Text / Aktion" aria-label="Suche" /><input name="actor" defaultValue={sp.actor} className="input !w-48" placeholder="Benutzer" aria-label="Benutzer" /><select name="type" defaultValue={sp.type ?? ""} className="input !w-auto" aria-label="Objekt"><option value="">Alle Objekte</option>{["Helper", "Shift", "ShiftAssignment", "User", "RoleAssignment", "Document", "Alert", "Incident", "Vehicle", "MaterialItem", "OrgUnit", "Report"].map((t) => <option key={t}>{t}</option>)}</select><button className="btn">Filtern</button></form>
      {r.items.length === 0 ? <Empty title="Keine Einträge" /> : (
        <Card pad={false}><ul className="divide-y divide-line">{r.items.map((a) => (
          <li key={a.id} className="px-4 py-3 text-sm"><div className="flex flex-wrap items-baseline justify-between gap-2"><span className="font-medium">{a.summary}</span><span className="text-xs tabular-nums text-fg-subtle">{fmtDateTime(a.at)}</span></div><p className="text-xs text-fg-muted">{a.actorLabel} · <code>{a.action}</code>{a.ip ? ` · ${a.ip}` : ""}</p>
            {a.changes && typeof a.changes === "object" && Object.keys(a.changes).length > 0 && <ul className="mt-1.5 space-y-0.5 text-xs text-fg-muted">{Object.entries(a.changes as Record<string, [unknown, unknown]>).slice(0, 8).map(([k, v]) => <li key={k}><span className="font-mono">{k}</span>: <span className="text-danger line-through">{String(Array.isArray(v) ? (v[0] ?? "–") : "")}</span> → <span className="text-ok">{String(Array.isArray(v) ? (v[1] ?? "–") : "")}</span></li>)}</ul>}</li>
        ))}</ul></Card>
      )}
      {pages > 1 && <nav className="mt-4 flex items-center justify-center gap-3 text-sm" aria-label="Seiten">{page > 1 && <Link className="btn btn-sm" href={qs(page - 1)}>← Neuere</Link>}<span className="text-fg-muted">Seite {page} von {pages}</span>{page < pages && <Link className="btn btn-sm" href={qs(page + 1)}>Ältere →</Link>}</nav>}
    </>
  );
}
