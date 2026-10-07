import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { audit } from "../audit";
import { badRequest, conflict, notFound } from "../errors";
import { canIn, require_, scopeWhere, type Ctx } from "../context";
import { loadUnits } from "../units";
import { eventInput } from "../schemas";
import { notifyHelpers } from "../notify";
import { fmtRange } from "@/lib/dates";

export async function listEvents(ctx: Ctx, q: { from?: Date; to?: Date; unitId?: string } = {}) {
  const units = await loadUnits();
  const and: Prisma.EventWhereInput[] = [scopeWhere(ctx, "event.view") as Prisma.EventWhereInput];
  if (q.from) and.push({ endsAt: { gte: q.from } });
  if (q.to) and.push({ startsAt: { lte: q.to } });
  if (q.unitId && units.get(q.unitId)) and.push({ unit: { path: { startsWith: units.get(q.unitId)!.path } } });
  const rows = await prisma.event.findMany({ where: { AND: and }, include: { unit: { select: { name: true } }, _count: { select: { shifts: true } } }, orderBy: { startsAt: "asc" }, take: 300 });
  return rows.map((e) => ({ id: e.id, unitId: e.unitId, unitName: e.unit.name, name: e.name, startsAt: e.startsAt, endsAt: e.endsAt, location: e.location, cancelled: e.cancelled, shiftCount: e._count.shifts }));
}

export async function getEvent(ctx: Ctx, id: string) {
  const e = await prisma.event.findFirst({ where: { AND: [{ id }, scopeWhere(ctx, "event.view") as Prisma.EventWhereInput] }, include: { unit: { select: { name: true } }, tasks: { orderBy: { id: "asc" } } } });
  if (!e) throw notFound("Veranstaltung nicht gefunden.");
  const unit = (await loadUnits()).get(e.unitId)!;
  return { ...e, unitName: e.unit.name, canManage: canIn(ctx, "event.manage", unit) };
}

export async function createEvent(ctx: Ctx, raw: unknown) {
  const input = eventInput.parse(raw);
  await require_(ctx, "event.manage", input.unitId);
  const e = await prisma.event.create({
    data: { unitId: input.unitId, name: input.name, description: input.description, startsAt: input.startsAt, endsAt: input.endsAt, location: input.location, organizer: input.organizer, tasks: { create: input.tasks } },
  });
  await audit(ctx, { action: "event.create", entityType: "Event", entityId: e.id, unitId: e.unitId, summary: `Veranstaltung „${e.name}“ angelegt` });
  return e;
}

export async function updateEvent(ctx: Ctx, id: string, raw: unknown) {
  const input = eventInput.parse(raw);
  const before = await prisma.event.findUnique({ where: { id }, include: { shifts: { include: { assignments: true } } } });
  if (!before) throw notFound("Veranstaltung nicht gefunden.");
  await require_(ctx, "event.manage", before.unitId, true);
  if (input.unitId !== before.unitId) throw badRequest("Die Einheit einer Veranstaltung kann nicht geändert werden.");
  await prisma.$transaction([
    prisma.eventTask.deleteMany({ where: { eventId: id } }),
    prisma.event.update({ where: { id }, data: { name: input.name, description: input.description, startsAt: input.startsAt, endsAt: input.endsAt, location: input.location, organizer: input.organizer, tasks: { create: input.tasks } } }),
  ]);
  const changed = before.name !== input.name || before.startsAt.getTime() !== input.startsAt.getTime() || before.endsAt.getTime() !== input.endsAt.getTime() || before.location !== input.location;
  await audit(ctx, { action: "event.update", entityType: "Event", entityId: id, unitId: before.unitId, summary: `Veranstaltung „${input.name}“ bearbeitet`, changes: changed ? { startsAt: [before.startsAt.toISOString(), input.startsAt.toISOString()], endsAt: [before.endsAt.toISOString(), input.endsAt.toISOString()], location: [before.location, input.location] } : null });
  if (changed) {
    const crew = before.shifts.flatMap((s) => s.assignments.filter((a) => ["BESTAETIGT", "EINGELADEN", "ANGEFRAGT"].includes(a.status)).map((a) => a.helperId));
    await notifyHelpers(crew, { type: "VERANSTALTUNG_GEAENDERT", title: `Veranstaltung geändert: ${input.name}`, body: fmtRange(input.startsAt, input.endsAt), link: `/events/${id}` });
  }
}

export async function cancelEvent(ctx: Ctx, id: string) {
  const e = await prisma.event.findUnique({ where: { id }, include: { shifts: true } });
  if (!e) throw notFound();
  await require_(ctx, "event.manage", e.unitId, true);
  if (e.shifts.some((s) => s.status === "ABGESCHLOSSEN")) throw conflict("Die Veranstaltung hat bereits abgeschlossene Dienste.");
  await prisma.event.update({ where: { id }, data: { cancelled: true } });
  await audit(ctx, { action: "event.cancel", entityType: "Event", entityId: id, unitId: e.unitId, summary: `Veranstaltung „${e.name}“ abgesagt. Zugeordnete Dienste bitte einzeln absagen.` });
}

export async function toggleEventTask(ctx: Ctx, taskId: string) {
  const t = await prisma.eventTask.findUnique({ where: { id: taskId }, include: { event: true } });
  if (!t) throw notFound();
  await require_(ctx, "event.manage", t.event.unitId, true);
  await prisma.eventTask.update({ where: { id: taskId }, data: { done: !t.done } });
}
