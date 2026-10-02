import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { assignableRoles, can, canManageUser, ROLE_LABELS } from "@/lib/permissions";
import { AIRSOFT_ROLE_LABELS, AIRSOFT_ROLE_OPTIONS } from "@/lib/labels";
import { fmtDate, fmtDateTime } from "@/lib/dates";
import { ActionButton } from "@/components/ui/action-button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar, FilterInput, FilterSelect, pickEnum, pickString } from "@/components/ui/filter-bar";
import { ModalTrigger } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableWrap, Td, Th } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { adminTabs } from "@/components/features/admin-tabs";
import { RoleBadge } from "@/components/features/badges";
import { InvitationDialog } from "@/components/features/invitation-dialog";
import { MemberForm } from "@/components/features/member-form";
import { MemberRowActions } from "@/components/features/member-row-actions";
import { revokeInvitation } from "@/server/actions/members";
import { listMembers } from "@/server/queries/members";

export const metadata: Metadata = { title: "Mitgliederverwaltung" };
export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminMembersPage({ searchParams }: { searchParams: SP }) {
  const user = await requirePagePermission("members.viewAdmin");
  const sp = await searchParams;
  const q = pickString(sp.q);
  const role = pickEnum(sp.role, ["SUPERADMIN", "ADMIN", "TEAMLEITUNG", "MITGLIED"] as const);
  const airsoftRole = pickEnum(sp.airsoft, AIRSOFT_ROLE_OPTIONS.map((o) => o.value));
  const status = pickEnum(sp.status, ["active", "inactive", "all"] as const) ?? "all";

  const manage = can(user, "members.manage");
  const members = await listMembers(user, { q, role, airsoftRole, status });
  const roleOptions = assignableRoles(user).map((r) => ({ value: r, label: ROLE_LABELS[r] }));
  const invitations = can(user, "invitations.manage")
    ? await db.invitation.findMany({ where: { usedAt: null, expiresAt: { gt: new Date() } }, include: { role: true }, orderBy: { createdAt: "desc" } })
    : [];

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Teammitglieder"
        subtitle={`${members.length} Einträge`}
        actions={
          <>
            {can(user, "invitations.manage") && <InvitationDialog roleOptions={roleOptions} />}
            {manage && (
              <ModalTrigger variant="primary" label={<><Plus className="h-4 w-4" /> Mitglied hinzufügen</>} title="Neues Mitglied" modalSize="lg">
                <MemberForm roleOptions={roleOptions} canNotes={can(user, "members.viewNotes")} />
              </ModalTrigger>
            )}
          </>
        }
      />
      <Tabs items={adminTabs("members", user)} />
      <FilterBar resetHref="/admin/members">
        <FilterInput label="Name suchen" name="q" value={q} placeholder="Name, Rufname, E-Mail" />
        <FilterSelect label="Systemrolle" name="role" value={role} options={Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))} />
        <FilterSelect label="Airsoft-Rolle" name="airsoft" value={airsoftRole} options={AIRSOFT_ROLE_OPTIONS} />
        <FilterSelect label="Status" name="status" value={status} placeholder="Alle" options={[{ value: "active", label: "Aktiv" }, { value: "inactive", label: "Inaktiv" }]} />
      </FilterBar>

      <Card>
        {members.length === 0 ? (
          <EmptyState icon={<Users className="h-8 w-8" />} title="Keine Mitglieder gefunden">
            {q || role || airsoftRole || status !== "all" ? "Mit diesen Filtern gibt es keine Treffer." : "Lege das erste Mitglied an oder erzeuge einen Einladungslink."}
          </EmptyState>
        ) : (
          <TableWrap>
            <Table className="min-w-[52rem]">
              <thead>
                <tr>
                  <Th>Mitglied</Th>
                  <Th>E-Mail</Th>
                  <Th>Systemrolle</Th>
                  <Th>Airsoft-Rolle</Th>
                  <Th>Beitritt</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Aktionen</Th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className={m.active ? "" : "opacity-60"}>
                    <Td>
                      <Link href={`/team/${m.id}`} className="flex items-center gap-3 hover:text-accent-300">
                        <Avatar src={m.avatarUrl} name={m.callsign || m.firstName} size="sm" />
                        <span>
                          <span className="block font-medium">{m.callsign || m.firstName}</span>
                          <span className="block text-xs text-muted">
                            {m.firstName} {m.lastName} · @{m.username}
                          </span>
                        </span>
                      </Link>
                    </Td>
                    <Td className="break-all text-muted">{m.email}</Td>
                    <Td>
                      <RoleBadge role={m.role} />
                    </Td>
                    <Td className="text-muted">{AIRSOFT_ROLE_LABELS[m.airsoftRole]}</Td>
                    <Td className="whitespace-nowrap text-muted">{fmtDate(m.joinedAt)}</Td>
                    <Td>{m.active ? <Badge tone="ok">Aktiv</Badge> : <Badge tone="danger">Inaktiv</Badge>}</Td>
                    <Td className="text-right">
                      <MemberRowActions id={m.id} name={m.callsign || m.firstName} active={m.active} manageable={manage && canManageUser(user, { id: m.id, role: m.role })} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Card>

      {invitations.length > 0 && (
        <Card className="mt-6">
          <CardHeader title={`Offene Einladungen (${invitations.length})`} />
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Für</Th>
                  <Th>Rolle</Th>
                  <Th>Gültig bis</Th>
                  <Th className="text-right">Aktion</Th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((i) => (
                  <tr key={i.id}>
                    <Td>{i.email ?? i.note ?? "Beliebige Person"}</Td>
                    <Td>
                      <Badge>{i.role.name}</Badge>
                    </Td>
                    <Td className="whitespace-nowrap text-muted">{fmtDateTime(i.expiresAt)}</Td>
                    <Td className="text-right">
                      <ActionButton size="sm" variant="ghost" action={revokeInvitation} args={[i.id]} confirm={{ title: "Einladung widerrufen?", message: "Der Link funktioniert danach nicht mehr.", confirmLabel: "Widerrufen", danger: true }}>
                        Widerrufen
                      </ActionButton>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        </Card>
      )}
    </>
  );
}
