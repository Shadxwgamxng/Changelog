import type { Metadata } from "next";
import { Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { can, ROLE_LABELS } from "@/lib/permissions";
import { AIRSOFT_ROLE_OPTIONS } from "@/lib/labels";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar, FilterInput, FilterSelect, pickEnum, pickString } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { MemberCard } from "@/components/features/member-card";
import { teamTabs } from "@/components/features/team-tabs";
import { listMembers } from "@/server/queries/members";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Team" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function TeamPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const sp = await searchParams;
  const admin = can(user, "members.viewAdmin");
  const q = pickString(sp.q);
  const role = pickEnum(sp.role, ["SUPERADMIN", "ADMIN", "TEAMLEITUNG", "MITGLIED"] as const);
  const airsoftRole = pickEnum(sp.airsoft, AIRSOFT_ROLE_OPTIONS.map((o) => o.value));
  const status = admin ? pickEnum(sp.status, ["active", "inactive", "all"] as const) ?? "active" : "active";

  const members = await listMembers(user, { q, role, airsoftRole, status });
  const hasFilter = Boolean(q || role || airsoftRole || (admin && status !== "active"));

  return (
    <>
      <PageHeader
        eyebrow="Team"
        title="Teammitglieder"
        subtitle={`${members.length} ${members.length === 1 ? "Mitglied" : "Mitglieder"}`}
        actions={admin && <ButtonLink href="/admin/members" variant="secondary">Mitglieder verwalten</ButtonLink>}
      />
      <Tabs items={teamTabs("members")} />
      <FilterBar resetHref="/team">
        <FilterInput label="Name suchen" name="q" value={q} placeholder="Name oder Rufname" />
        <FilterSelect label="Teamrolle" name="role" value={role} options={Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))} />
        <FilterSelect label="Airsoft-Rolle" name="airsoft" value={airsoftRole} options={AIRSOFT_ROLE_OPTIONS} />
        {admin && (
          <FilterSelect label="Status" name="status" value={status} placeholder="Aktive" options={[{ value: "active", label: "Aktive" }, { value: "inactive", label: "Inaktive" }, { value: "all", label: "Alle" }]} />
        )}
      </FilterBar>
      {members.length === 0 ? (
        <Card>
          <EmptyState icon={<Users className="h-8 w-8" />} title="Keine Mitglieder gefunden">
            {hasFilter ? "Mit diesen Filtern gibt es keine Treffer." : "Es wurden noch keine Mitglieder angelegt."}
          </EmptyState>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {members.map((m) => (
            <MemberCard key={m.id} member={m} />
          ))}
        </div>
      )}
    </>
  );
}
