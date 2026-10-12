import Link from "next/link";
import { Plus } from "lucide-react";
import { requireCtx } from "@/server/session";
import { hasAnywhere, visibleUnits } from "@/server/context";
import { listVehicles } from "@/server/services/vehicles";
import { Badge, Empty, LinkButton, PageHeader } from "@/components/ui";
import { VEHICLE_STATUS_EMOJI, VEHICLE_STATUS_LABEL } from "@/lib/constants";
import { vehicleTone } from "@/lib/ui-maps";
import { fmtDate } from "@/lib/dates";

export const metadata = { title: "Fahrzeuge" };
const dueBadge = (label: string, d: Date | null, st: string | null) => d && <Badge key={label} tone={st === "UEBERFAELLIG" ? "danger" : st === "BALD" ? "warn" : "neutral"}>{label} {fmtDate(d)}</Badge>;

export default async function VehiclesPage({ searchParams }: { searchParams: Promise<{ unit?: string; status?: string }> }) {
  const ctx = await requireCtx();
  const sp = await searchParams;
  const [vs, units] = await Promise.all([listVehicles(ctx, { unitId: sp.unit || undefined, status: sp.status || undefined }), visibleUnits(ctx)]);
  return (
    <>
      <PageHeader title="Fahrzeuge" subtitle="🟢 einsatzbereit · 🟡 eingeschränkt · 🔴 nicht einsatzbereit · 🔧 in Wartung" actions={hasAnywhere(ctx, "vehicle.manage") && <LinkButton href="/vehicles/new" variant="primary"><Plus className="h-4 w-4" />Fahrzeug anlegen</LinkButton>} />
      <form className="card card-pad mb-4 flex flex-wrap gap-3"><select name="unit" defaultValue={sp.unit ?? ""} className="input !w-auto" aria-label="Einheit"><option value="">Alle Einheiten</option>{units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select><select name="status" defaultValue={sp.status ?? ""} className="input !w-auto" aria-label="Status"><option value="">Alle Status</option>{Object.entries(VEHICLE_STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select><button className="btn">Filtern</button></form>
      {vs.length === 0 ? <Empty title="Keine Fahrzeuge" /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {vs.map((v) => (
            <Link key={v.id} href={`/vehicles/${v.id}`} className="card block p-4 transition hover:border-line-strong">
              <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-base font-semibold">{v.name}</p><p className="truncate text-xs text-fg-muted">{[v.callSign, v.plate].filter(Boolean).join(" · ") || "–"}</p></div><Badge tone={vehicleTone[v.status]}>{VEHICLE_STATUS_EMOJI[v.status]} {VEHICLE_STATUS_LABEL[v.status]}</Badge></div>
              <p className="mt-2 text-xs text-fg-subtle">{v.unitName}{v.type ? ` · ${v.type}` : ""}{v.odometerKm != null ? ` · ${v.odometerKm.toLocaleString("de-DE")} km` : ""}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">{dueBadge("TÜV", v.tuvDue, v.due.tuv)}{dueBadge("HU", v.huDue, v.due.hu)}{dueBadge("Vers.", v.insuranceDue, v.due.insurance)}</div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
