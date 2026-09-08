import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { eventSchema } from "@/lib/validation";
import { sanitizePlainish } from "@/lib/sanitize";
import { requireRole } from "@/lib/api-auth";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." }, { status: 400 });
  }
  const data = parsed.data;

  const event = await prisma.event.update({
    where: { id: params.id },
    data: {
      title: sanitizePlainish(data.title),
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

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  await prisma.event.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
