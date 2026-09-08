import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { postCardSelect, publishedPostsWhere, getCategories } from "@/lib/queries";
import { PostCard } from "@/components/site/PostCard";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Neueste Beiträge",
  description: "Alle veröffentlichten Beiträge von BOS_SH24 – Pressemitteilungen, Einsatzberichte und Aktuelles.",
};

const PAGE_SIZE = 9;

export default async function PostsPage({
  searchParams,
}: {
  searchParams: { seite?: string; kategorie?: string };
}) {
  const page = Math.max(1, Number(searchParams.seite) || 1);
  const categories = await getCategories();
  const activeCategory = categories.find((c) => c.slug === searchParams.kategorie);

  const where = {
    ...publishedPostsWhere(),
    ...(activeCategory ? { categoryId: activeCategory.id } : {}),
  };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: postCardSelect,
    }),
    prisma.post.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="container-page py-10 lg:py-14">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-extrabold text-ink-900 dark:text-white">Neueste Beiträge</h1>
        <p className="mt-2 text-ink-600 dark:text-ink-400">
          {total} Beiträge {activeCategory ? `in „${activeCategory.name}“` : "insgesamt"} – sortiert nach Veröffentlichungsdatum.
        </p>
      </header>

      <div className="mb-8 flex flex-wrap gap-2">
        <Link
          href="/beitraege"
          className={cn(
            "rounded-full border px-4 py-1.5 text-sm font-medium",
            !activeCategory
              ? "border-brand-600 bg-brand-600 text-white"
              : "border-ink-200 text-ink-700 hover:border-brand-400 dark:border-ink-700 dark:text-ink-200",
          )}
        >
          Alle
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/beitraege?kategorie=${cat.slug}`}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium",
              activeCategory?.id === cat.id
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-ink-200 text-ink-700 hover:border-brand-400 dark:border-ink-700 dark:text-ink-200",
            )}
          >
            {cat.name}
          </Link>
        ))}
      </div>

      {posts.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-ink-300 p-8 text-center text-ink-500 dark:border-ink-700">
          Keine Beiträge gefunden.
        </p>
      )}

      {totalPages > 1 && (
        <nav className="mt-10 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/beitraege?seite=${p}${activeCategory ? `&kategorie=${activeCategory.slug}` : ""}`}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium",
                p === page ? "bg-brand-600 text-white" : "border border-ink-200 text-ink-700 hover:bg-ink-100 dark:border-ink-700 dark:text-ink-200",
              )}
            >
              {p}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
