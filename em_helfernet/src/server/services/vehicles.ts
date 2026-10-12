import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { audit, diff } from "../audit";
import { badRequest, notFound } from "../errors";
import { canIn, hasAnywhere, require_, scopeWhere, type Ctx } from "../context";
import { loadUnits } from "../units";
import { vehicleInput } from "../schemas";
import { daysUntil, parseDateOnly } from "@/lib/dates";

export type DueState = "OK" | "BALD" | "UEBERFAELLIG";
export function dueState(d: Date | null | undefined, soonDays = 60, now = new Date()): DueState | null {
  if (!d) return null;
  const left = daysUntil(d, now);
  return left < 0 ? "UEBERFAELLIG" : left <= soonDays ? "BALD" : "OK";
}

const decorate = (v: Prisma.VehicleGetPayload<{ include: { unit: { select: { name: true } } } }>) => ({
  ...v, unitName: v.unit.name,
  due: { tuv: dueState(v.tuvDue), hu: dueState(v.huDue), insurance: dueState(v.insuranceDue) },
});

export async function listVehicles(ctx: Ctx, q: { unitId?: string; status?: string } = {}) {
  const units = await loadUnits();
  const and: Prisma.VehicleWhereInput[] = [scopeWhere(ctx, "vehicle.view") as Prisma.VehicleWhereInput];
  if (q.unitId && units.get(q.unitId)) and.push({ unit: { path: { startsWith: units.get(q.unitId)!.path } } });
  if (q.status) and.push({ status: q.status as never });
  const rows = await prisma.vehicle.findMany({ where: { AND: and }, include: { unit: { select: { name: true } } }, orderBy: [{ unit: { name: "asc" } }, { name: "asc" }] });
  return rows.map(decorate);
}

export async function getVehicle(ctx: Ctx, id: string) {
  const v = await prisma.vehicle.findFirst({
    where: { AND: [{ id }, scopeWhere(ctx, "vehicle.view") as Prisma.VehicleWhereInput] },
    include: { unit: { select: { name: true } }, maintenances: { orderBy: { date: "desc" }, take: 50 }, shifts: { where: { shift: { endsAt: { gte: new Date() }, status: { in: ["OFFEN", "ENTWURF"] } } }, include: { shift: { select: { id: true, name: true, startsAt: true, endsAt: true } } } } },
  });
  if (!v) throw notFound("Fahrzeug nicht gefunden.");
  const unit = (await loadUnits()).get(v.unitId)!;
  return { ...decorate(v), maintenances: v.maintenances.map((m) => ({ ...m, cost: m.cost ? Number(m.cost) : null })), upcoming: v.shifts.map((s) => s.shift), canManage: canIn(ctx, "vehicle.manage", unit) };
}

export async function createVehicle(ctx: Ctx, raw: unknown) {
  const input = vehicleInput.parse(raw);
  await require_(ctx, "vehicle.manage", input.unitId);
  const v = await prisma.vehicle.create({ data: input });
  await audit(ctx, { action: "vehicle.create", entityType: "Vehicle", entityId: v.id, unitId: v.unitId, summary: `Fahrzeug „${v.name}“ angelegt` });
  return v;
}

export async function updateVehicle(ctx: Ctx, id: string, raw: unknown) {
  const input = vehicleInput.omit({ unitId: true }).parse(raw);
  const before = await prisma.vehicle.findUnique({ where: { id } });
  if (!before) throw notFound();
  await require_(ctx, "vehicle.manage", before.unitId, true);
  const after = await prisma.vehicle.update({ where: { id }, data: input });
  const changes = diff(before as never, after as never, Object.keys(input));
  if (Object.keys(changes).length) await audit(ctx, { action: "vehicle.update", entityType: "Vehicle", entityId: id, unitId: before.unitId, summary: `Fahrzeug „${before.name}“ geändert`, changes });
  return after;
}

export async function addMaintenance(ctx: Ctx, vehicleId: string, raw: { date: string; description: string; odometerKm?: number | null; cost?: number | null; nextDue?: string | null }) {
  const v = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!v) throw notFound();
  await require_(ctx, "vehicle.manage", v.unitId, true);
  const date = parseDateOnly(raw.date);
  if (!date || !raw.description?.trim()) throw badRequest("Datum und Beschreibung sind Pflicht.");
  const nextDue = raw.nextDue ? parseDateOnly(raw.nextDue) : null;
  await prisma.$transaction([
    prisma.vehicleMaintenance.create({ data: { vehicleId, date, description: raw.description.trim().slice(0, 500), odometerKm: raw.odometerKm ?? null, cost: raw.cost ?? null, nextDue } }),
    // Kilometerstand nur vorwärts fortschreiben
    ...(raw.odometerKm && (!v.odometerKm || raw.odometerKm > v.odometerKm) ? [prisma.vehicle.update({ where: { id: vehicleId }, data: { odometerKm: raw.odometerKm } })] : []),
  ]);
  await audit(ctx, { action: "vehicle.maintenance", entityType: "Vehicle", entityId: vehicleId, unitId: v.unitId, summary: `Wartung für „${v.name}“: ${raw.description.trim().slice(0, 80)}` });
}

export async function deleteVehicle(ctx: Ctx, id: string) {
  const v = await prisma.vehicle.findUnique({ where: { id }, include: { _count: { select: { shifts: true, incidents: true } } } });
  if (!v) throw notFound();
  await require_(ctx, "vehicle.manage", v.unitId, true);
  if (v._count.shifts || v._count.incidents) throw badRequest("Das Fahrzeug wurde bereits in Diensten/Einsätzen verwendet. Setze es stattdessen auf „Nicht einsatzbereit“.");
  await prisma.vehicle.delete({ where: { id } });
  await audit(ctx, { action: "vehicle.delete", entityType: "Vehicle", entityId: id, unitId: v.unitId, summary: `Fahrzeug „${v.name}“ gelöscht` });
}

export async function vehicleWarnings(ctx: Ctx) {
  if (!hasAnywhere(ctx, "vehicle.view")) return [];
  const vs = await listVehicles(ctx);
  const out: { vehicleId: string; name: string; kind: string; level: "rot" | "gelb"; text: string }[] = [];
  for (const v of vs) {
    for (const [label, d, st] of [["TÜV", v.tuvDue, v.due.tuv], ["HU", v.huDue, v.due.hu], ["Versicherung", v.insuranceDue, v.due.insurance]] as const) {
      if (st === "UEBERFAELLIG") out.push({ vehicleId: v.id, name: v.name, kind: label, level: "rot", text: `${label} seit ${-daysUntil(d!)} Tagen überfällig` });
      else if (st === "BALD") out.push({ vehicleId: v.id, name: v.name, kind: label, level: "gelb", text: `${label} in ${daysUntil(d!)} Tagen fällig` });
    }
    if (v.status === "NICHT_EINSATZBEREIT" || v.status === "IN_WARTUNG") out.push({ vehicleId: v.id, name: v.name, kind: "Status", level: "rot", text: v.status === "IN_WARTUNG" ? "In Wartung" : "Nicht einsatzbereit" });
  }
  return out;
}
