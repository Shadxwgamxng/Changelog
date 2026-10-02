import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarCheck, Mail, Phone, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { AIRSOFT_ROLE_LABELS } from "@/lib/labels";
import { fmtDate } from "@/lib/dates";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { RoleBadge } from "@/components/features/badges";
import { getMember } from "@/server/queries/members";

export const metadata: Metadata = { title: "Mitglied" };

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireUser();
  const { id } = await params;
  const member = await getMember(viewer, id);
  if (!member) notFound();

  const manage = can(viewer, "members.viewAdmin");
  const attended = await db.eventAttendance.count({ where: { userId: id, status: "ACCEPTED", event: { startsAt: { lt: new Date() }, status: { not: "CANCELLED" } } } });

  return (
    <>
      <Link href="/team" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Zurück zum Team
      </Link>

      <Card tactical className="mb-6 p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar src={member.avatarUrl} name={member.callsign || member.firstName} size="xl" />
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-2xl font-semibold uppercase tracking-wide sm:text-3xl">
              {member.lastName}, {member.firstName}
              {member.callsign ? ` – ${member.callsign}` : ""}
            </h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <RoleBadge role={member.role} />
              <Badge tone="accent">{AIRSOFT_ROLE_LABELS[member.airsoftRole]}</Badge>
              {!member.active && <Badge tone="danger">Inaktiv</Badge>}
            </div>
          </div>
          {manage && can(viewer, "members.manage") && (
            <ButtonLink href={`/admin/members/${member.id}`} variant="secondary">
              Verwalten
            </ButtonLink>
          )}
          {viewer.id === member.id && (
            <ButtonLink href="/profile" variant="secondary">
              Profil bearbeiten
            </ButtonLink>
          )}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Steckbrief" icon={<ShieldCheck className="h-4 w-4" />} />
          <CardBody className="space-y-5">
            {member.bio ? <p className="whitespace-pre-wrap break-words text-sm text-fg/90">{member.bio}</p> : <p className="text-sm text-muted">Noch keine Beschreibung hinterlegt.</p>}
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="label-caps">Teamrolle</dt>
                <dd className="mt-0.5">
                  <RoleBadge role={member.role} />
                </dd>
              </div>
              <div>
                <dt className="label-caps">Airsoft-Rolle</dt>
                <dd className="mt-0.5">{AIRSOFT_ROLE_LABELS[member.airsoftRole]}</dd>
              </div>
              <div>
                <dt className="label-caps">Mitglied seit</dt>
                <dd className="mt-0.5">{fmtDate(member.joinedAt)}</dd>
              </div>
              <div>
                <dt className="label-caps">Spieltage dabei</dt>
                <dd className="mt-0.5 flex items-center gap-1.5">
                  <CalendarCheck className="h-4 w-4 text-accent-400" /> {attended}
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <div className="space-y-6">
          {(member.email || member.phone) && (
            <Card>
              <CardHeader title="Kontakt" />
              <CardBody className="space-y-3 text-sm">
                {member.email && (
                  <p className="flex items-center gap-2 break-all">
                    <Mail className="h-4 w-4 shrink-0 text-subtle" />
                    <a href={`mailto:${member.email}`} className="text-accent-300 hover:underline">
                      {member.email}
                    </a>
                  </p>
                )}
                {member.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0 text-subtle" />
                    <a href={`tel:${member.phone.replace(/[^+\d]/g, "")}`} className="text-accent-300 hover:underline">
                      {member.phone}
                    </a>
                  </p>
                )}
              </CardBody>
            </Card>
          )}
          {member.adminNotes !== null && (
            <Card className="border-warn/30">
              <CardHeader title="Admin-Notizen" action={<Badge tone="warn">Nur Verwaltung</Badge>} />
              <CardBody className="whitespace-pre-wrap break-words text-sm text-fg/90">{member.adminNotes || "Keine Notizen."}</CardBody>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
