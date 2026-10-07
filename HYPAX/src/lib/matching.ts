// Intelligente Dienstbesetzung: harte Ausschlusskriterien + gewichtete Passung (0–100 %).
// Reine Funktionen – die Datenbeschaffung passiert im Service (src/server/services/matching.ts).

export type Avail = "VERFUEGBAR" | "EINGESCHRAENKT" | "NICHT_VERFUEGBAR" | null;

export interface Interval { startsAt: Date; endsAt: Date }

export interface Candidate {
  helperId: string;
  name: string;
  unitId: string;
  active: boolean; // Helferstatus AKTIV
  functions: string[];
  /** effektive Qualifikationsarten zum Dienstbeginn (inkl. „deckt ab“) */
  qualTypeIds: Set<string>;
  /** schlechtester Verfügbarkeitsstatus über den Dienstzeitraum; null = keine Angabe */
  availability: Avail;
  /** bereits bestätigte (oder eingeladene) andere Dienste */
  busy: Interval[];
  confirmedThisMonth: number;
  /** Belastung = bestätigte Dienststunden der letzten 90 Tage + kommende 30 Tage */
  load: number;
  maxShiftsPerMonth: number | null;
  minRestHours: number;
  preferredKinds: string[];
  preferredWeekdays: number[]; // 0=So … 6=Sa (Berliner Wochentag)
  requested: boolean; // hat sich selbst gemeldet
  alreadyOnShift: boolean;
}

export interface ShiftCtx {
  unitId: string;
  kind: string;
  startsAt: Date;
  endsAt: Date;
  weekday: number;
  /** Durchschnittliche Belastung des Kandidatenpools */
  avgLoad: number;
}

export interface Requirement {
  id: string;
  label: string;
  count: number;
  functionKey: string | null;
  qualTypeIds: string[];
}

export interface Evaluation {
  helperId: string;
  eligible: boolean;
  /** Harte Verstöße (Empfehlung schließt aus; manuelle Zuteilung nur mit Override) */
  blockers: string[];
  /** Weiche Hinweise */
  warnings: string[];
  /** Gründe für die Passung (zur Anzeige) */
  reasons: string[];
  score: number; // 0–100, gerundet
  missingQualTypeIds: string[];
  missingFunction: boolean;
}

const HOUR = 3_600_000;

/** Kürzester Abstand (Stunden) zwischen dem Dienst und einem anderen Intervall; negativ = Überschneidung. */
export function gapHours(a: Interval, b: Interval): number {
  if (a.startsAt < b.endsAt && b.startsAt < a.endsAt) return -1;
  return a.startsAt >= b.endsAt ? (a.startsAt.getTime() - b.endsAt.getTime()) / HOUR : (b.startsAt.getTime() - a.endsAt.getTime()) / HOUR;
}

