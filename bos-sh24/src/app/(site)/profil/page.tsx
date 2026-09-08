import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { Bell, Bookmark, LayoutDashboard } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/site/ProfileForm";
import { Badge } from "@/components/ui/Badge";
import { roleLabels, can } from "@/lib/permissions";
import { formatDateTime, initials } from "@/lib/utils";
import type { Role } from "@/lib/types";

export const metadata: Metadata = { title: "Mein Profil" };

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?callbackUrl=/profil");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return (
    <div className="container-page max-w-4xl py-10 lg:py-14">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-200">
            {initials(user.name)}
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-ink-900 dark:text-white">{user.name}</h1>
            <p className="text-sm text-ink-500 dark:text-ink-400">@{user.username}</p>
          </div>
        </div>
        <Badge color="brand">{roleLabels[user.role as Role]}</Badge>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card dark:border-ink-800 dark:bg-ink-900">
            <h2 className="mb-4 font-display text-lg font-bold text-ink-900 dark:text-white">Profil bearbeiten</h2>
            <ProfileForm user={{ name: user.name, bio: user.bio, avatarUrl: user.avatarUrl }} />
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900">
            <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-ink-900 dark:text-white">
              <Bell className="h-4 w-4 text-brand-600" /> Benachrichtigungen
            </h2>
            {notifications.length > 0 ? (
              <ul className="space-y-2">
                {notifications.map((n) => (
                  <li key={n.id} className="rounded-lg bg-ink-50 p-2.5 text-xs text-ink-600 dark:bg-ink-800/60 dark:text-ink-300">
                    <p>{n.message}</p>
                    <p className="mt-1 text-[11px] text-ink-400">{formatDateTime(n.createdAt)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-ink-500 dark:text-ink-400">Keine Benachrichtigungen vorhanden.</p>
            )}
          </div>

          <Link href="/profil/favoriten" className="flex items-center gap-2 rounded-2xl border border-ink-200 bg-white p-4 text-sm font-medium text-ink-700 shadow-card hover:border-brand-400 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-200">
            <Bookmark className="h-4 w-4 text-brand-600" /> Gespeicherte Beiträge
          </Link>

          {can.accessAdmin(user.role as Role) && (
            <Link href="/admin" className="flex items-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm font-medium text-brand-700 hover:border-brand-400 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-300">
              <LayoutDashboard className="h-4 w-4" /> Zum Admin-Dashboard
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
