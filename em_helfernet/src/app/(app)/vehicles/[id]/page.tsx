import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCtx } from "@/server/session";
import { getVehicle } from "@/server/services/vehicles";
import { listDocuments } from "@/server/services/documents";
import { Badge, Card, Dl, PageHeader } from "@/components/ui";
import { ActionButton, ActionForm, Collapse, SubmitButton } from "@/components/forms";
import { VEHICLE_STATUS_EMOJI, VEHICLE_STATUS_LABEL, DOC_CATEGORY_LABEL } from "@/lib/constants";
import { vehicleTone } from "@/lib/ui-maps";
import { fmtDate, fmtRange } from "@/lib/dates";
import { deleteVehicleAction, maintenanceAction, updateVehicleAction } from "../actions";
import { VehicleFields } from "../vehicle-fields";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const v = await getVehicle(await requireCtx(), (await params).id).catch(() => null);
  return { title: v?.name ?? "Fahrzeug" };
}

const due = (label: string, d: Date | null, st: string | null) => <li key={label} className="flex justify-between gap-3 py-2 text-sm"><span>{label}</span><span>{d ? <Badge tone={st === "UEBERFAELLIG" ? "danger" : st === "BALD" ? "warn" : "ok"}>{fmtDate(d)}{st === "UEBERFAELLIG" ? " · überfällig" : ""}</Badge> : <span className="text-fg-subtle">–</span>}</span></li>;

export default async function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireCtx();
  const v = await getVehicle(ctx, id).catch(() => null);
  if (!v) notFound();
  const docs = await listDocuments(ctx, { vehicleId: id });
  return (
    <>
      <PageHeader title={v.name} back={{ href: "/vehicles", label: "Fahrzeuge" }} subtitle={[v.callSign, v.plate, v.type, v.unitName].filter(Boolean).join(" · ")} actions={<Badge tone={vehicleTone[v.status]}>{VEHICLE_STATUS_EMOJI[v.status]} {VEHICLE_STATUS_LABEL[v.status]}</Badge>} />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card title="Fälligkeiten"><ul className="divide-y divide-line">{due("TÜV", v.tuvDue, v.due.tuv)}{due("Hauptuntersuchung (HU)", v.huDue, v.due.hu)}{due("Versicherung", v.insuranceDue, v.due.insurance)}</ul></Card>
          <Card title="Wartungen" pad={false}>
            {v.maintenances.length === 0 ? <p className="p-4 text-sm text-fg-muted">Noch keine Wartungen eingetragen.</p> : <div className="overflow-x-auto"><table className="tbl"><thead><tr><th>Datum</th><th>Beschreibung</th><th className="text-right">km</th><th className="text-right">Kosten</th><th>Nächste</th></tr></thead><tbody>{v.maintenances.map((m) => <tr key={m.id}><td className="whitespace-nowrap">{fmtDate(m.date)}</td><td>{m.description}</td><td className="text-right tabular-nums">{m.odometerKm?.toLocaleString("de-DE") ?? "–"}</td><td className="text-right tabular-nums">{m.cost != null ? `${m.cost.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €` : "–"}</td><td>{m.nextDue ? fmtDate(m.nextDue) : "–"}</td></tr>)}</tbody></table></div>}
            {v.canManage && <div className="border-t border-line p-4"><Collapse summary="＋ Wartung eintragen"><ActionForm action={maintenanceAction} className="grid gap-3 sm:grid-cols-2" resetOnSuccess><input type="hidden" name="id" value={id} /><label className="block"><span className="label">Datum</span><input type="date" name="date" className="input" required /></label><label className="block"><span className="label">Kilometerstand</span><input type="number" name="odometerKm" className="input" min={0} /></label><label className="block sm:col-span-2"><span className="label">Beschreibung</span><input name="description" className="input" required maxLength={500} /></label><label className="block"><span className="label">Kosten (€)</span><input name="cost" className="input" inputMode="decimal" /></label><label className="block"><span className="label">Nächste Wartung</span><input type="date" name="nextDue" className="input" /></label><div className="sm:col-span-2"><SubmitButton>Eintragen</SubmitButton></div></ActionForm></Collapse></div>}
          </Card>
          {v.canManage && <Card title="Bearbeiten"><ActionForm action={updateVehicleAction} className="space-y-4"><input type="hidden" name="id" value={id} /><VehicleFields v={v as never} /><SubmitButton>Speichern</SubmitButton></ActionForm></Card>}
        </div>
        <div className="space-y-5">
          <Card title="Kommende Einsätze/Dienste">{v.upcoming.length === 0 ? <p className="text-sm text-fg-muted">Keine Buchungen.</p> : <ul className="space-y-2 text-sm">{v.upcoming.map((s) => <li key={s.id}><Link className="hover:underline" href={`/shifts/${s.id}`}>{s.name}</Link><span className="block text-xs text-fg-muted">{fmtRange(s.startsAt, s.endsAt)}</span></li>)}</ul>}</Card>
          <Card title="Dokumente">{docs.length === 0 ? <p className="text-sm text-fg-muted">Keine Dokumente.</p> : <ul className="space-y-1.5 text-sm">{docs.map((d) => <li key={d.id}><Link className="hover:underline" href={`/documents/${d.id}`}>{d.title}</Link> <span className="text-xs text-fg-muted">{DOC_CATEGORY_LABEL[d.category]}</span></li>)}</ul>}{v.canManage && <Link className="btn btn-sm mt-3" href={`/documents/new?vehicle=${id}`}>Dokument hochladen</Link>}</Card>
          {v.canManage && <ActionButton action={deleteVehicleAction} fields={{ id }} variant="ghost" small={false} label="Fahrzeug löschen" confirm="Fahrzeug löschen?" />}
          <Card title="Notizen"><p className="prose-plain">{v.notes || "–"}</p></Card>
        </div>
      </div>
      <Dl items={[]} />
    </>
  );
}
