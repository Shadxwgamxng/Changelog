// iCalendar (RFC 5545) Erzeugung.

export interface IcsEvent {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string | null;
  location?: string | null;
  status?: "CONFIRMED" | "TENTATIVE" | "CANCELLED";
  categories?: string[];
  updatedAt?: Date;
}

const pad = (n: number) => String(n).padStart(2, "0");
export function icsDate(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

export function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Zeilenfaltung auf max. 75 Oktette (UTF-8-sicher). */
export function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = "", curLen = 0;
  for (const ch of line) {
    const l = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74;
    if (curLen + l > limit) { out.push(cur); cur = ch; curLen = l; }
    else { cur += ch; curLen += l; }
  }
  out.push(cur);
  return out.join("\r\n ");
}

export function buildIcs(name: string, events: IcsEvent[], now = new Date()): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//HYPAX//DRK Verwaltung//DE", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${icsEscape(name)}`, "X-WR-TIMEZONE:Europe/Berlin"];
  for (const e of events) {
    lines.push("BEGIN:VEVENT", `UID:${e.uid}`, `DTSTAMP:${icsDate(now)}`);
    if (e.updatedAt) lines.push(`LAST-MODIFIED:${icsDate(e.updatedAt)}`);
    lines.push(`DTSTART:${icsDate(e.start)}`, `DTEND:${icsDate(e.end)}`, `SUMMARY:${icsEscape(e.summary)}`);
    if (e.description) lines.push(`DESCRIPTION:${icsEscape(e.description)}`);
    if (e.location) lines.push(`LOCATION:${icsEscape(e.location)}`);
    if (e.status) lines.push(`STATUS:${e.status}`);
    if (e.categories?.length) lines.push(`CATEGORIES:${e.categories.map(icsEscape).join(",")}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
