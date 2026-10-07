// Datenbeschaffung für die Besetzungs-Empfehlung; die Bewertung selbst liegt in src/lib/matching.ts (rein, getestet).
import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { canIn, scopeWhere, type Ctx } from "../context";
import { loadUnits } from "../units";
import { availabilityForShift } from "./availability";
import { loadCovers } from "./qualifications";
import { effectiveQualTypes } from "@/lib/qualification";
import { berlinParts, berlinWeekday, startOfBerlinMonth } from "@/lib/dates";
import { evaluate, proposeStaffing, rankForRequirement, type Candidate, type Evaluation, type ProposalSlot, type Requirement, type ShiftCtx } from "@/lib/matching";

export interface ShiftForMatching {
  id: string; unitId: string; kind: string; startsAt: Date; endsAt: Date;
  requirements: { id: string; label: string; count: number; functionKey: string | null; qualifications: { typeId: string }[] }[];
}

/** Baut die Kandidatenliste für einen Dienst: alle aktiven Helfer der Einheit und ihrer Untereinheiten, die der Planer sehen darf. */
export async function buildCandidates(ctx: Ctx | null, shift: ShiftForMatching, opts: { onlyHelperIds?: string[] } = {}) {
  const unit = (await loadUnits()).get(shift.unitId)!;
  const helperWhere: Prisma.HelperWhereInput = {
    status: "AKTIV",
    unit: { path: { startsWith: unit.path } },
    ...(opts.onlyHelperIds ? { id: { in: opts.onlyHelperIds } } : {}),
    ...(ctx ? (scopeWhere(ctx, "helper.view") as Prisma.HelperWhereInput) : {}),
  };
  const helpers = await prisma.helper.findMany({ where: helperWhere, include: { qualifications: true } });
  if (!helpers.length) return { candidates: [] as Candidate[], shiftCtx: null as ShiftCtx | null };
  const ids = helpers.map((h) => h.id);
  const covers = await loadCovers();
  const avail = await availabilityForShift(ids, shift.startsAt, shift.endsAt);

  const around = 4 * 86_400_000;
  const [busyRows, loadRows, monthRows, own] = await Promise.all([
    prisma.shiftAssignment.findMany({
      where: { helperId: { in: ids }, status: { in: ["BESTAETIGT", "EINGELADEN"] }, shiftId: { not: shift.id }, shift: { status: { in: ["OFFEN", "ENTWURF"] }, startsAt: { lt: new Date(shift.endsAt.getTime() + around) }, endsAt: { gt: new Date(shift.startsAt.getTime() - around) } } },
      select: { helperId: true, shift: { select: { startsAt: true, endsAt: true } } },
    }),
    prisma.shiftAssignment.findMany({
      where: { helperId: { in: ids }, status: "BESTAETIGT", shiftId: { not: shift.id }, shift: { status: { in: ["OFFEN", "ABGESCHLOSSEN"] }, startsAt: { gte: new Date(shift.startsAt.getTime() - 90 * 86_400_000), lte: new Date(shift.startsAt.getTime() + 30 * 86_400_000) } } },
      select: { helperId: true, shift: { select: { startsAt: true, endsAt: true } } },
    }),
    (async () => {
      const p = berlinParts(shift.startsAt);
      const from = startOfBerlinMonth(p.y, p.m), to = startOfBerlinMonth(p.m === 12 ? p.y + 1 : p.y, p.m === 12 ? 1 : p.m + 1);
      return prisma.shiftAssignment.groupBy({ by: ["helperId"], where: { helperId: { in: ids }, status: "BESTAETIGT", shiftId: { not: shift.id }, shift: { status: { in: ["OFFEN", "ABGESCHLOSSEN"] }, startsAt: { gte: from, lt: to } } }, _count: { _all: true } });
    })(),
    prisma.shiftAssignment.findMany({ where: { shiftId: shift.id, helperId: { in: ids } }, select: { helperId: true, status: true } }),
  ]);
  const busy = new Map<string, { startsAt: Date; endsAt: Date }[]>();
  for (const r of busyRows) (busy.get(r.helperId) ?? busy.set(r.helperId, []).get(r.helperId)!).push(r.shift);
  const load = new Map<string, number>();
  for (const r of loadRows) load.set(r.helperId, (load.get(r.helperId) ?? 0) + (r.shift.endsAt.getTime() - r.shift.startsAt.getTime()) / 3_600_000);
  const month = new Map(monthRows.map((m) => [m.helperId, m._count._all]));
  const ownBy = new Map(own.map((o) => [o.helperId, o.status]));

  const candidates: Candidate[] = helpers.map((h) => ({
    helperId: h.id,
    name: `${h.lastName}, ${h.firstName}`,
    unitId: h.unitId,
    active: h.status === "AKTIV",
    functions: h.functions,
    qualTypeIds: effectiveQualTypes(h.qualifications.map((q) => ({ typeId: q.typeId, validUntil: q.validUntil, status: q.status })), covers, shift.startsAt),
    availability: avail.get(h.id) ?? null,
    busy: busy.get(h.id) ?? [],
    confirmedThisMonth: month.get(h.id) ?? 0,
    load: load.get(h.id) ?? 0,
    maxShiftsPerMonth: h.maxShiftsPerMonth,
    minRestHours: h.minRestHours,
    preferredKinds: h.preferredKinds,
    preferredWeekdays: h.preferredWeekdays,
    requested: ownBy.get(h.id) === "ANGEFRAGT",
    alreadyOnShift: ownBy.get(h.id) === "BESTAETIGT" || ownBy.get(h.id) === "EINGELADEN",
  }));
  const avgLoad = candidates.reduce((s, c) => s + c.load, 0) / Math.max(candidates.length, 1);
  const shiftCtx: ShiftCtx = {
    unitId: shift.unitId, kind: shift.kind, startsAt: shift.startsAt, endsAt: shift.endsAt,
    weekday: berlinWeekday(shift.startsAt), avgLoad,
  };
  return { candidates, shiftCtx };
}

