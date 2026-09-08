import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EventForm } from "@/components/admin/EventForm";

export const metadata = { title: "Veranstaltung bearbeiten" };

function toLocalInput(date: Date | null) {
  if (!date) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default async function EditEventPage({ params }: { params: { id: string } }) {
  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) notFound();

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-ink-900 dark:text-white">Veranstaltung bearbeiten</h1>
      <EventForm
        initial={{
          id: event.id,
          title: event.title,
          description: event.description,
          imageUrl: event.imageUrl ?? "",
          startsAt: toLocalInput(event.startsAt),
          endsAt: toLocalInput(event.endsAt),
          location: event.location,
          address: event.address ?? "",
          category: event.category ?? "",
          isPublic: event.isPublic,
        }}
      />
    </div>
  );
}
