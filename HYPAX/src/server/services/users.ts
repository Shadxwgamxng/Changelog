import type { AssignmentScope, SystemRole } from "@prisma/client";
import { prisma } from "../db";
import { audit } from "../audit";
import { badRequest, conflict, forbidden, notFound } from "../errors";
import { canIn, hasAnywhere, require_, unitIdsWith, type Ctx } from "../context";
import { loadUnits } from "../units";
import { hashPassword, passwordProblems, randomToken } from "@/lib/crypto";
import { isPermission } from "@/lib/permissions";
import { revokeAllSessions } from "../auth";

/** Benutzer sichtbar = ein Benutzer mit Rollenzuweisung oder Helferprofil in einer Einheit, in der `user.view` gilt. */
export async function listUsers(ctx: Ctx) {
  if (!hasAnywhere(ctx, "user.view") && !hasAnywhere(ctx, "user.manage")) throw forbidden();
  const unitIds = [...new Set([...(await unitIdsWith(ctx, "user.view")), ...(await unitIdsWith(ctx, "user.manage"))])];
  const all = ctx.all || ctx.globalPerms.has("user.view");
  return prisma.user.findMany({
    where: all ? {} : { OR: [{ roleAssignments: { some: { unitId: { in: unitIds } } } }, { helper: { unitId: { in: unitIds } } }] },
    select: {
      id: true, email: true, systemRole: true, active: true, totpEnabled: true, lastLoginAt: true,
      helper: { select: { id: true, firstName: true, lastName: true, unitId: true } },
      roleAssignments: { select: { id: true, unitId: true, scope: true, grants: true, denies: true, role: { select: { id: true, key: true, name: true } } } },
    },
    orderBy: { email: "asc" },
  });
}

export async function createUser(ctx: Ctx, input: { email: string; password?: string; helperId?: string | null; systemRole?: SystemRole }) {
  const email = input.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw badRequest("Ungültige E-Mail-Adresse.");
  if (await prisma.user.findUnique({ where: { email } })) throw conflict("Diese E-Mail ist bereits vergeben.");
  const helper = input.helperId ? await prisma.helper.findUnique({ where: { id: input.helperId } }) : null;
  if (input.helperId) {
    if (!helper) throw notFound("Helfer nicht gefunden.");
    if (helper.userId) throw conflict("Dieser Helfer hat bereits ein Benutzerkonto.");
    await require_(ctx, "user.manage", helper.unitId);
  } else if (!ctx.all) throw forbidden("Benutzerkonten ohne Helferprofil können nur Systemadministratoren anlegen.");
  const systemRole = input.systemRole ?? "NONE";
  if (systemRole !== "NONE") {
    if (systemRole === "SUPERADMIN" && ctx.systemRole !== "SUPERADMIN") throw forbidden("Nur ein Superadministrator kann Superadministratoren anlegen.");
    if (!ctx.all) throw forbidden();
  }
  const password = input.password ?? randomToken(12) + "aA1!";
  const problems = passwordProblems(password);
  if (problems.length) throw badRequest(`Das Passwort braucht ${problems.join(" und ")}.`);
  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({ data: { email, passwordHash: await hashPassword(password), systemRole, mustChangePw: true } });
    if (helper) await tx.helper.update({ where: { id: helper.id }, data: { userId: u.id } });
    return u;
  });
  await audit(ctx, { action: "user.create", entityType: "User", entityId: user.id, unitId: helper?.unitId, summary: `Benutzerkonto ${email} angelegt` });
  // Das Initialpasswort wird nur einmal zurückgegeben (nie gespeichert), Nutzer muss es beim ersten Login ändern.
  return { id: user.id, email, initialPassword: input.password ? undefined : password };
}

async function managedUserGuard(ctx: Ctx, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { helper: true, roleAssignments: true } });
  if (!user) throw notFound();
  if (ctx.all) {
    if (user.systemRole === "SUPERADMIN" && ctx.systemRole !== "SUPERADMIN") throw forbidden();
    return user;
  }
  if (user.systemRole !== "NONE") throw forbidden();
  const unitIds = new Set(await unitIdsWith(ctx, "user.manage"));
  const scoped = (user.helper && unitIds.has(user.helper.unitId)) || user.roleAssignments.some((a) => unitIds.has(a.unitId));
  if (!scoped) throw forbidden();
  return user;
}

export async function setUserActive(ctx: Ctx, userId: string, active: boolean) {
  const user = await managedUserGuard(ctx, userId);
  if (userId === ctx.userId) throw badRequest("Du kannst dein eigenes Konto nicht deaktivieren.");
  await prisma.user.update({ where: { id: userId }, data: { active } });
  if (!active) await revokeAllSessions(userId);
  await audit(ctx, { action: active ? "user.activate" : "user.deactivate", entityType: "User", entityId: userId, unitId: user.helper?.unitId, summary: `Benutzerkonto ${user.email} ${active ? "aktiviert" : "deaktiviert"}` });
}

export async function adminResetPassword(ctx: Ctx, userId: string): Promise<string> {
  const user = await managedUserGuard(ctx, userId);
  const pw = randomToken(12) + "aA1!";
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(pw), mustChangePw: true, failedLogins: 0, lockedUntil: null } });
  await revokeAllSessions(userId);
  await audit(ctx, { action: "user.password_reset", entityType: "User", entityId: userId, unitId: user.helper?.unitId, summary: `Passwort von ${user.email} zurückgesetzt` });
  return pw;
}

