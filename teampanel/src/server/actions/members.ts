"use server";

import { revalidatePath } from "next/cache";
import type { RoleKey } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { ActionError, ok, run, type ActionResult } from "@/lib/action";
import { actionPermission, actionUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { canAssignRole, canManageUser, can, ROLE_LABELS } from "@/lib/permissions";
import { generatePassword, hashPassword } from "@/lib/password";
import { generateToken, hashToken } from "@/lib/tokens";
import { AIRSOFT_ROLE_LABELS, memberName } from "@/lib/labels";
import { releaseUpload } from "../upload-gc";
import { formToObject, zBool, zEmail, zId, zInt, zOptDateTime, zOptImage, zOptStr, zOptText, zStr, zUsername } from "@/lib/validation";
import { notifyUsers } from "../notifications";

const roleKeys = ["SUPERADMIN", "ADMIN", "TEAMLEITUNG", "MITGLIED"] as const;
const airsoftRoles = Object.keys(AIRSOFT_ROLE_LABELS) as [keyof typeof AIRSOFT_ROLE_LABELS, ...(keyof typeof AIRSOFT_ROLE_LABELS)[]];

const profileFields = {
  firstName: zStr("Vorname", 60),
  lastName: zStr("Nachname", 60),
  callsign: zOptStr("Rufname", 40),
  bio: zOptText("Beschreibung", 1000),
  airsoftRole: z.enum(airsoftRoles, { errorMap: () => ({ message: "Bitte wähle eine Airsoft-Rolle." }) }),
  phone: zOptStr("Telefon", 40),
  avatarUrl: zOptImage("Profilbild"),
};

const memberSchema = z.object({
  ...profileFields,
  username: zUsername,
  email: zEmail,
  role: z.enum(roleKeys, { errorMap: () => ({ message: "Bitte wähle eine Systemrolle." }) }),
  joinedAt: zOptDateTime("Teambeitritt"),
  adminNotes: zOptText("Notizen", 3000),
  phoneVisible: zBool,
});

async function ensureUnique(username: string, email: string, exceptId?: string) {
  const clash = await db.user.findFirst({
    where: { OR: [{ username }, { email }], ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { username: true },
  });
  if (!clash) return;
  const field = clash.username === username ? "username" : "email";
  throw new ActionError(field === "username" ? "Dieser Benutzername ist bereits vergeben." : "Diese E-Mail-Adresse ist bereits registriert.", { [field]: "Bereits vergeben." });
}

async function countOtherActiveSuperadmins(exceptId: string) {
  return db.user.count({ where: { active: true, role: { key: "SUPERADMIN" }, NOT: { id: exceptId } } });
}

async function roleIdFor(key: RoleKey) {
  const role = await db.role.findUnique({ where: { key } });
  if (!role) throw new ActionError("Die Rolle existiert nicht. Bitte führe das Datenbank-Setup aus (npm run db:bootstrap).");
  return role.id;
}

function paths() {
  revalidatePath("/admin/members");
  revalidatePath("/team");
}

export async function createMember(formData: FormData): Promise<ActionResult<{ id: string; username: string; password: string }>> {
  return run("Das Mitglied konnte nicht angelegt werden. Bitte versuche es erneut.", async () => {
    const actor = await actionPermission("members.manage");
    const input = memberSchema.parse(formToObject(formData));
    if (!canAssignRole(actor, input.role)) throw new ActionError("Diese Systemrolle darfst du nicht vergeben.", { role: "Nicht erlaubt." });
    await ensureUnique(input.username, input.email);

    const initialPassword = generatePassword();
    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          username: input.username,
          email: input.email,
          passwordHash: await hashPassword(initialPassword),
          mustChangePassword: true,
          roleId: await roleIdFor(input.role),
          profile: {
            create: {
              firstName: input.firstName,
              lastName: input.lastName,
              callsign: input.callsign,
              bio: input.bio,
              airsoftRole: input.airsoftRole,
              phone: input.phone,
              phoneVisible: input.phoneVisible,
              avatarUrl: input.avatarUrl,
              joinedAt: input.joinedAt ?? new Date(),
              adminNotes: can(actor, "members.viewNotes") ? input.adminNotes : undefined,
            },
          },
        },
      });
      await audit(actor, { action: "member.create", targetType: "User", targetId: created.id, targetLabel: input.username, message: `${actorName(actor)} hat das Mitglied ${memberName(input)} angelegt (${ROLE_LABELS[input.role]}).`, data: { role: input.role } }, tx);
      return created;
    });
    paths();
    return ok("Mitglied angelegt.", { id: user.id, username: user.username, password: initialPassword });
  });
}

function actorName(a: { callsign: string | null; firstName: string; role: RoleKey }) {
  return `${ROLE_LABELS[a.role]} ${a.callsign || a.firstName}`;
}

