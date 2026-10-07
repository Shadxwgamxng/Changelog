import { requireCtx } from "@/server/session";
import { unitsWith } from "@/server/context";
import { PageHeader } from "@/components/ui";
import { helperOptions } from "@/server/services/helpers";
import { listVehicles } from "@/server/services/vehicles";
import { listMaterials } from "@/server/services/materials";
import { forbidden } from "@/server/errors";
import { createIncidentAction } from "../actions";
import { IncidentForm } from "../incident-form";

export const metadata = { title: "Einsatz erfassen" };

export default async function NewIncident() {
  const ctx = await requireCtx();
  const units = await unitsWith(ctx, "incident.manage");
  if (!units.length) throw forbidden();
  const [helpers, vehicles, materials] = await Promise.all([helperOptions(ctx), listVehicles(ctx), listMaterials(ctx)]);
  return (<><PageHeader title="Einsatz erfassen" back={{ href: "/incidents", label: "Einsätze" }} /><IncidentForm action={createIncidentAction} units={units} helpers={helpers} vehicles={vehicles} materials={materials} submit="Einsatz speichern" d={{ unitId: units[0].id }} /></>);
}
