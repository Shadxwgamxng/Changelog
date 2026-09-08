import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const staticRoutes = [
    "", "/beitraege", "/veranstaltungen", "/ueber-uns", "/kontakt",
    "/impressum", "/datenschutz", "/login", "/registrieren",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1 : 0.6,
  }));

  const [posts, categories, events] = await Promise.all([
    prisma.post.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ select: { slug: true } }),
    prisma.event.findMany({ where: { isPublic: true }, select: { slug: true } }),
  ]);

  const postRoutes = posts.map((p) => ({
    url: `${baseUrl}/beitraege/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const categoryRoutes = categories.map((c) => ({
    url: `${baseUrl}/kategorie/${c.slug}`,
    changeFrequency: "daily" as const,
    priority: 0.5,
  }));

  const eventRoutes = events.map((e) => ({
    url: `${baseUrl}/veranstaltungen/${e.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  return [...staticRoutes, ...postRoutes, ...categoryRoutes, ...eventRoutes];
}
