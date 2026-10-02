import type { Metadata } from "next";
import { requirePagePermission } from "@/lib/auth";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { adminTabs } from "@/components/features/admin-tabs";
import { TeamSettingsForm } from "@/components/features/team-settings-form";
import { getTeamSettings } from "@/server/queries/team";

export const metadata: Metadata = { title: "Teamdaten" };
export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const user = await requirePagePermission("team.edit");
  const t = await getTeamSettings();
  return (
    <>
      <PageHeader eyebrow="Administration" title="Teamdaten" subtitle="Erscheinen auf der Teamprofil-Seite." />
      <Tabs items={adminTabs("team", user)} />
      <Card className="max-w-3xl">
        <CardBody>
          <TeamSettingsForm
            values={{
              name: t.name,
              shortName: t.shortName,
              motto: t.motto ?? "",
              foundedYear: t.foundedYear?.toString() ?? "",
              location: t.location,
              description: t.description ?? "",
              rules: t.rules ?? "",
              contactEmail: t.contactEmail ?? "",
              contactPhone: t.contactPhone ?? "",
              logoUrl: t.logoUrl,
              websiteUrl: t.websiteUrl ?? "",
              discordUrl: t.discordUrl ?? "",
              instagramUrl: t.instagramUrl ?? "",
              facebookUrl: t.facebookUrl ?? "",
              youtubeUrl: t.youtubeUrl ?? "",
            }}
          />
        </CardBody>
      </Card>
    </>
  );
}
