import { requireCtx } from "@/server/session";
import { unitsWith } from "@/server/context";
import { PageHeader } from "@/components/ui";
import { forbidden } from "@/server/errors";
import { createEventAction } from "../actions";
import { EventForm } from "../event-form";
import { parseBerlinLocal } from "@/lib/dates";

export const metadata = { title: "Veranstaltung anlegen" };

export default async function NewEvent() {
  const ctx = await requireCtx();
  const units = await unitsWith(ctx, "event.manage");
  if (!units.length) throw forbidden();
  const d = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
  return (<><PageHeader title="Veranstaltung anlegen" back={{ href: "/events", label: "Veranstaltungen" }} /><EventForm action={createEventAction} units={units} submit="Veranstaltung anlegen" defaults={{ unitId: units[0].id, startsAt: parseBerlinLocal(`${d}T14:00`)!, endsAt: parseBerlinLocal(`${d}T22:00`)! }} /></>);
}
