import type { ReactNode } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Alert } from "@/components/ui/alert";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessAdmin, ROLE_LABELS } from "@/lib/permissions";
import { shortName } from "@/lib/labels";
import { syncAutoNotifications } from "@/server/notifications";
import { getTeamSettings } from "@/server/queries/team";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  await syncAutoNotifications(user.id).catch((err) => console.error("[notifications]", err));
  const [unread, team] = await Promise.all([db.notification.count({ where: { userId: user.id, readAt: null } }), getTeamSettings()]);

  return (
    <AppShell
      user={{ name: `${user.firstName} ${user.lastName}`, shortName: shortName(user), roleLabel: ROLE_LABELS[user.role], avatarUrl: user.avatarUrl }}
      team={{ name: team.name, logoUrl: team.logoUrl || "/logo-512.webp" }}
      showAdmin={canAccessAdmin(user)}
      unread={unread}
    >
      {user.mustChangePassword && (
        <Alert variant="warning" title="Bitte ändere dein Passwort" className="mb-6">
          Du verwendest noch ein vorläufiges Passwort.{" "}
          <Link href="/profile?tab=password" className="font-medium text-accent-300 underline">
            Jetzt im Profil ändern
          </Link>
        </Alert>
      )}
      {children}
    </AppShell>
  );
}
