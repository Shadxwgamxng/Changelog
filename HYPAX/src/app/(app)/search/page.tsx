import Link from "next/link";
import { requireCtx } from "@/server/session";
import { globalSearch } from "@/server/services/search";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "Suche" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const ctx = await requireCtx();
  const q = ((await searchParams).q ?? "").trim();
  const hits = await globalSearch(ctx, q, 8);
  const groups = Object.entries(Object.groupBy(hits, (h) => h.type));
  return (
    <>
      <PageHeader title="Suche" subtitle={q ? `Ergebnisse für „${q}“ – nur Inhalte, die du sehen darfst` : "Suche nach Helfern, Diensten, Veranstaltungen, Fahrzeugen, Material, Qualifikationen, Dokumenten und Einheiten."} />
      <form role="search" className="mb-5 flex gap-2"><input name="q" defaultValue={q} className="input" type="search" autoFocus aria-label="Suchbegriff" placeholder="Mindestens 2 Zeichen" /><button className="btn btn-primary">Suchen</button></form>
      {q.length >= 2 && hits.length === 0 && <Empty title="Keine Treffer" />}
      <div className="space-y-5">{groups.map(([type, list]) => (
        <Card key={type} title={`${type} (${list!.length})`} pad={false}><ul className="divide-y divide-line">{list!.map((h) => <li key={h.type + h.id}><Link href={h.link} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-fill-1"><span className="min-w-0"><span className="block truncate font-medium">{h.title}</span>{h.subtitle && <span className="block truncate text-xs text-fg-muted">{h.subtitle}</span>}</span><Badge>{h.type}</Badge></Link></li>)}</ul></Card>
      ))}</div>
    </>
  );
}
