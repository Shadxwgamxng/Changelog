import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Car, Clock, ExternalLink, MapPin, Pencil, Trash2, Users, Wallet } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, canDeleteEvent, canEditEvent } from "@/lib/permissions";
import { registrationState } from "@/lib/events";
import { fmtDateLong, fmtDateTime, fmtEuro, fmtTime } from "@/lib/dates";
import { CATEGORY_LABELS, EVENT_TYPE_LABELS, memberName, shortName } from "@/lib/labels";
import { ActionButton } from "@/components/ui/action-button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableWrap, Td, Th } from "@/components/ui/table";
import { AttendanceAdminActions } from "@/components/features/attendance-admin-actions";
import { AttendanceButtons } from "@/components/features/attendance-buttons";
import { AttendanceBadge, EventStatusBadge, OwnershipBadge } from "@/components/features/badges";
import { ParticipationForm } from "@/components/features/participation-form";
import { deleteEvent } from "@/server/actions/events";
import { getEvent } from "@/server/queries/events";
import type { OwnershipStatus } from "@prisma/client";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const e = await db.event.findUnique({ where: { id }, select: { title: true } });
  return { title: e?.title ?? "Termin" };
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const event = await getEvent(id, user.id);
  if (!event) notFound();

  const manage = can(user, "attendance.manage");
  const state = registrationState(event, event.counts.accepted);
  const canEdit = canEditEvent(user, event);

  const [myEquipment, activeMembers] = await Promise.all([
    event.equipment.length
      ? db.userEquipment.findMany({ where: { userId: user.id, equipmentId: { in: event.equipment.map((e) => e.equipmentId) } } })
      : Promise.resolve([]),
    manage
      ? db.user.findMany({ where: { active: true, profile: { isNot: null } }, include: { profile: true }, orderBy: { profile: { lastName: "asc" } } })
      : Promise.resolve([]),
  ]);
  const statusOf = new Map<string, OwnershipStatus>(myEquipment.map((e) => [e.equipmentId, e.status]));

  const attendees = event.attendances.filter((a) => a.user.profile);
  const respondedIds = new Set(attendees.map((a) => a.userId));
  const noResponse = activeMembers.filter((m) => !respondedIds.has(m.id));
  const order = { ACCEPTED: 0, MAYBE: 1, DECLINED: 2 } as const;
  const sorted = [...attendees].sort((a, b) => order[a.status] - order[b.status] || shortName(a.user.profile!).localeCompare(shortName(b.user.profile!)));
  const drivers = attendees.filter((a) => a.canDrive && a.status !== "DECLINED");
  const riders = attendees.filter((a) => a.needsRide && a.status !== "DECLINED");

  return (
    <>
      <Link href="/events" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Alle Termine
      </Link>

      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone="accent">{EVENT_TYPE_LABELS[event.type]}</Badge>
            <EventStatusBadge status={event.effectiveStatus} />
            {event.mine && <AttendanceBadge status={event.mine.status} />}
          </div>
          <h1 className="break-words text-2xl font-semibold uppercase tracking-wide sm:text-3xl">{event.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {fmtDateLong(event.startsAt)} · {fmtTime(event.startsAt)}
            {event.endsAt ? ` – ${fmtTime(event.endsAt)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <ButtonLink href={`/events/${event.id}/edit`} variant="secondary">
              <Pencil className="h-4 w-4" /> Bearbeiten
            </ButtonLink>
          )}
          {canDeleteEvent(user) && (
            <ActionButton
              variant="danger"
              action={deleteEvent} args={[event.id]}
              redirectTo="/events"
              confirm={{ title: "Termin löschen?", message: `„${event.title}“ und alle Zu-/Absagen werden endgültig gelöscht.`, confirmLabel: "Löschen", danger: true }}
            >
              <Trash2 className="h-4 w-4" /> Löschen
            </ActionButton>
          )}
        </div>
      </header>

      {event.effectiveStatus === "CANCELLED" && (
        <div role="alert" className="mb-6 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          Dieser Termin wurde abgesagt.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Teilnahme */}
          <Card tactical>
            <CardHeader title="Deine Teilnahme" icon={<Users className="h-4 w-4" />} />
            <CardBody className="space-y-5">
              <AttendanceButtons eventId={event.id} current={event.mine?.status ?? null} open={state.open} closedReason={state.reason} acceptBlocked={state.acceptBlocked} size="lg" />
              {state.open && (
                <details className="group rounded-md border border-line bg-bg" open={Boolean(event.mine?.needsRide || event.mine?.canDrive || event.mine?.comment)}>
                  <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium">
                    <Car className="h-4 w-4 text-accent-400" /> Mitfahrgelegenheit &amp; Kommentar
                  </summary>
                  <div className="border-t border-line p-4">
                    <ParticipationForm
                      eventId={event.id}
                      values={event.mine ? { status: event.mine.status, needsRide: event.mine.needsRide, canDrive: event.mine.canDrive, freeSeats: event.mine.freeSeats, departureLocation: event.mine.departureLocation, comment: event.mine.comment } : {}}
                    />
                  </div>
                </details>
              )}
            </CardBody>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader title="Details" icon={<CalendarDays className="h-4 w-4" />} />
            <CardBody className="space-y-5">
              {event.description && <p className="whitespace-pre-wrap break-words text-sm text-fg/90">{event.description}</p>}
              <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                <Detail icon={<MapPin className="h-4 w-4" />} label="Veranstaltungsort">
                  <p>{event.location}</p>
                  {event.address && <p className="text-muted">{event.address}</p>}
                  {event.mapsUrl && (
                    <a href={event.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-accent-300 hover:underline">
                      In Google Maps öffnen <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </Detail>
                {event.organizer && (
                  <Detail icon={<Users className="h-4 w-4" />} label="Veranstalter">
                    {event.organizer}
                  </Detail>
                )}
                {event.meetingPoint && (
                  <Detail icon={<MapPin className="h-4 w-4" />} label="Treffpunkt">
                    {event.meetingPoint}
                  </Detail>
                )}
                {event.departureAt && (
                  <Detail icon={<Clock className="h-4 w-4" />} label="Abfahrt">
                    {fmtDateTime(event.departureAt)}
                  </Detail>
                )}
                <Detail icon={<Wallet className="h-4 w-4" />} label="Kosten">
                  {event.costCents === null ? "–" : event.costCents === 0 ? "Kostenlos" : fmtEuro(event.costCents)}
                </Detail>
                {event.registrationDeadline && (
                  <Detail icon={<Clock className="h-4 w-4" />} label="Anmeldefrist">
                    {fmtDateTime(event.registrationDeadline)}
                  </Detail>
                )}
                {event.maxParticipants && (
                  <Detail icon={<Users className="h-4 w-4" />} label="Max. Teilnehmer">
                    {event.maxParticipants}
                  </Detail>
                )}
              </dl>
            </CardBody>
          </Card>

          {/* Teilnehmer */}
          <Card>
            <CardHeader title="Teilnehmer" icon={<Users className="h-4 w-4" />} />
            <div className="grid grid-cols-3 divide-x divide-line border-b border-line text-center">
              <Count value={event.counts.accepted} label="zugesagt" tone="text-ok" />
              <Count value={event.counts.maybe} label="vielleicht" tone="text-warn" />
              <Count value={event.counts.declined} label="abgesagt" tone="text-danger" />
            </div>
            {sorted.length === 0 ? (
              <EmptyState title="Noch keine Antworten">Sei der Erste und sag zu!</EmptyState>
            ) : manage ? (
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <Th>Spieler</Th>
                      <Th>Status</Th>
                      <Th>Fahrer</Th>
                      <Th>Kommentar</Th>
                      <Th className="text-right">Aktion</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((a) => (
                      <tr key={a.id}>
                        <Td>
                          <div className="flex items-center gap-2.5">
                            <Avatar src={a.user.profile!.avatarUrl} name={shortName(a.user.profile!)} size="sm" />
                            <span className="font-medium">{shortName(a.user.profile!)}</span>
                            {!a.user.active && <Badge tone="danger">inaktiv</Badge>}
                          </div>
                        </Td>
                        <Td>
                          <AttendanceBadge status={a.status} />
                        </Td>
                        <Td>{a.canDrive ? `Ja${a.freeSeats !== null ? ` (${a.freeSeats} Plätze)` : ""}` : "Nein"}</Td>
                        <Td className="max-w-[16rem] text-muted">
                          {[a.needsRide ? "Suche Mitfahrgelegenheit" : null, a.departureLocation ? `ab ${a.departureLocation}` : null, a.comment].filter(Boolean).join(" · ") || "–"}
                        </Td>
                        <Td>
                          <AttendanceAdminActions eventId={event.id} userId={a.userId} name={shortName(a.user.profile!)} hasResponse values={{ status: a.status, needsRide: a.needsRide, canDrive: a.canDrive, freeSeats: a.freeSeats, departureLocation: a.departureLocation, comment: a.comment }} />
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            ) : (
              <ul className="divide-y divide-line">
                {sorted.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar src={a.user.profile!.avatarUrl} name={shortName(a.user.profile!)} size="sm" />
                      <span className="truncate text-sm font-medium">{shortName(a.user.profile!)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {a.canDrive && a.status !== "DECLINED" && <Badge tone="info">Fahrer</Badge>}
                      {a.needsRide && a.status !== "DECLINED" && <Badge tone="warn">Sucht Mitfahrt</Badge>}
                      <AttendanceBadge status={a.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {manage && noResponse.length > 0 && (
              <div className="border-t border-line p-4 sm:p-5">
                <p className="label-caps mb-3">Noch keine Antwort ({noResponse.length})</p>
                <ul className="divide-y divide-line/60">
                  {noResponse.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="flex items-center gap-2.5 text-sm">
                        <Avatar src={m.profile!.avatarUrl} name={shortName(m.profile!)} size="xs" />
                        {memberName(m.profile!)}
                      </span>
                      <AttendanceAdminActions eventId={event.id} userId={m.id} name={shortName(m.profile!)} hasResponse={false} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {/* Mitfahrbörse */}
          {(drivers.length > 0 || riders.length > 0) && (
            <Card>
              <CardHeader title="Mitfahrbörse" icon={<Car className="h-4 w-4" />} />
              <CardBody className="space-y-4 text-sm">
                {drivers.length > 0 && (
                  <div>
                    <p className="label-caps mb-1.5">Fahrer</p>
                    <ul className="space-y-1">
                      {drivers.map((d) => (
                        <li key={d.id}>
                          <strong>{shortName(d.user.profile!)}</strong>
                          <span className="text-muted">
                            {d.freeSeats !== null ? ` · ${d.freeSeats} freie Plätze` : ""}
                            {d.departureLocation ? ` · ab ${d.departureLocation}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {riders.length > 0 && (
                  <div>
                    <p className="label-caps mb-1.5">Suchen Mitfahrgelegenheit</p>
                    <ul className="space-y-1">
                      {riders.map((d) => (
                        <li key={d.id}>
                          <strong>{shortName(d.user.profile!)}</strong>
                          {d.departureLocation && <span className="text-muted"> · ab {d.departureLocation}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Ausrüstung */}
          <Card>
            <CardHeader title="Benötigte Ausrüstung" />
            {event.equipment.length === 0 ? (
              <EmptyState title="Keine besonderen Vorgaben" />
            ) : (
              <ul className="divide-y divide-line">
                {event.equipment.map(({ equipment: e }) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm sm:px-5">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{e.name}</span>
                      <span className="text-xs text-subtle">{CATEGORY_LABELS[e.category]}</span>
                    </span>
                    <OwnershipBadge status={statusOf.get(e.id) ?? "MISSING"} />
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t border-line p-3">
              <ButtonLink href="/equipment" variant="ghost" size="sm" className="w-full">
                Meine Ausrüstung öffnen
              </ButtonLink>
            </div>
          </Card>
          {event.createdBy?.profile && <p className="text-xs text-subtle">Erstellt von {shortName(event.createdBy.profile)}</p>}
        </div>
      </div>
    </>
  );
}

function Detail({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-subtle">{icon}</span>
      <div className="min-w-0">
        <dt className="label-caps">{label}</dt>
        <dd className="mt-0.5 break-words">{children}</dd>
      </div>
    </div>
  );
}

function Count({ value, label, tone }: { value: number; label: string; tone: string }) {
  return (
    <div className="px-2 py-3">
      <p className={`font-display text-2xl font-semibold ${tone}`}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
