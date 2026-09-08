import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);
const MAX_SIZE = 8 * 1024 * 1024; // 8 MB
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!can.manageMedia(session?.user.role)) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Keine Datei erhalten." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Nicht unterstützter Dateityp. Erlaubt: JPG, PNG, WEBP, GIF, SVG." },
      { status: 400 },
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Die Datei ist zu groß (max. 8 MB)." }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  // Zufälliger, serverseitig generierter Dateiname verhindert Path-Traversal und Namenskollisionen.
  const safeName = `${randomUUID()}.${EXT_BY_TYPE[file.type]}`;
  const filePath = path.join(uploadDir, safeName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const url = `/uploads/${safeName}`;
  const title = String(formData.get("title") ?? file.name).slice(0, 150);

  const media = await prisma.media.create({
    data: {
      filename: file.name.slice(0, 200),
      url,
      mimeType: file.type,
      size: file.size,
      title,
      uploaderId: session!.user.id,
    },
  });

  return NextResponse.json({ success: true, media });
}
