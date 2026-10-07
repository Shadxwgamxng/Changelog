import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { audit } from "../audit";
import { badRequest, conflict, forbidden, notFound } from "../errors";
import { canIn, hasAnywhere, isSelf, require_, scopeWhere, type Ctx } from "../context";
import { loadUnits } from "../units";
import { helperQualInput, qualTypeInput } from "../schemas";
import { computeValidUntil, qualState, resolveCovers, type QualState } from "@/lib/qualification";
import { daysUntil } from "@/lib/dates";
import { helperWithAccess } from "./helpers";

/** Lädt die „deckt ab“-Beziehungen (transitiv aufgelöst). */
export async function loadCovers() {
  const links = await prisma.qualificationCover.findMany();
  const direct = new Map<string, string[]>();
  const types = await prisma.qualificationType.findMany({ select: { id: true } });
  for (const t of types) direct.set(t.id, []);
  for (const l of links) direct.get(l.typeId)?.push(l.coversTypeId);
  return resolveCovers(direct);
}

/** Qualifikationsarten, die der Benutzer sehen/verwenden darf: globale + die seiner sichtbaren Einheiten. */
export async function listQualTypes(ctx: Ctx) {
  const units = await loadUnits();
  const visibleUnitIds = [...units.values()].filter((u) => ctx.all || ctx.helperUnitId === u.id || ctx.grants.some((g) => (g.scope === "SUBTREE" ? u.path.startsWith(g.unitPath) || g.unitPath.startsWith(u.path) : g.unitId === u.id)) || ctx.globalPerms.size).map((u) => u.id);
  const rows = await prisma.qualificationType.findMany({
    where: { active: true, OR: [{ unitId: null }, { unitId: { in: visibleUnitIds } }] },
    include: { covers: { select: { coversTypeId: true } }, unit: { select: { name: true } }, _count: { select: { helperQualifications: true } } },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return rows.map((r) => ({ id: r.id, unitId: r.unitId, unitName: r.unit?.name ?? null, name: r.name, category: r.category, validityMonths: r.validityMonths, description: r.description, covers: r.covers.map((c) => c.coversTypeId), holders: r._count.helperQualifications }));
}

async function typeScopeGuard(ctx: Ctx, unitId: string | null) {
  if (unitId === null) {
    if (!ctx.all) throw forbidden("Globale Qualifikationsarten können nur Systemadministratoren verwalten.");
  } else await require_(ctx, "qualification.manage", unitId);
}

export async function createQualType(ctx: Ctx, raw: unknown) {
  const input = qualTypeInput.parse(raw);
  await typeScopeGuard(ctx, input.unitId);
  if (await prisma.qualificationType.findFirst({ where: { unitId: input.unitId, name: input.name } })) throw conflict("Diese Qualifikationsart gibt es bereits.");
  const t = await prisma.qualificationType.create({
    data: { unitId: input.unitId, name: input.name, category: input.category, validityMonths: input.validityMonths, description: input.description, covers: { create: input.covers.map((c) => ({ coversTypeId: c })) } },
  });
  await audit(ctx, { action: "qualtype.create", entityType: "QualificationType", entityId: t.id, unitId: t.unitId, summary: `Qualifikationsart „${t.name}“ angelegt` });
  return t;
}

export async function updateQualType(ctx: Ctx, typeId: string, raw: unknown) {
  const input = qualTypeInput.omit({ unitId: true }).parse(raw);
  const t = await prisma.qualificationType.findUnique({ where: { id: typeId } });
  if (!t) throw notFound();
  await typeScopeGuard(ctx, t.unitId);
  if (input.covers.includes(typeId)) throw badRequest("Eine Qualifikation kann sich nicht selbst abdecken.");
  await prisma.$transaction([
    prisma.qualificationCover.deleteMany({ where: { typeId } }),
    prisma.qualificationType.update({
      where: { id: typeId },
      data: { name: input.name, category: input.category, validityMonths: input.validityMonths, description: input.description, covers: { create: input.covers.map((c) => ({ coversTypeId: c })) } },
    }),
  ]);
  await audit(ctx, { action: "qualtype.update", entityType: "QualificationType", entityId: typeId, unitId: t.unitId, summary: `Qualifikationsart „${t.name}“ geändert` });
}

export async function archiveQualType(ctx: Ctx, typeId: string) {
  const t = await prisma.qualificationType.findUnique({ where: { id: typeId } });
  if (!t) throw notFound();
  await typeScopeGuard(ctx, t.unitId);
  await prisma.qualificationType.update({ where: { id: typeId }, data: { active: false } });
  await audit(ctx, { action: "qualtype.archive", entityType: "QualificationType", entityId: typeId, unitId: t.unitId, summary: `Qualifikationsart „${t.name}“ archiviert` });
}

export interface QualView {
  id: string; typeId: string; typeName: string; category: string; issuedAt: Date | null; validUntil: Date | null;
  status: string; state: QualState; daysLeft: number | null; note: string | null; documentId: string | null;
}

export async function listHelperQualifications(ctx: Ctx, helperId: string): Promise<QualView[]> {
  const { access } = await helperWithAccess(ctx, helperId);
  if (!access.quals) throw forbidden();
  const rows = await prisma.helperQualification.findMany({ where: { helperId }, include: { type: true }, orderBy: [{ type: { category: "asc" } }, { type: { name: "asc" } }] });
  return rows.map((q) => ({
    id: q.id, typeId: q.typeId, typeName: q.type.name, category: q.type.category, issuedAt: q.issuedAt, validUntil: q.validUntil, status: q.status,
    state: qualState(q), daysLeft: q.validUntil ? daysUntil(q.validUntil) : null, note: access.sensitive || access.self ? q.note : null, documentId: q.documentId,
  }));
}

async function validatedType(typeId: string) {
  const t = await prisma.qualificationType.findUnique({ where: { id: typeId } });
  if (!t || !t.active) throw badRequest("Qualifikationsart nicht gefunden.");
  return t;
}

/** Leiter tragen Qualifikationen ein; Helfer können sie selbst melden (dann „In Prüfung“, zählt nicht für Besetzungen). */
export async function addHelperQualification(ctx: Ctx, helperId: string, raw: unknown) {
  const input = helperQualInput.parse(raw);
  const { helper, access, unit } = await helperWithAccess(ctx, helperId);
  const manager = canIn(ctx, "qualification.manage", unit);
  if (!manager && !access.self) throw forbidden();
  const type = await validatedType(input.typeId);
  const validUntil = computeValidUntil(input.issuedAt, type.validityMonths, input.validUntil);
  if (input.issuedAt && validUntil && validUntil < input.issuedAt) throw badRequest("Das Ablaufdatum liegt vor dem Ausstellungsdatum.");
  if (input.documentId) await assertOwnDocument(input.documentId, helper.id, helper.unitId);
  const q = await prisma.helperQualification.create({
    data: { helperId, typeId: type.id, issuedAt: input.issuedAt, validUntil, status: manager ? input.status : "IN_PRUEFUNG", note: input.note, documentId: input.documentId },
  });
  await audit(ctx, { action: "qual.add", entityType: "HelperQualification", entityId: q.id, unitId: helper.unitId, summary: `Qualifikation „${type.name}“ für ${helper.firstName} ${helper.lastName} ${manager ? "eingetragen" : "gemeldet (zur Prüfung)"}` });
  return q;
}

async function assertOwnDocument(documentId: string, helperId: string, unitId: string) {
  const d = await prisma.document.findUnique({ where: { id: documentId } });
  if (!d || d.unitId !== unitId || (d.ownerHelperId && d.ownerHelperId !== helperId)) throw badRequest("Das Dokument gehört nicht zu diesem Helfer.");
}

export async function updateHelperQualification(ctx: Ctx, qualId: string, raw: unknown) {
  const input = helperQualInput.partial().parse(raw);
  const q = await prisma.helperQualification.findUnique({ where: { id: qualId }, include: { helper: true, type: true } });
  if (!q) throw notFound();
  const unit = (await loadUnits()).get(q.helper.unitId)!;
  if (!canIn(ctx, "qualification.manage", unit)) throw isSelf(ctx, q.helperId) ? forbidden("Qualifikationen werden von der Leitung bestätigt und geändert.") : notFound();
  const type = input.typeId && input.typeId !== q.typeId ? await validatedType(input.typeId) : q.type;
  const issuedAt = input.issuedAt !== undefined ? input.issuedAt : q.issuedAt;
  const validUntil = input.validUntil !== undefined || input.issuedAt !== undefined || input.typeId ? computeValidUntil(issuedAt, type.validityMonths, input.validUntil ?? null) : q.validUntil;
  if (input.documentId) await assertOwnDocument(input.documentId, q.helperId, q.helper.unitId);
  await prisma.helperQualification.update({
    where: { id: qualId },
    data: { typeId: type.id, issuedAt, validUntil, status: input.status, note: input.note, documentId: input.documentId, warnedLevel: validUntil?.getTime() !== q.validUntil?.getTime() ? 0 : undefined },
  });
  await audit(ctx, { action: "qual.update", entityType: "HelperQualification", entityId: qualId, unitId: q.helper.unitId, summary: `Qualifikation „${type.name}“ von ${q.helper.firstName} ${q.helper.lastName} geändert` });
}

export async function removeHelperQualification(ctx: Ctx, qualId: string) {
  const q = await prisma.helperQualification.findUnique({ where: { id: qualId }, include: { helper: true, type: true } });
  if (!q) throw notFound();
  const unit = (await loadUnits()).get(q.helper.unitId)!;
  if (!canIn(ctx, "qualification.manage", unit)) throw notFound();
  await prisma.helperQualification.delete({ where: { id: qualId } });
  await audit(ctx, { action: "qual.remove", entityType: "HelperQualification", entityId: qualId, unitId: q.helper.unitId, summary: `Qualifikation „${q.type.name}“ von ${q.helper.firstName} ${q.helper.lastName} entfernt` });
}

export type ExpiryRow = { id: string; helperId: string; helperName: string; unitName: string; typeName: string; validUntil: Date; daysLeft: number; state: QualState };

/** Auslaufende/abgelaufene Qualifikationen im sichtbaren Bereich (für Leitung & Berichte). */
export async function expiringQualifications(ctx: Ctx, withinDays = 90, includeExpired = true): Promise<ExpiryRow[]> {
  if (!hasAnywhere(ctx, "qualification.view")) return [];
  const limit = new Date(Date.now() + withinDays * 86_400_000);
  const rows = await prisma.helperQualification.findMany({
    where: {
      status: "GUELTIG", validUntil: { not: null, lte: limit, ...(includeExpired ? {} : { gte: new Date(Date.now() - 86_400_000) }) },
      helper: { status: "AKTIV", ...(scopeWhere(ctx, "qualification.view") as Prisma.HelperWhereInput) },
    },
    include: { helper: { select: { id: true, firstName: true, lastName: true, unit: { select: { name: true } } } }, type: { select: { name: true } } },
    orderBy: { validUntil: "asc" }, take: 500,
  });
  return rows.map((r) => ({ id: r.id, helperId: r.helper.id, helperName: `${r.helper.lastName}, ${r.helper.firstName}`, unitName: r.helper.unit.name, typeName: r.type.name, validUntil: r.validUntil!, daysLeft: daysUntil(r.validUntil!), state: qualState(r) }));
}

/** Eigene Qualifikationen mit Status – fürs Dashboard (immer erlaubt). */
export async function ownQualificationWarnings(ctx: Ctx) {
  if (!ctx.helperId) return [];
  const rows = await prisma.helperQualification.findMany({ where: { helperId: ctx.helperId, status: "GUELTIG", validUntil: { not: null } }, include: { type: true } });
  return rows
    .map((q) => ({ id: q.id, name: q.type.name, validUntil: q.validUntil!, daysLeft: daysUntil(q.validUntil!), state: qualState(q) }))
    .filter((q) => q.state === "LAEUFT_AB" || q.state === "ABGELAUFEN")
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

/** Übersicht: wer hat welche Qualifikation (gültig)? Pro Art Zähler + Inhaber im sichtbaren Bereich. */
export async function qualificationOverview(ctx: Ctx) {
  if (!hasAnywhere(ctx, "qualification.view")) throw forbidden();
  const types = await listQualTypes(ctx);
  const covers = await loadCovers();
  const helpers = await prisma.helper.findMany({
    where: { status: "AKTIV", ...(scopeWhere(ctx, "qualification.view") as Prisma.HelperWhereInput) },
    select: { id: true, firstName: true, lastName: true, qualifications: { select: { typeId: true, validUntil: true, status: true } } },
  });
  const now = new Date();
  return types.map((t) => {
    const holders: { id: string; name: string; state: QualState }[] = [];
    for (const h of helpers) {
      const own = h.qualifications.filter((q) => covers.get(q.typeId)?.has(t.id) ?? q.typeId === t.id);
      if (!own.length) continue;
      const best = own.map((q) => qualState(q, now)).sort((a, b) => stateRank(a) - stateRank(b))[0];
      holders.push({ id: h.id, name: `${h.lastName}, ${h.firstName}`, state: best });
    }
    const valid = holders.filter((h) => h.state === "GUELTIG" || h.state === "LAEUFT_AB").length;
    return { ...t, holders, valid, expiring: holders.filter((h) => h.state === "LAEUFT_AB").length, expired: holders.filter((h) => h.state === "ABGELAUFEN").length };
  });
}
const stateRank = (s: QualState) => ({ GUELTIG: 0, LAEUFT_AB: 1, IN_PRUEFUNG: 2, ABGELAUFEN: 3, WIDERRUFEN: 4 })[s];
