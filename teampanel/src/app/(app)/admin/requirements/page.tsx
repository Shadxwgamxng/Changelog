import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { CATEGORY_LABELS, shortName } from "@/lib/labels";
import { fmtDate } from "@/lib/dates";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableWrap, Td, Th } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { adminTabs } from "@/components/features/admin-tabs";
import { OwnershipBadge } from "@/components/features/badges";
import { RequirementForm } from "@/components/features/requirement-form";
import { removeRequirement } from "@/server/actions/equipment";
import { getOpenRequirements } from "@/server/queries/equipment";

export const metadata: Metadata = { title: "Ausrüstungsanforderungen" };
export const dynamic = "force-dynamic";

export default async function RequirementsPage() {
  const user = await requirePagePermission("equipment.manageAll");
  const [open, members, equipment] = await Promise.all([
    getOpenRequirements(),
    db.user.findMany({ where: { active: true, profile: { isNot: null } }, include: { profile: true }, orderBy: { profile: { firstName: "asc" } } }),
    db.equipment.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }], select: { id: true, name: true, category: true, required: true } }),
  ]);

  return (
    <>
      <PageHeader eyebrow="Administration" title="Ausrüstungsanforderungen" subtitle="Lege fest, was einzelne Mitglieder bis wann besorgen müssen – daraus entsteht ihre persönliche Einkaufsliste." />
      <Tabs items={adminTabs("requirements", user)} />

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-2 xl:self-start">
          <CardHeader title="Ausrüstung zuweisen" icon={<ClipboardList className="h-4 w-4" />} />
          <CardBody>
            <RequirementForm
              members={members.map((m) => ({ id: m.id, label: `${shortName(m.profile!)} (${m.profile!.firstName} ${m.profile!.lastName})` }))}
              equipment={equipment.map((e) => ({ id: e.id, label: e.name, hint: `${CATEGORY_LABELS[e.category]}${e.required ? " · Pflicht" : ""}` }))}
            />
          </CardBody>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader title={`Offen (${open.length})`} />
          {open.length === 0 ? (
            <EmptyState title="Nichts offen">Alle zugewiesenen Anforderungen sind erfüllt.</EmptyState>
          ) : (
            <TableWrap>
              <Table className="min-w-[36rem]">
                <thead>
                  <tr>
                    <Th>Mitglied</Th>
                    <Th>Gegenstand</Th>
                    <Th>Status</Th>
                    <Th>Frist</Th>
                    <Th className="text-right" />
                  </tr>
                </thead>
                <tbody>
                  {open.map((r) => {
                    const overdue = r.dueDate && r.dueDate < new Date();
                    return (
                      <tr key={r.id}>
                        <Td>
                          <Link href={`/admin/members/${r.userId}`} className="font-medium hover:text-accent-300">
                            {shortName(r.user.profile!)}
                          </Link>
                        </Td>
                        <Td>{r.equipment.name}</Td>
                        <Td>
                          <OwnershipBadge status={r.ownership} />
                        </Td>
                        <Td className="whitespace-nowrap">{r.dueDate ? <Badge tone={overdue ? "danger" : "neutral"}>{fmtDate(r.dueDate)}</Badge> : <span className="text-subtle">–</span>}</Td>
                        <Td className="text-right">
                          <ActionButton size="sm" variant="ghost" action={removeRequirement} args={[r.id]} confirm={{ title: "Anforderung entfernen?", message: `„${r.equipment.name}“ für ${shortName(r.user.profile!)} entfernen?`, confirmLabel: "Entfernen", danger: true }}>
                            Entfernen
                          </ActionButton>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </Card>
      </div>
    </>
  );
}