export async function updateMember(formData: FormData): Promise<ActionResult> {
  return run("Das Mitglied konnte nicht gespeichert werden. Bitte versuche es erneut.", async () => {
    const actor = await actionPermission("members.manage");
    const id = zId.parse(formData.get("id"));
    const input = memberSchema.parse(formToObject(formData));

    const target = await db.user.findUnique({ where: { id }, include: { role: true, profile: true } });
    if (!target?.profile) throw new ActionError("Dieses Mitglied wurde nicht gefunden.");
    if (!canManageUser(actor, { id: target.id, role: target.role.key })) throw new ActionError("Dieses Mitglied darfst du nicht bearbeiten.");

    const roleChanged = input.role !== target.role.key;
    if (roleChanged) {
      if (!canAssignRole(actor, input.role)) throw new ActionError("Diese Systemrolle darfst du nicht vergeben.", { role: "Nicht erlaubt." });
      if (target.role.key === "SUPERADMIN" && (await countOtherActiveSuperadmins(target.id)) === 0) {
        throw new ActionError("Es muss mindestens ein aktiver Superadmin bestehen bleiben.");
      }
    }
    await ensureUnique(input.username, input.email, id);

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          username: input.username,
          email: input.email,
          ...(roleChanged ? { roleId: await roleIdFor(input.role) } : {}),
          profile: {
            update: {
              firstName: input.firstName,
              lastName: input.lastName,
              callsign: input.callsign ?? null,
              bio: input.bio ?? null,
              airsoftRole: input.airsoftRole,
              phone: input.phone ?? null,
              phoneVisible: input.phoneVisible,
              avatarUrl: input.avatarUrl ?? null,
              ...(input.joinedAt ? { joinedAt: input.joinedAt } : {}),
              ...(can(actor, "members.viewNotes") ? { adminNotes: input.adminNotes ?? null } : {}),
            },
          },
        },
      });
      if (roleChanged) {
        await audit(actor, { action: "member.role", targetType: "User", targetId: id, targetLabel: input.username, message: `${actorName(actor)} hat ${input.callsign || input.firstName} die Rolle ${ROLE_LABELS[input.role]} gegeben (vorher: ${ROLE_LABELS[target.role.key]}).`, data: { from: target.role.key, to: input.role } }, tx);
        await notifyUsers([id], { type: "ROLE_CHANGED", title: `Deine Systemrolle ist jetzt: ${ROLE_LABELS[input.role]}.` }, tx);
      }
      await audit(actor, { action: "member.update", targetType: "User", targetId: id, targetLabel: input.username, message: `${actorName(actor)} hat das Mitglied ${memberName(input)} bearbeitet.` }, tx);
    });
    await releaseUpload(target.profile.avatarUrl);
    paths();
    revalidatePath(`/team/${id}`);
    return ok("Mitglied gespeichert.");
  });
}

export async function setMemberActive(id: string, active: boolean): Promise<ActionResult> {
  return run("Der Status konnte nicht geändert werden. Bitte versuche es erneut.", async () => {
    const actor = await actionPermission("members.manage");
    const target = await db.user.findUnique({ where: { id }, include: { role: true, profile: true } });
    if (!target?.profile) throw new ActionError("Dieses Mitglied wurde nicht gefunden.");
    if (!canManageUser(actor, { id: target.id, role: target.role.key })) throw new ActionError("Dieses Mitglied darfst du nicht verwalten.");
    if (!active && target.role.key === "SUPERADMIN" && (await countOtherActiveSuperadmins(id)) === 0) {
      throw new ActionError("Der letzte aktive Superadmin kann nicht deaktiviert werden.");
    }
    await db.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { active } });
      if (!active) await tx.session.deleteMany({ where: { userId: id } });
      await audit(actor, { action: active ? "member.activate" : "member.deactivate", targetType: "User", targetId: id, targetLabel: target.username, message: `${actorName(actor)} hat ${target.profile!.callsign || target.profile!.firstName} ${active ? "aktiviert" : "deaktiviert"}.` }, tx);
    });
    paths();
    return ok(active ? "Mitglied aktiviert." : "Mitglied deaktiviert und abgemeldet.");
  });
}

export async function deleteMember(id: string): Promise<ActionResult> {
  return run("Das Mitglied konnte nicht gelöscht werden. Bitte versuche es erneut.", async () => {
    const actor = await actionPermission("members.manage");
    const target = await db.user.findUnique({ where: { id }, include: { role: true, profile: true } });
    if (!target?.profile) throw new ActionError("Dieses Mitglied wurde nicht gefunden.");
    if (!canManageUser(actor, { id: target.id, role: target.role.key })) throw new ActionError("Dieses Mitglied darfst du nicht löschen.");
    if (target.role.key === "SUPERADMIN" && (await countOtherActiveSuperadmins(id)) === 0) {
      throw new ActionError("Der letzte aktive Superadmin kann nicht gelöscht werden.");
    }
    await db.$transaction(async (tx) => {
      await tx.user.delete({ where: { id } });
      await audit(actor, { action: "member.delete", targetType: "User", targetId: id, targetLabel: target.username, message: `${actorName(actor)} hat das Mitglied ${memberName(target.profile!)} gelöscht.` }, tx);
    });
    await releaseUpload(target.profile.avatarUrl);
    paths();
    return ok("Mitglied gelöscht.");
  });
}

