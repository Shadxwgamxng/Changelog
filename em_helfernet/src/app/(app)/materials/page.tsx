import Link from "next/link";
import { Plus } from "lucide-react";
import { requireCtx } from "@/server/session";
import { hasAnywhere, visibleUnits } from "@/server/context";
import { listMaterials, type MaterialFlag } from "@/server/services/materials";
import { Badge, Card, Empty, LinkButton, PageHeader } from "@/components/ui";
import { MATERIAL_STATUS_LABEL } from "@/lib/constants";
import { materialTone } from "@/lib/ui-maps";
import { fmtDate } from "@/lib/dates";

export const metadata = { title: "Material" };
const FLAG: Record<MaterialFlag, [string, "danger" | "warn" | "info"]> = { MINDESTBESTAND: ["Mindestbestand", "danger"], ABGELAUFEN: ["Abgelaufen", "danger"], ABLAUF_BALD: ["Läuft bald ab", "warn"], WARTUNG_FAELLIG: ["Wartung überfällig", "danger"], WARTUNG_BALD: ["Wartung bald", "warn"], DEFEKT: ["Defekt", "danger"], IN_WARTUNG: ["In Wartung", "info"] };

export default async function MaterialsPage({ searchParams }: { searchParams: Promise<{ unit?: string; flagged?: string; category?: string }> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const [items, units] = await Promise.all([listMaterials(ctx, { unitId: sp.unit || undefined, flagged: sp.flagged === "1", category: sp.category || undefined }), visibleUnits(ctx)]);
  const cats = [...new Set(items.map((i) => i.category).filter(Boolean))] as string[];
  return (
    <>
      <PageHeader title="Material" subtitle="Bestand, Wartung, Ablauf und Ausgabe." actions={hasAnywhere(ctx, "material.manage") && <LinkButton href="/materials/new" variant="primary"><Plus className="h-4 w-4" />Material anlegen</LinkButton>} />
      <form className="card card-pad mb-4 flex flex-wrap items-center gap-3"><select name="unit" defaultValue={sp.unit ?? ""} className="input !w-auto" aria-label="Einheit"><option value="">Alle Einheiten</option>{units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select><select name="category" defaultValue={sp.category ?? ""} className="input !w-auto" aria-label="Kategorie"><option value="">Alle Kategorien</option>{cats.map((c) => <option key={c}>{c}</option>)}</select><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="flagged" value="1" defaultChecked={sp.flagged === "1"} className="h-4 w-4" /> nur mit Warnung</label><button className="btn">Filtern</button></form>
      {items.length === 0 ? <Empty title="Kein Material" /> : (
        <Card pad={false}><div className="overflow-x-auto"><table className="tbl"><thead><tr><th>Bezeichnung</th><th className="hidden sm:table-cell">Kategorie</th><th className="text-right">Verfügbar / Bestand</th><th className="hidden md:table-cell">Standort</th><th>Hinweise</th></tr></thead><tbody>
          {items.map((m) => <tr key={m.id} className="row-link"><td><Link href={`/materials/${m.id}`} className="font-medium hover:underline">{m.name}</Link>{m.serialNumber && <span className="block text-xs text-fg-subtle">SN {m.serialNumber}</span>}</td><td className="hidden text-fg-muted sm:table-cell">{m.category ?? "–"}</td><td className="text-right tabular-nums">{m.available} / {m.quantity}{m.minQuantity ? <span className="text-xs text-fg-subtle"> (min. {m.minQuantity})</span> : null}</td><td className="hidden text-fg-muted md:table-cell">{m.location ?? "–"}</td>
            <td><div className="flex flex-wrap gap-1">{m.status !== "OK" && <Badge tone={materialTone[m.status]}>{MATERIAL_STATUS_LABEL[m.status]}</Badge>}{m.flags.filter((f) => f !== "DEFEKT" && f !== "IN_WARTUNG").map((f) => <Badge key={f} tone={FLAG[f][1]}>{FLAG[f][0]}{f.startsWith("ABLAUF") && m.expiresAt ? ` ${fmtDate(m.expiresAt)}` : ""}</Badge>)}</div></td></tr>)}
        </tbody></table></div></Card>
      )}
    </>
  );
}
