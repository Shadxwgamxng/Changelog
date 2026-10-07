// Dienststunden, Statistiken und Berichte. Alle Zahlen werden serverseitig auf den berechtigten Bereich begrenzt.
import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { hasAnywhere, scopeWhere, type Ctx } from "../context";
import { forbidden } from "../errors";
import { loadUnits } from "../units";
import { berlinParts } from "@/lib/dates";
import { qualState } from "@/lib/qualification";
import { QUAL_CATEGORY_LABEL, SHIFT_KIND_LABEL } from "@/lib/constants";
import { buildCandidates, toRequirement } from "./staffing";
import { evaluate } from "@/lib/matching";

export interface HoursQuery { from: Date; to: Date; unitId?: string; helperId?: string }

const monthKey = (d: Date) => { const p = berlinParts(d); return `${p.y}-${String(p.m).padStart(2, "0")}`; };

export async function hoursReport(ctx: Ctx, q: HoursQuery) {
  if (!hasAnywhere(ctx, "report.view")) throw forbidden();
  const units = await loadUnits();
  const unitFilter: Prisma.ShiftWhereInput = q.unitId && units.get(q.unitId) ? { unit: { path: { startsWith: units.get(q.unitId)!.path } } } : {};
  const rows = await prisma.shiftAssignment.findMany({
    where: { status: "BESTAETIGT", workedMinutes: { not: null }, ...(q.helperId ? { helperId: q.helperId } : {}), shift: { AND: [{ status: "ABGESCHLOSSEN", startsAt: { gte: q.from, lte: q.to } }, scopeWhere(ctx, "report.view") as Prisma.ShiftWhereInput, unitFilter] } },
    include: { helper: { select: { id: true, firstName: true, lastName: true, unit: { select: { name: true } } } }, shift: { select: { kind: true, startsAt: true, unit: { select: { id: true, name: true } } } } },
  });
  const incidents = await prisma.incidentHelper.findMany({
    where: { ...(q.helperId ? { helperId: q.helperId } : {}), incident: { AND: [{ endedAt: { not: null }, startedAt: { gte: q.from, lte: q.to } }, scopeWhere(ctx, "report.view") as Prisma.IncidentWhereInput, q.unitId && units.get(q.unitId) ? { unit: { path: { startsWith: units.get(q.unitId)!.path } } } : {}] } },
    include: { helper: { select: { id: true, firstName: true, lastName: true, unit: { select: { name: true } } } }, incident: { select: { startedAt: true, endedAt: true, unit: { select: { name: true } } } } },
  });

  const byHelper = new Map<string, { helperId: string; name: string; unitName: string; minutes: number; shifts: number; trainingMinutes: number; incidentMinutes: number; incidents: number }>();
  const get = (h: { id: string; firstName: string; lastName: string; unit: { name: string } }) => {
    let r = byHelper.get(h.id);
    if (!r) byHelper.set(h.id, (r = { helperId: h.id, name: `${h.lastName}, ${h.firstName}`, unitName: h.unit.name, minutes: 0, shifts: 0, trainingMinutes: 0, incidentMinutes: 0, incidents: 0 }));
    return r;
  };
  const byMonth = new Map<string, number>(), byKind = new Map<string, number>(), byUnit = new Map<string, number>();
  let totalMinutes = 0;
  for (const a of rows) {
    const m = a.workedMinutes!;
    const r = get(a.helper);
    r.minutes += m; r.shifts++;
    if (a.shift.kind === "AUSBILDUNG") r.trainingMinutes += m;
    if (a.shift.kind === "EINSATZ") r.incidentMinutes += m;
    totalMinutes += m;
    byMonth.set(monthKey(a.shift.startsAt), (byMonth.get(monthKey(a.shift.startsAt)) ?? 0) + m);
    byKind.set(a.shift.kind, (byKind.get(a.shift.kind) ?? 0) + m);
    byUnit.set(a.shift.unit.name, (byUnit.get(a.shift.unit.name) ?? 0) + m);
  }
  for (const i of incidents) {
    const m = Math.round((i.incident.endedAt!.getTime() - i.incident.startedAt.getTime()) / 60_000);
    const r = get(i.helper);
    r.incidentMinutes += m; r.incidents++;
    byKind.set("EINSATZ_PROTOKOLL", (byKind.get("EINSATZ_PROTOKOLL") ?? 0) + m);
  }
  return {
    totalMinutes, shiftCount: rows.length, incidentCount: new Set(incidents.map((i) => i.incidentId)).size,
    trainingMinutes: [...byHelper.values()].reduce((s, r) => s + r.trainingMinutes, 0),
    incidentMinutes: [...byHelper.values()].reduce((s, r) => s + r.incidentMinutes, 0),
    helpers: [...byHelper.values()].sort((a, b) => b.minutes - a.minutes),
    byMonth: [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, minutes]) => ({ month, minutes })),
    byKind: [...byKind.entries()].map(([kind, minutes]) => ({ kind, label: kind === "EINSATZ_PROTOKOLL" ? "Einsatzprotokolle" : SHIFT_KIND_LABEL[kind as keyof typeof SHIFT_KIND_LABEL] ?? kind, minutes })).sort((a, b) => b.minutes - a.minutes),
    byUnit: [...byUnit.entries()].map(([unit, minutes]) => ({ unit, minutes })).sort((a, b) => b.minutes - a.minutes),
  };
}

