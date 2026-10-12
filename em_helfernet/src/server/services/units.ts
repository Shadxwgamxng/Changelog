import type { UnitType } from "@prisma/client";
import { prisma } from "../db";
import { audit } from "../audit";
import { badRequest, conflict, forbidden, notFound } from "../errors";
import { can, require_, visibleUnits, type Ctx } from "../context";
import { invalidateUnits, loadUnits } from "../units";

export interface UnitNode { id: string; name: string; type: UnitType; depth: number; parentId: string | null; path: string; active: boolean }

/** Sichtbarer Einheitenbaum, flach und in Baumreihenfolge. */
export async function listUnitTree(ctx: Ctx): Promise<UnitNode[]> {
  const units = await visibleUnits(ctx);
  return units.map((u) => ({ ...u, type: u.type as UnitType, depth: u.path.split("/").filter(Boolean).length - 1 }));
}

export async function createUnit(ctx: Ctx, input: { name: string; type: UnitType; parentId: string | null }) {
  const name = input.name.trim();
  if (!name) throw badRequest("Name fehlt.");
  let parentPath = "/";
  if (input.parentId) {
    const parent = (await loadUnits()).get(input.parentId);
    if (!parent) throw notFound("Übergeordnete Einheit nicht gefunden.");
    await require_(ctx, "unit.manage", parent.id);
    parentPath = parent.path;
  } else if (!ctx.all) {
    throw forbidden("Nur Systemadministratoren können oberste Einheiten anlegen.");
  }
  const created = await prisma.$transaction(async (tx) => {
    const u = await tx.orgUnit.create({ data: { name, type: input.type, parentId: input.parentId, path: `__tmp__${Math.random()}` } });
    return tx.orgUnit.update({ where: { id: u.id }, data: { path: `${parentPath}${u.id}/` } });
  });
  invalidateUnits();
  await audit(ctx, { action: "unit.create", entityType: "OrgUnit", entityId: created.id, unitId: created.id, summary: `Einheit „${name}“ angelegt` });
  return created;
}

export async function updateUnit(ctx: Ctx, unitId: string, input: { name?: string; type?: UnitType; active?: boolean }) {
  await require_(ctx, "unit.manage", unitId);
  const before = await prisma.orgUnit.findUnique({ where: { id: unitId } });
  if (!before) throw notFound();
  const updated = await prisma.orgUnit.update({
    where: { id: unitId },
    data: { name: input.name?.trim() || undefined, type: input.type, active: input.active },
  });
  invalidateUnits();
  await audit(ctx, { action: "unit.update", entityType: "OrgUnit", entityId: unitId, unitId, summary: `Einheit „${before.name}“ geändert`, changes: { name: [before.name, updated.name], type: [before.type, updated.type], active: [before.active, updated.active] } });
  return updated;
}

/** Verschiebt eine Einheit samt Teilbaum (Pfade werden neu geschrieben). */
export async function moveUnit(ctx: Ctx, unitId: string, newParentId: string | null) {
  const units = await loadUnits(true);
  const unit = units.get(unitId);
  if (!unit) throw notFound();
  await require_(ctx, "unit.manage", unitId);
  let newParentPath = "/";
  if (newParentId) {
    const p = units.get(newParentId);
    if (!p) throw notFound("Zieleinheit nicht gefunden.");
    if (p.path.startsWith(unit.path)) throw badRequest("Eine Einheit kann nicht in ihre eigene Untereinheit verschoben werden.");
    await require_(ctx, "unit.manage", p.id);
    newParentPath = p.path;
  } else if (!ctx.all) throw forbidden();
  const oldPrefix = unit.path, newPrefix = `${newParentPath}${unit.id}/`;
  await prisma.$transaction(async (tx) => {
    await tx.orgUnit.update({ where: { id: unitId }, data: { parentId: newParentId } });
    for (const u of units.values()) {
      if (u.path.startsWith(oldPrefix)) await tx.orgUnit.update({ where: { id: u.id }, data: { path: newPrefix + u.path.slice(oldPrefix.length) } });
    }
  });
  invalidateUnits();
  await audit(ctx, { action: "unit.move", entityType: "OrgUnit", entityId: unitId, unitId, summary: `Einheit „${unit.name}“ verschoben` });
}

export async function deleteUnit(ctx: Ctx, unitId: string) {
  await require_(ctx, "unit.manage", unitId);
  const unit = await prisma.orgUnit.findUnique({ where: { id: unitId }, include: { _count: { select: { children: true, helpers: true, shifts: true, vehicles: true, materials: true, events: true, incidents: true, documents: true } } } });
  if (!unit) throw notFound();
  const used = Object.values(unit._count).some((n) => n > 0);
  if (used) throw conflict("Die Einheit enthält noch Untereinheiten oder Daten. Deaktiviere sie stattdessen.");
  await prisma.orgUnit.delete({ where: { id: unitId } });
  invalidateUnits();
  await audit(ctx, { action: "unit.delete", entityType: "OrgUnit", entityId: unitId, summary: `Einheit „${unit.name}“ gelöscht` });
}

export async function assertUnitVisible(ctx: Ctx, unitId: string) {
  const vis = await visibleUnits(ctx);
  if (!vis.some((u) => u.id === unitId)) throw notFound();
}

export { can };
