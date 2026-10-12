import type { HelperStatus, Prisma } from "@prisma/client";
import { prisma } from "../db";
import { audit, diff } from "../audit";
import { badRequest, conflict, forbidden, notFound } from "../errors";
import { canIn, hasAnywhere, isSelf, scopeWhere, type Ctx } from "../context";
import { loadUnits, type UnitInfo } from "../units";
import { helperInput, ownProfileInput, type HelperInput } from "../schemas";
import { revokeAllSessions } from "../auth";

export interface HelperAccess { basic: boolean; contact: boolean; sensitive: boolean; planning: boolean; quals: boolean; edit: boolean; self: boolean }

export function accessFor(ctx: Ctx, h: { id: string; unitId: string }, unit: UnitInfo): HelperAccess {
  const self = isSelf(ctx, h.id);
  const sensitive = canIn(ctx, "helper.view_sensitive", unit);
  return {
    self,
    basic: self || canIn(ctx, "helper.view", unit),
    contact: self || canIn(ctx, "helper.view_contact", unit) || sensitive,
    sensitive,
    planning: self || canIn(ctx, "availability.view_others", unit) || canIn(ctx, "helper.edit", unit),
    quals: self || canIn(ctx, "qualification.view", unit),
    edit: canIn(ctx, "helper.edit", unit),
  };
}

type HelperRow = Prisma.HelperGetPayload<object>;

/** Feldweise Freigabe – nicht berechtigte Felder werden gar nicht erst ausgeliefert (weder UI noch API). */
export function serializeHelper(h: HelperRow, a: HelperAccess, unitName: string) {
  return {
    id: h.id,
    unitId: h.unitId,
    unitName,
    firstName: h.firstName,
    lastName: h.lastName,
    status: h.status,
    functions: h.functions,
    groupName: h.groupName,
    dienststellung: h.dienststellung,
    leadershipRole: h.leadershipRole,
    hasAccount: !!h.userId,
    ...(a.contact ? { email: h.email, phone: h.phone, street: h.street, zip: h.zip, city: h.city, memberNumber: h.memberNumber, joinedAt: h.joinedAt } : {}),
    ...(a.sensitive || a.self ? { birthDate: h.birthDate, leftAt: h.leftAt } : {}),
    ...(a.sensitive ? { internalNotes: h.internalNotes } : {}),
    ...(a.planning ? { maxShiftsPerMonth: h.maxShiftsPerMonth, minRestHours: h.minRestHours, preferredKinds: h.preferredKinds, preferredWeekdays: h.preferredWeekdays } : {}),
    access: { contact: a.contact, sensitive: a.sensitive, quals: a.quals, edit: a.edit, self: a.self },
  };
}
export type HelperView = ReturnType<typeof serializeHelper>;

export interface HelperListQuery { q?: string; unitId?: string; status?: HelperStatus | "ALLE"; group?: string; qualTypeId?: string; fn?: string; page?: number; pageSize?: number }

export async function listHelpers(ctx: Ctx, query: HelperListQuery = {}) {
  const units = await loadUnits();
  const visible: Prisma.HelperWhereInput[] = [scopeWhere(ctx, "helper.view") as Prisma.HelperWhereInput];
  const and: Prisma.HelperWhereInput[] = [{ OR: [...visible, ...(ctx.helperId ? [{ id: ctx.helperId }] : [])] }];
  if (query.unitId) {
    const u = units.get(query.unitId);
    if (u) and.push({ unit: { path: { startsWith: u.path } } });
  }
  if (query.status && query.status !== "ALLE") and.push({ status: query.status });
  else if (!query.status) and.push({ status: { in: ["AKTIV", "PASSIV"] } });
  else and.push({ status: { not: "ANONYMISIERT" } });
  if (query.group) and.push({ groupName: query.group });
  if (query.fn) and.push({ functions: { has: query.fn } });
  if (query.qualTypeId) and.push({ qualifications: { some: { typeId: query.qualTypeId, status: "GUELTIG", OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }] } } });
  if (query.q?.trim()) {
    for (const tok of query.q.trim().split(/\s+/).slice(0, 4)) {
      and.push({
        OR: [
          { firstName: { contains: tok, mode: "insensitive" } },
          { lastName: { contains: tok, mode: "insensitive" } },
          { groupName: { contains: tok, mode: "insensitive" } },
          // Mitgliedsnummer nur exakt und nur dort, wo Kontaktdaten sichtbar sind
          { AND: [scopeWhere(ctx, "helper.view_contact") as Prisma.HelperWhereInput, { memberNumber: { equals: tok } }] },
        ],
      });
    }
  }
  const pageSize = Math.min(query.pageSize ?? 50, 200), page = Math.max(query.page ?? 1, 1);
  const where: Prisma.HelperWhereInput = { AND: and };
  const [rows, total] = await Promise.all([
    prisma.helper.findMany({ where, orderBy: [{ lastName: "asc" }, { firstName: "asc" }], skip: (page - 1) * pageSize, take: pageSize }),
    prisma.helper.count({ where }),
  ]);
  const items = rows.map((h) => {
    const unit = units.get(h.unitId)!;
    return serializeHelper(h, accessFor(ctx, h, unit), unit.name);
  });
  return { items, total, page, pageSize };
}

