import { env } from "./env";

/** Alle Datumswerte liegen als UTC in der DB; Anzeige und Eingabe erfolgen in APP_TIMEZONE (Standard Europe/Berlin). */

const DAY = 86_400_000;

function partsIn(date: Date, tz: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) map[p.type] = p.value;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function offsetMs(date: Date, tz: string) {
  const p = partsIn(date, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** "2026-05-15T09:30" (Ortszeit in tz) → UTC-Date. */
export function localToDate(local: string, tz = env.timezone): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/.exec(local.trim());
  if (!m) return null;
  const [, y, mo, d, h = "0", mi = "0"] = m;
  const naive = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
  let ts = naive - offsetMs(new Date(naive), tz);
  ts = naive - offsetMs(new Date(ts), tz); // zweiter Durchlauf an DST-Grenzen
  const result = new Date(ts);
  return Number.isNaN(result.getTime()) ? null : result;
}

/** UTC-Date → Wert für <input type="datetime-local"> in tz. */
export function dateToLocalInput(date: Date | null | undefined, tz = env.timezone): string {
  if (!date) return "";
  const p = partsIn(date, tz);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

export function dateToDateInput(date: Date | null | undefined, tz = env.timezone): string {
  return dateToLocalInput(date, tz).slice(0, 10);
}

export function dayKey(date: Date, tz = env.timezone): string {
  return dateToLocalInput(date, tz).slice(0, 10);
}

/** Beginn (00:00 Ortszeit) des Tages von `date` als UTC-Date. */
export function startOfDay(date: Date, tz = env.timezone): Date {
  return localToDate(`${dayKey(date, tz)}T00:00`, tz)!;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY);
}

/** Ganze Tage zwischen den Kalendertagen (Ortszeit) von a und b. */
export function daysBetween(a: Date, b: Date, tz = env.timezone): number {
  const ka = Date.parse(dayKey(a, tz) + "T00:00:00Z");
  const kb = Date.parse(dayKey(b, tz) + "T00:00:00Z");
  return Math.round((kb - ka) / DAY);
}

export function fmtDate(date: Date | null | undefined, tz = env.timezone) {
  if (!date) return "–";
  return new Intl.DateTimeFormat("de-DE", { timeZone: tz, day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export function fmtDateLong(date: Date | null | undefined, tz = env.timezone) {
  if (!date) return "–";
  return new Intl.DateTimeFormat("de-DE", { timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
}

export function fmtTime(date: Date | null | undefined, tz = env.timezone) {
  if (!date) return "–";
  return new Intl.DateTimeFormat("de-DE", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(date) + " Uhr";
}

export function fmtDateTime(date: Date | null | undefined, tz = env.timezone) {
  if (!date) return "–";
  return `${fmtDate(date, tz)}, ${fmtTime(date, tz)}`;
}

export function fmtMonthYear(date: Date, tz = env.timezone) {
  return new Intl.DateTimeFormat("de-DE", { timeZone: tz, month: "long", year: "numeric" }).format(date);
}

export function fmtShortDay(date: Date, tz = env.timezone) {
  const f = new Intl.DateTimeFormat("de-DE", { timeZone: tz, weekday: "short", day: "2-digit", month: "short" });
  return f.format(date);
}

export function fmtRelative(date: Date, now = new Date()) {
  const diff = date.getTime() - now.getTime();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("de-DE", { numeric: "auto" });
  if (abs < 60_000) return "gerade eben";
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), "minute");
  if (abs < DAY) return rtf.format(Math.round(diff / 3_600_000), "hour");
  if (abs < 30 * DAY) return rtf.format(Math.round(diff / DAY), "day");
  return fmtDate(date);
}

export function fmtEuro(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return "–";
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}
