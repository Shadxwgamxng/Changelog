import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { eventSchema } from "@/lib/validation";
import { sanitizePlainish } from "@/lib/sanitize";
import { requireRole } from "@/lib/api-auth";
import { toSlug } from "@/lib/utils";

async function uniqueSlug(base: string) {
  let slug = toSlug(base) || "veranstaltung";
  let candidate = slug;
  let i = 1;
  while (await prisma.event.findUnique({ where: { slug: candidate } })) {
    candidate = `${slug}-${++i}`;
  }
  return candidate;
}

export async function POST(request: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." }, { status: 400 });
  }
  const data = parsed.data;
  const slug = await uniqueSlug(data.title);

  const event = await prisma.event.create({
    data: {
      title: sanitizePlainish(data.title),
      slug,
      description: sanitizePlainish(data.description),
      imageUrl: data.imageUrl || null,
      startsAt: new Date(data.startsAt),
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      location: sanitizePlainish(data.location),
      address: data.address ? sanitizePlainish(data.address) : null,
      category: data.category ? sanitizePlainish(data.category) : null,
      isPublic: data.isPublic,
    },
  });

  return NextResponse.json({ success: true, event });
}