export async function getHelper(ctx: Ctx, helperId: string) {
  const h = await prisma.helper.findUnique({ where: { id: helperId } });
  if (!h) throw notFound("Helfer nicht gefunden.");
  const unit = (await loadUnits()).get(h.unitId)!;
  const a = accessFor(ctx, h, unit);
  if (!a.basic) throw notFound("Helfer nicht gefunden."); // Existenz nicht verraten
  return serializeHelper(h, a, unit.name);
}

/** Interne Prüfung: darf der Benutzer diesen Helfer in irgendeiner Weise sehen? Liefert Zugriff + Rohdaten. */
export async function helperWithAccess(ctx: Ctx, helperId: string) {
  const h = await prisma.helper.findUnique({ where: { id: helperId } });
  if (!h) throw notFound("Helfer nicht gefunden.");
  const unit = (await loadUnits()).get(h.unitId)!;
  const a = accessFor(ctx, h, unit);
  if (!a.basic) throw notFound("Helfer nicht gefunden.");
  return { helper: h, access: a, unit };
}

const AUDIT_FIELDS = ["unitId", "firstName", "lastName", "birthDate", "email", "phone", "street", "zip", "city", "memberNumber", "status", "joinedAt", "leftAt", "groupName", "functions", "dienststellung", "leadershipRole", "internalNotes", "maxShiftsPerMonth", "minRestHours", "preferredKinds", "preferredWeekdays"];

export async function createHelper(ctx: Ctx, raw: unknown) {
  const input = helperInput.parse(raw);
  const unit = (await loadUnits()).get(input.unitId);
  if (!unit) throw badRequest("Einheit nicht gefunden.");
  if (!canIn(ctx, "helper.create", unit)) throw forbidden();
  // Sensible Felder nur setzen, wenn man sie auch sehen darf
  const sens = canIn(ctx, "helper.view_sensitive", unit);
  if (!sens && (input.birthDate || input.internalNotes)) throw forbidden("Geburtsdatum und interne Notizen darfst du nicht erfassen.");
  if (input.memberNumber && (await prisma.helper.findUnique({ where: { memberNumber: input.memberNumber } }))) throw conflict("Diese Mitgliedsnummer ist bereits vergeben.");
  const h = await prisma.helper.create({ data: input });
  await audit(ctx, { action: "helper.create", entityType: "Helper", entityId: h.id, unitId: h.unitId, summary: `Helfer ${h.firstName} ${h.lastName} angelegt` });
  return h;
}

const patchSchema = helperInput.partial();

