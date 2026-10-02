import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle, ArrowRight, CalendarDays, Clock, ExternalLink, MapPin, Megaphone, ShieldCheck, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { registrationState } from "@/lib/events";
import { daysBetween, fmtDate, fmtDateLong, fmtTime } from "@/lib/dates";
import { CATEGORY_LABELS, EVENT_TYPE_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { AttendanceButtons } from "@/components/features/attendance-buttons";
import { AnnouncementCard } from "@/components/features/announcement-card";
import { AttendanceBadge, EventStatusBadge } from "@/components/features/badges";
import { getNextEvent, listEvents } from "@/server/queries/events";
import { listAnnouncements } from "@/server/queries/announcements";
import { getEquipmentSummary } from "@/server/queries/equipment";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const [next, announcements, equipment, upcoming, memberCounts] = await Promise.all([
    getNextEvent(user.id),
    listAnnouncements(user, {}, 4),
    getEquipmentSummary(user.id),
    listEvents(user.id, { range: "upcoming" }),
    Promise.all([db.user.count({ where: { profile: { isNot: null } } }), db.user.count({ where: { active: true } })]),
  ]);
  const [totalMembers, activeMembers] = memberCounts;
  const upcomingActive = upcoming.filter((e) => e.effectiveStatus !== "CANCELLED" && e.effectiveStatus !== "COMPLETED");
  const urgent = announcements.filter((a) => a.priority === "URGENT");
  const nextState = next ? registrationState(next, next.counts.accepted) : null;
  const daysToNext = next ? daysBetween(new Date(), next.startsAt) : null;
  const pct = equipment.requiredTotal ? Math.round((equipment.requiredOwned / equipment.requiredTotal) * 100) : 100;

  return (
    <>
      <PageHeader eyebrow="Dashboard" title={`Moin, ${user.firstName}!`} subtitle="Schön, dass du da bist. Hier ist der aktuelle Stand im Team." />

      {urgent.length > 0 && (
        <div className="mb-6 space-y-3">
          {urgent.map((a) => (
            <Link key={a.id} href="/announcements" className="flex items-start gap-3 rounded-lg border border-danger/60 bg-danger/10 p-4 transition-colors hover:bg-danger/15">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
              <div className="min-w-0">
                <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-danger">Dringende Ankündigung</p>
                <p className="mt-0.5 font-medium text-fg">{a.title}</p>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted">{a.body}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Nächster Spieltag */}
        <Card tactical className="lg:col-span-2">
          <CardHeader title="Nächster Termin" icon={<CalendarDays className="h-4 w-4" />} action={next && <Link href={`/events/${next.id}`} className="text-xs text-accent-300 hover:underline">Details</Link>} />
          {next ? (
            <CardBody className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent">{EVENT_TYPE_LABELS[next.type]}</Badge>
                <EventStatusBadge status={next.effectiveStatus} />
                {next.mine && <AttendanceBadge status={next.mine} />}
                {daysToNext !== null && <Badge>{daysToNext <= 0 ? "Heute" : daysToNext === 1 ? "Morgen" : `in ${daysToNext} Tagen`}</Badge>}
              </div>
              <h3 className="text-2xl font-semibold uppercase tracking-wide">
                <Link href={`/events/${next.id}`} className="hover:text-accent-300">
                  {next.title}
                </Link>
              </h3>
              <dl className="grid gap-2 text-sm text-muted sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-subtle" />
                  <dd>{fmtDateLong(next.startsAt)}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-subtle" />
                  <dd>
                    {fmtTime(next.startsAt)}
                    {next.endsAt ? ` – ${fmtTime(next.endsAt)}` : ""}
                  </dd>
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <MapPin className="h-4 w-4 shrink-0 text-subtle" />
                  <dd className="flex min-w-0 flex-wrap items-center gap-x-2">
                    <span className="truncate">{next.location}</span>
                    {next.mapsUrl && (
                      <a href={next.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent-300 hover:underline">
                        Karte <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </dd>
                </div>
              </dl>
              {next.description && <p className="line-clamp-3 text-sm text-fg/90">{next.description}</p>}
              <div className="flex items-center gap-4 rounded-md border border-line bg-bg px-4 py-3 text-sm">
                <Users className="h-5 w-5 text-accent-400" />
                <span>
                  <strong className="font-display text-xl text-fg">{next.counts.accepted}</strong>
                  {next.maxParticipants ? <span className="text-muted"> / {next.maxParticipants}</span> : null} Zusagen
                </span>
                <span className="text-muted">· {next.counts.maybe} vielleicht · {next.counts.declined} Absagen</span>
              </div>
              <AttendanceButtons eventId={next.id} current={next.mine} open={nextState?.open ?? false} closedReason={nextState?.reason} acceptBlocked={nextState?.acceptBlocked} size="lg" />
            </CardBody>
          ) : (
            <EmptyState icon={<CalendarDays className="h-8 w-8" />} title="Kein Termin geplant">
              Sobald die Teamleitung einen Spieltag anlegt, erscheint er hier.
            </EmptyState>
          )}
        </Card>

        <div className="space-y-6">
          {/* Teamübersicht */}
          <Card tactical>
            <CardHeader title="Teamübersicht" icon={<Users className="h-4 w-4" />} />
            <CardBody className="grid grid-cols-2 gap-4">
              <div>
                <p className="label-caps">Mitglieder</p>
                <p className="font-display text-3xl font-semibold">{totalMembers}</p>
              </div>
              <div>
                <p className="label-caps">Aktiv</p>
                <p className="font-display text-3xl font-semibold text-accent-300">{activeMembers}</p>
              </div>
              <div className="col-span-2 border-t border-line pt-3 text-sm text-muted">
                <p>
                  <span className="text-fg">{upcomingActive.length}</span> bevorstehende{upcomingActive.length === 1 ? "r Termin" : " Termine"}
                </p>
                {next && (
                  <p className="mt-1">
                    Nächster: <span className="text-fg">{next.title}</span> am {fmtDate(next.startsAt)}
                  </p>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Ausrüstung */}
          <Card tactical>
            <CardHeader title="Meine Ausrüstung" icon={<ShieldCheck className="h-4 w-4" />} action={<Link href="/equipment" className="text-xs text-accent-300 hover:underline">Öffnen</Link>} />
            <CardBody className="space-y-3">
              <p className="text-sm">
                <strong className="font-display text-xl">{equipment.requiredOwned}</strong> von {equipment.requiredTotal} Pflichtgegenständen vorhanden
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-bg" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Pflichtausrüstung">
                <div className={`h-full rounded-full ${pct === 100 ? "bg-ok" : "bg-accent-500"}`} style={{ width: `${pct}%` }} />
              </div>
              {equipment.missingRequired.length > 0 ? (
                <ul className="space-y-1.5 text-sm">
                  {equipment.missingRequired.slice(0, 4).map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">
                        <span aria-hidden>🔴</span> {e.name} <span className="text-xs text-subtle">({CATEGORY_LABELS[e.category]})</span>
                      </span>
                      {e.shopUrl && (
                        <a href={e.shopUrl} target="_blank" rel="noopener noreferrer nofollow" className="shrink-0 text-xs text-accent-300 hover:underline">
                          Zum Shop
                        </a>
                      )}
                    </li>
                  ))}
                  {equipment.missingRequired.length > 4 && <li className="text-xs text-subtle">… und {equipment.missingRequired.length - 4} weitere</li>}
                </ul>
              ) : (
                <p className="text-sm text-ok">Alles Pflichtmaterial vorhanden. 👍</p>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Ankündigungen */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-sm font-medium uppercase tracking-[0.12em]">
              <Megaphone className="h-4 w-4 text-accent-400" /> Ankündigungen
            </h2>
            <Link href="/announcements" className="inline-flex items-center gap-1 text-xs text-accent-300 hover:underline">
              Alle ansehen <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {announcements.length === 0 ? (
            <Card>
              <EmptyState title="Keine Ankündigungen">Aktuell gibt es keine Neuigkeiten.</EmptyState>
            </Card>
          ) : (
            <div className="space-y-4">
              {announcements.slice(0, 3).map((a) => (
                <AnnouncementCard key={a.id} item={a} compact />
              ))}
            </div>
          )}
        </div>

        {/* Bevorstehende Events */}
        <Card className="self-start">
          <CardHeader title="Bevorstehend" action={<Link href="/events" className="text-xs text-accent-300 hover:underline">Alle</Link>} />
          {upcomingActive.length === 0 ? (
            <EmptyState title="Nichts geplant" />
          ) : (
            <ul className="divide-y divide-line">
              {upcomingActive.slice(0, 5).map((e) => (
                <li key={e.id}>
                  <Link href={`/events/${e.id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-elevated sm:px-5">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{e.title}</span>
                      <span className="text-xs text-muted">{fmtDate(e.startsAt)} · {fmtTime(e.startsAt)}</span>
                    </span>
                    {e.mine ? <AttendanceBadge status={e.mine} /> : <Badge tone="warn">Offen</Badge>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-line p-3">
            <ButtonLink href="/calendar" variant="ghost" size="sm" className="w-full">
              <CalendarDays className="h-4 w-4" /> Zum Kalender
            </ButtonLink>
          </div>
        </Card>
      </div>
    </>
  );
}