export async function setSystemRole(ctx: Ctx, userId: string, role: SystemRole) {
  if (!ctx.all) throw forbidden();
  if ((role === "SUPERADMIN" || role === "SYSTEMADMIN") && ctx.systemRole !== "SUPERADMIN") throw forbidden("Nur ein Superadministrator kann diese Rolle vergeben.");
  const user = await managedUserGuard(ctx, userId);
  if (userId === ctx.userId && role !== ctx.systemRole) throw badRequest("Du kannst deine eigene Systemrolle nicht ändern.");
  await prisma.user.update({ where: { id: userId }, data: { systemRole: role } });
  await audit(ctx, { action: "user.system_role", entityType: "User", entityId: userId, summary: `Systemrolle von ${user.email}: ${user.systemRole} → ${role}`, changes: { systemRole: [user.systemRole, role] } });
}

export async function listRoles() {
  return prisma.roleDefinition.findMany({ orderBy: { rank: "desc" } });
}

export async function assignRole(ctx: Ctx, input: { userId: string; unitId: string; roleKey: string; scope: AssignmentScope; grants?: string[]; denies?: string[] }) {
  await require_(ctx, "user.manage", input.unitId);
  await managedUserGuard(ctx, input.userId);
  const role = await prisma.roleDefinition.findUnique({ where: { key: input.roleKey } });
  if (!role) throw notFound("Rolle nicht gefunden.");
  const grants = (input.grants ?? []).filter(isPermission), denies = (input.denies ?? []).filter(isPermission);
  // Eskalationsschutz: Man kann nur Rechte vergeben, die man selbst in dieser Einheit besitzt.
  const unit = (await loadUnits()).get(input.unitId)!;
  if (!ctx.all) {
    for (const p of [...role.permissions, ...grants]) {
      if (isPermission(p) && !canIn(ctx, p, unit)) throw forbidden(`Du kannst das Recht „${p}“ nicht vergeben, da du es selbst nicht besitzt.`);
    }
    if (input.scope === "SUBTREE" && !ctx.grants.some((g) => g.perms.has("user.manage") && g.scope === "SUBTREE" && unit.path.startsWith(g.unitPath))) {
      throw forbidden("Rollen für Untereinheiten kann nur vergeben, wer selbst für den Teilbaum zuständig ist.");
    }
  }
  const a = await prisma.roleAssignment.upsert({
    where: { userId_unitId_roleId: { userId: input.userId, unitId: input.unitId, roleId: role.id } },
    create: { userId: input.userId, unitId: input.unitId, roleId: role.id, scope: input.scope, grants, denies },
    update: { scope: input.scope, grants, denies },
  });
  await audit(ctx, { action: "role.assign", entityType: "RoleAssignment", entityId: a.id, unitId: input.unitId, summary: `Rolle „${role.name}“ in „${unit.name}“ zugewiesen`, changes: { scope: [null, input.scope], grants: [null, grants], denies: [null, denies] } });
  return a;
}

export async function removeRoleAssignment(ctx: Ctx, assignmentId: string) {
  const a = await prisma.roleAssignment.findUnique({ where: { id: assignmentId }, include: { role: true, user: true } });
  if (!a) throw notFound();
  await require_(ctx, "user.manage", a.unitId);
  if (a.userId === ctx.userId) throw badRequest("Du kannst dir nicht selbst Rollen entziehen.");
  await prisma.roleAssignment.delete({ where: { id: assignmentId } });
  await audit(ctx, { action: "role.remove", entityType: "RoleAssignment", entityId: assignmentId, unitId: a.unitId, summary: `Rolle „${a.role.name}“ von ${a.user.email} entzogen` });
}

/** Rollenvorlagen bearbeiten (nur Systemadministration). */
export async function updateRoleDefinition(ctx: Ctx, roleId: string, input: { name?: string; description?: string | null; permissions: string[] }) {
  if (!ctx.all) throw forbidden();
  const role = await prisma.roleDefinition.findUnique({ where: { id: roleId } });
  if (!role) throw notFound();
  const permissions = input.permissions.filter(isPermission);
  await prisma.roleDefinition.update({ where: { id: roleId }, data: { name: input.name?.trim() || role.name, description: input.description ?? role.description, permissions } });
  await audit(ctx, { action: "role.update", entityType: "RoleDefinition", entityId: roleId, summary: `Rolle „${role.name}“ angepasst`, changes: { permissions: [role.permissions, permissions] } });
}

export async function createRoleDefinition(ctx: Ctx, input: { key: string; name: string; description?: string; permissions: string[] }) {
  if (!ctx.all) throw forbidden();
  const key = input.key.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
  if (!key) throw badRequest("Schlüssel fehlt.");
  if (await prisma.roleDefinition.findUnique({ where: { key } })) throw conflict("Schlüssel bereits vergeben.");
  const r = await prisma.roleDefinition.create({ data: { key, name: input.name.trim(), description: input.description, permissions: input.permissions.filter(isPermission), rank: 20 } });
  await audit(ctx, { action: "role.create", entityType: "RoleDefinition", entityId: r.id, summary: `Rolle „${r.name}“ angelegt` });
  return r;
}
