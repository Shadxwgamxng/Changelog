import "./env-setup";
import { prisma } from "../../src/server/db";
import { ensureDefaultQualifications, ensureDefaultRoles } from "../../src/server/bootstrap";
import { loadCtx, type Ctx } from "../../src/server/context";
import { invalidateUnits } from "../../src/server/units";
import { hashPassword } from "../../src/lib/crypto";
import { resetRateLimit } from "../../src/lib/rate-limit";

const TABLES = [
  "Notification", "NotificationPreference", "PushSubscription", "MessageRecipient", "Message", "Announcement", "DocumentVersion", "HelperQualification", "Document",
  "ShiftMaterial", "ShiftVehicle", "ShiftRequirementQualification", "ShiftAssignment", "ShiftRequirement", "Alert", "AlertRecipient", "AlertGroupMember", "AlertGroup", "Shift", "EventTask", "Event",
  "IncidentHelper", "IncidentVehicle", "IncidentMaterial", "Incident", "MaterialIssue", "MaterialItem", "VehicleMaintenance", "Vehicle", "Availability",
  "QualificationCover", "QualificationType", "Helper", "RoleAssignment", "Session", "PasswordResetToken", "User", "RoleDefinition", "OrgUnit",
];

export async function resetDb() {
  await prisma.$executeRawUnsafe(`TRUNCATE ${TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`);
  invalidateUnits();
  resetRateLimit();
}

export async function mkUnit(name: string, type: "KREISVERBAND" | "ORTSVEREIN" | "BEREITSCHAFT" | "JUGENDROTKREUZ" | "WASSERWACHT" | "EINSATZEINHEIT" | "SEG" | "SONSTIGE", parent?: { id: string; path: string }) {
  const u = await prisma.orgUnit.create({ data: { name, type, parentId: parent?.id ?? null, path: `tmp${Math.random()}` } });
  const out = await prisma.orgUnit.update({ where: { id: u.id }, data: { path: `${parent?.path ?? "/"}${u.id}/` } });
  invalidateUnits();
  return out;
}

let counter = 0;
export async function mkUser(email: string, opts: { roleKey?: string; unitId?: string; scope?: "UNIT" | "SUBTREE"; systemRole?: "NONE" | "SUPERADMIN" | "SYSTEMADMIN" | "SUPPORT"; password?: string } = {}) {
  const user = await prisma.user.create({ data: { email, passwordHash: await hashPassword(opts.password ?? "Test#Passwort1"), systemRole: opts.systemRole ?? "NONE" } });
  if (opts.roleKey && opts.unitId) {
    const role = await prisma.roleDefinition.findUniqueOrThrow({ where: { key: opts.roleKey } });
    await prisma.roleAssignment.create({ data: { userId: user.id, unitId: opts.unitId, roleId: role.id, scope: opts.scope ?? "UNIT" } });
  }
  return user;
}

export async function mkHelper(unitId: string, first: string, last: string, extra: Record<string, unknown> = {}) {
  return prisma.helper.create({ data: { unitId, firstName: first, lastName: last, functions: ["HELFER"], memberNumber: `M${++counter}-${Math.random().toString(36).slice(2, 7)}`, ...extra } });
}

export async function mkAccountHelper(unitId: string, first: string, last: string, roleKey = "HELFER", extra: Record<string, unknown> = {}) {
  const h = await mkHelper(unitId, first, last, extra);
  const u = await mkUser(`${first}.${last}.${++counter}@test.de`.toLowerCase(), { roleKey, unitId });
  await prisma.helper.update({ where: { id: h.id }, data: { userId: u.id } });
  return { helper: h, user: u, ctx: await loadCtx(u.id) };
}

export const ctxOf = (userId: string): Promise<Ctx> => loadCtx(userId);

export async function mkQual(helperId: string, typeId: string, validUntil: Date | null = null, status: "GUELTIG" | "IN_PRUEFUNG" | "WIDERRUFEN" = "GUELTIG") {
  return prisma.helperQualification.create({ data: { helperId, typeId, validUntil, status } });
}

/** Standard-Szenario: Kreisverband → Ortsverein A (→ Bereitschaft A, JRK A), Ortsverein B (→ Bereitschaft B). */
export async function scenario() {
  await resetDb();
  await ensureDefaultRoles();
  const qt = await ensureDefaultQualifications();
  const kv = await mkUnit("DRK Kreisverband Musterkreis", "KREISVERBAND");
  const ovA = await mkUnit("Ortsverein Musterstadt", "ORTSVEREIN", kv);
  const berA = await mkUnit("Bereitschaft Musterstadt", "BEREITSCHAFT", ovA);
  const jrkA = await mkUnit("JRK Musterstadt", "JUGENDROTKREUZ", ovA);
  const ovB = await mkUnit("Ortsverein Beispielstadt", "ORTSVEREIN", kv);
  const berB = await mkUnit("Bereitschaft Beispielstadt", "BEREITSCHAFT", ovB);
  const admin = await mkUser("admin@test.de", { systemRole: "SUPERADMIN" });
  return { qt, kv, ovA, berA, jrkA, ovB, berB, admin, adminCtx: await loadCtx(admin.id) };
}
