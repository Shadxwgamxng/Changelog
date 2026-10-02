"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { env, SESSION_COOKIE } from "@/lib/env";
import { ActionError, ok, run, type ActionResult } from "@/lib/action";
import { actionUser, createSession, destroyCurrentSession, getClientIp } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { generateToken, hashToken } from "@/lib/tokens";
import { LOGIN_LIMIT, SENSITIVE_LIMIT, blockedFor, clearAttempts, formatWait, registerAttempt } from "@/lib/rate-limit";
import { sendMail } from "@/lib/mailer";
import { audit } from "@/lib/audit";
import { formToObject, zEmail, zOptStr, zPassword, zStr, zUsername } from "@/lib/validation";
import { findValidInvitation, findValidResetToken, getDummyHash } from "../auth-helpers";

const GENERIC_LOGIN_ERROR = "Benutzername oder Passwort ist falsch.";

const loginSchema = z.object({
  identifier: zStr("Benutzername oder E-Mail", 200),
  password: z.string().min(1, "Bitte gib dein Passwort ein.").max(256),
});

export async function login(formData: FormData): Promise<ActionResult<{ redirectTo: string }>> {
  return run("Die Anmeldung ist fehlgeschlagen. Bitte versuche es erneut.", async () => {
    const input = loginSchema.parse(formToObject(formData));
    const identifier = input.identifier.toLowerCase();
    const ipKey = `login:ip:${await getClientIp()}`;
    const idKey = `login:id:${identifier}`;

    const wait = Math.max(await blockedFor(ipKey), await blockedFor(idKey));
    if (wait > 0) throw new ActionError(`Zu viele Fehlversuche. Bitte warte ${formatWait(wait)} und versuche es dann erneut.`);

    const user = await db.user.findFirst({ where: { OR: [{ username: identifier }, { email: identifier }] } });
    const valid = await verifyPassword(input.password, user?.passwordHash ?? (await getDummyHash()));
    if (!user || !valid) {
      await registerAttempt(ipKey, { ...LOGIN_LIMIT, max: LOGIN_LIMIT.max * 4 });
      await registerAttempt(idKey, LOGIN_LIMIT);
      throw new ActionError(GENERIC_LOGIN_ERROR);
    }
    if (!user.active) throw new ActionError("Dein Konto ist deaktiviert. Bitte wende dich an die Teamleitung.");

    await clearAttempts(idKey);
    await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await createSession(user.id);
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return ok(undefined, { redirectTo: "/" });
  });
}

export async function logout(): Promise<void> {
  await destroyCurrentSession();
  redirect("/login");
}

const forgotSchema = z.object({ email: zEmail });

/** Antwortet immer gleich, damit nicht erkennbar ist, ob eine Adresse registriert ist. */
export async function requestPasswordReset(formData: FormData): Promise<ActionResult> {
  return run("Die Anfrage konnte nicht verarbeitet werden. Bitte versuche es erneut.", async () => {
    const { email } = forgotSchema.parse(formToObject(formData));
    const key = `reset:ip:${await getClientIp()}`;
    const wait = await blockedFor(key);
    if (wait > 0) throw new ActionError(`Zu viele Anfragen. Bitte warte ${formatWait(wait)}.`);
    await registerAttempt(key, SENSITIVE_LIMIT);

    const user = await db.user.findUnique({ where: { email } });
    if (user?.active) {
      const token = generateToken();
      await db.$transaction([
        db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
        db.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 60 * 60_000) } }),
      ]);
      await sendMail({
        to: user.email,
        subject: "Passwort zurücksetzen – SH Airsoft Kommando",
        text: `Moin,\n\nüber diesen Link kannst du ein neues Passwort festlegen (1 Stunde gültig):\n${env.appUrl}/reset-password/${token}\n\nWenn du das nicht angefordert hast, ignoriere diese Nachricht.`,
      }).catch((err) => console.error("[mail]", err));
    }
    return ok("Falls ein Konto mit dieser E-Mail-Adresse existiert, haben wir einen Link zum Zurücksetzen gesendet.");
  });
}

