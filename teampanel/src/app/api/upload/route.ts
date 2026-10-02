import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { can, type Permission } from "@/lib/permissions";
import { MAX_UPLOAD_BYTES, UPLOAD_KINDS, UploadError, saveImage, type UploadKind } from "@/lib/uploads";

export const runtime = "nodejs";

const REQUIRED_PERMISSION: Partial<Record<UploadKind, Permission>> = {
  equipment: "equipment.manage",
  shopping: "shopping.manage",
  announcements: "announcements.create",
  team: "team.edit",
};

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Bitte melde dich an." }, { status: 401 });

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_UPLOAD_BYTES + 64 * 1024) return NextResponse.json({ error: "Die Datei ist zu groß (maximal 3 MB)." }, { status: 413 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const kind = form.get("kind");
  const file = form.get("file");
  if (typeof kind !== "string" || !(UPLOAD_KINDS as readonly string[]).includes(kind) || !(file instanceof File)) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  const permission = REQUIRED_PERMISSION[kind as UploadKind];
  if (permission && !can(user, permission)) return NextResponse.json({ error: "Dafür fehlt dir die Berechtigung." }, { status: 403 });
  // Profilbilder anderer Mitglieder pflegt nur die Mitgliederverwaltung – das Formular lädt hier lediglich hoch, die Zuordnung prüft die Action.
  try {
    const url = await saveImage(file, kind as UploadKind);
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof UploadError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[upload]", err);
    return NextResponse.json({ error: "Der Upload ist fehlgeschlagen. Bitte versuche es erneut." }, { status: 500 });
  }
}
