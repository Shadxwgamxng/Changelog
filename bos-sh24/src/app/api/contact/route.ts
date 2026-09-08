import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contactSchema } from "@/lib/validation";
import { sanitizePlainish } from "@/lib/sanitize";

const submissionsByIp = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (submissionsByIp.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  submissionsByIp.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_MAX;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte versuche es in einigen Minuten erneut." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // Honeypot: das Feld "website" ist unsichtbar für Menschen, Bots füllen es meist aus.
  if (data.website) {
    return NextResponse.json({ success: true });
  }

  // Formulare, die schneller als 2 Sekunden ausgefüllt wurden, stammen fast immer von Bots.
  if (data.formStartedAt && Date.now() - data.formStartedAt < 2000) {
    return NextResponse.json({ error: "Bitte versuche es erneut." }, { status: 400 });
  }

  await prisma.contactMessage.create({
    data: {
      firstName: sanitizePlainish(data.firstName),
      lastName: sanitizePlainish(data.lastName),
      email: data.email,
      phone: data.phone ? sanitizePlainish(data.phone) : null,
      subject: sanitizePlainish(data.subject),
      message: sanitizePlainish(data.message),
    },
  });

  return NextResponse.json({ success: true });
}
