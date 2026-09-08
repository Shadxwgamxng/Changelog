import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowLeft, CalendarDays, Clock, User } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPostBySlug, getSimilarPosts } from "@/lib/queries";
import { formatDateTime, readingTime, initials } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { PostCard } from "@/components/site/PostCard";
import { ShareButtons } from "@/components/site/ShareButtons";
import { SaveButton } from "@/components/site/SaveButton";

async function getBaseUrl() {
  return process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
      authors: [post.author.name],
      images: post.coverImageUrl ? [{ url: post.coverImageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    },
    alternates: { canonical: `/beitraege/${post.slug}` },
  };
}

export default async function PostDetailPage({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);
  if (!post || (post.status !== "PUBLISHED" && post.status !== "ARCHIVED")) notFound();

  await prisma.post.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  const [similar, session, baseUrl] = await Promise.all([
    getSimilarPosts(post.categoryId, post.id),
    getServerSession(authOptions),
    getBaseUrl(),
  ]);

  let initiallySaved = false;
  if (session) {
    const saved = await prisma.savedPost.findUnique({
      where: { userId_postId: { userId: session.user.id, postId: post.id } },
    });
    initiallySaved = Boolean(saved);
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title,
    description: post.excerpt,
    image: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: { "@type": "Person", name: post.author.name },
    publisher: { "@type": "Organization", name: "BOS_SH24" },
    mainEntityOfPage: `${baseUrl}/beitraege/${post.slug}`,
  };

  return (
    <article className="container-page max-w-4xl py-10 lg:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Link href="/beitraege" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-brand-600 dark:text-ink-400">
        <ArrowLeft className="h-4 w-4" /> Zurück zu den Beiträgen
      </Link>

      <header className="mb-6">
        <Badge color="brand">{post.category.name}</Badge>
        <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight text-ink-900 dark:text-white sm:text-4xl">
          {post.title}
        </h1>
        {post.subtitle && <p className="mt-3 text-lg text-ink-600 dark:text-ink-400">{post.subtitle}</p>}

        <div className="mt-5 flex flex-wrap items-center gap-4 border-y border-ink-200 py-4 dark:border-ink-800">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-200">
              {initials(post.author.name)}
            </span>
            <div className="text-sm">
              <p className="font-medium text-ink-900 dark:text-white">{post.author.name}</p>
              <p className="text-ink-500 dark:text-ink-400">Autor</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm text-ink-500 dark:text-ink-400">
            <CalendarDays className="h-4 w-4" /> {post.publishedAt && formatDateTime(post.publishedAt)}
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm text-ink-500 dark:text-ink-400">
            <Clock className="h-4 w-4" /> {readingTime(post.content)} Min. Lesezeit
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm text-ink-500 dark:text-ink-400">
            <User className="h-4 w-4" /> {post.viewCount} Aufrufe
          </span>
        </div>
      </header>

      {post.coverImageUrl && (
        <div className="relative mb-8 aspect-[16/9] w-full overflow-hidden rounded-2xl bg-ink-100 dark:bg-ink-800">
          <Image src={post.coverImageUrl} alt={post.coverImageAlt ?? post.title} fill priority sizes="100vw" className="object-cover" />
        </div>
      )}

      <div className="prose-article" dangerouslySetInnerHTML={{ __html: post.content }} />

      {post.gallery.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 font-display text-xl font-bold text-ink-900 dark:text-white">Weitere Bilder</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {post.gallery.map((img) => (
              <figure key={img.id} className="overflow-hidden rounded-xl border border-ink-200 dark:border-ink-800">
                <div className="relative aspect-[4/3] w-full bg-ink-100 dark:bg-ink-800">
                  <Image src={img.url} alt={img.caption ?? post.title} fill sizes="50vw" className="object-cover" />
                </div>
                {img.caption && (
                  <figcaption className="p-2 text-center text-xs text-ink-500 dark:text-ink-400">{img.caption}</figcaption>
                )}
              </figure>
            ))}
          </div>
        </section>
      )}

      {post.tags.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {post.tags.map(({ tag }) => (
            <span key={tag.id} className="rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-600 dark:bg-ink-800 dark:text-ink-300">
              #{tag.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-y border-ink-200 py-4 dark:border-ink-800">
        <ShareButtons title={post.title} url={`${baseUrl}/beitraege/${post.slug}`} />
        <SaveButton postId={post.id} initiallySaved={initiallySaved} />
      </div>

      {similar.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-5 font-display text-xl font-bold text-ink-900 dark:text-white">Ähnliche Beiträge</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((p) => (
              <PostCard key={p.slug} post={p} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
