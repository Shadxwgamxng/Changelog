import { notFound, redirect } from "next/navigation";
import { requireCtx } from "@/server/session";
import { PageHeader } from "@/components/ui";
import { getShift } from "@/server/services/shifts";
import { listQualTypes } from "@/server/services/qualifications";
import { listEvents } from "@/server/services/events";
import { helperOptions } from "@/server/services/helpers";
import { prisma } from "@/server/db";
import { updateShiftAction } from "../../actions";
import { ShiftForm } from "../../shift-form";

export const metadata = { title: "Dienst bearbeiten" };

export default async function EditShift({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireCtx();
  const s = await getShift(ctx, id).catch(() => null);
  if (!s) notFound();
  if (!s.perms.edit) redirect(`/shifts/${id}`);
  const [qualTypes, events, helpers, reqs] = await Promise.all([listQualTypes(ctx), listEvents(ctx, { from: new Date(Date.now() - 30 * 86_400_000), unitId: s.unitId }), helperOptions(ctx), prisma.shiftRequirement.findMany({ where: { shiftId: id }, include: { qualifications: true }, orderBy: { sortOrder: "asc" } })]);
  return (
    <>
      <PageHeader title="Dienst bearbeiten" back={{ href: `/shifts/${id}`, label: s.name }} subtitle={s.status === "OFFEN" ? "Änderungen an Zeit, Ort oder Beschreibung benachrichtigen die Besatzung automatisch." : undefined} />
      <ShiftForm action={updateShiftAction} submit="Änderungen speichern" units={[{ id: s.unitId, name: s.unitName }]} qualTypes={qualTypes} events={events} helpers={helpers}
        defaults={{ id, unitId: s.unitId, eventId: s.eventId, name: s.name, kind: s.kind, startsAt: s.startsAt, endsAt: s.endsAt, meetingPoint: s.meetingPoint, location: s.location, organizer: s.organizer, description: s.description, responsibleId: s.responsible?.id ?? null,
          requirements: reqs.map((r) => ({ id: r.id, label: r.label, count: r.count, functionKey: r.functionKey, qualTypeIds: r.qualifications.map((q) => q.typeId) })) }} />
    </>
  );
}
