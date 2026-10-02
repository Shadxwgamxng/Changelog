import type { Metadata } from "next";
import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { dateToLocalInput, addDays } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { EventForm } from "@/components/features/event-form";

export const metadata: Metadata = { title: "Neuer Termin" };

export default async function NewEventPage() {
  await requirePagePermission("events.create");
  const equipment = await db.equipment.findMany({ orderBy: [{ required: "desc" }, { name: "asc" }], select: { id: true, name: true, category: true, required: true } });
  const defaultStart = dateToLocalInput(addDays(new Date(), 14)).slice(0, 11) + "09:00";
  return (
    <>
      <PageHeader eyebrow="Termine" title="Neuer Termin" />
      <EventForm values={{ startsAt: defaultStart }} equipment={equipment} />
    </>
  );
}
