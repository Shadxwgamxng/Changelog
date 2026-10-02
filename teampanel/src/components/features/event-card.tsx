import Link from "next/link";
import { CalendarDays, Clock, MapPin, Users } from "lucide-react";
import type { AttendanceStatus, EventStatus, EventType } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import { fmtDateLong, fmtTime } from "@/lib/dates";
import { AttendanceBadge, EventStatusBadge } from "./badges";

export interface EventCardData {
  id: string;
  title: string;
  type: EventType;
  startsAt: Date;
  endsAt: Date | null;
  location: string;
  maxParticipants: number | null;
  effectiveStatus: EventStatus;
  counts: { accepted: number; maybe: number; declined: number };
  mine: AttendanceStatus | null;
}

export function EventCard({ event }: { event: EventCardData }) {
  const dim = event.effectiveStatus === "COMPLETED" || event.effectiveStatus === "CANCELLED";
  return (
    <Link href={`/events/${event.id}`} className="group block focus-visible:rounded-lg">
      <Card className={`h-full p-4 transition-colors group-hover:border-accent-600/60 sm:p-5 ${dim ? "opacity-75" : ""}`}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge tone="accent">{EVENT_TYPE_LABELS[event.type]}</Badge>
          <EventStatusBadge status={event.effectiveStatus} />
          {event.mine && <AttendanceBadge status={event.mine} />}
        </div>
        <h3 className="text-lg font-semibold uppercase tracking-wide text-fg group-hover:text-accent-300">{event.title}</h3>
        <dl className="mt-3 space-y-1.5 text-sm text-muted">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-subtle" />
            <dd>{fmtDateLong(event.startsAt)}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-subtle" />
            <dd>
              {fmtTime(event.startsAt)}
              {event.endsAt ? ` – ${fmtTime(event.endsAt)}` : ""}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-subtle" />
            <dd className="truncate">{event.location}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0 text-subtle" />
            <dd>
              {event.counts.accepted}
              {event.maxParticipants ? ` / ${event.maxParticipants}` : ""} Zusagen
              {event.counts.maybe > 0 && <span className="text-subtle"> · {event.counts.maybe} vielleicht</span>}
            </dd>
          </div>
        </dl>
      </Card>
    </Link>
  );
}