/** Eigene Stunden – für jeden Helfer verfügbar (kein report.view nötig). */
export async function ownHours(ctx: Ctx, year: number) {
  if (!ctx.helperId) return { totalMinutes: 0, shifts: 0, byMonth: [] as { month: string; minutes: number }[], byKind: [] as { kind: string; label: string; minutes: number }[], trainingMinutes: 0 };
  const from = new Date(Date.UTC(year - 1, 11, 31)), to = new Date(Date.UTC(year + 1, 0, 2));
  const rows = await prisma.shiftAssignment.findMany({ where: { helperId: ctx.helperId, status: "BESTAETIGT", workedMinutes: { not: null }, shift: { status: "ABGESCHLOSSEN", startsAt: { gte: from, lte: to } } }, include: { shift: { select: { kind: true, startsAt: true } } } });
  const mine = rows.filter((r) => berlinParts(r.shift.startsAt).y === year);
  const byMonth = new Map<string, number>(), byKind = new Map<string, number>();
  for (const r of mine) {
    byMonth.set(monthKey(r.shift.startsAt), (byMonth.get(monthKey(r.shift.startsAt)) ?? 0) + r.workedMinutes!);
    byKind.set(r.shift.kind, (byKind.get(r.shift.kind) ?? 0) + r.workedMinutes!);
  }
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  return {
    totalMinutes: mine.reduce((s, r) => s + r.workedMinutes!, 0), shifts: mine.length,
    trainingMinutes: byKind.get("AUSBILDUNG") ?? 0,
    byMonth: months.map((month) => ({ month, minutes: byMonth.get(month) ?? 0 })),
    byKind: [...byKind.entries()].map(([kind, minutes]) => ({ kind, label: SHIFT_KIND_LABEL[kind as keyof typeof SHIFT_KIND_LABEL] ?? kind, minutes })),
  };
}

export async function helperStats(ctx: Ctx, from: Date, to: Date, unitId?: string) {
  if (!hasAnywhere(ctx, "report.view")) throw forbidden();
  const units = await loadUnits();
  const base: Prisma.HelperWhereInput = { AND: [scopeWhere(ctx, "report.view") as Prisma.HelperWhereInput, unitId && units.get(unitId) ? { unit: { path: { startsWith: units.get(unitId)!.path } } } : {}, { status: { not: "ANONYMISIERT" } }] };
  const [byStatus, joined, left, byUnit] = await Promise.all([
    prisma.helper.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
    prisma.helper.count({ where: { AND: [base, { joinedAt: { gte: from, lte: to } }] } }),
    prisma.helper.count({ where: { AND: [base, { leftAt: { gte: from, lte: to } }] } }),
    prisma.helper.groupBy({ by: ["unitId"], where: { AND: [base, { status: "AKTIV" }] }, _count: { _all: true } }),
  ]);
  const count = (s: string) => byStatus.find((x) => x.status === s)?._count._all ?? 0;
  return {
    active: count("AKTIV"), passive: count("PASSIV"), inactive: count("INAKTIV"), left: count("AUSGETRETEN"), newMembers: joined, leavers: left,
    byUnit: byUnit.map((u) => ({ unit: units.get(u.unitId)?.name ?? u.unitId, active: u._count._all })).sort((a, b) => b.active - a.active),
  };
}

