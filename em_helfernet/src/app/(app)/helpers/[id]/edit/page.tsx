import { notFound, redirect } from "next/navigation";
import { requireCtx } from "@/server/session";
import { unitsWith } from "@/server/context";
import { PageHeader } from "@/components/ui";
import { getHelper, listGroups } from "@/server/services/helpers";
import { updateHelperAction } from "../../actions";
import { HelperForm } from "../../helper-form";

export const metadata = { title: "Helfer bearbeiten" };

export default async function EditHelper({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireCtx();
  const h = await getHelper(ctx, id).catch(() => null);
  if (!h) notFound();
  if (!h.access.edit) redirect(`/helpers/${id}`);
  const units = await unitsWith(ctx, "helper.edit");
  return (
    <>
      <PageHeader title={`${h.firstName} ${h.lastName} bearbeiten`} back={{ href: `/helpers/${id}`, label: "Profil" }} />
      <HelperForm action={updateHelperAction} h={h as never} units={units} groups={await listGroups(ctx)} submit="Änderungen speichern" />
    </>
  );
}
