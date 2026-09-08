import Link from "next/link";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { formatTime } from "@/lib/utils";

interface EventCardData {
  title: string;
  slug: string;
  description: string;
  startsAt: Date | string;
  location: string;
}

export function EventCard({ event }: { event: EventCardData }) {
  return (
    <div className="flex gap-3 rounded-xl border border-ink-200 bg-white p-3.5 shadow-card dark:border-ink-800 dark:bg-ink-900">
      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-brand-600 text-white">
        <span className="text-[11px] font-medium uppercase leading-none">
          {new Intl.DateTimeFormat("de-DE", { month: "short" }).format(new Date(event.startsAt))}
        </span>
        <span className="text-lg font-bold leading-tight">
          {new Intl.DateTimeFormat("de-DE", { day: "2-digit" }).format(new Date(event.startsAt))}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="truncate font-display text-sm font-bold text-ink-900 dark:text-white">
          <Link href={`/veranstaltungen/${event.slug}`} className="hover:text-brand-600">
            {event.title}
          </Link>
        </h4>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-500 dark:text-ink-400">
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {formatTime(event.startsAt)} Uhr</span>
          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {event.location}</span>
        </div>
        <p className="mt-1.5 line-clamp-2 text-xs text-ink-600 dark:text-ink-400">{event.description}</p>
        <Link href={`/veranstaltungen/${event.slug}`} className="mt-1.5 inline-block text-xs font-semibold text-brand-600 hover:underline">
          Details ansehen →
        </Link>
      </div>
    </div>
  );
}
