// Authentifizierung: Passwort (scrypt), serverseitige Sessions (nur Token-Hash in der DB), optional TOTP-2FA.
import { prisma } from "./db";
import { env } from "./env";
import { audit } from "./audit";
import { badRequest, tooMany, unauthorized } from "./errors";
import { loadCtx, type Ctx } from "./context";
import { decryptString, encryptString, hashPassword, passwordProblems, randomToken, sha256, verifyPassword } from "@/lib/crypto";
import { generateTotpSecret, otpauthUri, verifyTotp } from "@/lib/totp";
import { rateLimit } from "@/lib/rate-limit";

const MAX_FAILS = 5;
const LOCK_MIN = 15;
// Wird bei unbekannter E-Mail verglichen, damit die Antwortzeit nichts verrät.
let dummyHash: Promise<string> | null = null;

export interface Meta { ip?: string; userAgent?: string }

export type LoginResult =
  | { status: "ok"; token: string; mustChangePw: boolean }
  | { status: "2fa"; token: string };

export async function login(emailRaw: string, password: string, meta: Meta = {}): Promise<LoginResult> {
  const email = emailRaw.trim().toLowerCase();
  const rl = rateLimit(`login:ip:${meta.ip ?? "?"}`, 30, 10 * 60_000);
  const rl2 = rateLimit(`login:email:${email}`, 10, 10 * 60_000);
  if (!rl.ok || !rl2.ok) throw tooMany();

  const user = await prisma.user.findUnique({ where: { email } });
  dummyHash ??= hashPassword("dummy-password-for-timing");
  const hash = user?.passwordHash ?? (await dummyHash);
  const valid = await verifyPassword(password, hash);

  if (!user || !user.active || !valid || (user.lockedUntil && user.lockedUntil > new Date())) {
    if (user && !valid) {
      const fails = user.failedLogins + 1;
      const lock = fails >= MAX_FAILS;
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLogins: lock ? 0 : fails, lockedUntil: lock ? new Date(Date.now() + LOCK_MIN * 60_000) : user.lockedUntil },
      });
      await audit({ userId: user.id, email: user.email, ip: meta.ip }, { action: lock ? "auth.locked" : "auth.failed", entityType: "User", entityId: user.id, summary: lock ? `Konto nach ${MAX_FAILS} Fehlversuchen für ${LOCK_MIN} Minuten gesperrt` : "Fehlgeschlagener Anmeldeversuch" });
    }
    throw unauthorized("E-Mail oder Passwort falsch, oder das Konto ist gesperrt.");
  }

  await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() } });
  const token = await createSession(user.id, !user.totpEnabled, meta);
  await audit({ userId: user.id, email: user.email, ip: meta.ip }, { action: "auth.login", entityType: "User", entityId: user.id, summary: "Angemeldet" });
  return user.totpEnabled ? { status: "2fa", token } : { status: "ok", token, mustChangePw: user.mustChangePw };
}

export async function createSession(userId: string, twoFactorOk: boolean, meta: Meta = {}): Promise<string> {
  const token = randomToken(32);
  await prisma.session.create({
    data: {
      id: sha256(token), userId, twoFactorOk,
      expiresAt: new Date(Date.now() + env.sessionMaxH * 3_600_000),
      ip: meta.ip, userAgent: meta.userAgent?.slice(0, 250),
    },
  });
  return token;
}

export interface SessionInfo { userId: string; twoFactorOk: boolean }

/** Prüft Token, absolutes Ablaufdatum und Inaktivitäts-Timeout; verlängert die Aktivität. */
export async function getSession(token: string | undefined | null): Promise<SessionInfo | null> {
  if (!token) return null;
  const id = sha256(token);
  const s = await prisma.session.findUnique({ where: { id } });
  if (!s) return null;
  const now = Date.now();
  if (s.expiresAt.getTime() <= now || s.lastSeenAt.getTime() + env.sessionIdleMin * 60_000 <= now) {
    await prisma.session.delete({ where: { id } }).catch(() => {});
    return null;
  }
  if (now - s.lastSeenAt.getTime() > 30_000) await prisma.session.update({ where: { id }, data: { lastSeenAt: new Date() } }).catch(() => {});
  return { userId: s.userId, twoFactorOk: s.twoFactorOk };
}

/** Liefert den vollen Kontext – nur für Sessions, die auch die 2. Stufe bestanden haben. */
export async function ctxFromToken(token: string | undefined | null, meta: Meta = {}): Promise<Ctx | null> {
  const s = await getSession(token);
  if (!s || !s.twoFactorOk) return null;
  try {
    return await loadCtx(s.userId, meta);
  } catch {
    return null;
  }
}

