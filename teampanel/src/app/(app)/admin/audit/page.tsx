import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDateTime } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar, FilterInput, FilterSelect, pickString } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableWrap, Td, Th } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { adminTabs } from "@/components/features/admin-tabs";

export const metadata: Metadata = { title: "Aktivitätsprotokoll" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const GROUPS = [
  { value: "member", label: "Mitglieder" },
  { value: "event", label: "Termine" },
  { value: "attendance", label: "Teilnahme" },
  { value: "equipment", label: "Ausrüstung" },
  { value: "requirement", label: "Anforderungen" },
  { value: "userEquipment", label: "Persönliche Ausrüstung" },
  { value: "shopping", label: "Einkaufsliste" },
  { value: "announcement", label: "Ankündigungen" },
  { value: "invitation", label: "Einladungen" },
  { value: "team", label: "Teamdaten" },
  { value: "auth", label: "Anmeldung" },
];

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function AuditPage({ searchParams }: { searchParams: SP }) {
  const user = await requirePagePermission("audit.view");
  const sp = await searchParams;
  const q = pickString(sp.q);
  const group = GROUPS.find((g) => g.value === pickString(sp.group))?.value;
  const page = Math.max(1, Number(pickString(sp.page, 5)) || 1);

  const where: Prisma.AuditLogWhereInput = {
    ...(group ? { action: { startsWith: `${group}.` } } : {}),
    ...(q ? { OR: [{ message: { contains: q, mode: "insensitive" } }, { actorLabel: { contains: q, mode: "insensitive" } }, { targetLabel: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [rows, count] = await Promise.all([db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }), db.auditLog.count({ where })]);
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const link = (p: number) => `/admin/audit?${new URLSearchParams({ ...(q ? { q } : {}), ...(group ? { group } : {}), page: String(p) })}`;

  return (
    <>
      <PageHeader eyebrow="Administration" title="Aktivitätsprotokoll" subtitle="Wer hat wann was geändert?" />
      <Tabs items={adminTabs("audit", user)} />
      <FilterBar resetHref="/admin/audit">
        <FilterInput label="Suche" name="q" value={q} placeholder="Person, Ziel oder Text" />
        <FilterSelect label="Bereich" name="group" value={group} options={GROUPS} />
      </FilterBar>
      <Card>
        {rows.length === 0 ? (
          <EmptyState title="Keine Einträge">{q || group ? "Mit diesen Filtern gibt es keine Treffer." : "Es wurden noch keine Änderungen protokolliert."}</EmptyState>
        ) : (
          <TableWrap>
            <Table className="min-w-[44rem]">
              <thead>
                <tr>
                  <Th>Zeitpunkt</Th>
                  <Th>Akteur</Th>
                  <Th>Aktion</Th>
                  <Th>Beschreibung</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <Td className="whitespace-nowrap text-muted">{fmtDateTime(r.createdAt)}</Td>
                    <Td className="whitespace-nowrap">{r.actorLabel}</Td>
                    <Td>
                      <Badge>{r.action}</Badge>
                    </Td>
                    <Td className="max-w-md break-words">{r.message}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Card>
      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm text-muted" aria-label="Seiten">
          {page > 1 ? <Link href={link(page - 1)} className={buttonClass("secondary", "sm")}>← Neuer</Link> : <span />}
          <span>
            Seite {page} von {pages} · {count} Einträge
          </span>
          {page < pages ? <Link href={link(page + 1)} className={buttonClass("secondary", "sm")}>Älter →</Link> : <span />}
        </nav>
      )}
    </>
  );
}
