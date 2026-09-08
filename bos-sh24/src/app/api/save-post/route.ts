import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Bitte melde dich an, um Beiträge zu speichern." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const postId = body?.postId as string | undefined;
  if (!postId) return NextResponse.json({ error: "postId fehlt." }, { status: 400 });

  const existing = await prisma.savedPost.findUnique({
    where: { userId_postId: { userId: session.user.id, postId } },
  });

  if (existing) {
    await prisma.savedPost.delete({ where: { userId_postId: { userId: session.user.id, postId } } });
    return NextResponse.json({ saved: false });
  }

  await prisma.savedPost.create({ data: { userId: session.user.id, postId } });
  return NextResponse.json({ saved: true });
}
