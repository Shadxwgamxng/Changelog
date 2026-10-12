import type { AssignmentStatus, Prisma, ShiftKind, ShiftStatus } from "@prisma/client";
import { prisma, type Tx } from "../db";
import { audit, type Changes } from "../audit";
import { badRequest, conflict, forbidden, notFound } from "../errors";
import { canIn, hasAnywhere, require_, scopeWhere, type Ctx } from "../context";
import { loadUnits } from "../units";
import { shiftInput, timeWindowInput } from "../schemas";
import { notifyHelpers, notifyUsers, usersWithPermission } from "../notify";
import { evaluateHelperForRequirement, recommend, toRequirement, type ShiftForMatching } from "./staffing";
import { berlinDateKey, fmtDateTime, fmtRange, fmtTime, parseBerlinLocal } from "@/lib/dates";
import { effective, fits, fullSeats, gaps, isFull, minutesOf, peak, segments, within, type Window } from "@/lib/coverage";
import { SHIFT_KIND_LABEL } from "@/lib/constants";
import { helperWithAccess } from "./helpers";

// ───────────── Sichtbarkeit ─────────────

export function visibleWhere(ctx: Ctx): Prisma.ShiftWhereInput {
  const staffer: Prisma.ShiftWhereInput[] = (["shift.create", "shift.edit", "shift.staff"] as const).map((p) => scopeWhere(ctx, p) as Prisma.ShiftWhereInput);
  const published: Prisma.ShiftWhereInput = { status: { not: "ENTWURF" } };
  const or: Prisma.ShiftWhereInput[] = [
    { AND: [scopeWhere(ctx, "shift.view") as Prisma.ShiftWhereInput, published] },
    ...staffer,
  ];
  if (ctx.helperId) or.push({ AND: [published, { assignments: { some: { helperId: ctx.helperId, status: { in: ["BESTAETIGT", "EINGELADEN", "ANGEFRAGT", "WARTELISTE"] } } } }] });
  return { OR: or };
}

const shiftInclude = {
  unit: { select: { id: true, name: true } },
  event: { select: { id: true, name: true, signupDeadline: true, organizer: true } },
  responsible: { select: { id: true, firstName: true, lastName: true } },
  requirements: { include: { qualifications: { include: { type: { select: { id: true, name: true } } } } }, orderBy: { sortOrder: "asc" as const } },
  assignments: { include: { helper: { select: { id: true, firstName: true, lastName: true, unitId: true, functions: true } } } },
  vehicles: { include: { vehicle: { select: { id: true, name: true, callSign: true, plate: true, status: true } } } },
  materials: { include: { material: { select: { id: true, name: true, quantity: true } } } },
} satisfies Prisma.ShiftInclude;

type ShiftFull = Prisma.ShiftGetPayload<{ include: typeof shiftInclude }>;

const ACTIVE: AssignmentStatus[] = ["BESTAETIGT", "EINGELADEN"];

const shiftWin = (s: { startsAt: Date; endsAt: Date }): Window => ({ from: s.startsAt, to: s.endsAt });
const plannedWin = (s: { startsAt: Date; endsAt: Date }, a: { plannedFrom: Date | null; plannedTo: Date | null }) => effective(shiftWin(s), a.plannedFrom, a.plannedTo);
const availableWin = (s: { startsAt: Date; endsAt: Date }, a: { availableFrom: Date | null; availableTo: Date | null }) => effective(shiftWin(s), a.availableFrom, a.availableTo);
/** Zeiträume aller aktiven (bestätigten/eingeladenen) Einteilungen einer Position. */
const reqWindows = (s: Pick<ShiftFull, "startsAt" | "endsAt" | "assignments">, reqId: string, exceptAssignmentId?: string, statuses: AssignmentStatus[] = ACTIVE) =>
  s.assignments.filter((a) => a.requirementId === reqId && statuses.includes(a.status) && a.id !== exceptAssignmentId).map((a) => plannedWin(s, a));
/** Lesbarer Zeitraum, falls nicht der ganze Dienst. */
export function windowLabel(s: { startsAt: Date; endsAt: Date }, from: Date | null, to: Date | null): string | null {
  if (!from && !to) return null;
  const w = effective(shiftWin(s), from, to);
  return isFull(shiftWin(s), w) ? null : `${fmtTime(w.from)}–${fmtTime(w.to)} Uhr`;
}

function summarize(s: Pick<ShiftFull, "requirements" | "assignments" | "startsAt" | "endsAt">) {
  const needed = s.requirements.reduce((a, r) => a + r.count, 0);
  const confirmed = s.assignments.filter((a) => a.status === "BESTAETIGT").length;
  const invited = s.assignments.filter((a) => a.status === "EINGELADEN").length;
  const requested = s.assignments.filter((a) => a.status === "ANGEFRAGT").length;
  const waitlist = s.assignments.filter((a) => a.status === "WARTELISTE").length;
  // Auf offene Positionen angerechnet: nur über den ganzen Dienst lückenlos besetzte Plätze (Teilzeit-Einteilungen können sich einen Platz teilen)
  const filledPositions = s.requirements.reduce((a, r) => a + Math.min(r.count, fullSeats(shiftWin(s), reqWindows(s, r.id, undefined, ["BESTAETIGT"]))), 0);
  return { needed, confirmed, invited, requested, waitlist, filledPositions, open: Math.max(0, needed - filledPositions), pct: needed ? Math.round((filledPositions / needed) * 100) : null };
}

export interface ShiftQuery { from?: Date; to?: Date; unitId?: string; kind?: ShiftKind; status?: ShiftStatus; mine?: boolean; openOnly?: boolean; eventId?: string; take?: number }

export async function listShifts(ctx: Ctx, q: ShiftQuery = {}) {
  const units = await loadUnits();
  const and: Prisma.ShiftWhereInput[] = [visibleWhere(ctx)];
  if (q.from) and.push({ endsAt: { gte: q.from } });
  if (q.to) and.push({ startsAt: { lte: q.to } });
  if (q.unitId && units.get(q.unitId)) and.push({ unit: { path: { startsWith: units.get(q.unitId)!.path } } });
  if (q.kind) and.push({ kind: q.kind });
  if (q.status) and.push({ status: q.status });
  if (q.eventId) and.push({ eventId: q.eventId });
  if (q.mine) and.push({ assignments: { some: { helperId: ctx.helperId ?? "-", status: { in: ["BESTAETIGT", "EINGELADEN", "ANGEFRAGT", "WARTELISTE"] } } } });
  const rows = await prisma.shift.findMany({ where: { AND: and }, include: shiftInclude, orderBy: { startsAt: "asc" }, take: q.take ?? 200 });
  const items = rows.map((s) => {
    const mine = ctx.helperId ? s.assignments.find((a) => a.helperId === ctx.helperId) : undefined;
    return {
      id: s.id, name: s.name, kind: s.kind, status: s.status, unitId: s.unitId, unitName: s.unit.name, eventId: s.eventId, eventName: s.event?.name ?? null,
      startsAt: s.startsAt, endsAt: s.endsAt, location: s.location, meetingPoint: s.meetingPoint,
      ...summarize(s), myStatus: mine?.status ?? null,
    };
  });
  return q.openOnly ? items.filter((i) => i.status === "OFFEN" && (i.needed === 0 || i.open > 0)) : items;
}

