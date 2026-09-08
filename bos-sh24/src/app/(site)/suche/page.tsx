import type { Metadata } from "next";
import Link from "next/link";
import { Newspaper, CalendarDays, Tag as TagIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { postCardSelect, publishedPostsWhere } from "@/lib/queries";
import { PostCard } from "@/components/site/PostCard";
import { formatDate } from "@/lib/utils";
import { SearchBox } from "@/components/site/SearchBox";

export const metadata: Metadata = { title: "Suche" };

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q?.trim() ?? "";

  if (!q) {
    return (
      <div className="container-page py-14 text-center">
        <h1 className="font-display text-3xl font-extrabold text-ink-900 dark:text-white">Suche</h1>
        <div className="mx-auto mt-6 max-w-lg">
          <SearchBox autoFocus />
        </div>
      </div>
    );
  }

  const [posts, categories, events, tags] = await Promise.all([
    prisma.post.findMany({
      where: {
        ...publishedPostsWhere(),
        OR: [
          { title: { contains: q } },
          { excerpt: { contains: q } },
          { content: { contains: q } },
        ],
      },
      orderBy: { publishedAt: "desc" },
      take: 12,
      select: postCardSelect,
    }),
    prisma.category.findMany({ where: { name: { contains: q } } }),
    prisma.event.findMany({
      where: { isPublic: true, OR: [{ title: { contains: q } }, { location: { contains: q } }] },
      orderBy: { startsAt: "asc" },
      take: 6,
    }),
    prisma.tag.findMany({ where: { name: { contains: q } }, take: 10 }),
  ]);

  const totalResults = posts.length + categories.length + events.length + tags.length;

  return (
    <div className="container-page py-10 lg:py-14">
      <h1 className="font-display text-3xl font-extrabold text-ink-900 dark:text-white">Suchergebnisse</h1>
      <div className="mt-4 max-w-lg">
        <SearchBox />
      </div>
      <p className="mt-4 text-ink-600 dark:text-ink-400">
        {totalResults} Ergebnisse für <strong>„{q}“</strong>
      </p>

      {categories.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-ink-900 dark:text-white">
            <TagIcon className="h-4 w-4 text-brand-600" /> Kategorien
          </h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link key={c.id} href={`/kategorie/${c.slug}`} className="rounded-full border border-ink-200 px-4 py-1.5 text-sm font-medium text-ink-700 hover:border-brand-400 dark:border-ink-700 dark:text-ink-200">
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {tags.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 font-display text-lg font-bold text-ink-900 dark:text-white">Schlagwörter</h2>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <span key={t.id} className="rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-600 dark:bg-ink-800 dark:text-ink-300">#{t.name}</span>
            ))}
          </div>
        </section>
      )}

      {events.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-ink-900 dark:text-white">
            <CalendarDays className="h-4 w-4 text-brand-600" /> Veranstaltungen
          </h2>
          <div className="space-y-2">
            {events.map((e) => (
              <Link key={e.id} href={`/veranstaltungen/${e.slug}`} className="flex items-center justify-between rounded-xl border border-ink-200 bg-white p-3 hover:border-brand-400 dark:border-ink-800 dark:bg-ink-900">
                <span className="font-medium text-ink-900 dark:text-white">{e.title}</span>
                <span className="text-sm text-ink-500 dark:text-ink-400">{formatDate(e.startsAt)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {posts.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-ink-900 dark:text-white">
            <Newspaper className="h-4 w-4 text-brand-600" /> Beiträge
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => <PostCard key={post.slug} post={post} />)}
          </div>
        </section>
      )}

      {totalResults === 0 && (
        <p className="mt-10 rounded-xl border border-dashed border-ink-300 p-8 text-center text-ink-500 dark:border-ink-700">
          Keine Ergebnisse gefunden. Versuche einen anderen Suchbegriff.
        </p>
      )}
    </div>
  );
}
