import Link from "next/link";
import { FileText, Upload } from "lucide-react";
import { requireCtx } from "@/server/session";
import { hasAnywhere } from "@/server/context";
import { listDocuments } from "@/server/services/documents";
import { Badge, Card, Empty, LinkButton, PageHeader } from "@/components/ui";
import { DOC_ACCESS_LABEL, DOC_CATEGORY_LABEL } from "@/lib/constants";
import { daysUntil, fmtDate } from "@/lib/dates";

export const metadata = { title: "Dokumente" };

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const docs = await listDocuments(ctx, { q: sp.q, category: (sp.category as never) || undefined });
  const canUpload = hasAnywhere(ctx, "document.manage") || !!ctx.helperId;
  return (
    <>
      <PageHeader title="Dokumente" subtitle="Verschlüsselt gespeichert, versioniert und nur für Berechtigte sichtbar." actions={canUpload && <LinkButton href="/documents/new" variant="primary"><Upload className="h-4 w-4" />Hochladen</LinkButton>} />
      <form className="card card-pad mb-4 flex flex-wrap gap-3" role="search"><input name="q" defaultValue={sp.q} placeholder="Titel suchen" className="input !w-64" type="search" aria-label="Suche" /><select name="category" defaultValue={sp.category ?? ""} className="input !w-auto" aria-label="Kategorie"><option value="">Alle Kategorien</option>{Object.entries(DOC_CATEGORY_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select><button className="btn">Filtern</button></form>
      {docs.length === 0 ? <Empty icon={<FileText className="h-8 w-8" />} title="Keine Dokumente" text="Hier erscheinen nur Dokumente, die du sehen darfst." /> : (
        <Card pad={false}><div className="overflow-x-auto"><table className="tbl"><thead><tr><th>Titel</th><th>Kategorie</th><th className="hidden sm:table-cell">Zugriff</th><th className="hidden md:table-cell">Einheit</th><th>Version</th><th>Gültig bis</th></tr></thead><tbody>
          {docs.map((d) => <tr key={d.id} className="row-link"><td><Link href={`/documents/${d.id}`} className="font-medium hover:underline">{d.title}</Link>{d.ownerName && <span className="block text-xs text-fg-subtle">{d.ownerName}</span>}</td><td><Badge>{DOC_CATEGORY_LABEL[d.category]}</Badge></td><td className="hidden text-fg-muted sm:table-cell">{DOC_ACCESS_LABEL[d.access]}</td><td className="hidden text-fg-muted md:table-cell">{d.unitName}</td><td className="tabular-nums">v{d.version}</td><td>{d.expiresAt ? <Badge tone={daysUntil(d.expiresAt) < 0 ? "danger" : daysUntil(d.expiresAt) < 30 ? "warn" : "neutral"}>{fmtDate(d.expiresAt)}</Badge> : "–"}</td></tr>)}
        </tbody></table></div></Card>
      )}
    </>
  );
}