export async function updateHelper(ctx: Ctx, helperId: string, raw: unknown) {
  const patch = patchSchema.parse(raw);
  const { helper: before, unit } = await helperWithAccess(ctx, helperId);
  if (!canIn(ctx, "helper.edit", unit)) throw forbidden();
  if (patch.unitId && patch.unitId !== before.unitId) {
    const target = (await loadUnits()).get(patch.unitId);
    if (!target || !canIn(ctx, "helper.edit", target)) throw forbidden("Keine Berechtigung für die Zieleinheit.");
  }
  if (!canIn(ctx, "helper.view_sensitive", unit) && (patch.birthDate !== undefined || patch.internalNotes !== undefined)) {
    throw forbidden("Geburtsdatum und interne Notizen darfst du nicht ändern.");
  }
  if (patch.memberNumber && patch.memberNumber !== before.memberNumber) {
    if (await prisma.helper.findUnique({ where: { memberNumber: patch.memberNumber } })) throw conflict("Diese Mitgliedsnummer ist bereits vergeben.");
  }
  const after = await prisma.helper.update({ where: { id: helperId }, data: patch });
  const changes = diff(before as never, after as never, AUDIT_FIELDS);
  if (Object.keys(changes).length) {
    await audit(ctx, { action: "helper.update", entityType: "Helper", entityId: helperId, unitId: after.unitId, summary: `Helfer ${after.firstName} ${after.lastName} bearbeitet`, changes });
  }
  return after;
}

/** Selbstbedienung: eigene Kontaktdaten und Planungswünsche. */
export async function updateOwnProfile(ctx: Ctx, raw: unknown) {
  if (!ctx.helperId) throw badRequest("Dein Konto ist mit keinem Helferprofil verknüpft.");
  const patch = ownProfileInput.partial().parse(raw);
  const before = await prisma.helper.findUniqueOrThrow({ where: { id: ctx.helperId } });
  const after = await prisma.helper.update({ where: { id: ctx.helperId }, data: patch });
  const changes = diff(before as never, after as never, Object.keys(patch));
  if (Object.keys(changes).length) await audit(ctx, { action: "helper.update_own", entityType: "Helper", entityId: before.id, unitId: before.unitId, summary: "Eigenes Profil geändert", changes });
  return after;
}

/** Kern der DSGVO-Löschung: personenbezogene Daten entfernen, statistische Dienstdaten (ohne Personenbezug) bleiben. */
export async function anonymizeCore(helperId: string): Promise<boolean> {
  const h = await prisma.helper.findUnique({ where: { id: helperId } });
  if (!h || h.status === "ANONYMISIERT") return false;
  const docs = await prisma.documentVersion.findMany({ where: { document: { ownerHelperId: helperId } }, select: { storageKey: true } });
  const { getStorage } = await import("../storage");
  await prisma.$transaction(async (tx) => {
    await tx.document.deleteMany({ where: { ownerHelperId: helperId } });
    await tx.availability.deleteMany({ where: { helperId } });
    await tx.helperQualification.deleteMany({ where: { helperId } });
    await tx.alertRecipient.deleteMany({ where: { helperId } });
    await tx.alertGroupMember.deleteMany({ where: { helperId } });
    await tx.shiftAssignment.updateMany({ where: { helperId, status: { in: ["ANGEFRAGT", "EINGELADEN", "WARTELISTE"] } }, data: { status: "ZURUECKGEZOGEN", note: null } });
    await tx.shiftAssignment.updateMany({ where: { helperId }, data: { note: null } });
    if (h.userId) {
      await tx.session.deleteMany({ where: { userId: h.userId } });
      await tx.roleAssignment.deleteMany({ where: { userId: h.userId } });
    }
    await tx.helper.update({
      where: { id: helperId },
      data: {
        firstName: "Gelöscht", lastName: `#${helperId.slice(-6)}`, birthDate: null, email: null, phone: null, street: null, zip: null, city: null,
        memberNumber: null, internalNotes: null, groupName: null, leadershipRole: null, dienststellung: null, functions: [],
        status: "ANONYMISIERT", anonymizedAt: new Date(), userId: null, leftAt: h.leftAt ?? new Date(),
      },
    });
    if (h.userId) await tx.user.delete({ where: { id: h.userId } });
  });
  await Promise.all(docs.map((d) => getStorage().delete(d.storageKey).catch(() => {})));
  return true;
}

export async function anonymizeHelper(ctx: Ctx, helperId: string) {
  const { helper: h, unit } = await helperWithAccess(ctx, helperId);
  if (!canIn(ctx, "helper.delete", unit)) throw forbidden();
  if (await anonymizeCore(helperId)) {
    await audit(ctx, { action: "helper.anonymize", entityType: "Helper", entityId: helperId, unitId: h.unitId, summary: `Helfer #${helperId.slice(-6)} anonymisiert (DSGVO-Löschung)` });
  }
}

