import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { z } from "zod";

const updateSchema = z.object({
  role: z.enum(["USER", "EDITOR", "ADMIN"]).optional(),
  status: z.enum(["ACTIVE", "BLOCKED"]).optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  if (params.id === auth.session.user.id) {
    return NextResponse.json({ error: "Du kannst deine eigene Rolle oder deinen Status nicht ändern." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });

  const user = await prisma.user.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json({ success: true, user: { id: user.id, role: user.role, status: user.status } });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  if (params.id === auth.session.user.id) {
    return NextResponse.json({ error: "Du kannst dein eigenes Konto nicht löschen." }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
