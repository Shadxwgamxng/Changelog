import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/dates";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { RoleBadge } from "@/components/features/badges";
import { PasswordForm, ProfileForm } from "@/components/features/profile-forms";
import { pickEnum } from "@/components/ui/filter-bar";
import { AIRSOFT_ROLE_LABELS } from "@/lib/labels";

export const metadata: Metadata = { title: "Mein Profil" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function ProfilePage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const sp = await searchParams;
  const tab = pickEnum(sp.tab, ["profile", "password"] as const) ?? "profile";
  const profile = await db.teamMemberProfile.findUniqueOrThrow({ where: { userId: user.id } });

  return (
    <>
      <PageHeader eyebrow="Konto" title="Mein Profil" />
      <Tabs
        items={[
          { href: "/profile", label: "Profil", active: tab === "profile" },
          { href: "/profile?tab=password", label: "Passwort", active: tab === "password" },
        ]}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={tab === "profile" ? "Profil bearbeiten" : "Passwort ändern"} />
          <CardBody>
            {tab === "profile" ? (
              <ProfileForm
                values={{
                  firstName: profile.firstName,
                  lastName: profile.lastName,
                  callsign: profile.callsign ?? "",
                  airsoftRole: profile.airsoftRole,
                  bio: profile.bio ?? "",
                  phone: profile.phone ?? "",
                  phoneVisible: profile.phoneVisible,
                  avatarUrl: profile.avatarUrl,
                }}
              />
            ) : (
              <PasswordForm />
            )}
          </CardBody>
        </Card>
        <Card className="self-start">
          <CardHeader title="Kontodaten" />
          <CardBody>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="label-caps">Benutzername</dt>
                <dd>{user.username}</dd>
              </div>
              <div>
                <dt className="label-caps">E-Mail</dt>
                <dd className="break-all">{user.email}</dd>
              </div>
              <div>
                <dt className="label-caps">Systemrolle</dt>
                <dd className="mt-0.5">
                  <RoleBadge role={user.role} />
                </dd>
              </div>
              <div>
                <dt className="label-caps">Airsoft-Rolle</dt>
                <dd>{AIRSOFT_ROLE_LABELS[profile.airsoftRole]}</dd>
              </div>
              <div>
                <dt className="label-caps">Mitglied seit</dt>
                <dd>{fmtDate(profile.joinedAt)}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-subtle">Benutzername, E-Mail und Systemrolle ändert die Verwaltung.</p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
