import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PostCard } from "@/components/site/PostCard";

export const metadata: Metadata = { title: "Gespeicherte Beiträge" };

export default async function FavoritesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?callbackUrl=/profil/favoriten");

  const saved = await prisma.savedPost.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      post: {
        select: {
          title: true, subtitle: true, slug: true, excerpt: true, coverImageUrl: true, coverImageAlt: true,
          publishedAt: true, viewCount: true, featured: true,
          category: { select: { name: true, slug: true, color: true } },
          author: { select: { name: true, avatarUrl: true, username: true } },
        },
      },
    },
  });

  return (
    <div className="container-page py-10 lg:py-14">
      <Link href="/profil" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-brand-600 dark:text-ink-400">
        <ArrowLeft className="h-4 w-4" /> Zurück zum Profil
      </Link>
      <h1 className="mb-8 font-display text-3xl font-extrabold text-ink-900 dark:text-white">Gespeicherte Beiträge</h1>

      {saved.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map(({ post }) => <PostCard key={post.slug} post={post} />)}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-ink-300 p-8 text-center text-ink-500 dark:border-ink-700">
          Du hast noch keine Beiträge gespeichert. Klicke bei einem Beitrag auf „Speichern“, um ihn hier wiederzufinden.
        </p>
      )}
    </div>
  );
}
