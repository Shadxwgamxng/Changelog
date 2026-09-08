import Link from "next/link";
import Image from "next/image";
import { CalendarDays, User } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

interface PostCardData {
  title: string;
  subtitle?: string | null;
  slug: string;
  excerpt: string;
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
  publishedAt: Date | string | null;
  category: { name: string; slug: string } | null;
  author: { name: string } | null;
}

export function PostCard({ post, priority = false }: { post: PostCardData; priority?: boolean }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-soft dark:border-ink-800 dark:bg-ink-900">
      <Link href={`/beitraege/${post.slug}`} className="relative block aspect-[16/10] w-full overflow-hidden bg-ink-100 dark:bg-ink-800">
        {post.coverImageUrl ? (
          <Image
            src={post.coverImageUrl}
            alt={post.coverImageAlt ?? post.title}
            fill
            priority={priority}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-300">Kein Bild</div>
        )}
        {post.category && (
          <span className="absolute left-3 top-3">
            <Badge color="brand">{post.category.name}</Badge>
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-3 text-xs text-ink-500 dark:text-ink-400">
          {post.publishedAt && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> {formatDateTime(post.publishedAt)}
            </span>
          )}
          {post.author && (
            <span className="inline-flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> {post.author.name}
            </span>
          )}
        </div>
        <h3 className="font-display text-lg font-bold leading-snug text-ink-900 dark:text-white">
          <Link href={`/beitraege/${post.slug}`} className="line-clamp-2 hover:text-brand-600">
            {post.title}
          </Link>
        </h3>
        <p className="line-clamp-2 flex-1 text-sm text-ink-600 dark:text-ink-400">{post.excerpt}</p>
        <Link
          href={`/beitraege/${post.slug}`}
          className="mt-2 inline-flex w-fit items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          Beitrag lesen →
        </Link>
      </div>
    </article>
  );
}
