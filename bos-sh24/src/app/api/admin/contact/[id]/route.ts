import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { z } from "zod";

const schema = z.object({ status: z.enum(["NEW", "IN_PROGRESS", "DONE"]) });

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });

  const message = await prisma.contactMessage.update({
    where: { id: params.id },
    data: { status: parsed.data.status, handledById: auth.session.user.id },
  });

  return NextResponse.json({ success: true, message });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;
  await prisma.contactMessage.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