const ownProfileSchema = z.object(profileFields).extend({ phoneVisible: zBool });

export async function updateOwnProfile(formData: FormData): Promise<ActionResult> {
  return run("Dein Profil konnte nicht gespeichert werden. Bitte versuche es erneut.", async () => {
    const me = await actionUser();
    const input = ownProfileSchema.parse(formToObject(formData));
    const current = await db.teamMemberProfile.findUnique({ where: { userId: me.id } });
    if (!current) throw new ActionError("Dein Profil wurde nicht gefunden.");
    await db.teamMemberProfile.update({
      where: { userId: me.id },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        callsign: input.callsign ?? null,
        bio: input.bio ?? null,
        airsoftRole: input.airsoftRole,
        phone: input.phone ?? null,
        phoneVisible: input.phoneVisible,
        avatarUrl: input.avatarUrl ?? null,
      },
    });
    await releaseUpload(current.avatarUrl);
    revalidatePath("/", "layout");
    return ok("Profil gespeichert.");
  });
}

// ── Einladungen & Passwort-Links ─────────────────────────────

const invitationSchema = z.object({
  email: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), zEmail.optional()),
  role: z.enum(roleKeys),
  days: zInt("Gültigkeit", 1, 30),
  note: zOptStr("Notiz", 200),
});

export async function createInvitation(formData: FormData): Promise<ActionResult<{ url: string }>> {
  return run("Die Einladung konnte nicht erstellt werden. Bitte versuche es erneut.", async () => {
    const actor = await actionPermission("invitations.manage");
    const input = invitationSchema.parse(formToObject(formData));
    if (!canAssignRole(actor, input.role)) throw new ActionError("Diese Systemrolle darfst du nicht vergeben.", { role: "Nicht erlaubt." });
    if (input.email && (await db.user.findUnique({ where: { email: input.email } }))) {
      throw new ActionError("Mit dieser E-Mail-Adresse gibt es bereits ein Konto.", { email: "Bereits registriert." });
    }
    const token = generateToken();
    const inv = await db.invitation.create({
      data: { tokenHash: hashToken(token), email: input.email, roleId: await roleIdFor(input.role), createdById: actor.id, note: input.note, expiresAt: new Date(Date.now() + input.days * 86_400_000) },
    });
    await audit(actor, { action: "invitation.create", targetType: "Invitation", targetId: inv.id, targetLabel: input.email ?? input.note ?? null, message: `${actorName(actor)} hat einen Einladungslink erstellt (${ROLE_LABELS[input.role]}${input.email ? `, ${input.email}` : ""}).` });
    revalidatePath("/admin/members");
    return ok("Einladungslink erstellt.", { url: `${env.appUrl}/register/${token}` });
  });
}

export async function revokeInvitation(id: string): Promise<ActionResult> {
  return run("Die Einladung konnte nicht widerrufen werden. Bitte versuche es erneut.", async () => {
    const actor = await actionPermission("invitations.manage");
    const inv = await db.invitation.findUnique({ where: { id }, include: { role: true } });
    if (!inv) throw new ActionError("Diese Einladung existiert nicht mehr.");
    await db.invitation.delete({ where: { id } });
    await audit(actor, { action: "invitation.revoke", targetType: "Invitation", targetId: id, message: `${actorName(actor)} hat eine Einladung (${inv.role.name}) widerrufen.` });
    revalidatePath("/admin/members");
    return ok("Einladung widerrufen.");
  });
}

/** Erzeugt einen Passwort-Reset-Link, den ein Admin an das Mitglied weitergeben kann. */
export async function createResetLink(userId: string): Promise<ActionResult<{ url: string }>> {
  return run("Der Link konnte nicht erstellt werden. Bitte versuche es erneut.", async () => {
    const actor = await actionPermission("members.manage");
    const target = await db.user.findUnique({ where: { id: userId }, include: { role: true, profile: true } });
    if (!target?.profile) throw new ActionError("Dieses Mitglied wurde nicht gefunden.");
    if (!canManageUser(actor, { id: target.id, role: target.role.key })) throw new ActionError("Für dieses Mitglied darfst du keinen Link erstellen.");
    const token = generateToken();
    await db.$transaction([
      db.passwordResetToken.deleteMany({ where: { userId, usedAt: null } }),
      db.passwordResetToken.create({ data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 24 * 3_600_000) } }),
    ]);
    await audit(actor, { action: "member.resetLink", targetType: "User", targetId: userId, targetLabel: target.username, message: `${actorName(actor)} hat einen Passwort-Link für ${target.profile.callsign || target.profile.firstName} erstellt.` });
    return ok("Link erstellt (24 Stunden gültig).", { url: `${env.appUrl}/reset-password/${token}` });
  });
}