const resetSchema = z
  .object({ token: zStr("Token", 200), password: zPassword, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Die Passwörter stimmen nicht überein.", path: ["confirm"] });

export async function resetPassword(formData: FormData): Promise<ActionResult<{ redirectTo: string }>> {
  return run("Das Passwort konnte nicht zurückgesetzt werden. Bitte versuche es erneut.", async () => {
    const input = resetSchema.parse(formToObject(formData));
    const row = await findValidResetToken(input.token);
    if (!row) throw new ActionError("Dieser Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.");
    const passwordHash = await hashPassword(input.password);
    await db.$transaction([
      db.user.update({ where: { id: row.userId }, data: { passwordHash, mustChangePassword: false } }),
      db.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
      db.session.deleteMany({ where: { userId: row.userId } }),
    ]);
    await audit(null, { action: "auth.passwordReset", targetType: "User", targetId: row.userId, targetLabel: row.user.username, message: `Das Passwort von ${row.user.username} wurde per Link zurückgesetzt.` });
    return ok("Passwort geändert. Du kannst dich jetzt anmelden.", { redirectTo: "/login" });
  });
}

const registerSchema = z
  .object({
    token: zStr("Einladung", 200),
    username: zUsername,
    email: zEmail,
    firstName: zStr("Vorname", 60),
    lastName: zStr("Nachname", 60),
    callsign: zOptStr("Rufname", 40),
    password: zPassword,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Die Passwörter stimmen nicht überein.", path: ["confirm"] });

export async function registerWithInvitation(formData: FormData): Promise<ActionResult<{ redirectTo: string }>> {
  return run("Die Registrierung ist fehlgeschlagen. Bitte versuche es erneut.", async () => {
    const input = registerSchema.parse(formToObject(formData));
    const key = `register:ip:${await getClientIp()}`;
    const wait = await blockedFor(key);
    if (wait > 0) throw new ActionError(`Zu viele Versuche. Bitte warte ${formatWait(wait)}.`);
    await registerAttempt(key, { max: 20, windowMs: 60 * 60_000, blockMs: 60 * 60_000 });

    const inv = await findValidInvitation(input.token);
    if (!inv) throw new ActionError("Diese Einladung ist ungültig oder abgelaufen. Bitte bitte die Teamleitung um einen neuen Link.");
    if (inv.email && inv.email.toLowerCase() !== input.email) {
      throw new ActionError("Diese Einladung ist für eine andere E-Mail-Adresse bestimmt.", { email: "Bitte verwende die eingeladene E-Mail-Adresse." });
    }

    const clash = await db.user.findFirst({ where: { OR: [{ username: input.username }, { email: input.email }] }, select: { username: true } });
    if (clash) {
      const field = clash.username === input.username ? "username" : "email";
      throw new ActionError(field === "username" ? "Dieser Benutzername ist bereits vergeben." : "Diese E-Mail-Adresse ist bereits registriert.", { [field]: "Bereits vergeben." });
    }

    const passwordHash = await hashPassword(input.password);
    const user = await db.$transaction(async (tx) => {
      // Einladung atomar "verbrauchen" – verhindert doppelte Nutzung bei parallelen Requests.
      const claimed = await tx.invitation.updateMany({ where: { id: inv.id, usedAt: null }, data: { usedAt: new Date() } });
      if (claimed.count !== 1) throw new ActionError("Diese Einladung wurde bereits verwendet.");
      return tx.user.create({
        data: {
          username: input.username,
          email: input.email,
          passwordHash,
          roleId: inv.roleId,
          profile: { create: { firstName: input.firstName, lastName: input.lastName, callsign: input.callsign } },
        },
      });
    });
    await audit(null, { action: "member.register", targetType: "User", targetId: user.id, targetLabel: input.username, message: `${input.callsign || input.firstName} hat sich über eine Einladung registriert (${inv.role.name}).` });
    await createSession(user.id);
    return ok("Willkommen im Team!", { redirectTo: "/" });
  });
}

const changePasswordSchema = z
  .object({ current: z.string().min(1, "Bitte gib dein aktuelles Passwort ein."), password: zPassword, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Die Passwörter stimmen nicht überein.", path: ["confirm"] });

export async function changeOwnPassword(formData: FormData): Promise<ActionResult> {
  return run("Das Passwort konnte nicht geändert werden. Bitte versuche es erneut.", async () => {
    const me = await actionUser();
    const input = changePasswordSchema.parse(formToObject(formData));
    const key = `pwchange:${me.id}`;
    const wait = await blockedFor(key);
    if (wait > 0) throw new ActionError(`Zu viele Fehlversuche. Bitte warte ${formatWait(wait)}.`);
    const user = await db.user.findUniqueOrThrow({ where: { id: me.id } });
    if (!(await verifyPassword(input.current, user.passwordHash))) {
      await registerAttempt(key, LOGIN_LIMIT);
      throw new ActionError("Das aktuelle Passwort ist nicht korrekt.", { current: "Nicht korrekt." });
    }
    await clearAttempts(key);
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    await db.$transaction([
      db.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(input.password), mustChangePassword: false } }),
      // Alle anderen Geräte abmelden
      db.session.deleteMany({ where: { userId: me.id, ...(token ? { NOT: { tokenHash: hashToken(token) } } : {}) } }),
    ]);
    return ok("Passwort geändert. Andere Geräte wurden abgemeldet.");
  });
}
