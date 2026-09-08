import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { PostForm } from "@/components/admin/PostForm";
import type { PostStatus } from "@/lib/types";

export const metadata = { title: "Beitrag bearbeiten" };

export default async function EditPostPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const role = session!.user.role;

  const post = await prisma.post.findUnique({
    where: { id: params.id },
    include: { tags: { include: { tag: true } }, gallery: { orderBy: { position: "asc" } } },
  });
  if (!post) notFound();
  if (!can.editAnyPost(role) && post.authorId !== session!.user.id) {
    redirect("/admin/beitraege");
  }

  const [categories, authors] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    can.editAnyPost(role)
      ? prisma.user.findMany({ where: { role: { in: ["EDITOR", "ADMIN"] } }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-ink-900 dark:text-white">Beitrag bearbeiten</h1>
      <PostForm
        categories={categories}
        authors={authors.length ? authors : [{ id: post.authorId, name: session!.user.name ?? "Ich" }]}
        canPickAuthor={can.editAnyPost(role)}
        initial={{
          id: post.id,
          title: post.title,
          subtitle: post.subtitle ?? "",
          excerpt: post.excerpt,
          content: post.content,
          categoryId: post.categoryId,
          tags: post.tags.map((t) => t.tag.name).join(", "),
          coverImageUrl: post.coverImageUrl ?? "",
          coverImageAlt: post.coverImageAlt ?? "",
          authorId: post.authorId,
          status: post.status as PostStatus,
          featured: post.featured,
          scheduledAt: post.scheduledAt ? post.scheduledAt.toISOString().slice(0, 16) : "",
          gallery: post.gallery.map((g) => ({ url: g.url, caption: g.caption ?? "" })),
        }}
      />
    </div>
  );
}
