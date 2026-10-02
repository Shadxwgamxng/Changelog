import "server-only";
import { db } from "@/lib/db";
import { deleteUpload } from "@/lib/uploads";

/**
 * Löscht eine hochgeladene Datei nur, wenn kein Datensatz mehr darauf verweist.
 * Verhindert, dass ein Benutzer durch Eintragen einer fremden Datei-Adresse deren Löschung auslösen kann.
 */
export async function releaseUpload(url: string | null | undefined) {
  if (!url?.startsWith("/api/files/")) return;
  const refs = await Promise.all([
    db.teamMemberProfile.count({ where: { avatarUrl: url } }),
    db.equipment.count({ where: { imageUrl: url } }),
    db.announcement.count({ where: { imageUrl: url } }),
    db.shoppingItem.count({ where: { imageUrl: url } }),
    db.teamSettings.count({ where: { logoUrl: url } }),
  ]);
  if (refs.some((n) => n > 0)) return;
  await deleteUpload(url);
}
