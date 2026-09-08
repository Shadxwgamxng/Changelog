import Link from "next/link";
import { getServerSession } from "next-auth";
import { PlusCircle, Eye } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { Badge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { formatDateTime } from "@/lib/utils";
import type { PostStatus } from "@/lib/types";

export const metadata = { title: "Beiträge verwalten" };

const statusColors: Record<PostStatus, "gray" | "amber" | "green"> = { DRAFT: "gray", SCHEDULED: "amber", PUBLISHED: "green", ARCHIVED: "gray" };
const statusLabels: Record<PostStatus, string> = { DRAFT: "Entwurf", SCHEDULED: "Geplant", PUBLISHED: "Veröffentlicht", ARCHIVED: "Archiviert" };

export default async function AdminPostsPage() {
  const session = await getServerSession(authOptions);
  const role = session!.user.role;

  const posts = await prisma.post.findMany({
    where: can.editAnyPost(role) ? {} : { authorId: session!.user.id },
    orderBy: { updatedAt: "desc" },
    include: { author: { select: { name: true } }, category: { select: { name: true } } },
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-extrabold text-ink-900 dark:text-white">Beiträge</h1>
        <Link href="/admin/beitraege/neu" className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
          <PlusCircle className="h-4 w-4" /> Neuer Beitrag
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-ink-200 bg-white shadow-card dark:border-ink-800 dark:bg-ink-900">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-ink-200 text-xs uppercase text-ink-500 dark:border-ink-800 dark:text-ink-400">
            <tr>
              <th className="px-4 py-3">Titel</th>
              <th className="px-4 py-3">Kategorie</th>
              <th className="px-4 py-3">Autor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Aufrufe</th>
              <th className="px-4 py-3">Aktualisiert</th>
              <th className="px-4 py-3 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
            {posts.map((post) => (
              <tr key={post.id} className="hover:bg-ink-50 dark:hover:bg-ink-800/40">
                <td className="max-w-xs truncate px-4 py-3 font-medium text-ink-900 dark:text-white">{post.title}</td>
                <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{post.category.name}</td>
                <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{post.author.name}</td>
                <td className="px-4 py-3"><Badge color={statusColors[post.status as PostStatus]}>{statusLabels[post.status as PostStatus]}</Badge></td>
                <td className="px-4 py-3 text-ink-600 dark:text-ink-300"><span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{post.viewCount}</span></td>
                <td className="px-4 py-3 text-ink-500 dark:text-ink-400">{formatDateTime(post.updatedAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Link href={`/admin/beitraege/${post.id}`} className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40">Bearbeiten</Link>
                    <DeleteButton url={`/api/admin/posts/${post.id}`} confirmText={`„${post.title}“ wirklich löschen?`} />
                  </div>
                </td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-ink-500 dark:text-ink-400">Noch keine Beiträge vorhanden.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
