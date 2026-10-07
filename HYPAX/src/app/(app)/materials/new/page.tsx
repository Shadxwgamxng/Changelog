import { requireCtx } from "@/server/session";
import { unitsWith } from "@/server/context";
import { PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { helperOptions } from "@/server/services/helpers";
import { forbidden } from "@/server/errors";
import { createMaterialAction } from "../actions";
import { MaterialFields } from "../material-fields";

export const metadata = { title: "Material anlegen" };

export default async function NewMaterial() {
  const ctx = await requireCtx();
  const units = await unitsWith(ctx, "material.manage");
  if (!units.length) throw forbidden();
  return (<><PageHeader title="Material anlegen" back={{ href: "/materials", label: "Material" }} /><ActionForm action={createMaterialAction} className="card card-pad space-y-4"><MaterialFields units={units} helpers={await helperOptions(ctx)} /><SubmitButton>Anlegen</SubmitButton></ActionForm></>);
}
