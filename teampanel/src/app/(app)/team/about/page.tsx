import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Calendar, Globe, Mail, MapPin, Pencil, Phone, ScrollText } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { fmtDate, fmtTime } from "@/lib/dates";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { RoleBadge } from "@/components/features/badges";
import { listEvents } from "@/server/queries/events";
import { listMembers } from "@/server/queries/members";
import { getTeamSettings } from "@/server/queries/team";
import { teamTabs } from "@/components/features/team-tabs";

export const metadata: Metadata = { title: "Teamprofil" };

export default async function TeamAboutPage() {
  const user = await requireUser();
  const [team, members, events] = await Promise.all([getTeamSettings(), listMembers(user, { status: "active" }), listEvents(user.id, { range: "upcoming" })]);
  const next = events.filter((e) => e.effectiveStatus !== "CANCELLED" && e.effectiveStatus !== "COMPLETED").slice(0, 3);
  const socials = [
    { label: "Website", url: team.websiteUrl },
    { label: "Discord", url: team.discordUrl },
    { label: "Instagram", url: team.instagramUrl },
    { label: "Facebook", url: team.facebookUrl },
    { label: "YouTube", url: team.youtubeUrl },
  ].filter((s): s is { label: string; url: string } => Boolean(s.url));

  return (
    <>
      <PageHeader
        eyebrow="Team"
        title="Teamprofil"
        actions={can(user, "team.edit") && <ButtonLink href="/admin/team" variant="secondary"><Pencil className="h-4 w-4" /> Bearbeiten</ButtonLink>}
      />
      <Tabs items={teamTabs("about")} />

      <Card tactical className="mb-6 p-6">
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
          <Image src={team.logoUrl || "/logo-512.webp"} alt={`Logo ${team.name}`} width={128} height={128} unoptimized className="h-28 w-28 rounded-full sm:h-32 sm:w-32" priority />
          <div>
            <h2 className="text-2xl font-semibold uppercase tracking-wide sm:text-3xl">{team.name}</h2>
            {team.motto && <p className="mt-1 font-display uppercase tracking-[0.2em] text-accent-400">{team.motto}</p>}
            <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-muted sm:justify-start">
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-subtle" /> {team.location}</span>
              {team.foundedYear && <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-subtle" /> Gegründet {team.foundedYear}</span>}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Über uns" />
            <CardBody>{team.description ? <p className="whitespace-pre-wrap break-words text-sm text-fg/90">{team.description}</p> : <p className="text-sm text-muted">Noch keine Beschreibung.</p>}</CardBody>
          </Card>
          <Card>
            <CardHeader title="Teamregeln" icon={<ScrollText className="h-4 w-4" />} />
            <CardBody>{team.rules ? <p className="whitespace-pre-wrap break-words text-sm text-fg/90">{team.rules}</p> : <p className="text-sm text-muted">Noch keine Regeln hinterlegt.</p>}</CardBody>
          </Card>
          <Card>
            <CardHeader title={`Teammitglieder (${members.length})`} action={<Link href="/team" className="text-xs text-accent-300 hover:underline">Alle</Link>} />
            <ul className="grid gap-px bg-line sm:grid-cols-2">
              {members.map((m) => (
                <li key={m.id} className="bg-surface">
                  <Link href={`/team/${m.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-elevated">
                    <Avatar src={m.avatarUrl} name={m.callsign || m.firstName} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{m.callsign || m.firstName}</span>
                    <RoleBadge role={m.role} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Kontakt" />
            <CardBody className="space-y-3 text-sm">
              {team.contactEmail && <p className="flex items-center gap-2 break-all"><Mail className="h-4 w-4 shrink-0 text-subtle" /><a href={`mailto:${team.contactEmail}`} className="text-accent-300 hover:underline">{team.contactEmail}</a></p>}
              {team.contactPhone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-subtle" />{team.contactPhone}</p>}
              {!team.contactEmail && !team.contactPhone && <p className="text-muted">Keine Kontaktdaten hinterlegt.</p>}
              {socials.length > 0 && (
                <ul className="flex flex-wrap gap-2 border-t border-line pt-3">
                  {socials.map((s) => (
                    <li key={s.label}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-line bg-elevated px-3 py-1.5 text-xs hover:border-subtle">
                        <Globe className="h-3.5 w-3.5" /> {s.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Nächste Termine" />
            {next.length === 0 ? (
              <EmptyState title="Nichts geplant" />
            ) : (
              <ul className="divide-y divide-line">
                {next.map((e) => (
                  <li key={e.id}>
                    <Link href={`/events/${e.id}`} className="block px-4 py-3 text-sm hover:bg-elevated sm:px-5">
                      <span className="block font-medium">{e.title}</span>
                      <span className="text-xs text-muted">{fmtDate(e.startsAt)} · {fmtTime(e.startsAt)} · {e.location}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