export async function getShift(ctx: Ctx, shiftId: string) {
  const s = await prisma.shift.findFirst({ where: { AND: [{ id: shiftId }, visibleWhere(ctx)] }, include: shiftInclude });
  if (!s) throw notFound("Dienst nicht gefunden.");
  const unit = (await loadUnits()).get(s.unitId)!;
  const perms = {
    edit: canIn(ctx, "shift.edit", unit), staff: canIn(ctx, "shift.staff", unit), cancel: canIn(ctx, "shift.cancel", unit),
    create: canIn(ctx, "shift.create", unit), alert: canIn(ctx, "alert.create", unit),
    viewHelpers: canIn(ctx, "helper.view", unit), viewQuals: canIn(ctx, "qualification.view", unit),
  };
  const mine = ctx.helperId ? s.assignments.find((a) => a.helperId === ctx.helperId) ?? null : null;
  // Besatzung: bestätigte Namen für alle mit Sicht auf den Dienst; Anfragen/Warteliste nur Planer (und man selbst).
  const crew = s.assignments
    .filter((a) => a.status === "BESTAETIGT" || (perms.staff && ["EINGELADEN", "ANGEFRAGT", "WARTELISTE"].includes(a.status)) || (mine && a.id === mine.id))
    .map((a) => ({
      id: a.id, helperId: a.helper.id, name: `${a.helper.lastName}, ${a.helper.firstName}`, status: a.status, source: a.source,
      requirementId: a.requirementId, note: perms.staff || a.helperId === ctx.helperId ? a.note : null, workedMinutes: a.workedMinutes,
      availableFrom: perms.staff || a.helperId === ctx.helperId ? availableWin(s, a).from : null, availableTo: perms.staff || a.helperId === ctx.helperId ? availableWin(s, a).to : null,
      availableLabel: perms.staff || a.helperId === ctx.helperId ? windowLabel(s, a.availableFrom, a.availableTo) : null,
      plannedFrom: plannedWin(s, a).from, plannedTo: plannedWin(s, a).to, plannedLabel: windowLabel(s, a.plannedFrom, a.plannedTo),
      functions: perms.staff ? a.helper.functions : [], createdAt: a.createdAt,
    }));
  return {
    id: s.id, unitId: s.unitId, unitName: s.unit.name, eventId: s.eventId, eventName: s.event?.name ?? null, name: s.name, kind: s.kind, status: s.status,
    startsAt: s.startsAt, endsAt: s.endsAt, meetingPoint: s.meetingPoint, location: s.location, organizer: s.organizer, description: s.description,
    signupDeadline: deadlineOf(s), signupClosed: !!deadlineOf(s) && deadlineOf(s)! < new Date(),
    responsible: s.responsible ? { id: s.responsible.id, name: `${s.responsible.firstName} ${s.responsible.lastName}` } : null,
    requirements: s.requirements.map((r) => ({
      id: r.id, label: r.label, count: r.count, functionKey: r.functionKey,
      qualifications: r.qualifications.map((q) => ({ id: q.typeId, name: q.type.name })),
      filled: Math.min(r.count, fullSeats(shiftWin(s), reqWindows(s, r.id, undefined, ["BESTAETIGT"]))),
      people: s.assignments.filter((a) => a.requirementId === r.id && a.status === "BESTAETIGT").length,
      reserved: s.assignments.filter((a) => a.requirementId === r.id && a.status === "EINGELADEN").length,
      /** Abschnitte mit Anzahl gleichzeitig eingeteilter Personen (bestätigt + eingeladen) */
      coverage: segments(shiftWin(s), reqWindows(s, r.id)).map((g) => ({ from: g.from, to: g.to, count: g.count })),
      gaps: gaps(shiftWin(s), reqWindows(s, r.id), r.count).map((g) => ({ from: g.from, to: g.to, count: g.count })),
      peak: peak(reqWindows(s, r.id)),
    })),
    crew, vehicles: s.vehicles.map((v) => v.vehicle), materials: s.materials.map((m) => ({ id: m.material.id, name: m.material.name, quantity: m.quantity, stock: m.material.quantity })),
    summary: summarize(s), mine: mine ? { id: mine.id, status: mine.status, requirementId: mine.requirementId, note: mine.note, availableFrom: availableWin(s, mine).from, availableTo: availableWin(s, mine).to, availableLabel: windowLabel(s, mine.availableFrom, mine.availableTo), plannedLabel: windowLabel(s, mine.plannedFrom, mine.plannedTo) } : null, perms,
    updatedAt: s.updatedAt,
  };
}
export type ShiftDetail = Awaited<ReturnType<typeof getShift>>;

/** Interne Ladefunktion mit Rechteprüfung für Schreibzugriffe. */
async function loadShiftFor(ctx: Ctx, shiftId: string, perm: "shift.edit" | "shift.staff" | "shift.cancel" | "shift.create") {
  const s = await prisma.shift.findUnique({ where: { id: shiftId }, include: shiftInclude });
  if (!s) throw notFound("Dienst nicht gefunden.");
  const unit = (await loadUnits()).get(s.unitId)!;
  if (!canIn(ctx, perm, unit)) {
    // Wer den Dienst gar nicht sehen darf, erfährt auch nichts über seine Existenz.
    if (!canIn(ctx, "shift.view", unit)) throw notFound("Dienst nicht gefunden.");
    throw forbidden();
  }
  return s;
}

const asMatching = (s: ShiftFull): ShiftForMatching => ({
  id: s.id, unitId: s.unitId, kind: s.kind, startsAt: s.startsAt, endsAt: s.endsAt,
  requirements: s.requirements.map((r) => ({ id: r.id, label: r.label, count: r.count, functionKey: r.functionKey, qualifications: r.qualifications.map((q) => ({ typeId: q.typeId })) })),
});

// ───────────── Anlegen / Ändern ─────────────

async function validateQualTypes(ids: string[]) {
  const unique = [...new Set(ids)];
  if (!unique.length) return;
  const n = await prisma.qualificationType.count({ where: { id: { in: unique }, active: true } });
  if (n !== unique.length) throw badRequest("Mindestens eine benötigte Qualifikation existiert nicht.");
}

async function validateResponsible(responsibleId: string | null, unitId: string) {
  if (!responsibleId) return;
  const unit = (await loadUnits()).get(unitId)!;
  const h = await prisma.helper.findUnique({ where: { id: responsibleId }, include: { unit: true } });
  if (!h || !(h.unit.path.startsWith(unit.path) || unit.path.startsWith(h.unit.path))) throw badRequest("Die verantwortliche Person gehört nicht zu dieser Einheit.");
}

export async function createShift(ctx: Ctx, raw: unknown) {
  const input = shiftInput.parse(raw);
  await require_(ctx, "shift.create", input.unitId);
  await validateQualTypes(input.requirements.flatMap((r) => r.qualTypeIds));
  await validateResponsible(input.responsibleId, input.unitId);
  if (input.eventId) {
    const ev = await prisma.event.findUnique({ where: { id: input.eventId } });
    if (!ev || ev.unitId !== input.unitId) throw badRequest("Die Veranstaltung gehört zu einer anderen Einheit.");
  }
  const shift = await prisma.shift.create({
    data: {
      unitId: input.unitId, eventId: input.eventId, name: input.name, kind: input.kind, startsAt: input.startsAt, endsAt: input.endsAt,
      meetingPoint: input.meetingPoint, location: input.location, organizer: input.organizer, description: input.description, responsibleId: input.responsibleId, signupDeadline: input.signupDeadline,
      requirements: { create: input.requirements.map((r, i) => ({ label: r.label, count: r.count, functionKey: r.functionKey, sortOrder: i, qualifications: { create: [...new Set(r.qualTypeIds)].map((typeId) => ({ typeId })) } })) },
    },
  });
  await audit(ctx, { action: "shift.create", entityType: "Shift", entityId: shift.id, unitId: shift.unitId, summary: `Dienst „${shift.name}“ erstellt` });
  return shift;
}

