import { requireCtx } from "@/server/session";
import { unitsWith } from "@/server/context";
import { PageHeader } from "@/components/ui";
import { listGroups } from "@/server/services/helpers";
import { forbidden } from "@/server/errors";
import { createHelperAction } from "../actions";
import { HelperForm } from "../helper-form";

export const metadata = { title: "Helfer anlegen" };

export default async function NewHelper() {
  const ctx = await requireCtx();
  const units = await unitsWith(ctx, "helper.create");
  if (!units.length) throw forbidden();
  return (
    <>
      <PageHeader title="Helfer anlegen" back={{ href: "/helpers", label: "Helfer" }} subtitle="Ein Benutzerkonto für die Anmeldung kannst du danach im Profil anlegen." />
      <HelperForm action={createHelperAction} units={units} groups={await listGroups(ctx)} submit="Helfer anlegen" />
    </>
  );
}
