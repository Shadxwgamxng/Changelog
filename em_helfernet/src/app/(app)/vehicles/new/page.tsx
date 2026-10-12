import { requireCtx } from "@/server/session";
import { unitsWith } from "@/server/context";
import { PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { forbidden } from "@/server/errors";
import { createVehicleAction } from "../actions";
import { VehicleFields } from "../vehicle-fields";

export const metadata = { title: "Fahrzeug anlegen" };

export default async function NewVehicle() {
  const ctx = await requireCtx();
  const units = await unitsWith(ctx, "vehicle.manage");
  if (!units.length) throw forbidden();
  return (<><PageHeader title="Fahrzeug anlegen" back={{ href: "/vehicles", label: "Fahrzeuge" }} /><ActionForm action={createVehicleAction} className="card card-pad space-y-4"><VehicleFields units={units} /><SubmitButton>Anlegen</SubmitButton></ActionForm></>);
}