export async function updateShift(ctx: Ctx, shiftId: string, raw: unknown) {
  const input = shiftInput.parse(raw);
  const before = await loadShiftFor(ctx, shiftId, "shift.edit");
  if (before.status === "ABGESCHLOSSEN" || before.status === "ABGESAGT") throw conflict("Abgeschlossene oder abgesagte Dienste können nicht mehr bearbeitet werden.");
  if (input.unitId !== before.unitId) throw badRequest("Die Einheit eines Dienstes kann nicht geändert werden.");
  await validateQualTypes(input.requirements.flatMap((r) => r.qualTypeIds));
  await validateResponsible(input.responsibleId, input.unitId);

  const keepIds = new Set(input.requirements.map((r) => r.id).filter(Boolean) as string[]);
  for (const id of keepIds) if (!before.requirements.some((r) => r.id === id)) throw badRequest("Unbekannte Position.");
  // Positionen darf man nicht unter die Zahl der gleichzeitig Eingeteilten senken
  for (const r of input.requirements) {
    if (!r.id) continue;
    const taken = peak(reqWindows(before, r.id));
    if (r.count < taken) throw conflict(`Die Position „${r.label}“ hat bereits ${taken} Eingeteilte – die Anzahl kann nicht kleiner sein.`);
  }
  const removed = before.requirements.filter((r) => !keepIds.has(r.id));
  const removedTaken = removed.filter((r) => before.assignments.some((a) => a.requirementId === r.id && ACTIVE.includes(a.status)));
  if (removedTaken.length) throw conflict(`Die Position „${removedTaken[0].label}“ hat bereits Eingeteilte und kann nicht entfernt werden.`);

  const after = await prisma.$transaction(async (tx) => {
    await tx.shiftRequirement.deleteMany({ where: { id: { in: removed.map((r) => r.id) } } });
    for (const [i, r] of input.requirements.entries()) {
      const quals = [...new Set(r.qualTypeIds)];
      if (r.id) {
        await tx.shiftRequirementQualification.deleteMany({ where: { requirementId: r.id } });
        await tx.shiftRequirement.update({ where: { id: r.id }, data: { label: r.label, count: r.count, functionKey: r.functionKey, sortOrder: i, qualifications: { create: quals.map((typeId) => ({ typeId })) } } });
      } else {
        await tx.shiftRequirement.create({ data: { shiftId, label: r.label, count: r.count, functionKey: r.functionKey, sortOrder: i, qualifications: { create: quals.map((typeId) => ({ typeId })) } } });
      }
    }
    return tx.shift.update({
      where: { id: shiftId },
      data: { eventId: input.eventId, name: input.name, kind: input.kind, startsAt: input.startsAt, endsAt: input.endsAt, meetingPoint: input.meetingPoint, location: input.location, organizer: input.organizer, description: input.description, responsibleId: input.responsibleId, signupDeadline: input.signupDeadline },
    });
  });

  const changes: Changes = {};
  const cmp = (k: string, a: unknown, b: unknown) => { const x = a instanceof Date ? a.toISOString() : a ?? null, y = b instanceof Date ? b.toISOString() : b ?? null; if (x !== y) changes[k] = [x, y]; };
  cmp("name", before.name, after.name); cmp("kind", before.kind, after.kind); cmp("startsAt", before.startsAt, after.startsAt); cmp("endsAt", before.endsAt, after.endsAt);
  cmp("meetingPoint", before.meetingPoint, after.meetingPoint); cmp("location", before.location, after.location); cmp("organizer", before.organizer, after.organizer);
  cmp("description", before.description, after.description); cmp("responsibleId", before.responsibleId, after.responsibleId); cmp("eventId", before.eventId, after.eventId);
  cmp("signupDeadline", before.signupDeadline, after.signupDeadline);
  const oldNeed = before.requirements.reduce((a, r) => a + r.count, 0), newNeed = input.requirements.reduce((a, r) => a + r.count, 0);
  cmp("benötigteHelfer", oldNeed, newNeed);
  if (Object.keys(changes).length) {
    const detail = changes["benötigteHelfer"] ? ` Besetzung von ${oldNeed} auf ${newNeed} Helfer.` : "";
    await audit(ctx, { action: "shift.update", entityType: "Shift", entityId: shiftId, unitId: after.unitId, summary: `Dienst „${after.name}“ bearbeitet.${detail}`.trim(), changes });
    const relevant = ["name", "startsAt", "endsAt", "meetingPoint", "location", "description"].some((k) => k in changes);
    if (before.status === "OFFEN" && relevant) {
      const crew = before.assignments.filter((a) => ["BESTAETIGT", "EINGELADEN", "ANGEFRAGT", "WARTELISTE"].includes(a.status)).map((a) => a.helperId);
      await notifyHelpers(crew, { type: "DIENST_GEAENDERT", title: `Dienst geändert: ${after.name}`, body: `${fmtRange(after.startsAt, after.endsAt)}${after.meetingPoint ? ` · Treffpunkt: ${after.meetingPoint}` : ""}`, link: `/shifts/${shiftId}` });
    }
  }
  return after;
}

export async function publishShift(ctx: Ctx, shiftId: string) {
  const s = await loadShiftFor(ctx, shiftId, "shift.edit");
  if (s.status !== "ENTWURF") throw conflict("Der Dienst ist bereits veröffentlicht.");
  if (s.endsAt < new Date()) throw badRequest("Ein vergangener Dienst kann nicht veröffentlicht werden.");
  await prisma.shift.update({ where: { id: shiftId }, data: { status: "OFFEN" } });
  await audit(ctx, { action: "shift.publish", entityType: "Shift", entityId: shiftId, unitId: s.unitId, summary: `Dienst „${s.name}“ veröffentlicht` });
  const users = await usersWithPermission("shift.view", s.unitId);
  await notifyUsers(users.filter((u) => u !== ctx.userId), { type: "DIENST_NEU", title: `Neuer Dienst: ${s.name}`, body: `${SHIFT_KIND_LABEL[s.kind]} · ${fmtRange(s.startsAt, s.endsAt)}`, link: `/shifts/${shiftId}` });
}

export async function cancelShift(ctx: Ctx, shiftId: string, reason?: string) {
  const s = await loadShiftFor(ctx, shiftId, "shift.cancel");
  if (s.status === "ABGESAGT") return;
  if (s.status === "ABGESCHLOSSEN") throw conflict("Abgeschlossene Dienste können nicht abgesagt werden.");
  await prisma.shift.update({ where: { id: shiftId }, data: { status: "ABGESAGT" } });
  await audit(ctx, { action: "shift.cancel", entityType: "Shift", entityId: shiftId, unitId: s.unitId, summary: `Dienst „${s.name}“ abgesagt${reason ? `: ${reason}` : ""}` });
  const crew = s.assignments.filter((a) => ["BESTAETIGT", "EINGELADEN", "ANGEFRAGT", "WARTELISTE"].includes(a.status)).map((a) => a.helperId);
  await notifyHelpers(crew, { type: "DIENST_ABGESAGT", title: `Dienst abgesagt: ${s.name}`, body: `${fmtDateTime(s.startsAt)}${reason ? ` – ${reason}` : ""}`, link: `/shifts/${shiftId}` });
}

