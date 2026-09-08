import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, MapPin, Tag } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate, formatTime } from "@/lib/utils";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const event = await prisma.event.findUnique({ where: { slug: params.slug } });
  if (!event) return {};
  return { title: event.title, description: event.description.slice(0, 160) };
}

export default async function EventDetailPage({ params }: { params: { slug: string } }) {
  const event = await prisma.event.findUnique({ where: { slug: params.slug } });
  if (!event || !event.isPublic) notFound();

  return (
    <article className="container-page max-w-3xl py-10 lg:py-14">
      <Link href="/veranstaltungen" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-brand-600 dark:text-ink-400">
        <ArrowLeft className="h-4 w-4" /> Zurück zu den Veranstaltungen
      </Link>

      {event.imageUrl && (
        <div className="relative mb-6 aspect-[16/9] w-full overflow-hidden rounded-2xl bg-ink-100 dark:bg-ink-800">
          <Image src={event.imageUrl} alt={event.title} fill priority sizes="100vw" className="object-cover" />
        </div>
      )}

      {event.category && (
        <span className="mb-3 inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
          {event.category}
        </span>
      )}
      <h1 className="font-display text-3xl font-extrabold text-ink-900 dark:text-white">{event.title}</h1>

      <div className="mt-5 grid gap-3 rounded-2xl border border-ink-200 bg-ink-50 p-5 dark:border-ink-800 dark:bg-ink-900/40 sm:grid-cols-2">
        <div className="flex items-center gap-2.5 text-sm text-ink-700 dark:text-ink-200">
          <CalendarDays className="h-4 w-4 text-brand-600" />
          {formatDate(event.startsAt)}
        </div>
        <div className="flex items-center gap-2.5 text-sm text-ink-700 dark:text-ink-200">
          <Clock className="h-4 w-4 text-brand-600" />
          {formatTime(event.startsAt)} Uhr{event.endsAt ? ` – ${formatTime(event.endsAt)} Uhr` : ""}
        </div>
        <div className="flex items-center gap-2.5 text-sm text-ink-700 dark:text-ink-200">
          <MapPin className="h-4 w-4 text-brand-600" />
          {event.location}
        </div>
        {event.address && (
          <div className="flex items-center gap-2.5 text-sm text-ink-700 dark:text-ink-200">
            <Tag className="h-4 w-4 text-brand-600" />
            {event.address}
          </div>
        )}
      </div>

      <div className="prose-article mt-8 whitespace-pre-line">{event.description}</div>
    </article>
  );
}
