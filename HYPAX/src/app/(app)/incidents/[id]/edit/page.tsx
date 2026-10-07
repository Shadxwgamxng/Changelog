import { notFound, redirect } from "next/navigation";
import { requireCtx } from "@/server/session";
import { PageHeader } from "@/components/ui";
import { getIncident } from "@/server/services/incidents";
import { helperOptions } from "@/server/services/helpers";
import { listVehicles } from "@/server/services/vehicles";
import { listMaterials } from "@/server/services/materials";
import { updateIncidentAction } from "../../actions";
import { IncidentForm } from "../../incident-form";

export const metadata = { title: "Einsatz bearbeiten" };

export default async function EditIncident({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireCtx();
  const i = await getIncident(ctx, id).catch(() => null);
  if (!i) notFound();
  if (!i.canManage) redirect(`/incidents/${id}`);
  const [helpers, vehicles, materials] = await Promise.all([helperOptions(ctx, i.unitId), listVehicles(ctx, { unitId: i.unitId }), listMaterials(ctx, { unitId: i.unitId })]);
  return (<><PageHeader title={`Einsatz ${i.number} bearbeiten`} back={{ href: `/incidents/${id}`, label: "Einsatz" }} /><IncidentForm action={updateIncidentAction} units={[{ id: i.unitId, name: i.unitName }]} helpers={helpers} vehicles={vehicles} materials={materials} submit="Speichern" d={{ id, unitId: i.unitId, number: i.number, kind: i.kind, alertedAt: i.alertedAt, startedAt: i.startedAt, endedAt: i.endedAt, location: i.location, documentation: i.documentation, helpers: i.helpers.map((h) => ({ helperId: h.helperId, role: h.role })), vehicleIds: i.vehicles.map((v) => v.vehicleId), materials: i.materials.map((m) => ({ materialId: m.materialId, quantity: m.quantity })) }} /></>);
}
