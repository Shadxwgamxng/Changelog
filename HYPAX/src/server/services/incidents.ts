// Einsatzverwaltung – bewusst datensparsam: keine Felder für Patienten-/Betroffenendaten.
import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { audit } from "../audit";
import { badRequest, conflict, notFound } from "../errors";
import { canIn, require_, scopeWhere, type Ctx } from "../context";
import { loadUnits } from "../units";
import { incidentInput } from "../schemas";
import { berlinParts } from "@/lib/dates";

export const INCIDENT_PRIVACY_NOTICE = "Datensparsam dokumentieren: keine Namen, Geburtsdaten, Adressen oder Diagnosen von Patienten/Betroffenen erfassen. Nur Einsatzablauf und Ressourcen.";

export async function listIncidents(ctx: Ctx, q: { from?: Date; to?: Date; unitId?: string } = {}) {
  const units = await loadUnits();
  const and: Prisma.IncidentWhereInput[] = [scopeWhere(ctx, "incident.view") as Prisma.IncidentWhereInput];
  if (q.from) and.push({ startedAt: { gte: q.from } });
  if (q.to) and.push({ startedAt: { lte: q.to } });
  if (q.unitId && units.get(q.unitId)) and.push({ unit: { path: { startsWith: units.get(q.unitId)!.path } } });
  const rows = await prisma.incident.findMany({ where: { AND: and }, include: { unit: { select: { name: true } }, _count: { select: { helpers: true, vehicles: true } } }, orderBy: { startedAt: "desc" }, take: 200 });
  return rows.map((i) => ({ id: i.id, number: i.number, kind: i.kind, unitName: i.unit.name, startedAt: i.startedAt, endedAt: i.endedAt, location: i.location, status: i.status, helperCount: i._count.helpers, vehicleCount: i._count.vehicles }));
}

export async function getIncident(ctx: Ctx, id: string) {
  const i = await prisma.incident.findFirst({
    where: { AND: [{ id }, scopeWhere(ctx, "incident.view") as Prisma.IncidentWhereInput] },
    include: { unit: { select: { name: true } }, helpers: { include: { helper: { select: { id: true, firstName: true, lastName: true } } } }, vehicles: { include: { vehicle: { select: { id: true, name: true, callSign: true } } } }, materials: { include: { material: { select: { id: true, name: true } } } } },
  });
  if (!i) throw notFound("Einsatz nicht gefunden.");
  const unit = (await loadUnits()).get(i.unitId)!;
  return { ...i, unitName: i.unit.name, canManage: canIn(ctx, "incident.manage", unit) };
}

async function nextNumber(unitId: string, at: Date) {
  const year = berlinParts(at).y;
  const n = await prisma.incident.count({ where: { unitId, number: { startsWith: `${year}-` } } });
  for (let k = n + 1; k < n + 50; k++) {
    const num = `${year}-${String(k).padStart(3, "0")}`;
    if (!(await prisma.incident.findUnique({ where: { unitId_number: { unitId, number: num } } }))) return num;
  }
  throw conflict("Keine freie Einsatznummer gefunden.");
}

async function validateParticipants(unitId: string, input: ReturnType<typeof incidentInput.parse>) {
  const unit = (await loadUnits()).get(unitId)!;
  const hIds = [...new Set(input.helpers.map((h) => h.helperId))];
  if (hIds.length !== input.helpers.length) throw badRequest("Ein Helfer ist doppelt eingetragen.");
  if (hIds.length) {
    const n = await prisma.helper.count({ where: { id: { in: hIds }, unit: { path: { startsWith: unit.path } } } });
    if (n !== hIds.length) throw badRequest("Ein Helfer gehört nicht zu dieser Einheit.");
  }
  if (input.vehicleIds.length) {
    const n = await prisma.vehicle.count({ where: { id: { in: input.vehicleIds }, unit: { path: { startsWith: unit.path } } } });
    if (n !== new Set(input.vehicleIds).size) throw badRequest("Ein Fahrzeug gehört nicht zu dieser Einheit.");
  }
  if (input.materials.length) {
    const n = await prisma.materialItem.count({ where: { id: { in: input.materials.map((m) => m.materialId) }, unit: { path: { startsWith: unit.path } } } });
    if (n !== new Set(input.materials.map((m) => m.materialId)).size) throw badRequest("Material gehört nicht zu dieser Einheit.");
  }
}