/** Auskunft/Export nach Art. 15/20 DSGVO. */
export async function exportHelperData(ctx: Ctx, helperId: string) {
  const { helper: h, access, unit } = await helperWithAccess(ctx, helperId);
  if (!access.self && !canIn(ctx, "helper.export", unit)) throw forbidden();
  const [quals, assignments, availability, alerts, documents, incidents, issues, user] = await Promise.all([
    prisma.helperQualification.findMany({ where: { helperId }, include: { type: { select: { name: true, category: true } } } }),
    prisma.shiftAssignment.findMany({ where: { helperId }, include: { shift: { select: { name: true, kind: true, startsAt: true, endsAt: true } } } }),
    prisma.availability.findMany({ where: { helperId } }),
    prisma.alertRecipient.findMany({ where: { helperId }, include: { alert: { select: { title: true, createdAt: true } } } }),
    prisma.document.findMany({ where: { ownerHelperId: helperId }, select: { id: true, title: true, category: true, createdAt: true, expiresAt: true } }),
    prisma.incidentHelper.findMany({ where: { helperId }, include: { incident: { select: { number: true, kind: true, startedAt: true } } } }),
    prisma.materialIssue.findMany({ where: { helperId }, include: { material: { select: { name: true } } } }),
    h.userId ? prisma.user.findUnique({ where: { id: h.userId }, select: { email: true, createdAt: true, lastLoginAt: true, totpEnabled: true } }) : null,
  ]);
  await audit(ctx, { action: "helper.export", entityType: "Helper", entityId: helperId, unitId: h.unitId, summary: `Personenbezogene Daten von ${h.firstName} ${h.lastName} exportiert` });
  return { exportedAt: new Date().toISOString(), helper: h, account: user, qualifications: quals, shifts: assignments, availability, alerts, documents, incidents, materialIssues: issues };
}

export async function deactivateLeaving(ctx: Ctx, helperId: string, status: Exclude<HelperStatus, "ANONYMISIERT">, leftAt?: Date | null) {
  const { helper: h, unit } = await helperWithAccess(ctx, helperId);
  if (!canIn(ctx, "helper.edit", unit)) throw forbidden();
  await prisma.helper.update({ where: { id: helperId }, data: { status, leftAt: status === "AUSGETRETEN" ? leftAt ?? new Date() : null } });
  if (status === "AUSGETRETEN" && h.userId) {
    await prisma.user.update({ where: { id: h.userId }, data: { active: false } });
    await revokeAllSessions(h.userId);
  }
  await audit(ctx, { action: "helper.status", entityType: "Helper", entityId: helperId, unitId: h.unitId, summary: `Status von ${h.firstName} ${h.lastName}: ${h.status} → ${status}`, changes: { status: [h.status, status] } });
}

export async function listGroups(ctx: Ctx, unitId?: string): Promise<string[]> {
  const rows = await prisma.helper.findMany({
    where: { AND: [{ OR: [scopeWhere(ctx, "helper.view") as Prisma.HelperWhereInput, ...(ctx.helperId ? [{ id: ctx.helperId }] : [])] }, unitId ? { unitId } : {}, { groupName: { not: null } }] },
    select: { groupName: true }, distinct: ["groupName"], orderBy: { groupName: "asc" },
  });
  return rows.map((r) => r.groupName!).filter(Boolean);
}

/** Auswahlliste (Name + Einheit) für Formulare – nur Helfer mit helper.view im Scope. */
export async function helperOptions(ctx: Ctx, unitId?: string) {
  if (!hasAnywhere(ctx, "helper.view")) return [];
  const rows = await prisma.helper.findMany({
    where: { AND: [scopeWhere(ctx, "helper.view") as Prisma.HelperWhereInput, { status: "AKTIV" }, unitId ? { unitId } : {}] },
    select: { id: true, firstName: true, lastName: true, unitId: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return rows.map((r) => ({ id: r.id, name: `${r.lastName}, ${r.firstName}`, unitId: r.unitId }));
}

export type { HelperInput };