export async function shiftStats(ctx: Ctx, from: Date, to: Date, unitId?: string) {
  if (!hasAnywhere(ctx, "report.view")) throw forbidden();
  const units = await loadUnits();
  const shifts = await prisma.shift.findMany({
    where: { AND: [scopeWhere(ctx, "report.view") as Prisma.ShiftWhereInput, { startsAt: { gte: from, lte: to }, status: { not: "ENTWURF" } }, unitId && units.get(unitId) ? { unit: { path: { startsWith: units.get(unitId)!.path } } } : {}] },
    include: { requirements: true, assignments: { where: { status: "BESTAETIGT" } }, unit: { select: { name: true } } }, orderBy: { startsAt: "asc" },
  });
  let needed = 0, filled = 0;
  const open: { id: string; name: string; startsAt: Date; unitName: string; needed: number; filled: number }[] = [];
  const byKind = new Map<string, number>();
  for (const s of shifts) {
    byKind.set(s.kind, (byKind.get(s.kind) ?? 0) + 1);
    if (s.status === "ABGESAGT") continue;
    const n = s.requirements.reduce((a, r) => a + r.count, 0);
    const f = s.requirements.reduce((a, r) => a + Math.min(r.count, s.assignments.filter((x) => x.requirementId === r.id).length), 0);
    needed += n; filled += f;
    if (n > f && s.endsAt > new Date()) open.push({ id: s.id, name: s.name, startsAt: s.startsAt, unitName: s.unit.name, needed: n, filled: f });
  }
  return {
    total: shifts.length, cancelled: shifts.filter((s) => s.status === "ABGESAGT").length, completed: shifts.filter((s) => s.status === "ABGESCHLOSSEN").length,
    needed, filled, fillRate: needed ? Math.round((filled / needed) * 100) : null, open: open.slice(0, 50),
    byKind: [...byKind.entries()].map(([kind, count]) => ({ kind, label: SHIFT_KIND_LABEL[kind as keyof typeof SHIFT_KIND_LABEL] ?? kind, count })),
  };
}

export async function qualificationStats(ctx: Ctx, unitId?: string) {
  if (!hasAnywhere(ctx, "report.view")) throw forbidden();
  const units = await loadUnits();
  const quals = await prisma.helperQualification.findMany({
    where: { helper: { status: "AKTIV", AND: [scopeWhere(ctx, "report.view") as Prisma.HelperWhereInput, unitId && units.get(unitId) ? { unit: { path: { startsWith: units.get(unitId)!.path } } } : {}] } },
    include: { type: { select: { name: true, category: true } } },
  });
  const tally = { valid: 0, expiring: 0, expired: 0, review: 0, revoked: 0 };
  const perType = new Map<string, { name: string; category: string; valid: number; expiring: number; expired: number }>();
  for (const q of quals) {
    const st = qualState(q);
    const t = perType.get(q.typeId) ?? { name: q.type.name, category: QUAL_CATEGORY_LABEL[q.type.category], valid: 0, expiring: 0, expired: 0 };
    perType.set(q.typeId, t);
    if (st === "GUELTIG") { tally.valid++; t.valid++; } else if (st === "LAEUFT_AB") { tally.expiring++; t.expiring++; t.valid++; } else if (st === "ABGELAUFEN") { tally.expired++; t.expired++; } else if (st === "IN_PRUEFUNG") tally.review++; else tally.revoked++;
  }
  // „Fehlende Qualifikationen“: kommende Dienstpositionen, für die es nicht genug geeignete Helfer gibt
  const upcoming = await prisma.shift.findMany({
    where: { AND: [scopeWhere(ctx, "report.view") as Prisma.ShiftWhereInput, { status: "OFFEN", startsAt: { gte: new Date(), lte: new Date(Date.now() + 90 * 86_400_000) } }, unitId && units.get(unitId) ? { unit: { path: { startsWith: units.get(unitId)!.path } } } : {}] },
    include: { requirements: { include: { qualifications: true } } }, orderBy: { startsAt: "asc" }, take: 40,
  });
  const gaps: { shiftId: string; shiftName: string; startsAt: Date; position: string; needed: number; qualified: number }[] = [];
  for (const s of upcoming) {
    const reqs = s.requirements.filter((r) => r.qualifications.length || r.functionKey);
    if (!reqs.length) continue;
    const { candidates, shiftCtx } = await buildCandidates(null, { id: s.id, unitId: s.unitId, kind: s.kind, startsAt: s.startsAt, endsAt: s.endsAt, requirements: reqs });
    if (!shiftCtx) continue;
    for (const r of reqs) {
      const qualified = candidates.filter((c) => { const e = evaluate({ ...c, availability: "VERFUEGBAR", busy: [], maxShiftsPerMonth: null, alreadyOnShift: false }, toRequirement(r as never), shiftCtx); return !e.missingFunction && !e.missingQualTypeIds.length; }).length;
      if (qualified < r.count) gaps.push({ shiftId: s.id, shiftName: s.name, startsAt: s.startsAt, position: r.label, needed: r.count, qualified });
    }
  }
  return { ...tally, perType: [...perType.values()].sort((a, b) => a.name.localeCompare(b.name, "de")), gaps };
}
