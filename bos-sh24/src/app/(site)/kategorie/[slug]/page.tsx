import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { postCardSelect, publishedPostsWhere } from "@/lib/queries";
import { PostCard } from "@/components/site/PostCard";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const category = await prisma.category.findUnique({ where: { slug: params.slug } });
  if (!category) return {};
  return {
    title: category.name,
    description: category.description ?? `Alle Beiträge aus der Kategorie ${category.name} bei BOS_SH24.`,
  };
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const category = await prisma.category.findUnique({ where: { slug: params.slug } });
  if (!category) notFound();

  const posts = await prisma.post.findMany({
    where: { ...publishedPostsWhere(), categoryId: category.id },
    orderBy: { publishedAt: "desc" },
    select: postCardSelect,
  });

  return (
    <div className="container-page py-10 lg:py-14">
      <header className="mb-8">
        <span
          className="mb-2 inline-block h-1.5 w-12 rounded-full"
          style={{ backgroundColor: category.color }}
        />
        <h1 className="font-display text-3xl font-extrabold text-ink-900 dark:text-white">{category.name}</h1>
        {category.description && <p className="mt-2 max-w-2xl text-ink-600 dark:text-ink-400">{category.description}</p>}
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-500">{posts.length} Beiträge</p>
      </header>

      {posts.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-ink-300 p-8 text-center text-ink-500 dark:border-ink-700">
          In dieser Kategorie wurden noch keine Beiträge veröffentlicht.
        </p>
      )}
    </div>
  );
}
