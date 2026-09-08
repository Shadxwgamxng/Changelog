import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validation";
import { sanitizePlainish } from "@/lib/sanitize";
import { requireRole } from "@/lib/api-auth";
import { toSlug } from "@/lib/utils";

export async function POST(request: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." }, { status: 400 });
  }
  const data = parsed.data;
  const slug = toSlug(data.name);

  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) return NextResponse.json({ error: "Diese Kategorie existiert bereits." }, { status: 409 });

  const category = await prisma.category.create({
    data: { name: sanitizePlainish(data.name), slug, description: data.description ? sanitizePlainish(data.description) : null, color: data.color },
  });

  return NextResponse.json({ success: true, category });
}
