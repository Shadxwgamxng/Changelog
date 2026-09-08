import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate, formatTime, cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Veranstaltungen",
  description: "Alle öffentlichen Veranstaltungen von Feuerwehr, Rettungsdienst und Polizei im Überblick.",
};

export default async function EventsPage({
  searchParams,
}: {
  searchParams: { kategorie?: string; suche?: string; zeitraum?: string };
}) {
  const now = new Date();
  const timeframe = searchParams.zeitraum === "vergangen" ? "past" : "upcoming";

  const categories = await prisma.event.findMany({
    where: { isPublic: true, category: { not: null } },
    select: { category: true },
    distinct: ["category"],
  });

  const where = {
    isPublic: true,
    ...(timeframe === "upcoming" ? { startsAt: { gte: now } } : { startsAt: { lt: now } }),
    ...(searchParams.kategorie ? { category: searchParams.kategorie } : {}),
    ...(searchParams.suche
      ? {
          OR: [
            { title: { contains: searchParams.suche } },
            { description: { contains: searchParams.suche } },
            { location: { contains: searchParams.suche } },
          ],
        }
      : {}),
  };

  const events = await prisma.event.findMany({
    where,
    orderBy: { startsAt: timeframe === "upcoming" ? "asc" : "desc" },
  });

  return (
    <div className="container-page py-10 lg:py-14">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-extrabold text-ink-900 dark:text-white">Veranstaltungen</h1>
        <p className="mt-2 text-ink-600 dark:text-ink-400">
          Übungen, Tage der offenen Tür und öffentliche Termine von BOS-Organisationen in der Region.
        </p>
      </header>

      <form className="mb-8 flex flex-wrap items-end gap-3" method="get">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">Suche</label>
          <input
            type="text"
            name="suche"
            defaultValue={searchParams.suche}
            placeholder="Titel, Ort oder Beschreibung…"
            className="w-full rounded-lg border border-ink-300 bg-white px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-600 dark:bg-ink-900"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">Kategorie</label>
          <select
            name="kategorie"
            defaultValue={searchParams.kategorie ?? ""}
            className="rounded-lg border border-ink-300 bg-white px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-600 dark:bg-ink-900"
          >
            <option value="">Alle</option>
            {categories.filter((c) => c.category).map((c) => (
              <option key={c.category} value={c.category!}>{c.category}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">Zeitraum</label>
          <select
            name="zeitraum"
            defaultValue={searchParams.zeitraum ?? "kommend"}
            className="rounded-lg border border-ink-300 bg-white px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-600 dark:bg-ink-900"
          >
            <option value="kommend">Kommende</option>
            <option value="vergangen">Vergangene</option>
          </select>
        </div>
        <button type="submit" className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
          Filtern
        </button>
      </form>

      {events.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/veranstaltungen/${event.slug}`}
              className={cn(
                "group flex flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-soft dark:border-ink-800 dark:bg-ink-900",
              )}
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-ink-100 dark:bg-ink-800">
                {event.imageUrl ? (
                  <Image src={event.imageUrl} alt={event.title} fill sizes="400px" className="object-cover transition duration-300 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full items-center justify-center text-ink-300"><CalendarDays className="h-8 w-8" /></div>
                )}
                {event.category && (
                  <span className="absolute left-3 top-3 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white">
                    {event.category}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <h3 className="font-display text-lg font-bold leading-snug text-ink-900 dark:text-white">{event.title}</h3>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-500 dark:text-ink-400">
                  <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {formatDate(event.startsAt)}</span>
                  <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatTime(event.startsAt)} Uhr</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {event.location}</span>
                </div>
                <p className="line-clamp-2 flex-1 text-sm text-ink-600 dark:text-ink-400">{event.description}</p>
                <span className="mt-2 inline-flex w-fit items-center gap-1 text-sm font-semibold text-brand-600">Details →</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-ink-300 p-8 text-center text-ink-500 dark:border-ink-700">
          Keine Veranstaltungen gefunden.
        </p>
      )}
    </div>
  );
}