export async function deleteShift(ctx: Ctx, shiftId: string) {
  const s = await loadShiftFor(ctx, shiftId, "shift.edit");
  if (s.status !== "ENTWURF") throw conflict("Nur Entwürfe können gelöscht werden. Veröffentlichte Dienste bitte absagen.");
  await prisma.shift.delete({ where: { id: shiftId } });
  await audit(ctx, { action: "shift.delete", entityType: "Shift", entityId: shiftId, unitId: s.unitId, summary: `Dienst-Entwurf „${s.name}“ gelöscht` });
}

/** Schließt den Dienst ab und bucht die Stunden aller bestätigten Helfer (anpassbar über minutesOverrides). */
export async function completeShift(ctx: Ctx, shiftId: string, minutesOverrides: Record<string, number> = {}) {
  const s = await loadShiftFor(ctx, shiftId, "shift.cancel");
  if (s.status === "ABGESCHLOSSEN") throw conflict("Der Dienst ist bereits abgeschlossen.");
  if (s.status !== "OFFEN") throw conflict("Nur veröffentlichte Dienste können abgeschlossen werden.");
  if (s.startsAt > new Date()) throw conflict("Der Dienst hat noch nicht begonnen.");
  await prisma.$transaction(async (tx) => {
    for (const a of s.assignments.filter((x) => x.status === "BESTAETIGT")) {
      // Geplante Zeit = eingeteilter Zeitraum (bei Teilzeit-Einteilung nur dieser Teil)
      const m = minutesOverrides[a.helperId] ?? minutesOf(plannedWin(s, a));
      if (!Number.isInteger(m) || m < 0 || m > 24 * 60 * 3) throw badRequest("Ungültige Dienstzeit.");
      await tx.shiftAssignment.update({ where: { id: a.id }, data: { workedMinutes: m } });
    }
    await tx.shiftAssignment.updateMany({ where: { shiftId, status: { in: ["ANGEFRAGT", "EINGELADEN", "WARTELISTE"] } }, data: { status: "ABGELEHNT" } });
    await tx.shift.update({ where: { id: shiftId }, data: { status: "ABGESCHLOSSEN" } });
  });
  await audit(ctx, { action: "shift.complete", entityType: "Shift", entityId: shiftId, unitId: s.unitId, summary: `Dienst „${s.name}“ abgeschlossen, ${s.assignments.filter((a) => a.status === "BESTAETIGT").length} Helfer verbucht` });
}

export async function setWorkedMinutes(ctx: Ctx, assignmentId: string, minutes: number) {
  const a = await prisma.shiftAssignment.findUnique({ where: { id: assignmentId }, include: { shift: true, helper: true } });
  if (!a) throw notFound();
  await require_(ctx, "shift.cancel", a.shift.unitId, true);
  if (a.shift.status !== "ABGESCHLOSSEN" || a.status !== "BESTAETIGT") throw conflict("Stunden können nur für bestätigte Helfer abgeschlossener Dienste korrigiert werden.");
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 24 * 60 * 3) throw badRequest("Ungültige Dienstzeit.");
  await prisma.shiftAssignment.update({ where: { id: assignmentId }, data: { workedMinutes: minutes } });
  await audit(ctx, { action: "shift.hours", entityType: "ShiftAssignment", entityId: assignmentId, unitId: a.shift.unitId, summary: `Dienstzeit von ${a.helper.firstName} ${a.helper.lastName} bei „${a.shift.name}“ auf ${minutes} min gesetzt`, changes: { workedMinutes: [a.workedMinutes, minutes] } });
}

// ───────────── Besetzung ─────────────

async function lockShift(tx: Tx, id: string) {
  await tx.$queryRaw`SELECT id FROM "Shift" WHERE id = ${id} FOR UPDATE`;
}

interface AssignOpts { requirementId?: string | null; override?: boolean; mode?: "EINTEILEN" | "EINLADEN"; source?: "SELBST" | "PLANER"; note?: string | null; from?: Date | string | null; to?: Date | string | null }

const MIN_WINDOW_MIN = 15;

/** Wirksamer Meldeschluss: eigener der Schicht, sonst der Veranstaltung. */
export const deadlineOf = (s: { signupDeadline: Date | null; event?: { signupDeadline: Date | null } | null }) => s.signupDeadline ?? s.event?.signupDeadline ?? null;

/** Reine Uhrzeit („22:00“) auf das passende Datum innerhalb des Dienstes legen (auch über Mitternacht). */
function timeInShift(s: { startsAt: Date; endsAt: Date }, hhmm: string, after?: Date): Date | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const t = `${m[1].padStart(2, "0")}:${m[2]}`;
  const ref = after ?? s.startsAt;
  let d = parseBerlinLocal(`${berlinDateKey(ref)}T${t}`);
  if (!d) return null;
  // vor dem Bezugszeitpunkt → am Folgetag (z. B. Ende 01:30 nach Beginn 16:30)
  if (after ? d <= ref : d < ref) d = parseBerlinLocal(`${berlinDateKey(new Date(ref.getTime() + 86_400_000))}T${t}`);
  return d;
}

/** Prüft einen Zeitraum innerhalb des Dienstes; leer = ganzer Dienst. Liefert gespeicherte Werte (null bei ganzem Dienst). */
function resolveWindow(s: { startsAt: Date; endsAt: Date }, raw: { from?: Date | string | null; to?: Date | string | null }, label = "Zeitraum") {
  const isHm = (v: unknown): v is string => typeof v === "string" && /^\d{1,2}:\d{2}$/.test(v.trim());
  if (isHm(raw.from) || isHm(raw.to)) {
    const f = isHm(raw.from) ? timeInShift(s, raw.from) : (raw.from as Date | null | undefined) ?? s.startsAt;
    const t = isHm(raw.to) ? timeInShift(s, raw.to, f ?? s.startsAt) : raw.to;
    if (!f || (isHm(raw.to) && !t)) throw badRequest(`${label}: ungültige Uhrzeit.`);
    raw = { from: f, to: t };
  }
  const parsed = timeWindowInput.safeParse({ from: raw.from ?? null, to: raw.to ?? null });
  if (!parsed.success) throw badRequest(`${label}: ungültige Uhrzeit.`);
  const w = effective(shiftWin(s), parsed.data.from, parsed.data.to);
  if (!within(shiftWin(s), w)) throw badRequest(`${label} muss innerhalb des Dienstes liegen (${fmtRange(s.startsAt, s.endsAt)}).`);
  if (minutesOf(w) < MIN_WINDOW_MIN || w.to <= w.from) throw badRequest(`${label}: Das Ende muss mindestens ${MIN_WINDOW_MIN} Minuten nach dem Beginn liegen.`);
  const full = isFull(shiftWin(s), w);
  return { window: w, from: full ? null : w.from, to: full ? null : w.to };
}

/** Dienst so zuschneiden, dass Verfügbarkeit/Konflikte nur für den Zeitraum geprüft werden. */
const matchingFor = (s: ShiftFull, w: Window): ShiftForMatching => ({ ...asMatching(s), startsAt: w.from, endsAt: w.to });

