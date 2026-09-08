import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { formatDate, formatTime } from "@/lib/utils";

export const metadata = { title: "Veranstaltungen verwalten" };

export default async function AdminEventsPage() {
  const events = await prisma.event.findMany({ orderBy: { startsAt: "desc" } });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-extrabold text-ink-900 dark:text-white">Veranstaltungen</h1>
        <Link href="/admin/veranstaltungen/neu" className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
          <PlusCircle className="h-4 w-4" /> Neue Veranstaltung
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-ink-200 bg-white shadow-card dark:border-ink-800 dark:bg-ink-900">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-ink-200 text-xs uppercase text-ink-500 dark:border-ink-800 dark:text-ink-400">
            <tr>
              <th className="px-4 py-3">Titel</th>
              <th className="px-4 py-3">Datum</th>
              <th className="px-4 py-3">Ort</th>
              <th className="px-4 py-3">Sichtbarkeit</th>
              <th className="px-4 py-3 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
            {events.map((event) => (
              <tr key={event.id} className="hover:bg-ink-50 dark:hover:bg-ink-800/40">
                <td className="px-4 py-3 font-medium text-ink-900 dark:text-white">{event.title}</td>
                <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{formatDate(event.startsAt)}, {formatTime(event.startsAt)} Uhr</td>
                <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{event.location}</td>
                <td className="px-4 py-3"><Badge color={event.isPublic ? "green" : "gray"}>{event.isPublic ? "Öffentlich" : "Privat"}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Link href={`/admin/veranstaltungen/${event.id}`} className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40">Bearbeiten</Link>
                    <DeleteButton url={`/api/admin/events/${event.id}`} confirmText={`„${event.title}“ wirklich löschen?`} />
                  </div>
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-500 dark:text-ink-400">Noch keine Veranstaltungen vorhanden.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
