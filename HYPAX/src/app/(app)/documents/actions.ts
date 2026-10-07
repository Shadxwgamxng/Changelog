"use server";
import { redirect } from "next/navigation";
import { action, str } from "@/server/action";
import * as D from "@/server/services/documents";
import { badRequest } from "@/server/errors";
import { parseDateOnly } from "@/lib/dates";

async function readFile(f: FormData) {
  const file = f.get("file");
  if (!(file instanceof File) || file.size === 0) throw badRequest("Bitte wähle eine Datei.");
  return { filename: file.name, mime: file.type || "application/octet-stream", data: Buffer.from(await file.arrayBuffer()) };
}

export const uploadAction = action(async (ctx, f) => {
  const exp = str(f, "expiresAt");
  const doc = await D.uploadDocument(ctx, {
    unitId: str(f, "unitId"), title: str(f, "title"), category: str(f, "category") as never, access: str(f, "access") as never,
    ownerHelperId: str(f, "ownerHelperId") || null, vehicleId: str(f, "vehicleId") || null, expiresAt: exp ? parseDateOnly(exp) : null,
  }, await readFile(f));
  redirect(`/documents/${doc.id}`);
});
export const newVersionAction = action(async (ctx, f) => { const v = await D.addDocumentVersion(ctx, str(f, "id"), await readFile(f)); return `Version ${v} hochgeladen.`; });
export const updateMetaAction = action(async (ctx, f) => { const exp = str(f, "expiresAt"); await D.updateDocumentMeta(ctx, str(f, "id"), { title: str(f, "title"), category: str(f, "category") as never, access: str(f, "access") as never, expiresAt: exp ? parseDateOnly(exp) : null }); return "Gespeichert."; });
export const deleteDocAction = action(async (ctx, f) => { await D.deleteDocument(ctx, str(f, "id")); redirect("/documents"); });