/** Wählt die beste Position, in der im Zeitraum noch Platz ist und für die der Helfer geeignet ist. */
async function pickRequirement(s: ShiftFull, helperId: string, w: Window, exceptAssignmentId?: string): Promise<{ id: string | null; blockers: string[] }> {
  if (!s.requirements.length) return { id: null, blockers: [] };
  const m = matchingFor(s, w);
  let best: { id: string; score: number } | null = null;
  let firstBlockers: string[] = [];
  for (const r of s.requirements) {
    if (!fits(reqWindows(s, r.id, exceptAssignmentId), w, r.count)) continue;
    const ev = await evaluateHelperForRequirement(m, helperId, r.id);
    if (!firstBlockers.length) firstBlockers = ev.blockers;
    if (ev.eligible && (!best || ev.score > best.score)) best = { id: r.id, score: ev.score };
  }
  return best ? { id: best.id, blockers: [] } : { id: null, blockers: firstBlockers.length ? firstBlockers : ["Keine freie Position in diesem Zeitraum"] };
}

/** Für die Empfehlung: lückenlos besetzte Plätze je Position. */
const takenByReq = (s: ShiftFull) => {
  const t: Record<string, number> = {};
  for (const r of s.requirements) t[r.id] = Math.min(r.count, fullSeats(shiftWin(s), reqWindows(s, r.id)));
  return t;
};

/** Gemeinsamer Kern für Einteilen/Bestätigen. Läuft unter Zeilensperre, damit Positionen nie überbucht werden. */
async function placeHelper(ctx: Ctx, shiftId: string, helperId: string, status: "BESTAETIGT" | "EINGELADEN", opts: AssignOpts) {
  const pre = await prisma.shift.findUnique({ where: { id: shiftId }, include: shiftInclude });
  if (!pre) throw notFound("Dienst nicht gefunden.");
  if (pre.status === "ABGESAGT" || pre.status === "ABGESCHLOSSEN") throw conflict("Für diesen Dienst können keine Helfer mehr eingeteilt werden.");
  const helper = await prisma.helper.findUnique({ where: { id: helperId } });
  if (!helper || helper.status !== "AKTIV") throw badRequest("Der Helfer ist nicht aktiv.");
  const hu = (await loadUnits()).get(helper.unitId)!, su = (await loadUnits()).get(pre.unitId)!;
  if (!(hu.path.startsWith(su.path) || su.path.startsWith(hu.path))) throw badRequest("Der Helfer gehört nicht zu dieser Einheit.");

  return prisma.$transaction(async (tx) => {
    await lockShift(tx, shiftId);
    const s = (await tx.shift.findUnique({ where: { id: shiftId }, include: shiftInclude }))!;
    const existing = s.assignments.find((a) => a.helperId === helperId);
    if (existing && ACTIVE.includes(existing.status) && !(existing.status === "EINGELADEN" && status === "BESTAETIGT")) throw conflict("Der Helfer ist bereits für diesen Dienst eingeteilt.");
    const warnings: string[] = [];
    // Zeitraum: ausdrücklich angegeben, sonst der gemeldete Zeitraum, sonst der ganze Dienst
    const reported = existing && ["ANGEFRAGT", "WARTELISTE"].includes(existing.status) ? availableWin(s, existing) : null;
    const hasExplicit = opts.from != null || opts.to != null;
    const win = resolveWindow(s, hasExplicit ? { from: opts.from, to: opts.to } : reported ? { from: reported.from, to: reported.to } : {}, "Einteilungszeitraum");
    if (reported && !within(reported, win.window)) {
      const msg = `Einteilung außerhalb des gemeldeten Zeitraums (${fmtTime(reported.from)}–${fmtTime(reported.to)} Uhr)`;
      if (!opts.override) throw conflict(`${msg}. Bitte innerhalb der Meldung einteilen oder als Ausnahme bestätigen.`, { blockers: [msg], overridable: true });
      warnings.push(msg);
    }
    let requirementId = opts.requirementId ?? null;
    if (s.requirements.length) {
      if (requirementId) {
        const r = s.requirements.find((x) => x.id === requirementId);
        if (!r) throw badRequest("Unbekannte Position.");
        if (!fits(reqWindows(s, r.id, existing?.id), win.window, r.count)) throw conflict(`Die Position „${r.label}“ ist im Zeitraum ${fmtTime(win.window.from)}–${fmtTime(win.window.to)} Uhr bereits voll besetzt.`);
        const ev = await evaluateHelperForRequirement(matchingFor(s, win.window), helperId, r.id);
        if (!ev.eligible) {
          if (!opts.override) throw conflict(`Nicht geeignet für „${r.label}“: ${ev.blockers.join("; ")}`, { blockers: ev.blockers, overridable: true });
          warnings.push(...ev.blockers);
        }
      } else {
        const pick = await pickRequirement(s, helperId, win.window, existing?.id);
        if (!pick.id) {
          if (!opts.override) throw conflict(`Keine passende freie Position: ${pick.blockers.join("; ")}`, { blockers: pick.blockers, overridable: true });
          throw badRequest("Bitte wähle für die Ausnahme-Zuteilung eine Position.");
        }
        requirementId = pick.id;
      }
    }
    const data = { requirementId, status, source: opts.source ?? "PLANER", decidedById: ctx.userId, decidedAt: new Date(), note: opts.note ?? existing?.note ?? null, plannedFrom: win.from, plannedTo: win.to };
    const a = existing
      ? await tx.shiftAssignment.update({ where: { id: existing.id }, data })
      : await tx.shiftAssignment.create({ data: { shiftId, helperId, ...data } });
    const wl = windowLabel(s, win.from, win.to);
    await audit(ctx, { action: status === "BESTAETIGT" ? "shift.assign" : "shift.invite", entityType: "ShiftAssignment", entityId: a.id, unitId: s.unitId, summary: `${helper.firstName} ${helper.lastName} ${status === "BESTAETIGT" ? "für" : "eingeladen zu"} „${s.name}“${requirementId ? ` (${s.requirements.find((r) => r.id === requirementId)?.label})` : ""}${wl ? `, ${wl}` : ""}${warnings.length ? ` – Ausnahme: ${warnings.join("; ")}` : ""}` }, tx);
    return { assignment: a, shift: s, helper, warnings, windowText: wl };
  });
}

const whenText = (s: { startsAt: Date; endsAt: Date }, wl: string | null) => (wl ? `${fmtDateTime(s.startsAt).split(" ")[0]} ${wl}` : fmtRange(s.startsAt, s.endsAt));

/** Planer teilt einen Helfer direkt ein (oder lädt ihn ein). */
export async function assignHelper(ctx: Ctx, shiftId: string, helperId: string, opts: AssignOpts = {}) {
  await loadShiftFor(ctx, shiftId, "shift.staff");
  const mode = opts.mode ?? "EINTEILEN";
  const r = await placeHelper(ctx, shiftId, helperId, mode === "EINTEILEN" ? "BESTAETIGT" : "EINGELADEN", { ...opts, source: "PLANER" });
  await notifyHelpers([helperId], mode === "EINTEILEN"
    ? { type: "DIENST_BESTAETIGT", title: `Du wurdest eingeteilt: ${r.shift.name}`, body: `${whenText(r.shift, r.windowText)}${r.shift.meetingPoint ? ` · Treffpunkt: ${r.shift.meetingPoint}` : ""}`, link: `/shifts/${shiftId}` }
    : { type: "DIENST_NEU", title: `Einladung zum Dienst: ${r.shift.name}`, body: `${whenText(r.shift, r.windowText)} – bitte zu- oder absagen.`, link: `/shifts/${shiftId}` });
  return r.assignment;
}

