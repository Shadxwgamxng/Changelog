import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postSchema } from "@/lib/validation";
import { sanitizeArticleHtml, sanitizePlainish } from "@/lib/sanitize";
import { requireRole } from "@/lib/api-auth";
import { toSlug } from "@/lib/utils";
import { can } from "@/lib/permissions";

async function uniqueSlug(base: string) {
  let slug = toSlug(base);
  if (!slug) slug = "beitrag";
  let candidate = slug;
  let i = 1;
  while (await prisma.post.findUnique({ where: { slug: candidate } })) {
    candidate = `${slug}-${++i}`;
  }
  return candidate;
}

export async function POST(request: Request) {
  const auth = await requireRole("EDITOR");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." }, { status: 400 });
  }

  const data = parsed.data;

  // Redakteure dürfen Beiträge nur unter ihrem eigenen Namen anlegen.
  const authorId = can.editAnyPost(auth.session.user.role) ? data.authorId : auth.session.user.id;

  const slug = await uniqueSlug(data.title);

  const post = await prisma.post.create({
    data: {
      title: sanitizePlainish(data.title),
      subtitle: data.subtitle ? sanitizePlainish(data.subtitle) : null,
      slug,
      excerpt: sanitizePlainish(data.excerpt),
      content: sanitizeArticleHtml(data.content),
      coverImageUrl: data.coverImageUrl || null,
      coverImageAlt: data.coverImageAlt ? sanitizePlainish(data.coverImageAlt) : null,
      categoryId: data.categoryId,
      authorId,
      status: data.status,
      featured: data.featured,
      publishedAt: data.status === "PUBLISHED" ? new Date() : null,
      scheduledAt: data.status === "SCHEDULED" && data.scheduledAt ? new Date(data.scheduledAt) : null,
      gallery: { create: data.gallery.map((g, i) => ({ url: g.url, caption: g.caption, position: i })) },
      tags: {
        create: await Promise.all(
          data.tags.filter(Boolean).map(async (name) => {
            const slug = toSlug(name);
            const tag = await prisma.tag.upsert({ where: { slug }, update: {}, create: { name, slug } });
            return { tagId: tag.id };
          }),
        ),
      },
    },
  });

  return NextResponse.json({ success: true, post });
}
