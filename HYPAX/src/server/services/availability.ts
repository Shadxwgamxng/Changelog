import type { AvailabilityStatus, Prisma } from "@prisma/client";
import { prisma, type Db } from "../db";
import { audit } from "../audit";
import { badRequest, forbidden } from "../errors";
import { canIn, scopeWhere, type Ctx } from "../context";
import { availabilityInput } from "../schemas";
import { addDays, berlinDateKey, parseDateOnly, startOfBerlinDay } from "@/lib/dates";
import { helperWithAccess } from "./helpers";

const DAY = 86_400_000;
const MAX_RANGE_DAYS = 400;

/** Tage (Berliner Datumsschlüssel), die ein Zeitraum berührt – mind. 2 h Überlappung, sonst zählt der Tag nicht. */
export function shiftDayKeys(start: Date, end: Date): string[] {
  const keys: string[] = [];
  const first = berlinDateKey(start), last = berlinDateKey(end);
  let cursor = parseDateOnly(first)!;
  for (let i = 0; i < 60; i++) {
    const key = cursor.toISOString().slice(0, 10);
    if (key > last) break;
    const next = new Date(cursor.getTime() + DAY).toISOString().slice(0, 10);
    const dayStart = startOfBerlinDay(key).getTime(), dayEnd = startOfBerlinDay(next).getTime();
    const overlap = Math.min(dayEnd, end.getTime()) - Math.max(dayStart, start.getTime());
    if (key === first || overlap >= 2 * 3_600_000) keys.push(key);
    cursor = new Date(cursor.getTime() + DAY);
  }
  return keys;
}

async function writeRange(tx: Db, helperId: string, start: Date, end: Date, data: { status: AvailabilityStatus; reason: string | null; note: string | null } | null) {
  // Überlappende Einträge zuschneiden/aufteilen, damit pro Tag genau ein Status gilt.
  const overlapping = await tx.availability.findMany({ where: { helperId, startDate: { lte: end }, endDate: { gte: start } } });
  for (const o of overlapping) {
    const keepLeft = o.startDate < start, keepRight = o.endDate > end;
    if (!keepLeft && !keepRight) await tx.availability.delete({ where: { id: o.id } });
    else if (keepLeft && !keepRight) await tx.availability.update({ where: { id: o.id }, data: { endDate: new Date(start.getTime() - DAY) } });
    else if (!keepLeft && keepRight) await tx.availability.update({ where: { id: o.id }, data: { startDate: new Date(end.getTime() + DAY) } });
    else {
      await tx.availability.update({ where: { id: o.id }, data: { endDate: new Date(start.getTime() - DAY) } });
      await tx.availability.create({ data: { helperId, startDate: new Date(end.getTime() + DAY), endDate: o.endDate, status: o.status, reason: o.reason, note: o.note } });
    }
  }
  if (data) await tx.availability.create({ data: { helperId, startDate: start, endDate: end, status: data.status, reason: data.reason as never, note: data.note } });
}

async function writableHelper(ctx: Ctx, helperId: string) {
  const { helper, access, unit } = await helperWithAccess(ctx, helperId);
  if (!access.self && !canIn(ctx, "helper.edit", unit)) throw forbidden("Du kannst nur deine eigene Verfügbarkeit ändern.");
  return helper;
}

export async function setAvailability(ctx: Ctx, helperId: string, raw: unknown) {
  const input = availabilityInput.parse(raw);
  if (input.endDate < input.startDate) throw badRequest("Das Ende liegt vor dem Beginn.");
  if ((input.endDate.getTime() - input.startDate.getTime()) / DAY > MAX_RANGE_DAYS) throw badRequest(`Maximal ${MAX_RANGE_DAYS} Tage pro Eintrag.`);
  const helper = await writableHelper(ctx, helperId);
  await prisma.$transaction((tx) => writeRange(tx, helperId, input.startDate, input.endDate, { status: input.status, reason: input.reason, note: input.note }));
  await audit(ctx, { action: "availability.set", entityType: "Availability", entityId: helperId, unitId: helper.unitId, summary: `Verfügbarkeit ${input.startDate.toISOString().slice(0, 10)}–${input.endDate.toISOString().slice(0, 10)} gesetzt: ${input.status}` });
}

