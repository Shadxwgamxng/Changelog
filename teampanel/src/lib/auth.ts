import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { RoleKey, AirsoftRole } from "@prisma/client";
import { db } from "./db";
import { env, SESSION_COOKIE } from "./env";
import { generateToken, hashToken } from "./tokens";
import { ActionError } from "./action";
import { can, type Permission } from "./permissions";

export interface SessionUser {
  id: string;
  username: string;
  email: string;
  role: RoleKey;
  mustChangePassword: boolean;
  firstName: string;
  lastName: string;
  callsign: string | null;
  avatarUrl: string | null;
  airsoftRole: AirsoftRole;
}

export async function getClientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || h.get("x-real-ip") || "unknown";
}

export async function createSession(userId: string) {
  const token = generateToken();
  const h = await headers();
  const expiresAt = new Date(Date.now() + env.sessionDays * 86_400_000);
  await db.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      userAgent: h.get("user-agent")?.slice(0, 250) ?? null,
      ip: await getClientIp(),
    },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.cookieSecure,
    path: "/",
    expires: expiresAt,
  });
}

export async function destroyCurrentSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
}

/** Aktueller Benutzer (pro Request gecacht). Inaktive Benutzer und abgelaufene Sessions liefern null. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { role: true, profile: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  const { user } = session;
  if (!user.active || !user.profile) return null;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role.key,
    mustChangePassword: user.mustChangePassword,
    firstName: user.profile.firstName,
    lastName: user.profile.lastName,
    callsign: user.profile.callsign,
    avatarUrl: user.profile.avatarUrl,
    airsoftRole: user.profile.airsoftRole,
  };
});

/** Für Seiten/Layouts: leitet auf den Login um. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Für Seiten: ohne Recht → 404 (verrät nicht, dass die Seite existiert). */
export async function requirePagePermission(...permissions: Permission[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!permissions.some((p) => can(user, p))) notFound();
  return user;
}

/** Für Server Actions: wirft verständliche Fehler statt umzuleiten. */
export async function actionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ActionError("Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.");
  return user;
}

export async function actionPermission(...permissions: Permission[]): Promise<SessionUser> {
  const user = await actionUser();
  if (!permissions.some((p) => can(user, p))) throw new ActionError("Dafür fehlt dir die Berechtigung.");
  return user;
}
