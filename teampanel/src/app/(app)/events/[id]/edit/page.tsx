import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canEditEvent } from "@/lib/permissions";
import { dateToLocalInput } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { EventForm } from "@/components/features/event-form";

export const metadata: Metadata = { title: "Termin bearbeiten" };

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const event = await db.event.findUnique({ where: { id }, include: { equipment: { select: { equipmentId: true } } } });
  if (!event || !canEditEvent(user, event)) notFound();
  const equipment = await db.equipment.findMany({ orderBy: [{ required: "desc" }, { name: "asc" }], select: { id: true, name: true, category: true, required: true } });
  return (
    <>
      <PageHeader eyebrow="Termine" title="Termin bearbeiten" subtitle={event.title} />
      <EventForm
        equipment={equipment}
        values={{
          id: event.id,
          title: event.title,
          type: event.type,
          status: event.status,
          startsAt: dateToLocalInput(event.startsAt),
          endsAt: dateToLocalInput(event.endsAt),
          location: event.location,
          address: event.address ?? "",
          mapsUrl: event.mapsUrl ?? "",
          organizer: event.organizer ?? "",
          description: event.description ?? "",
          meetingPoint: event.meetingPoint ?? "",
          departureAt: dateToLocalInput(event.departureAt),
          cost: event.costCents !== null ? (event.costCents / 100).toFixed(2).replace(".", ",") : "",
          registrationDeadline: dateToLocalInput(event.registrationDeadline),
          maxParticipants: event.maxParticipants?.toString() ?? "",
          equipmentIds: event.equipment.map((e) => e.equipmentId),
        }}
      />
    </>
  );
}