export const toRequirement = (r: ShiftForMatching["requirements"][number]): Requirement => ({
  id: r.id, label: r.label, count: r.count, functionKey: r.functionKey, qualTypeIds: r.qualifications.map((q) => q.typeId),
});

/** Einzelne Eignungsprüfung (für Zusagen/manuelle Einteilung): nutzt dieselbe Logik wie die Empfehlung. */
export async function evaluateHelperForRequirement(shift: ShiftForMatching, helperId: string, requirementId: string | null): Promise<Evaluation & { name: string }> {
  const { candidates, shiftCtx } = await buildCandidates(null, shift, { onlyHelperIds: [helperId] });
  const cand = candidates[0];
  if (!cand || !shiftCtx) {
    return { helperId, name: "", eligible: false, blockers: ["Helfer ist nicht aktiv oder gehört nicht zur Einheit des Dienstes"], warnings: [], reasons: [], score: 0, missingQualTypeIds: [], missingFunction: false };
  }
  const req = shift.requirements.find((r) => r.id === requirementId);
  const requirement: Requirement = req ? toRequirement(req) : { id: "-", label: "Allgemein", count: 1, functionKey: null, qualTypeIds: [] };
  // Kandidat ist bereits auf dem Dienst (z. B. ANGEFRAGT) → für Prüfung nicht als „bereits eingeteilt“ werten
  return { ...evaluate({ ...cand, alreadyOnShift: false }, requirement, shiftCtx), name: cand.name };
}

export interface Recommendation {
  requirements: { requirementId: string; label: string; needed: number; filled: number; candidates: (Evaluation & { name: string })[]; excluded: number }[];
  proposal: ProposalSlot[];
}

export async function recommend(ctx: Ctx, shift: ShiftForMatching, confirmedByReq: Record<string, number>): Promise<Recommendation> {
  const { candidates, shiftCtx } = await buildCandidates(ctx, shift);
  if (!shiftCtx) return { requirements: shift.requirements.map((r) => ({ requirementId: r.id, label: r.label, needed: r.count, filled: confirmedByReq[r.id] ?? 0, candidates: [], excluded: 0 })), proposal: [] };
  const reqs = shift.requirements.map(toRequirement);
  const proposal = proposeStaffing(candidates, reqs, shiftCtx, confirmedByReq);
  const requirements = reqs.map((r) => {
    const ranked = rankForRequirement(candidates, r, shiftCtx);
    const eligible = ranked.filter((e) => e.eligible);
    return { requirementId: r.id, label: r.label, needed: r.count, filled: confirmedByReq[r.id] ?? 0, candidates: eligible.slice(0, 15), excluded: ranked.length - eligible.length };
  });
  return { requirements, proposal };
}

export { canIn };
