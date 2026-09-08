import Link from "next/link";
import { getServerSession } from "next-auth";
import { Newspaper, FileEdit, Users, CalendarDays, Mail, Eye, PlusCircle } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/admin/StatCard";
import { can } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import type { PostStatus } from "@/lib/types";

export const metadata = { title: "Admin-Dashboard" };

const statusColors: Record<PostStatus, "gray" | "amber" | "green"> = { DRAFT: "gray", SCHEDULED: "amber", PUBLISHED: "green", ARCHIVED: "gray" };
const statusLabels: Record<PostStatus, string> = { DRAFT: "Entwurf", SCHEDULED: "Geplant", PUBLISHED: "Veröffentlicht", ARCHIVED: "Archiviert" };

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  const role = session!.user.role;

  const [
    totalPosts, publishedPosts, draftPosts, totalUsers, totalEvents, newContacts, totalViews, recentPosts,
  ] = await Promise.all([
    prisma.post.count(),
    prisma.post.count({ where: { status: "PUBLISHED" } }),
    prisma.post.count({ where: { status: "DRAFT" } }),
    can.manageUsers(role) ? prisma.user.count() : Promise.resolve(null),
    prisma.event.count(),
    can.manageContact(role) ? prisma.contactMessage.count({ where: { status: "NEW" } }) : Promise.resolve(null),
    prisma.post.aggregate({ _sum: { viewCount: true } }),
    prisma.post.findMany({
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: { id: true, title: true, slug: true, status: true, updatedAt: true, author: { select: { name: true } } },
    }),
  ]);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink-900 dark:text-white">Übersicht</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Willkommen zurück, {session!.user.name}!</p>
        </div>
        {can.createPosts(role) && (
          <Link href="/admin/beitraege/neu" className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
            <PlusCircle className="h-4 w-4" /> Neuer Beitrag
          </Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Beiträge gesamt" value={totalPosts} icon={<Newspaper className="h-5 w-5" />} />
        <StatCard label="Veröffentlicht" value={publishedPosts} icon={<Newspaper className="h-5 w-5" />} color="green" />
        <StatCard label="Entwürfe" value={draftPosts} icon={<FileEdit className="h-5 w-5" />} color="amber" />
        <StatCard label="Seitenaufrufe" value={totalViews._sum.viewCount ?? 0} icon={<Eye className="h-5 w-5" />} />
        {totalUsers !== null && <StatCard label="Benutzer" value={totalUsers} icon={<Users className="h-5 w-5" />} />}
        <StatCard label="Veranstaltungen" value={totalEvents} icon={<CalendarDays className="h-5 w-5" />} />
        {newContacts !== null && <StatCard label="Neue Kontaktanfragen" value={newContacts} icon={<Mail className="h-5 w-5" />} color="accent" />}
      </div>

      <div className="mt-10 rounded-2xl border border-ink-200 bg-white shadow-card dark:border-ink-800 dark:bg-ink-900">
        <div className="border-b border-ink-200 p-5 dark:border-ink-800">
          <h2 className="font-display text-lg font-bold text-ink-900 dark:text-white">Zuletzt bearbeitete Beiträge</h2>
        </div>
        <div className="divide-y divide-ink-100 dark:divide-ink-800">
          {recentPosts.map((post) => (
            <Link key={post.id} href={`/admin/beitraege/${post.id}`} className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-ink-50 dark:hover:bg-ink-800/40">
              <div>
                <p className="font-medium text-ink-900 dark:text-white">{post.title}</p>
                <p className="text-xs text-ink-500 dark:text-ink-400">{post.author.name} · {formatDateTime(post.updatedAt)}</p>
              </div>
              <Badge color={statusColors[post.status as PostStatus]}>{statusLabels[post.status as PostStatus]}</Badge>
            </Link>
          ))}
          {recentPosts.length === 0 && <p className="p-5 text-sm text-ink-500 dark:text-ink-400">Noch keine Beiträge vorhanden.</p>}
        </div>
      </div>
    </div>
  );
}
