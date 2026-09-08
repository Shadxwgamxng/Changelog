import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validation";
import { sanitizePlainish } from "@/lib/sanitize";
import { requireRole } from "@/lib/api-auth";
import { toSlug } from "@/lib/utils";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." }, { status: 400 });
  }
  const data = parsed.data;

  const category = await prisma.category.update({
    where: { id: params.id },
    data: {
      name: sanitizePlainish(data.name),
      slug: toSlug(data.name),
      description: data.description ? sanitizePlainish(data.description) : null,
      color: data.color,
    },
  });

  return NextResponse.json({ success: true, category });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const postCount = await prisma.post.count({ where: { categoryId: params.id } });
  if (postCount > 0) {
    return NextResponse.json(
      { error: `Diese Kategorie kann nicht gelöscht werden, da ${postCount} Beiträge zugeordnet sind.` },
      { status: 409 },
    );
  }

  await prisma.category.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
