import { prisma } from "@/lib/prisma";

export const postCardSelect = {
  id: true,
  title: true,
  subtitle: true,
  slug: true,
  excerpt: true,
  coverImageUrl: true,
  coverImageAlt: true,
  publishedAt: true,
  viewCount: true,
  featured: true,
  category: { select: { name: true, slug: true, color: true } },
  author: { select: { name: true, avatarUrl: true, username: true } },
} as const;

export function publishedPostsWhere() {
  return { status: "PUBLISHED" as const, publishedAt: { lte: new Date() } };
}

export async function getFeaturedPost() {
  return prisma.post.findFirst({
    where: { ...publishedPostsWhere(), featured: true },
    orderBy: { publishedAt: "desc" },
    select: postCardSelect,
  });
}

export async function getLatestPosts(take = 6, skip = 0) {
  return prisma.post.findMany({
    where: publishedPostsWhere(),
    orderBy: { publishedAt: "desc" },
    take,
    skip,
    select: postCardSelect,
  });
}

export async function getMostReadPosts(take = 5) {
  return prisma.post.findMany({
    where: publishedPostsWhere(),
    orderBy: { viewCount: "desc" },
    take,
    select: postCardSelect,
  });
}

export async function getUpcomingEvents(take = 4) {
  return prisma.event.findMany({
    where: { isPublic: true, startsAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    orderBy: { startsAt: "asc" },
    take,
  });
}

export async function getCategories() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { posts: true } } },
  });
}

export async function getPostBySlug(slug: string) {
  return prisma.post.findUnique({
    where: { slug },
    include: {
      author: { select: { name: true, avatarUrl: true, username: true, bio: true } },
      category: true,
      tags: { include: { tag: true } },
      gallery: { orderBy: { position: "asc" } },
    },
  });
}

export async function getSimilarPosts(categoryId: string, excludePostId: string, take = 3) {
  return prisma.post.findMany({
    where: { ...publishedPostsWhere(), categoryId, id: { not: excludePostId } },
    orderBy: { publishedAt: "desc" },
    take,
    select: postCardSelect,
  });
}
