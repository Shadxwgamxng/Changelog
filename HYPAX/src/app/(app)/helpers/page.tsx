import Link from "next/link";
import { Plus } from "lucide-react";
import { requireCtx } from "@/server/session";
import { hasAnywhere, visibleUnits } from "@/server/context";
import { listGroups, listHelpers } from "@/server/services/helpers";
import { listQualTypes } from "@/server/services/qualifications";
import { Avatar, Badge, Card, Empty, LinkButton, PageHeader } from "@/components/ui";
import { FUNCTION_LABEL, FUNCTIONS, HELPER_STATUS_LABEL } from "@/lib/constants";
import { helperStatusTone } from "@/lib/ui-maps";

export const metadata = { title: "Helfer" };
type SP = { q?: string; unit?: string; status?: string; group?: string; qual?: string; fn?: string; page?: string };

export default async function HelpersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const [res, units, groups, quals] = await Promise.all([
    listHelpers(ctx, { q: sp.q, unitId: sp.unit || undefined, status: (sp.status as never) || undefined, group: sp.group || undefined, qualTypeId: sp.qual || undefined, fn: sp.fn || undefined, page, pageSize: 40 }),
    visibleUnits(ctx), listGroups(ctx), listQualTypes(ctx),
  ]);
  const pages = Math.ceil(res.total / res.pageSize);
  const qs = (p: number) => { const u = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]); u.set("page", String(p)); return `?${u}`; };
  return (
    <>
      <PageHeader title="Helfer" subtitle={`${res.total} Einträge`} actions={hasAnywhere(ctx, "helper.create") && <LinkButton href="/helpers/new" variant="primary"><Plus className="h-4 w-4" />Helfer anlegen</LinkButton>} />
      <form className="card card-pad mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6" role="search" aria-label="Helfer filtern">
        <input name="q" defaultValue={sp.q} className="input lg:col-span-2" placeholder="Name, Gruppe oder Mitgliedsnr." aria-label="Suche" type="search" />
        <select name="unit" defaultValue={sp.unit ?? ""} className="input" aria-label="Einheit"><option value="">Alle Einheiten</option>{units.map((u) => <option key={u.id} value={u.id}>{"— ".repeat(u.path.split("/").length - 3)}{u.name}</option>)}</select>
        <select name="status" defaultValue={sp.status ?? ""} className="input" aria-label="Status"><option value="">Aktiv & Passiv</option><option value="ALLE">Alle Status</option>{Object.entries(HELPER_STATUS_LABEL).filter(([k]) => k !== "ANONYMISIERT").map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <select name="fn" defaultValue={sp.fn ?? ""} className="input" aria-label="Funktion"><option value="">Alle Funktionen</option>{FUNCTIONS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}</select>
        <select name="qual" defaultValue={sp.qual ?? ""} className="input" aria-label="Qualifikation"><option value="">Alle Qualifikationen</option>{quals.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}</select>
        {groups.length > 0 && <select name="group" defaultValue={sp.group ?? ""} className="input" aria-label="Gruppe"><option value="">Alle Gruppen</option>{groups.map((g) => <option key={g}>{g}</option>)}</select>}
        <button className="btn btn-primary">Filtern</button>
      </form>
      {res.items.length === 0 ? <Empty title="Keine Helfer gefunden" text="Passe die Filter an." /> : (
        <Card pad={false}>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Name</th><th>Einheit</th><th className="hidden sm:table-cell">Funktionen</th><th className="hidden md:table-cell">Gruppe</th><th>Status</th></tr></thead>
              <tbody>
                {res.items.map((h) => (
                  <tr key={h.id} className="row-link">
                    <td><Link href={`/helpers/${h.id}`} className="flex min-h-[44px] items-center gap-3 font-medium"><Avatar name={`${h.firstName} ${h.lastName}`} size={34} /><span>{h.lastName}, {h.firstName}{h.access.self && <span className="ml-1 text-xs text-fg-subtle">(du)</span>}</span></Link></td>
                    <td className="text-fg-muted">{h.unitName}</td>
                    <td className="hidden text-fg-muted sm:table-cell">{h.functions.map((f) => FUNCTION_LABEL[f] ?? f).join(", ")}</td>
                    <td className="hidden text-fg-muted md:table-cell">{h.groupName}</td>
                    <td><Badge tone={helperStatusTone[h.status]}>{HELPER_STATUS_LABEL[h.status]}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {pages > 1 && <nav className="mt-4 flex items-center justify-center gap-3 text-sm" aria-label="Seiten">{page > 1 && <Link className="btn btn-sm" href={qs(page - 1)}>← Zurück</Link>}<span className="text-fg-muted">Seite {page} von {pages}</span>{page < pages && <Link className="btn btn-sm" href={qs(page + 1)}>Weiter →</Link>}</nav>}
    </>
  );
}