export async function decideAssignment(ctx: Ctx, assignmentId: string, decision: "CONFIRM" | "REJECT" | "WAITLIST", opts: { requirementId?: string | null; override?: boolean; from?: Date | string | null; to?: Date | string | null } = {}) {
  const a = await prisma.shiftAssignment.findUnique({ where: { id: assignmentId }, include: { shift: true } });
  if (!a) throw notFound();
  await loadShiftFor(ctx, a.shiftId, "shift.staff");
  if (a.status !== "ANGEFRAGT" && a.status !== "WARTELISTE") throw conflict("Diese Anfrage wurde bereits entschieden.");
  if (decision === "CONFIRM") {
    const r = await placeHelper(ctx, a.shiftId, a.helperId, "BESTAETIGT", { requirementId: opts.requirementId, override: opts.override, source: a.source, from: opts.from, to: opts.to });
    await notifyHelpers([a.helperId], { type: "DIENST_BESTAETIGT", title: `Dienst bestätigt: ${r.shift.name}`, body: `${whenText(r.shift, r.windowText)}${r.shift.meetingPoint ? ` · Treffpunkt: ${r.shift.meetingPoint}` : ""}`, link: `/shifts/${a.shiftId}` });
    return r.assignment;
  }
  const status: AssignmentStatus = decision === "REJECT" ? "ABGELEHNT" : "WARTELISTE";
  const upd = await prisma.shiftAssignment.update({ where: { id: assignmentId }, data: { status, decidedById: ctx.userId, decidedAt: new Date() } });
  await audit(ctx, { action: decision === "REJECT" ? "shift.reject" : "shift.waitlist", entityType: "ShiftAssignment", entityId: assignmentId, unitId: a.shift.unitId, summary: `Anfrage für „${a.shift.name}“ ${decision === "REJECT" ? "abgelehnt" : "auf die Warteliste gesetzt"}` });
  await notifyHelpers([a.helperId], { type: "DIENST_ABGELEHNT", title: decision === "REJECT" ? `Anfrage abgelehnt: ${a.shift.name}` : `Warteliste: ${a.shift.name}`, body: decision === "REJECT" ? "Deine Anfrage konnte leider nicht berücksichtigt werden." : "Du stehst auf der Warteliste und wirst benachrichtigt, falls ein Platz frei wird.", link: `/shifts/${a.shiftId}` });
  return upd;
}

/** Planer entfernt einen Helfer aus der Besetzung. */
export async function removeFromShift(ctx: Ctx, assignmentId: string) {
  const a = await prisma.shiftAssignment.findUnique({ where: { id: assignmentId }, include: { shift: true, helper: true } });
  if (!a) throw notFound();
  await loadShiftFor(ctx, a.shiftId, "shift.staff");
  if (a.shift.status === "ABGESCHLOSSEN") throw conflict("Der Dienst ist abgeschlossen.");
  await prisma.shiftAssignment.update({ where: { id: assignmentId }, data: { status: "ABGELEHNT", requirementId: null, plannedFrom: null, plannedTo: null, decidedById: ctx.userId, decidedAt: new Date() } });
  await audit(ctx, { action: "shift.unassign", entityType: "ShiftAssignment", entityId: assignmentId, unitId: a.shift.unitId, summary: `${a.helper.firstName} ${a.helper.lastName} aus „${a.shift.name}“ entfernt` });
  await notifyHelpers([a.helperId], { type: "DIENST_GEAENDERT", title: `Du wurdest aus dem Dienst „${a.shift.name}“ ausgetragen`, body: fmtDateTime(a.shift.startsAt), link: `/shifts/${a.shiftId}` });
}

// ───────────── Selbstbedienung der Helfer ─────────────

async function ownContext(ctx: Ctx, shiftId: string) {
  if (!ctx.helperId) throw badRequest("Dein Konto ist mit keinem Helferprofil verknüpft.");
  const s = await prisma.shift.findFirst({ where: { AND: [{ id: shiftId }, visibleWhere(ctx)] }, include: shiftInclude });
  if (!s) throw notFound("Dienst nicht gefunden.");
  return s;
}

/** Fachliche Prüfung einer Meldung für einen Zeitraum (mindestens eine Position muss in Frage kommen). */
async function checkSignupEligibility(s: ShiftFull, helperId: string, w: Window) {
  const warnings: string[] = [];
  if (!s.requirements.length) return warnings;
  const m = matchingFor(s, w);
  const evals = await Promise.all(s.requirements.map((r) => evaluateHelperForRequirement(m, helperId, r.id)));
  const ok = evals.filter((e) => e.eligible || (e.blockers.length === 1 && e.blockers[0].startsWith("Als nicht verfügbar")));
  const qualOk = evals.filter((e) => !e.missingQualTypeIds.length && !e.missingFunction);
  if (!qualOk.length) throw conflict("Dir fehlt für alle Positionen dieses Dienstes eine erforderliche Qualifikation oder Funktion.", { blockers: evals[0]?.blockers });
  if (!ok.length) warnings.push(...new Set(evals.flatMap((e) => e.blockers)));
  return warnings;
}

function assertSignupOpen(s: ShiftFull) {
  if (s.status !== "OFFEN") throw conflict("Für diesen Dienst kannst du dich nicht melden.");
  if (s.endsAt < new Date()) throw conflict("Der Dienst liegt in der Vergangenheit.");
  const dl = deadlineOf(s);
  if (dl && dl < new Date()) throw conflict(`Der Meldeschluss (${fmtDateTime(dl)} Uhr) ist vorbei. Bitte wende dich direkt an die Dienstplanung.`);
}

export interface SignupWindow { from?: Date | string | null; to?: Date | string | null }

/** Für einen Dienst melden – optional nur für einen Teil des Dienstes. */
export async function signUpForShift(ctx: Ctx, shiftId: string, note?: string | null, win: SignupWindow = {}) {
  const s = await ownContext(ctx, shiftId);
  const unit = (await loadUnits()).get(s.unitId)!;
  if (!canIn(ctx, "shift.view", unit)) throw forbidden();
  assertSignupOpen(s);
  const helper = await prisma.helper.findUniqueOrThrow({ where: { id: ctx.helperId! } });
  if (helper.status !== "AKTIV") throw forbidden("Nur aktive Helfer können sich melden.");
  const existing = s.assignments.find((a) => a.helperId === helper.id);
  if (existing && ["BESTAETIGT", "EINGELADEN", "ANGEFRAGT", "WARTELISTE"].includes(existing.status)) throw conflict("Du bist für diesen Dienst bereits gemeldet.");
  const w = resolveWindow(s, win, "Dein Zeitraum");
  const warnings = await checkSignupEligibility(s, helper.id, w.window);
  const data = { status: "ANGEFRAGT" as const, source: "SELBST" as const, note: note ?? null, availableFrom: w.from, availableTo: w.to, plannedFrom: null, plannedTo: null };
  const a = existing
    ? await prisma.shiftAssignment.update({ where: { id: existing.id }, data: { ...data, decidedAt: null, decidedById: null, requirementId: null } })
    : await prisma.shiftAssignment.create({ data: { shiftId, helperId: helper.id, ...data } });
  const wl = windowLabel(s, w.from, w.to);
  await audit(ctx, { action: "shift.signup", entityType: "ShiftAssignment", entityId: a.id, unitId: s.unitId, summary: `${helper.firstName} ${helper.lastName} hat sich für „${s.name}“ gemeldet${wl ? ` (${wl})` : ""}` });
  const planners = await usersWithPermission("shift.staff", s.unitId);
  await notifyUsers(planners.filter((u) => u !== ctx.userId), { type: "DIENST_ANFRAGE", title: `Neue Meldung: ${s.name}`, body: `${helper.firstName} ${helper.lastName} kann ${wl ? `am ${fmtDateTime(s.startsAt).split(" ")[0]} von ${wl}` : `am ${fmtDateTime(s.startsAt)} (ganzer Dienst)`}.`, link: `/shifts/${shiftId}` });
  return { assignment: a, warnings };
}