export async function logout(token: string | undefined | null) {
  if (token) await prisma.session.deleteMany({ where: { id: sha256(token) } });
}

export async function revokeAllSessions(userId: string, exceptToken?: string) {
  await prisma.session.deleteMany({ where: { userId, ...(exceptToken ? { id: { not: sha256(exceptToken) } } : {}) } });
}

// ── 2. Faktor ──
export async function completeTwoFactor(token: string, code: string, meta: Meta = {}): Promise<void> {
  const s = await getSession(token);
  if (!s) throw unauthorized();
  if (!rateLimit(`2fa:${s.userId}`, 8, 10 * 60_000).ok) throw tooMany();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: s.userId } });
  const clean = code.replace(/\s+/g, "");
  let ok = false;
  if (user.totpSecretEnc && verifyTotp(decryptString(user.totpSecretEnc), clean)) ok = true;
  else {
    const h = sha256(clean.toLowerCase());
    if (user.recoveryHashes.includes(h)) {
      ok = true;
      await prisma.user.update({ where: { id: user.id }, data: { recoveryHashes: user.recoveryHashes.filter((x) => x !== h) } });
    }
  }
  if (!ok) {
    await audit({ userId: user.id, email: user.email, ip: meta.ip }, { action: "auth.2fa_failed", entityType: "User", entityId: user.id, summary: "Ungültiger 2FA-Code" });
    throw unauthorized("Der Code ist ungültig.");
  }
  await prisma.session.update({ where: { id: sha256(token) }, data: { twoFactorOk: true } });
}

export async function beginTotpSetup(ctx: Ctx) {
  const secret = generateTotpSecret();
  // Noch nicht aktiv – wird erst durch confirmTotpSetup scharfgeschaltet.
  await prisma.user.update({ where: { id: ctx.userId }, data: { totpSecretEnc: encryptString(secret), totpEnabled: false } });
  return { secret, uri: otpauthUri(secret, ctx.email) };
}

export async function confirmTotpSetup(ctx: Ctx, code: string): Promise<string[]> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: ctx.userId } });
  if (!user.totpSecretEnc || user.totpEnabled) throw badRequest("Es läuft keine 2FA-Einrichtung.");
  if (!verifyTotp(decryptString(user.totpSecretEnc), code.replace(/\s+/g, ""))) throw badRequest("Der Code ist ungültig.");
  const codes = Array.from({ length: 8 }, () => randomToken(6).toLowerCase().replace(/[^a-z0-9]/g, "x").slice(0, 10));
  await prisma.user.update({ where: { id: ctx.userId }, data: { totpEnabled: true, recoveryHashes: codes.map((c) => sha256(c)) } });
  await audit(ctx, { action: "auth.2fa_enabled", entityType: "User", entityId: ctx.userId, summary: "2FA aktiviert" });
  return codes;
}

export async function disableTotp(ctx: Ctx, password: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: ctx.userId } });
  if (!(await verifyPassword(password, user.passwordHash))) throw badRequest("Das Passwort ist falsch.");
  await prisma.user.update({ where: { id: ctx.userId }, data: { totpEnabled: false, totpSecretEnc: null, recoveryHashes: [] } });
  await audit(ctx, { action: "auth.2fa_disabled", entityType: "User", entityId: ctx.userId, summary: "2FA deaktiviert" });
}

// ── Passwort ──
export async function changePassword(ctx: Ctx, current: string, next: string, keepToken?: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: ctx.userId } });
  if (!(await verifyPassword(current, user.passwordHash))) throw badRequest("Das aktuelle Passwort ist falsch.");
  const problems = passwordProblems(next);
  if (problems.length) throw badRequest(`Das neue Passwort braucht ${problems.join(" und ")}.`);
  if (current === next) throw badRequest("Das neue Passwort muss sich vom alten unterscheiden.");
  await prisma.user.update({ where: { id: ctx.userId }, data: { passwordHash: await hashPassword(next), mustChangePw: false, passwordChangedAt: new Date() } });
  await revokeAllSessions(ctx.userId, keepToken);
  await audit(ctx, { action: "auth.password_changed", entityType: "User", entityId: ctx.userId, summary: "Passwort geändert" });
}

export async function regenerateIcalToken(ctx: Ctx): Promise<string> {
  const token = randomToken(24);
  await prisma.user.update({ where: { id: ctx.userId }, data: { icalToken: token } });
  return token;
}

export async function purgeExpiredSessions() {
  const idle = new Date(Date.now() - env.sessionIdleMin * 60_000);
  return prisma.session.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date() } }, { lastSeenAt: { lt: idle } }] } });
}
