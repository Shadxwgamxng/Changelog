import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postSchema } from "@/lib/validation";
import { sanitizeArticleHtml, sanitizePlainish } from "@/lib/sanitize";
import { requireRole } from "@/lib/api-auth";
import { toSlug } from "@/lib/utils";
import { can } from "@/lib/permissions";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("EDITOR");
  if (!auth.ok) return auth.response;

  const existing = await prisma.post.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Beitrag nicht gefunden." }, { status: 404 });

  const isOwner = existing.authorId === auth.session.user.id;
  if (!can.editAnyPost(auth.session.user.role) && !isOwner) {
    return NextResponse.json({ error: "Du darfst nur eigene Beiträge bearbeiten." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." }, { status: 400 });
  }
  const data = parsed.data;

  let slug = existing.slug;
  if (toSlug(data.title) !== toSlug(existing.title)) {
    let candidate = toSlug(data.title) || "beitrag";
    let i = 1;
    while (await prisma.post.findFirst({ where: { slug: candidate, id: { not: existing.id } } })) {
      candidate = `${toSlug(data.title)}-${++i}`;
    }
    slug = candidate;
  }

  const authorId = can.editAnyPost(auth.session.user.role) ? data.authorId : existing.authorId;

  await prisma.postTag.deleteMany({ where: { postId: existing.id } });
  await prisma.postImage.deleteMany({ where: { postId: existing.id } });

  const post = await prisma.post.update({
    where: { id: existing.id },
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
      publishedAt: data.status === "PUBLISHED" ? existing.publishedAt ?? new Date() : existing.publishedAt,
      scheduledAt: data.status === "SCHEDULED" && data.scheduledAt ? new Date(data.scheduledAt) : null,
      gallery: { create: data.gallery.map((g, i) => ({ url: g.url, caption: g.caption, position: i })) },
      tags: {
        create: await Promise.all(
          data.tags.filter(Boolean).map(async (name) => {
            const tagSlug = toSlug(name);
            const tag = await prisma.tag.upsert({ where: { slug: tagSlug }, update: {}, create: { name, slug: tagSlug } });
            return { tagId: tag.id };
          }),
        ),
      },
    },
  });

  return NextResponse.json({ success: true, post });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("EDITOR");
  if (!auth.ok) return auth.response;

  const existing = await prisma.post.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Beitrag nicht gefunden." }, { status: 404 });

  const isOwner = existing.authorId === auth.session.user.id;
  if (!can.editAnyPost(auth.session.user.role) && !isOwner) {
    return NextResponse.json({ error: "Du darfst nur eigene Beiträge löschen." }, { status: 403 });
  }

  await prisma.post.delete({ where: { id: existing.id } });
  return NextResponse.json({ success: true });
}
