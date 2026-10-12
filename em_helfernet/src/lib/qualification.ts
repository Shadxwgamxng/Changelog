// Reine Logik rund um Qualifikationen: Ablaufstatus, Gültigkeit zum Dienstzeitpunkt, „deckt ab“-Beziehungen.
import { EXPIRING_SOON_DAYS } from "./constants";
import { daysUntil } from "./dates";

export type QualState = "GUELTIG" | "LAEUFT_AB" | "ABGELAUFEN" | "WIDERRUFEN" | "IN_PRUEFUNG";

export interface QualLike {
  typeId: string;
  validUntil: Date | null;
  status: "GUELTIG" | "IN_PRUEFUNG" | "WIDERRUFEN";
}

export function addMonthsUTC(date: Date, months: number): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
}

/** Ablaufdatum: explizit angegeben, sonst Ausstellungsdatum + Gültigkeitsdauer, sonst unbegrenzt (null). */
export function computeValidUntil(issuedAt: Date | null, validityMonths: number | null, explicit?: Date | null): Date | null {
  if (explicit) return explicit;
  if (issuedAt && validityMonths) return addMonthsUTC(issuedAt, validityMonths);
  return null;
}

export function qualState(q: Pick<QualLike, "validUntil" | "status">, now = new Date()): QualState {
  if (q.status === "WIDERRUFEN") return "WIDERRUFEN";
  if (q.status === "IN_PRUEFUNG") return "IN_PRUEFUNG";
  if (!q.validUntil) return "GUELTIG";
  const left = daysUntil(q.validUntil, now);
  if (left < 0) return "ABGELAUFEN";
  if (left <= EXPIRING_SOON_DAYS) return "LAEUFT_AB";
  return "GUELTIG";
}

export const QUAL_STATE_LABEL: Record<QualState, string> = {
  GUELTIG: "Gültig",
  LAEUFT_AB: "Läuft bald ab",
  ABGELAUFEN: "Abgelaufen",
  WIDERRUFEN: "Widerrufen",
  IN_PRUEFUNG: "In Prüfung",
};

/** Gilt die Qualifikation zum Zeitpunkt `at` (z. B. Dienstbeginn)? Abgelaufen vor `at` zählt nicht. */
export function isValidAt(q: Pick<QualLike, "validUntil" | "status">, at: Date): boolean {
  if (q.status !== "GUELTIG") return false;
  if (!q.validUntil) return true;
  // gültig bis einschließlich dem Ablaufdatum
  return q.validUntil.getTime() + 86_400_000 > at.getTime();
}

/** covers: typeId → Typen, die dieser Typ zusätzlich abdeckt (transitiv aufgelöst). */
export function resolveCovers(direct: Map<string, string[]>): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const visit = (id: string, seen: Set<string>): Set<string> => {
    if (out.has(id)) return out.get(id)!;
    const acc = new Set<string>([id]);
    if (seen.has(id)) return acc;
    seen.add(id);
    for (const c of direct.get(id) ?? []) for (const x of visit(c, seen)) acc.add(x);
    seen.delete(id);
    out.set(id, acc);
    return acc;
  };
  for (const id of direct.keys()) visit(id, new Set());
  return out;
}

/** Menge aller Qualifikationsarten, die ein Helfer zum Zeitpunkt `at` effektiv nachweisen kann (inkl. abgedeckter). */
export function effectiveQualTypes(quals: QualLike[], covers: Map<string, Set<string>>, at: Date): Set<string> {
  const result = new Set<string>();
  for (const q of quals) {
    if (!isValidAt(q, at)) continue;
    const cov = covers.get(q.typeId);
    if (cov) for (const t of cov) result.add(t);
    else result.add(q.typeId);
  }
  return result;
}

export function missingTypes(required: string[], held: Set<string>): string[] {
  return required.filter((t) => !held.has(t));
}