export async function createIncident(ctx: Ctx, raw: unknown) {
  const input = incidentInput.parse(raw);
  await require_(ctx, "incident.manage", input.unitId);
  if (input.endedAt && input.endedAt < input.startedAt) throw badRequest("Das Einsatzende liegt vor dem Beginn.");
  await validateParticipants(input.unitId, input);
  const number = input.number || (await nextNumber(input.unitId, input.startedAt));
  if (await prisma.incident.findUnique({ where: { unitId_number: { unitId: input.unitId, number } } })) throw conflict("Diese Einsatznummer ist bereits vergeben.");
  const i = await prisma.incident.create({
    data: {
      unitId: input.unitId, number, kind: input.kind, alertedAt: input.alertedAt ?? null, startedAt: input.startedAt, endedAt: input.endedAt ?? null, location: input.location, documentation: input.documentation,
      status: input.endedAt ? "ABGESCHLOSSEN" : "LAUFEND",
      helpers: { create: input.helpers.map((h) => ({ helperId: h.helperId, role: h.role })) },
      vehicles: { create: [...new Set(input.vehicleIds)].map((vehicleId) => ({ vehicleId })) },
      materials: { create: input.materials.map((m) => ({ materialId: m.materialId, quantity: m.quantity })) },
    },
  });
  await audit(ctx, { action: "incident.create", entityType: "Incident", entityId: i.id, unitId: i.unitId, summary: `Einsatz ${i.number} (${i.kind}) angelegt` });
  return i;
}

export async function updateIncident(ctx: Ctx, id: string, raw: unknown) {
  const input = incidentInput.parse(raw);
  const before = await prisma.incident.findUnique({ where: { id } });
  if (!before) throw notFound();
  await require_(ctx, "incident.manage", before.unitId, true);
  if (input.unitId !== before.unitId) throw badRequest("Die Einheit eines Einsatzes kann nicht geändert werden.");
  if (input.endedAt && input.endedAt < input.startedAt) throw badRequest("Das Einsatzende liegt vor dem Beginn.");
  await validateParticipants(before.unitId, input);
  const number = input.number || before.number;
  if (number !== before.number && (await prisma.incident.findUnique({ where: { unitId_number: { unitId: before.unitId, number } } }))) throw conflict("Diese Einsatznummer ist bereits vergeben.");
  await prisma.$transaction([
    prisma.incidentHelper.deleteMany({ where: { incidentId: id } }), prisma.incidentVehicle.deleteMany({ where: { incidentId: id } }), prisma.incidentMaterial.deleteMany({ where: { incidentId: id } }),
    prisma.incident.update({
      where: { id },
      data: {
        number, kind: input.kind, alertedAt: input.alertedAt ?? null, startedAt: input.startedAt, endedAt: input.endedAt ?? null, location: input.location, documentation: input.documentation,
        status: input.endedAt ? "ABGESCHLOSSEN" : "LAUFEND",
        helpers: { create: input.helpers.map((h) => ({ helperId: h.helperId, role: h.role })) },
        vehicles: { create: [...new Set(input.vehicleIds)].map((vehicleId) => ({ vehicleId })) },
        materials: { create: input.materials.map((m) => ({ materialId: m.materialId, quantity: m.quantity })) },
      },
    }),
  ]);
  await audit(ctx, { action: "incident.update", entityType: "Incident", entityId: id, unitId: before.unitId, summary: `Einsatz ${number} bearbeitet`, changes: before.status !== (input.endedAt ? "ABGESCHLOSSEN" : "LAUFEND") ? { status: [before.status, input.endedAt ? "ABGESCHLOSSEN" : "LAUFEND"] } : null });
}

export async function deleteIncident(ctx: Ctx, id: string) {
  const i = await prisma.incident.findUnique({ where: { id } });
  if (!i) throw notFound();
  await require_(ctx, "incident.manage", i.unitId, true);
  await prisma.incident.delete({ where: { id } });
  await audit(ctx, { action: "incident.delete", entityType: "Incident", entityId: id, unitId: i.unitId, summary: `Einsatz ${i.number} gelöscht` });
}
