import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";
import { sendWelcomeMail } from "@/lib/mailer";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." },
      { status: 400 },
    );
  }

  const { name, username, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: normalizedEmail }, { username }] },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Diese E-Mail-Adresse oder dieser Benutzername wird bereits verwendet." },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, username, email: normalizedEmail, passwordHash, role: "USER" },
  });

  await prisma.notification.create({
    data: {
      userId: user.id,
      type: "register",
      message: "Willkommen bei BOS_SH24! Dein Konto wurde erfolgreich erstellt.",
    },
  });

  await sendWelcomeMail(normalizedEmail, name);

  return NextResponse.json({ success: true });
}
