import { notFound, redirect } from "next/navigation";
import { requireCtx } from "@/server/session";
import { PageHeader } from "@/components/ui";
import { getEvent } from "@/server/services/events";
import { updateEventAction } from "../../actions";
import { EventForm } from "../../event-form";

export const metadata = { title: "Veranstaltung bearbeiten" };

export default async function EditEvent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireCtx();
  const e = await getEvent(ctx, id).catch(() => null);
  if (!e) notFound();
  if (!e.canManage) redirect(`/events/${id}`);
  return (<><PageHeader title="Veranstaltung bearbeiten" back={{ href: `/events/${id}`, label: e.name }} subtitle="Änderungen an Zeit oder Ort benachrichtigen die eingeteilten Helfer." /><EventForm action={updateEventAction} units={[{ id: e.unitId, name: e.unitName }]} submit="Speichern" defaults={{ id, unitId: e.unitId, name: e.name, description: e.description, startsAt: e.startsAt, endsAt: e.endsAt, location: e.location, organizer: e.organizer, tasks: e.tasks }} /></>);
}