/** Setzt Tage zurück auf „Keine Angabe“. */
export async function clearAvailability(ctx: Ctx, helperId: string, startDate: Date, endDate: Date) {
  if (endDate < startDate) throw badRequest("Das Ende liegt vor dem Beginn.");
  await writableHelper(ctx, helperId);
  await prisma.$transaction((tx) => writeRange(tx, helperId, startDate, endDate, null));
}

export interface AvailabilityEntry { id: string; startDate: Date; endDate: Date; status: AvailabilityStatus; reason?: string | null; note?: string | null }

/** Eigene Einträge inkl. privatem Grund; fremde nur mit `availability.view_others` und OHNE Grund/Notiz. */
export async function getAvailability(ctx: Ctx, helperId: string, from: Date, to: Date): Promise<AvailabilityEntry[]> {
  const { access } = await helperWithAccess(ctx, helperId);
  if (!access.self && !access.planning) throw forbidden();
  const rows = await prisma.availability.findMany({ where: { helperId, startDate: { lte: to }, endDate: { gte: from } }, orderBy: { startDate: "asc" } });
  return rows.map((r) => ({
    id: r.id, startDate: r.startDate, endDate: r.endDate, status: r.status,
    ...(access.self ? { reason: r.reason, note: r.note } : {}),
  }));
}

/** Matrix für Planer: Status je Helfer und Tag (ohne Gründe). */
export async function unitAvailabilityMatrix(ctx: Ctx, unitId: string, from: Date, to: Date) {
  const unit = await prisma.orgUnit.findUnique({ where: { id: unitId } });
  if (!unit) throw badRequest("Einheit nicht gefunden.");
  const helpers = await prisma.helper.findMany({
    where: { status: "AKTIV", unit: { path: { startsWith: unit.path } }, AND: [scopeWhere(ctx, "availability.view_others") as Prisma.HelperWhereInput] },
    select: { id: true, firstName: true, lastName: true, availabilities: { where: { startDate: { lte: to }, endDate: { gte: from } }, select: { startDate: true, endDate: true, status: true } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  const days: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d.toISOString().slice(0, 10));
  return {
    days,
    rows: helpers.map((h) => ({
      helperId: h.id, name: `${h.lastName}, ${h.firstName}`,
      cells: days.map((k) => {
        const t = parseDateOnly(k)!.getTime();
        return h.availabilities.find((a) => a.startDate.getTime() <= t && a.endDate.getTime() >= t)?.status ?? null;
      }),
    })),
  };
}

const SEVERITY: Record<AvailabilityStatus, number> = { VERFUEGBAR: 0, EINGESCHRAENKT: 1, NICHT_VERFUEGBAR: 2 };

/** Interner Abruf für die Besetzung: schlechtester Status über den Dienstzeitraum (null = keine Angabe). */
export async function availabilityForShift(helperIds: string[], start: Date, end: Date): Promise<Map<string, AvailabilityStatus | null>> {
  const keys = shiftDayKeys(start, end);
  const out = new Map<string, AvailabilityStatus | null>(helperIds.map((h) => [h, null]));
  if (!keys.length || !helperIds.length) return out;
  const first = parseDateOnly(keys[0])!, last = parseDateOnly(keys[keys.length - 1])!;
  const rows = await prisma.availability.findMany({ where: { helperId: { in: helperIds }, startDate: { lte: last }, endDate: { gte: first } } });
  for (const id of helperIds) {
    const mine = rows.filter((r) => r.helperId === id);
    let worst: AvailabilityStatus | null = null, anyMissing = false;
    for (const k of keys) {
      const t = parseDateOnly(k)!.getTime();
      const hit = mine.find((r) => r.startDate.getTime() <= t && r.endDate.getTime() >= t);
      if (!hit) { anyMissing = true; continue; }
      if (worst === null || SEVERITY[hit.status] > SEVERITY[worst]) worst = hit.status;
    }
    // Teilweise Angaben: nur „verfügbar“, wenn alle berührten Tage bestätigt sind
    if (worst === "VERFUEGBAR" && anyMissing) worst = null;
    out.set(id, worst);
  }
  return out;
}