export function evaluate(c: Candidate, req: Requirement, shift: ShiftCtx): Evaluation {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const reasons: string[] = [];

  if (!c.active) blockers.push("Helfer ist nicht aktiv");
  if (c.alreadyOnShift) blockers.push("Bereits in diesem Dienst eingeteilt");

  const missingQualTypeIds = req.qualTypeIds.filter((t) => !c.qualTypeIds.has(t));
  if (missingQualTypeIds.length) blockers.push("Erforderliche Qualifikation fehlt oder ist zum Dienstzeitpunkt abgelaufen");
  const missingFunction = !!req.functionKey && !c.functions.includes(req.functionKey);
  if (missingFunction) blockers.push("Erforderliche Funktion fehlt");

  if (c.availability === "NICHT_VERFUEGBAR") blockers.push("Als nicht verfügbar eingetragen");

  const me: Interval = { startsAt: shift.startsAt, endsAt: shift.endsAt };
  let minGap = Infinity;
  for (const b of c.busy) {
    const g = gapHours(me, b);
    if (g < 0) {
      blockers.push("Überschneidung mit einem anderen Dienst");
      minGap = -1;
      break;
    }
    minGap = Math.min(minGap, g);
  }
  if (minGap >= 0 && minGap < c.minRestHours) blockers.push(`Ruhezeit unterschritten (${Math.floor(minGap)} h < ${c.minRestHours} h)`);
  if (c.maxShiftsPerMonth != null && c.confirmedThisMonth >= c.maxShiftsPerMonth) {
    blockers.push(`Maximale Dienstanzahl pro Monat erreicht (${c.maxShiftsPerMonth})`);
  }

  // ── Score ──
  let score = 0;

  // Verfügbarkeit (30)
  if (c.availability === "VERFUEGBAR") { score += 30; reasons.push("Verfügbar"); }
  else if (c.availability === "EINGESCHRAENKT") { score += 14; warnings.push("Nur eingeschränkt verfügbar"); }
  else if (c.availability === null) { score += 18; warnings.push("Keine Verfügbarkeitsangabe"); }

  // Faire Lastverteilung (20)
  const ref = Math.max(shift.avgLoad, 1);
  const loadFactor = 1 - Math.min(1, c.load / (ref * 2));
  score += 20 * loadFactor;
  if (loadFactor >= 0.75) reasons.push("Geringe bisherige Dienstbelastung");
  else if (loadFactor <= 0.25) warnings.push("Überdurchschnittliche Dienstbelastung");

  // Ruhezeit-Puffer (10)
  if (minGap === Infinity || minGap >= c.minRestHours * 2) score += 10;
  else if (minGap >= c.minRestHours) score += 5 + (5 * (minGap - c.minRestHours)) / Math.max(c.minRestHours, 1);

  // Wunschzeiten / Präferenzen (15)
  const hasKindPref = c.preferredKinds.length > 0, hasDayPref = c.preferredWeekdays.length > 0;
  let pref = 0;
  pref += hasKindPref ? (c.preferredKinds.includes(shift.kind) ? 8 : 0) : 5;
  pref += hasDayPref ? (c.preferredWeekdays.includes(shift.weekday) ? 7 : 0) : 5;
  score += Math.min(15, pref);
  if ((hasKindPref && c.preferredKinds.includes(shift.kind)) || (hasDayPref && c.preferredWeekdays.includes(shift.weekday))) reasons.push("Passt zu den Wunschzeiten");

  // Selbstmeldung (15)
  if (c.requested) { score += 15; reasons.push("Hat sich selbst gemeldet"); }

  // Heimateinheit (10)
  if (c.unitId === shift.unitId) { score += 10; reasons.push("Gehört zur veranstaltenden Einheit"); }
  else warnings.push("Gehört einer anderen Einheit an");

  if (req.qualTypeIds.length) reasons.push("Erfüllt alle Qualifikationsanforderungen");

  const eligible = blockers.length === 0;
  return {
    helperId: c.helperId, eligible, blockers, warnings, reasons,
    score: eligible ? Math.round(Math.min(100, score)) : Math.min(Math.round(score), 49),
    missingQualTypeIds, missingFunction,
  };
}

export interface RankedCandidate extends Evaluation { name: string }

export function rankForRequirement(cands: Candidate[], req: Requirement, shift: ShiftCtx): RankedCandidate[] {
  return cands
    .map((c) => ({ ...evaluate(c, req, shift), name: c.name }))
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score || a.name.localeCompare(b.name, "de"));
}

export interface ProposalSlot { requirementId: string; label: string; needed: number; filled: RankedCandidate[]; unfilled: number }

/**
 * „Beste Besetzung“: Positionen mit den wenigsten geeigneten Kandidaten zuerst (knappste Ressource),
 * Helfer werden höchstens einer Position zugeteilt. `alreadyFilled` = bereits bestätigte Plätze je Position.
 */
export function proposeStaffing(
  cands: Candidate[],
  reqs: Requirement[],
  shift: ShiftCtx,
  alreadyFilled: Record<string, number> = {},
): ProposalSlot[] {
  const open = reqs
    .map((r) => ({ r, need: Math.max(0, r.count - (alreadyFilled[r.id] ?? 0)) }))
    .filter((x) => x.need > 0);
  const pool = new Map(cands.map((c) => [c.helperId, c]));
  const eligibleCount = new Map(open.map(({ r }) => [r.id, rankForRequirement(cands, r, shift).filter((e) => e.eligible).length]));
  open.sort((a, b) => (eligibleCount.get(a.r.id)! / a.need) - (eligibleCount.get(b.r.id)! / b.need));

  const taken = new Set<string>();
  const result: ProposalSlot[] = [];
  for (const { r, need } of open) {
    const ranked = rankForRequirement([...pool.values()].filter((c) => !taken.has(c.helperId)), r, shift).filter((e) => e.eligible);
    const filled = ranked.slice(0, need);
    filled.forEach((f) => taken.add(f.helperId));
    result.push({ requirementId: r.id, label: r.label, needed: need, filled, unfilled: need - filled.length });
  }
  const order = new Map(reqs.map((r, i) => [r.id, i]));
  return result.sort((a, b) => order.get(a.requirementId)! - order.get(b.requirementId)!);
}
