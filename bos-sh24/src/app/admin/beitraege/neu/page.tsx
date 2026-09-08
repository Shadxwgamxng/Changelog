import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { PostForm } from "@/components/admin/PostForm";

export const metadata = { title: "Neuer Beitrag" };

export default async function NewPostPage() {
  const session = await getServerSession(authOptions);
  const role = session!.user.role;

  const [categories, authors] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    can.editAnyPost(role)
      ? prisma.user.findMany({ where: { role: { in: ["EDITOR", "ADMIN"] } }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-ink-900 dark:text-white">Neuer Beitrag</h1>
      <PostForm
        categories={categories}
        authors={authors.length ? authors : [{ id: session!.user.id, name: session!.user.name ?? "Ich" }]}
        canPickAuthor={can.editAnyPost(role)}
        initial={{ authorId: session!.user.id }}
      />
    </div>
  );
}
