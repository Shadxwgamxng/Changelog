import { TZ } from "./constants";

// Alle Zeiten liegen als UTC in der DB; Ein-/Ausgabe erfolgt in Europe/Berlin.

const partsFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
});

export interface Parts { y: number; m: number; d: number; h: number; mi: number; s: number }

export function berlinParts(date: Date): Parts {
  const o: Record<string, number> = {};
  for (const p of partsFmt.formatToParts(date)) if (p.type !== "literal") o[p.type] = Number(p.value);
  return { y: o.year, m: o.month, d: o.day, h: o.hour, mi: o.minute, s: o.second };
}

/** Versatz von Berlin gegenüber UTC in Minuten zum Zeitpunkt `date`. */
function offsetMinutes(date: Date): number {
  const p = berlinParts(date);
  return (Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(date.getTime() / 1000) * 1000) / 60000;
}

/** "2027-07-18T18:00" (Berliner Wandzeit) → UTC-Date. Berücksichtigt Sommer-/Winterzeit. */
export function parseBerlinLocal(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m.map(Number) as unknown as number[];
  const guess = Date.UTC(y, mo - 1, d, h, mi, s || 0);
  let utc = guess - offsetMinutes(new Date(guess)) * 60000;
  // Zweite Iteration fängt Zeitumstellungen ab
  utc = guess - offsetMinutes(new Date(utc)) * 60000;
  const out = new Date(utc);
  const p = berlinParts(out);
  if (p.y !== y || p.m !== mo || p.d !== d || p.h !== h || p.mi !== mi) return null; // nicht existierende Zeit (Lücke bei Umstellung)
  return out;
}

export function toBerlinInput(date: Date | null | undefined): string {
  if (!date) return "";
  const p = berlinParts(date);
  const z = (n: number) => String(n).padStart(2, "0");
  return `${p.y}-${z(p.m)}-${z(p.d)}T${z(p.h)}:${z(p.mi)}`;
}

/** "YYYY-MM-DD" → Date (UTC-Mitternacht), für @db.Date-Spalten. */
export function parseDateOnly(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCMonth() === +m[2] - 1 ? d : null;
}

export const toDateOnly = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");

export function berlinDateKey(date: Date): string {
  const p = berlinParts(date);
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

const f = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("de-DE", { timeZone: TZ, ...opts });
const fDate = f({ day: "2-digit", month: "2-digit", year: "numeric" });
const fDateShort = f({ day: "2-digit", month: "2-digit" });
const fTime = f({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const fWeekday = f({ weekday: "short" });
const fLong = f({ weekday: "long", day: "numeric", month: "long", year: "numeric" });

export const fmtDate = (d: Date) => fDate.format(d);
export const fmtDateShort = (d: Date) => fDateShort.format(d);
export const fmtTime = (d: Date) => fTime.format(d);
export const fmtDateTime = (d: Date) => `${fDate.format(d)} ${fTime.format(d)}`;
export const fmtWeekday = (d: Date) => fWeekday.format(d);
export const fmtLong = (d: Date) => fLong.format(d);

/** "18.07. · 18:00–02:00" bzw. mehrtägig "18.07. 18:00 – 19.07. 02:00" */
export function fmtRange(start: Date, end: Date): string {
  if (berlinDateKey(start) === berlinDateKey(end)) return `${fmtDateShort(start)} · ${fmtTime(start)}–${fmtTime(end)}`;
  const nextDay = berlinDateKey(new Date(start.getTime() + 86_400_000)) === berlinDateKey(end);
  if (nextDay && end.getTime() - start.getTime() <= 16 * 3_600_000) return `${fmtDateShort(start)} · ${fmtTime(start)}–${fmtTime(end)}`;
  return `${fmtDateShort(start)} ${fmtTime(start)} – ${fmtDateShort(end)} ${fmtTime(end)}`;
}

/** Berliner Wochentag: 0 = Sonntag … 6 = Samstag */
export function berlinWeekday(d: Date): number {
  const p = berlinParts(d);
  return new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay();
}

export const hoursBetween = (a: Date, b: Date) => Math.max(0, (b.getTime() - a.getTime()) / 3_600_000);
export const fmtHours = (minutes: number) => `${(minutes / 60).toLocaleString("de-DE", { maximumFractionDigits: 1 })} h`;

export function greeting(now = new Date()): string {
  const h = berlinParts(now).h;
  if (h < 5) return "Guten Abend";
  if (h < 11) return "Guten Morgen";
  if (h < 18) return "Guten Tag";
  return "Guten Abend";
}

export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

/** Tage von „heute“ (Berliner Datum) bis zum Datum `target` (UTC-Mitternacht, d. h. „reines Datum“). */
export function daysUntil(target: Date, now = new Date()): number {
  const p = berlinParts(now);
  const today = Date.UTC(p.y, p.m - 1, p.d);
  const t = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  return Math.round((t - today) / 86_400_000);
}

/** Anfang des Berliner Monats als UTC-Date. */
export function startOfBerlinMonth(y: number, m1: number): Date {
  return parseBerlinLocal(`${y}-${String(m1).padStart(2, "0")}-01T00:00`)!;
}
export function startOfBerlinDay(dateKey: string): Date {
  return parseBerlinLocal(`${dateKey}T00:00`)!;
}