/** Eigene, noch nicht entschiedene Meldung ändern (Zeitraum/Anmerkung). */
export async function updateMySignup(ctx: Ctx, shiftId: string, note: string | null | undefined, win: SignupWindow = {}) {
  const s = await ownContext(ctx, shiftId);
  const a = s.assignments.find((x) => x.helperId === ctx.helperId);
  if (!a || !["ANGEFRAGT", "WARTELISTE"].includes(a.status)) throw conflict("Du hast keine offene Meldung für diesen Dienst.");
  assertSignupOpen(s);
  const w = resolveWindow(s, win, "Dein Zeitraum");
  const warnings = await checkSignupEligibility(s, a.helperId, w.window);
  const upd = await prisma.shiftAssignment.update({ where: { id: a.id }, data: { availableFrom: w.from, availableTo: w.to, note: note === undefined ? a.note : note } });
  const wl = windowLabel(s, w.from, w.to);
  await audit(ctx, { action: "shift.signup_update", entityType: "ShiftAssignment", entityId: a.id, unitId: s.unitId, summary: `${a.helper.firstName} ${a.helper.lastName} hat die Meldung für „${s.name}“ geändert: ${wl ?? "ganzer Dienst"}`, changes: { availableFrom: [a.availableFrom?.toISOString() ?? null, w.from?.toISOString() ?? null], availableTo: [a.availableTo?.toISOString() ?? null, w.to?.toISOString() ?? null] } });
  return { assignment: upd, warnings };
}

/** Eigene Anfrage zurückziehen bzw. eine Zusage absagen. */
export async function withdrawFromShift(ctx: Ctx, shiftId: string, reason?: string | null) {
  const s = await ownContext(ctx, shiftId);
  const a = s.assignments.find((x) => x.helperId === ctx.helperId);
  if (!a || !["BESTAETIGT", "EINGELADEN", "ANGEFRAGT", "WARTELISTE"].includes(a.status)) throw conflict("Du bist für diesen Dienst nicht gemeldet.");
  if (s.status === "ABGESCHLOSSEN") throw conflict("Der Dienst ist abgeschlossen.");
  const wasConfirmed = a.status === "BESTAETIGT";
  await prisma.shiftAssignment.update({ where: { id: a.id }, data: { status: "ZURUECKGEZOGEN", note: reason ?? a.note, decidedAt: new Date() } });
  await audit(ctx, { action: wasConfirmed ? "shift.cancel_own" : "shift.withdraw", entityType: "ShiftAssignment", entityId: a.id, unitId: s.unitId, summary: `${a.helper.firstName} ${a.helper.lastName} ${wasConfirmed ? "hat für" : "zog Meldung für"} „${s.name}“ ${wasConfirmed ? "abgesagt" : "zurück"}` });
  if (wasConfirmed) {
    const planners = await usersWithPermission("shift.staff", s.unitId);
    await notifyUsers(planners.filter((u) => u !== ctx.userId), { type: "DIENST_ABGESAGT", title: `Absage: ${a.helper.firstName} ${a.helper.lastName} – ${s.name}`, body: `${fmtDateTime(s.startsAt)}${reason ? ` – ${reason}` : ""}. Die Position ist wieder frei.`, link: `/shifts/${shiftId}` });
  }
}

export async function respondToInvitation(ctx: Ctx, shiftId: string, accept: boolean) {
  const s = await ownContext(ctx, shiftId);
  const a = s.assignments.find((x) => x.helperId === ctx.helperId);
  if (!a || a.status !== "EINGELADEN") throw conflict("Keine offene Einladung.");
  if (!accept) return withdrawFromShift(ctx, shiftId, "Einladung abgelehnt");
  await prisma.shiftAssignment.update({ where: { id: a.id }, data: { status: "BESTAETIGT", decidedAt: new Date() } });
  await audit(ctx, { action: "shift.accept", entityType: "ShiftAssignment", entityId: a.id, unitId: s.unitId, summary: `${a.helper.firstName} ${a.helper.lastName} hat die Einladung zu „${s.name}“ angenommen` });
  const planners = await usersWithPermission("shift.staff", s.unitId);
  await notifyUsers(planners.filter((u) => u !== ctx.userId), { type: "DIENST_BESTAETIGT", title: `Zusage: ${a.helper.firstName} ${a.helper.lastName} – ${s.name}`, link: `/shifts/${shiftId}` });
}

// ───────────── Meldung für eine Veranstaltung mit mehreren Schichten ─────────────

/** Alle für den Helfer sichtbaren, veröffentlichten Schichten einer Veranstaltung mit eigener Meldung. */
export async function getEventSignup(ctx: Ctx, eventId: string) {
  const rows = await prisma.shift.findMany({ where: { AND: [{ eventId, status: { not: "ENTWURF" } }, visibleWhere(ctx)] }, include: shiftInclude, orderBy: { startsAt: "asc" } });
  if (!rows.length) throw notFound("Für diese Veranstaltung gibt es keine Schichten, für die du dich melden kannst.");
  const ev = await prisma.event.findUniqueOrThrow({ where: { id: eventId }, select: { id: true, name: true, organizer: true, startsAt: true, endsAt: true, location: true, signupDeadline: true, cancelled: true } });
  const now = new Date();
  const shifts = rows.map((s, i) => {
    const mine = ctx.helperId ? s.assignments.find((a) => a.helperId === ctx.helperId) ?? null : null;
    const sum = summarize(s);
    const dl = deadlineOf(s);
    const active = mine && ["BESTAETIGT", "EINGELADEN", "ANGEFRAGT", "WARTELISTE"].includes(mine.status) ? mine : null;
    const win = active ? (["BESTAETIGT", "EINGELADEN"].includes(active.status) ? plannedWin(s, active) : availableWin(s, active)) : shiftWin(s);
    return {
      id: s.id, index: i + 1, name: s.name, kind: s.kind, status: s.status, startsAt: s.startsAt, endsAt: s.endsAt, meetingPoint: s.meetingPoint, location: s.location,
      past: s.endsAt < now, full: sum.needed > 0 && sum.open === 0, needed: sum.needed, filled: sum.filledPositions,
      signupDeadline: dl, signupClosed: !!dl && dl < now,
      mine: active ? { status: active.status, note: active.note, from: win.from, to: win.to, label: ["BESTAETIGT", "EINGELADEN"].includes(active.status) ? windowLabel(s, active.plannedFrom, active.plannedTo) : windowLabel(s, active.availableFrom, active.availableTo) } : null,
      defaultFrom: win.from, defaultTo: win.to,
    };
  });
  const deadlines = shifts.map((x) => x.signupDeadline).filter(Boolean) as Date[];
  return {
    event: { id: ev.id, name: ev.name, organizer: ev.organizer, location: ev.location, cancelled: ev.cancelled, startsAt: shifts[0].startsAt, endsAt: shifts[shifts.length - 1].endsAt },
    signupDeadline: ev.signupDeadline ?? (deadlines.length ? new Date(Math.min(...deadlines.map((d) => d.getTime()))) : null),
    total: shifts.length, past: shifts.filter((x) => x.past).length, shifts, canSignUp: !!ctx.helperId,
  };
}
export type EventSignup = Awaited<ReturnType<typeof getEventSignup>>;

