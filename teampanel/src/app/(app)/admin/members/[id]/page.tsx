import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { assignableRoles, can, canManageUser, ROLE_LABELS } from "@/lib/permissions";
import { CATEGORY_LABELS, memberName } from "@/lib/labels";
import { dateToDateInput, fmtDate, fmtDateTime } from "@/lib/dates";
import { ActionButton } from "@/components/ui/action-button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableWrap, Td, Th } from "@/components/ui/table";
import { PersonalInventory } from "@/components/features/personal-inventory";
import { MemberForm } from "@/components/features/member-form";
import { OwnershipEditor, OwnershipSelect } from "@/components/features/ownership-controls";
import { RoleBadge } from "@/components/features/badges";
import { removeRequirement } from "@/server/actions/equipment";
import { getMember } from "@/server/queries/members";

export const metadata: Metadata = { title: "Mitglied verwalten" };
export const dynamic = "force-dynamic";

export default async function AdminMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requirePagePermission("members.viewAdmin");
  const { id } = await params;
  const member = await getMember(viewer, id);
  if (!member) notFound();

  const manageable = can(viewer, "members.manage") && canManageUser(viewer, { id: member.id, role: member.role });
  const manageEquipment = can(viewer, "equipment.manageAll");
  const [catalog, owned, requirements, inventory] = await Promise.all([
    db.equipment.findMany({ orderBy: [{ required: "desc" }, { category: "asc" }, { name: "asc" }] }),
    db.userEquipment.findMany({ where: { userId: id } }),
    db.equipmentRequirement.findMany({ where: { userId: id }, include: { equipment: true, assignedBy: { select: { profile: { select: { firstName: true, callsign: true } } } } }, orderBy: { createdAt: "desc" } }),
    can(viewer, "equipment.manageAll") ? db.personalItem.findMany({ where: { userId: id }, include: { parts: { orderBy: { name: "asc" } } }, orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);
  const ownedMap = new Map(owned.map((o) => [o.equipmentId, o]));
  const roleOptions = (() => {
    const base = assignableRoles(viewer);
    const list = base.includes(member.role) ? base : [member.role, ...base];
    return list.map((r) => ({ value: r, label: ROLE_LABELS[r] }));
  })();
  const roleLocked = !assignableRoles(viewer).includes(member.role) || assignableRoles(viewer).length === 0;

  return (
    <>
      <Link href="/admin/members" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Mitgliederverwaltung
      </Link>
      <PageHeader
        eyebrow="Administration"
        title={memberName(member)}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <RoleBadge role={member.role} />
            {member.active ? <Badge tone="ok">Aktiv</Badge> : <Badge tone="danger">Inaktiv</Badge>}
            <span>Letzter Login: {member.lastLoginAt ? fmtDateTime(member.lastLoginAt) : "noch nie"}</span>
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2 lg:self-start">
          <CardHeader title="Stammdaten" />
          <CardBody>
            {manageable ? (
              <MemberForm
                canNotes={can(viewer, "members.viewNotes")}
                roleOptions={roleOptions}
                roleLocked={roleLocked}
                values={{
                  id: member.id,
                  username: member.username,
                  email: member.email ?? "",
                  firstName: member.firstName,
                  lastName: member.lastName,
                  callsign: member.callsign ?? "",
                  role: member.role,
                  airsoftRole: member.airsoftRole,
                  joinedAt: dateToDateInput(member.joinedAt),
                  bio: member.bio ?? "",
                  phone: member.phone ?? "",
                  phoneVisible: member.phoneVisible,
                  adminNotes: member.adminNotes ?? "",
                  avatarUrl: member.avatarUrl,
                }}
              />
            ) : (
              <div className="space-y-3 text-sm">
                <Alert variant="info">Du darfst dieses Mitglied nicht bearbeiten (gleicher oder höherer Rang, oder fehlende Berechtigung).</Alert>
                <p>E-Mail: {member.email ?? "–"}</p>
                <p>Telefon: {member.phone ?? "–"}</p>
                <p>Mitglied seit: {fmtDate(member.joinedAt)}</p>
                {member.adminNotes !== null && <p className="whitespace-pre-wrap">Notizen: {member.adminNotes || "–"}</p>}
              </div>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader title="Zugewiesene Anforderungen" />
            {requirements.length === 0 ? (
              <EmptyState title="Keine Anforderungen">Weise Ausrüstung unter „Ausrüstungsanforderungen“ zu.</EmptyState>
            ) : (
              <ul className="divide-y divide-line">
                {requirements.map((r) => {
                  const status = ownedMap.get(r.equipmentId)?.status ?? "MISSING";
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm sm:px-5">
                      <div className="min-w-0">
                        <p className="font-medium">{r.equipment.name}</p>
                        <p className="text-xs text-muted">
                          {r.dueDate ? `bis ${fmtDate(r.dueDate)}` : "ohne Frist"}
                          {r.note ? ` · ${r.note}` : ""} · {status === "OWNED" ? "erfüllt ✅" : "offen"}
                        </p>
                      </div>
                      {manageEquipment && (
                        <ActionButton size="sm" variant="ghost" action={removeRequirement} args={[r.id]} confirm={{ title: "Anforderung entfernen?", message: `Die Anforderung „${r.equipment.name}“ wird für ${member.callsign || member.firstName} entfernt.`, confirmLabel: "Entfernen", danger: true }}>
                          Entfernen
                        </ActionButton>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Ausrüstung des Mitglieds" action={<Link href="/admin/requirements" className="text-xs text-accent-300 hover:underline">Anforderungen zuweisen</Link>} />
            <TableWrap>
              <Table className="min-w-[32rem]">
                <thead>
                  <tr>
                    <Th>Gegenstand</Th>
                    <Th>Status</Th>
                    {manageEquipment && <Th className="text-right">Aktion</Th>}
                  </tr>
                </thead>
                <tbody>
                  {catalog.map((e) => {
                    const o = ownedMap.get(e.id);
                    const status = o?.status ?? "MISSING";
                    return (
                      <tr key={e.id}>
                        <Td>
                          <p className="font-medium">{e.name}</p>
                          <p className="text-xs text-subtle">
                            {CATEGORY_LABELS[e.category]} {e.required && "· Pflicht"}
                          </p>
                        </Td>
                        <Td>{manageEquipment ? <OwnershipSelect equipmentId={e.id} status={status} userId={id} label={e.name} /> : status}</Td>
                        {manageEquipment && (
                          <Td className="text-right">
                            <OwnershipEditor equipmentId={e.id} name={e.name} status={status} quantity={o?.quantity ?? 0} notes={o?.notes} userId={id} />
                          </Td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableWrap>
          </Card>

          {manageEquipment && (
            <div>
              <h2 className="label-caps mb-3">Persönliches Inventar (nur lesen)</h2>
              <PersonalInventory items={inventory} editable={false} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
