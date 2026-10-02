import "server-only";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { hashPassword } from "@/lib/password";

/** Gültige (unbenutzte, nicht abgelaufene) Einladung zum Token oder null. */
export async function findValidInvitation(token: string) {
  if (!token || token.length > 200) return null;
  const inv = await db.invitation.findUnique({ where: { tokenHash: hashToken(token) }, include: { role: true } });
  if (!inv || inv.usedAt || inv.expiresAt < new Date()) return null;
  return inv;
}

export async function findValidResetToken(token: string) {
  if (!token || token.length > 200) return null;
  const row = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!row || row.usedAt || row.expiresAt < new Date() || !row.user.active) return null;
  return row;
}

let dummyHash: Promise<string> | null = null;
/** Hash für nicht existierende Benutzer, damit die Antwortzeit keine Benutzernamen verrät. */
export function getDummyHash() {
  dummyHash ??= hashPassword("dummy-password-for-timing");
  return dummyHash;
}