// ───────────── Empfehlung ─────────────

export async function getRecommendation(ctx: Ctx, shiftId: string) {
  const s = await loadShiftFor(ctx, shiftId, "shift.staff");
  if (s.status === "ABGESAGT" || s.status === "ABGESCHLOSSEN") throw conflict("Für diesen Dienst ist keine Besetzung mehr möglich.");
  return recommend(ctx, asMatching(s), takenByReq(s));
}

/** Übernimmt Empfehlungen – jede Zuordnung wird serverseitig erneut geprüft (kein Vertrauen in den Client). */
export async function applyRecommendation(ctx: Ctx, shiftId: string, picks: { requirementId: string; helperId: string }[], mode: "EINTEILEN" | "EINLADEN" = "EINTEILEN") {
  await loadShiftFor(ctx, shiftId, "shift.staff");
  const applied: string[] = [], skipped: { helperId: string; reason: string }[] = [];
  for (const p of picks) {
    try {
      await assignHelper(ctx, shiftId, p.helperId, { requirementId: p.requirementId, mode, override: false });
      applied.push(p.helperId);
    } catch (e) {
      skipped.push({ helperId: p.helperId, reason: (e as Error).message });
    }
  }
  return { applied, skipped };
}

// ───────────── Fahrzeuge & Material ─────────────

export async function setShiftResources(ctx: Ctx, shiftId: string, input: { vehicleIds?: string[]; materials?: { materialId: string; quantity: number }[] }) {
  const s = await loadShiftFor(ctx, shiftId, "shift.edit");
  if (s.status === "ABGESCHLOSSEN" || s.status === "ABGESAGT") throw conflict("Der Dienst ist beendet.");
  const unit = (await loadUnits()).get(s.unitId)!;
  const overlapping: Prisma.ShiftWhereInput = { id: { not: shiftId }, status: { in: ["OFFEN", "ENTWURF"] }, startsAt: { lt: s.endsAt }, endsAt: { gt: s.startsAt } };

  if (input.vehicleIds) {
    const ids = [...new Set(input.vehicleIds)];
    const vehicles = await prisma.vehicle.findMany({ where: { id: { in: ids } }, include: { unit: true } });
    if (vehicles.length !== ids.length) throw badRequest("Ein Fahrzeug wurde nicht gefunden.");
    for (const v of vehicles) {
      if (!canIn(ctx, "vehicle.view", v.unit)) throw notFound("Fahrzeug nicht gefunden.");
      if (!(v.unit.path.startsWith(unit.path) || unit.path.startsWith(v.unit.path))) throw badRequest(`Fahrzeug „${v.name}“ gehört nicht zu dieser Einheit.`);
      if (v.status === "NICHT_EINSATZBEREIT" || v.status === "IN_WARTUNG") throw conflict(`Fahrzeug „${v.name}“ ist nicht einsatzbereit (${v.status === "IN_WARTUNG" ? "in Wartung" : "nicht einsatzbereit"}).`);
      const clash = await prisma.shiftVehicle.findFirst({ where: { vehicleId: v.id, shift: overlapping }, include: { shift: { select: { name: true, startsAt: true } } } });
      if (clash) throw conflict(`Fahrzeug „${v.name}“ ist bereits im Dienst „${clash.shift.name}“ (${fmtDateTime(clash.shift.startsAt)}) gebucht.`);
    }
  }
  if (input.materials) {
    for (const m of input.materials) {
      const item = await prisma.materialItem.findUnique({ where: { id: m.materialId }, include: { unit: true } });
      if (!item || !canIn(ctx, "material.view", item.unit)) throw notFound("Material nicht gefunden.");
      if (!(item.unit.path.startsWith(unit.path) || unit.path.startsWith(item.unit.path))) throw badRequest(`Material „${item.name}“ gehört nicht zu dieser Einheit.`);
      if (!Number.isInteger(m.quantity) || m.quantity < 1) throw badRequest("Ungültige Menge.");
      if (item.status === "DEFEKT" || item.status === "AUSGESONDERT") throw conflict(`Material „${item.name}“ ist ${item.status === "DEFEKT" ? "defekt" : "ausgesondert"}.`);
      const reserved = await prisma.shiftMaterial.aggregate({ where: { materialId: item.id, shift: overlapping }, _sum: { quantity: true } });
      const free = item.quantity - (reserved._sum.quantity ?? 0);
      if (m.quantity > free) throw conflict(`Von „${item.name}“ sind im Zeitraum nur noch ${Math.max(free, 0)} von ${item.quantity} frei.`);
    }
  }
  await prisma.$transaction(async (tx) => {
    if (input.vehicleIds) {
      await tx.shiftVehicle.deleteMany({ where: { shiftId } });
      await tx.shiftVehicle.createMany({ data: [...new Set(input.vehicleIds)].map((vehicleId) => ({ shiftId, vehicleId })) });
    }
    if (input.materials) {
      await tx.shiftMaterial.deleteMany({ where: { shiftId } });
      await tx.shiftMaterial.createMany({ data: input.materials.map((m) => ({ shiftId, materialId: m.materialId, quantity: m.quantity })) });
    }
  });
  await audit(ctx, { action: "shift.resources", entityType: "Shift", entityId: shiftId, unitId: s.unitId, summary: `Fahrzeuge/Material für „${s.name}“ aktualisiert` });
}

/** Für Dashboard/Profile: kommende Dienste des Helfers. */
export async function upcomingForHelper(helperId: string, limit = 5) {
  const rows = await prisma.shiftAssignment.findMany({
    where: { helperId, status: { in: ["BESTAETIGT", "EINGELADEN", "ANGEFRAGT", "WARTELISTE"] }, shift: { endsAt: { gte: new Date() }, status: { in: ["OFFEN"] } } },
    include: { shift: { select: { id: true, name: true, kind: true, startsAt: true, endsAt: true, meetingPoint: true } } },
    orderBy: { shift: { startsAt: "asc" } }, take: limit,
  });
  return rows.map((r) => ({ shiftId: r.shift.id, name: r.shift.name, kind: r.shift.kind, startsAt: r.shift.startsAt, endsAt: r.shift.endsAt, meetingPoint: r.shift.meetingPoint, status: r.status }));
}

/** Diensthistorie eines Helfers (nur mit Zugriff auf das Profil). */
export async function shiftHistory(ctx: Ctx, helperId: string, take = 50) {
  const { access } = await helperWithAccess(ctx, helperId);
  if (!access.self && !access.planning && !access.quals) throw forbidden();
  const rows = await prisma.shiftAssignment.findMany({
    where: { helperId, status: "BESTAETIGT", shift: { status: { in: ["OFFEN", "ABGESCHLOSSEN"] } } },
    include: { shift: { select: { id: true, name: true, kind: true, startsAt: true, endsAt: true, status: true, unit: { select: { name: true } } } }, requirement: { select: { label: true } } },
    orderBy: { shift: { startsAt: "desc" } }, take,
  });
  return rows
    .map((r) => ({ shiftId: r.shift.id, name: r.shift.name, kind: r.shift.kind, startsAt: r.shift.startsAt, endsAt: r.shift.endsAt, status: r.shift.status, unitName: r.shift.unit.name, position: r.requirement?.label ?? null, workedMinutes: r.workedMinutes }));
}

export { hasAnywhere, toRequirement };
