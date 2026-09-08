import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";
import { settingsSchema } from "@/lib/validation";
import { sanitizePlainish, sanitizeArticleHtml } from "@/lib/sanitize";

export async function PATCH(request: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." }, { status: 400 });
  }
  const data = parsed.data;

  const settings = await prisma.siteSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      siteName: sanitizePlainish(data.siteName),
      tagline: data.tagline ? sanitizePlainish(data.tagline) : "",
      description: data.description ? sanitizePlainish(data.description) : "",
      logoUrl: data.logoUrl || null,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone ? sanitizePlainish(data.contactPhone) : "",
      contactAddress: data.contactAddress ? sanitizePlainish(data.contactAddress) : "",
      facebookUrl: data.facebookUrl || null,
      instagramUrl: data.instagramUrl || null,
      youtubeUrl: data.youtubeUrl || null,
      tiktokUrl: data.tiktokUrl || null,
      xUrl: data.xUrl || null,
      footerText: data.footerText ? sanitizePlainish(data.footerText) : "",
      impressumContent: sanitizeArticleHtml(data.impressumContent ?? ""),
      datenschutzContent: sanitizeArticleHtml(data.datenschutzContent ?? ""),
    },
    update: {
      siteName: sanitizePlainish(data.siteName),
      tagline: data.tagline ? sanitizePlainish(data.tagline) : "",
      description: data.description ? sanitizePlainish(data.description) : "",
      logoUrl: data.logoUrl || null,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone ? sanitizePlainish(data.contactPhone) : "",
      contactAddress: data.contactAddress ? sanitizePlainish(data.contactAddress) : "",
      facebookUrl: data.facebookUrl || null,
      instagramUrl: data.instagramUrl || null,
      youtubeUrl: data.youtubeUrl || null,
      tiktokUrl: data.tiktokUrl || null,
      xUrl: data.xUrl || null,
      footerText: data.footerText ? sanitizePlainish(data.footerText) : "",
      impressumContent: sanitizeArticleHtml(data.impressumContent ?? ""),
      datenschutzContent: sanitizeArticleHtml(data.datenschutzContent ?? ""),
    },
  });

  return NextResponse.json({ success: true, settings });
}
