import { NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { sanitizePlainish } from "@/lib/sanitize";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("EDITOR");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const media = await prisma.media.update({
    where: { id: params.id },
    data: {
      title: body.title ? sanitizePlainish(String(body.title)) : null,
      description: body.description ? sanitizePlainish(String(body.description)) : null,
      credit: body.credit ? sanitizePlainish(String(body.credit)) : null,
    },
  });

  return NextResponse.json({ success: true, media });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("EDITOR");
  if (!auth.ok) return auth.response;

  const media = await prisma.media.findUnique({ where: { id: params.id } });
  if (!media) return NextResponse.json({ error: "Datei nicht gefunden." }, { status: 404 });

  await prisma.media.delete({ where: { id: params.id } });

  if (media.url.startsWith("/uploads/")) {
    const filePath = path.join(process.cwd(), "public", media.url);
    await unlink(filePath).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
