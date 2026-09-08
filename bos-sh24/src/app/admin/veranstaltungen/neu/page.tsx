import { EventForm } from "@/components/admin/EventForm";

export const metadata = { title: "Neue Veranstaltung" };

export default function NewEventPage() {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-ink-900 dark:text-white">Neue Veranstaltung</h1>
      <EventForm />
    </div>
  );
}
