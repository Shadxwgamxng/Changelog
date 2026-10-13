// Login mit Discord (OAuth2, Scope „identify“). Es melden sich nur Konten an, die vorher mit Discord verknüpft wurden.
import { prisma } from "./db";
import { env } from "./env";
import { audit } from "./audit";
import { badRequest, conflict, tooMany, unauthorized } from "./errors";
import { createSession, type Meta } from "./auth";
import type { Ctx } from "./context";
import { rateLimit } from "@/lib/rate-limit";

export interface DiscordProfile { id: string; username: string; globalName?: string | null }

export const discordEnabled = () => Boolean(env.discord);
export const discordRedirectUri = () => `${env.appUrl}/api/auth/discord/callback`;

export function discordAuthorizeUrl(state: string): string {
  const d = env.discord;
  if (!d) throw badRequest("Discord-Login ist nicht eingerichtet.");
  const q = new URLSearchParams({ client_id: d.clientId, redirect_uri: discordRedirectUri(), response_type: "code", scope: "identify", state, prompt: "none" });
  return `https://discord.com/oauth2/authorize?${q}`;
}

/** Tauscht den Autorisierungscode gegen das Discord-Profil. `fetchImpl` ist für Tests austauschbar. */
export async function fetchDiscordProfile(code: string, fetchImpl: typeof fetch = fetch): Promise<DiscordProfile> {
  const d = env.discord;
  if (!d) throw badRequest("Discord-Login ist nicht eingerichtet.");
  const tokenRes = await fetchImpl("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: d.clientId, client_secret: d.clientSecret, grant_type: "authorization_code", code, redirect_uri: discordRedirectUri() }),
  });
  if (!tokenRes.ok) throw unauthorized("Discord hat die Anmeldung nicht bestätigt.");
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  if (!access_token) throw unauthorized("Discord hat die Anmeldung nicht bestätigt.");
  const meRes = await fetchImpl("https://discord.com/api/users/@me", { headers: { authorization: `Bearer ${access_token}` } });
  if (!meRes.ok) throw unauthorized("Discord-Profil konnte nicht gelesen werden.");
  const me = (await meRes.json()) as { id?: string; username?: string; global_name?: string | null };
  if (!me.id || !/^\d{5,25}$/.test(me.id)) throw unauthorized("Discord-Profil ist ungültig.");
  return { id: me.id, username: me.username ?? "", globalName: me.global_name ?? null };
}

const label = (p: DiscordProfile) => (p.globalName && p.globalName !== p.username ? `${p.globalName} (@${p.username})` : `@${p.username}`);

export type DiscordLoginResult = { status: "ok" | "2fa"; token: string };

/** Anmeldung über ein verknüpftes Discord-Konto. 2FA bleibt Pflicht, wenn sie aktiviert ist. */
export async function loginWithDiscord(profile: DiscordProfile, meta: Meta = {}): Promise<DiscordLoginResult> {
  if (!rateLimit(`login:ip:${meta.ip ?? "?"}`, 30, 10 * 60_000).ok) throw tooMany();
  const user = await prisma.user.findUnique({ where: { discordId: profile.id } });
  if (!user) throw unauthorized("Dieses Discord-Konto ist mit keinem HelferNet-Konto verknüpft. Melde dich einmal mit E-Mail und Passwort an und verknüpfe Discord unter „Konto“ – oder bitte die Leitung, deine Discord-ID einzutragen.");
  if (!user.active || (user.lockedUntil && user.lockedUntil > new Date())) throw unauthorized("Das Konto ist gesperrt.");
  // Wer sich über Discord anmeldet, braucht das Initialpasswort nicht mehr zu ändern.
  await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lastLoginAt: new Date(), discordName: label(profile), mustChangePw: false } });
  const token = await createSession(user.id, !user.totpEnabled, meta);
  await audit({ userId: user.id, email: user.email, ip: meta.ip }, { action: "auth.login_discord", entityType: "User", entityId: user.id, summary: "Mit Discord angemeldet" });
  return { status: user.totpEnabled ? "2fa" : "ok", token };
}

export async function linkDiscord(ctx: Ctx, profile: DiscordProfile) {
  const other = await prisma.user.findUnique({ where: { discordId: profile.id } });
  if (other && other.id !== ctx.userId) throw conflict("Dieses Discord-Konto ist bereits mit einem anderen HelferNet-Konto verknüpft.");
  await prisma.user.update({ where: { id: ctx.userId }, data: { discordId: profile.id, discordName: label(profile) } });
  await audit(ctx, { action: "user.discord_link", entityType: "User", entityId: ctx.userId, summary: `Discord-Konto ${label(profile)} verknüpft` });
}

export async function unlinkDiscord(ctx: Ctx) {
  await prisma.user.update({ where: { id: ctx.userId }, data: { discordId: null, discordName: null } });
  await audit(ctx, { action: "user.discord_unlink", entityType: "User", entityId: ctx.userId, summary: "Discord-Verknüpfung entfernt" });
}
