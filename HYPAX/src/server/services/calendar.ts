import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { canIn, hasAnywhere, scopeWhere, type Ctx } from "../context";
import { loadUnits } from "../units";
import { loadCtx } from "../context";
import { visibleWhere } from "./shifts";
import { buildIcs, type IcsEvent } from "@/lib/ics";
import { SHIFT_KIND_LABEL } from "@/lib/constants";
import { parseDateOnly } from "@/lib/dates";

export const CALENDAR_TYPES = ["DIENST", "VERANSTALTUNG", "AUSBILDUNG", "BESPRECHUNG", "FAHRZEUG", "MATERIAL"] as const;
export type CalendarType = (typeof CALENDAR_TYPES)[number];
export const CALENDAR_TYPE_LABEL: Record<CalendarType, string> = { DIENST: "Dienste", VERANSTALTUNG: "Veranstaltungen", AUSBILDUNG: "Ausbildung", BESPRECHUNG: "Besprechungen", FAHRZEUG: "Fahrzeuge", MATERIAL: "Material" };

export interface CalendarEntry {
  id: string; type: CalendarType; title: string; start: Date; end: Date; allDay: boolean; unitName?: string; link: string;
  status?: string; mine?: boolean; subtitle?: string; location?: string | null;
}

export interface CalendarQuery { from: Date; to: Date; types?: CalendarType[]; unitId?: string; mine?: boolean }

const kindToType = (k: string): CalendarType => (k === "AUSBILDUNG" ? "AUSBILDUNG" : k === "BESPRECHUNG" ? "BESPRECHUNG" : "DIENST");

export async function calendarEntries(ctx: Ctx, q: CalendarQuery): Promise<CalendarEntry[]> {
  const types = new Set(q.types?.length ? q.types : CALENDAR_TYPES);
  const units = await loadUnits();
  const unitFilter = q.unitId && units.get(q.unitId) ? { unit: { path: { startsWith: units.get(q.unitId)!.path } } } : {};
  const out: CalendarEntry[] = [];
  const dutyTypes: CalendarType[] = ["DIENST", "AUSBILDUNG", "BESPRECHUNG"];

  if (dutyTypes.some((t) => types.has(t))) {
    const shifts = await prisma.shift.findMany({
      where: { AND: [visibleWhere(ctx), { startsAt: { lte: q.to }, endsAt: { gte: q.from } }, unitFilter, q.mine ? { assignments: { some: { helperId: ctx.helperId ?? "-", status: { in: ["BESTAETIGT", "EINGELADEN", "ANGEFRAGT"] } } } } : {}] },
      include: { unit: { select: { name: true } }, assignments: { where: { helperId: ctx.helperId ?? "-" }, select: { status: true } }, requirements: { select: { count: true } } },
      orderBy: { startsAt: "asc" }, take: 1000,
    });
    for (const s of shifts) {
      const type = kindToType(s.kind);
      if (!types.has(type)) continue;
      out.push({ id: `shift:${s.id}`, type, title: s.name, start: s.startsAt, end: s.endsAt, allDay: false, unitName: s.unit.name, link: `/shifts/${s.id}`, status: s.status === "ABGESAGT" ? "ABGESAGT" : s.status === "ENTWURF" ? "ENTWURF" : s.assignments[0]?.status, mine: s.assignments[0]?.status === "BESTAETIGT", subtitle: SHIFT_KIND_LABEL[s.kind], location: s.location });
    }
  }
  if (types.has("VERANSTALTUNG") && hasAnywhere(ctx, "event.view") && !q.mine) {
    const events = await prisma.event.findMany({ where: { AND: [scopeWhere(ctx, "event.view") as Prisma.EventWhereInput, { startsAt: { lte: q.to }, endsAt: { gte: q.from } }, unitFilter] }, include: { unit: { select: { name: true } } }, take: 500 });
    for (const e of events) out.push({ id: `event:${e.id}`, type: "VERANSTALTUNG", title: e.name, start: e.startsAt, end: e.endsAt, allDay: false, unitName: e.unit.name, link: `/events/${e.id}`, status: e.cancelled ? "ABGESAGT" : undefined, subtitle: "Veranstaltung", location: e.location });
  }
  if (types.has("FAHRZEUG") && hasAnywhere(ctx, "vehicle.view") && !q.mine) {
    const from = parseDateOnly(q.from.toISOString().slice(0, 10))!, to = parseDateOnly(q.to.toISOString().slice(0, 10))!;
    const vs = await prisma.vehicle.findMany({ where: { AND: [scopeWhere(ctx, "vehicle.view") as Prisma.VehicleWhereInput, unitFilter, { OR: [{ tuvDue: { gte: from, lte: to } }, { huDue: { gte: from, lte: to } }, { insuranceDue: { gte: from, lte: to } }] }] }, include: { unit: { select: { name: true } } } });
    for (const v of vs) for (const [label, d] of [["TÜV", v.tuvDue], ["HU", v.huDue], ["Versicherung", v.insuranceDue]] as const) if (d && d >= from && d <= to) out.push({ id: `veh:${v.id}:${label}`, type: "FAHRZEUG", title: `${label} fällig: ${v.name}`, start: d, end: d, allDay: true, unitName: v.unit.name, link: `/vehicles/${v.id}`, subtitle: "Fahrzeug" });
  }
  if (types.has("MATERIAL") && hasAnywhere(ctx, "material.view") && !q.mine) {
    const from = parseDateOnly(q.from.toISOString().slice(0, 10))!, to = parseDateOnly(q.to.toISOString().slice(0, 10))!;
    const ms = await prisma.materialItem.findMany({ where: { AND: [scopeWhere(ctx, "material.view") as Prisma.MaterialItemWhereInput, unitFilter, { OR: [{ maintenanceDue: { gte: from, lte: to } }, { expiresAt: { gte: from, lte: to } }] }] }, include: { unit: { select: { name: true } } } });
    for (const m of ms) for (const [label, d] of [["Wartung", m.maintenanceDue], ["Ablauf", m.expiresAt]] as const) if (d && d >= from && d <= to) out.push({ id: `mat:${m.id}:${label}`, type: "MATERIAL", title: `${label}: ${m.name}`, start: d, end: d, allDay: true, unitName: m.unit.name, link: `/materials/${m.id}`, subtitle: "Material" });
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** ICS für die aktuell gefilterte Ansicht (authentifiziert). */
export async function exportCalendarIcs(ctx: Ctx, q: CalendarQuery) {
  const entries = (await calendarEntries(ctx, q)).filter((e) => !e.allDay || e.type === "FAHRZEUG" || e.type === "MATERIAL");
  const events: IcsEvent[] = entries.map((e) => ({
    uid: `${e.id}@hypax`, start: e.allDay ? e.start : e.start, end: e.allDay ? new Date(e.end.getTime() + 3_600_000) : e.end,
    summary: e.title, location: e.location ?? undefined, description: [e.subtitle, e.unitName].filter(Boolean).join(" · "),
    status: e.status === "ABGESAGT" ? "CANCELLED" : e.status === "ANGEFRAGT" || e.status === "EINGELADEN" ? "TENTATIVE" : "CONFIRMED", categories: [CALENDAR_TYPE_LABEL[e.type]],
  }));
  return buildIcs("HelferNet Kalender", events);
}

/** Persönlicher Abo-Feed (Token statt Login) – enthält nur eigene Dienste und Veranstaltungen der eigenen Einheit. */
export async function personalIcsByToken(token: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const user = await prisma.user.findUnique({ where: { icalToken: token } });
  if (!user || !user.active) return null;
  const ctx = await loadCtx(user.id);
  const from = new Date(Date.now() - 30 * 86_400_000), to = new Date(Date.now() + 400 * 86_400_000);
  const shifts = ctx.helperId
    ? await prisma.shiftAssignment.findMany({ where: { helperId: ctx.helperId, status: { in: ["BESTAETIGT", "EINGELADEN", "ANGEFRAGT"] }, shift: { startsAt: { gte: from, lte: to }, status: { in: ["OFFEN", "ABGESCHLOSSEN", "ABGESAGT"] } } }, include: { shift: true } })
    : [];
  const events: IcsEvent[] = shifts.map((a) => ({
    uid: `shift:${a.shiftId}@hypax`, start: a.shift.startsAt, end: a.shift.endsAt, summary: a.shift.name, location: [a.shift.meetingPoint && `Treffpunkt: ${a.shift.meetingPoint}`, a.shift.location].filter(Boolean).join(" · ") || undefined,
    description: `${SHIFT_KIND_LABEL[a.shift.kind]}${a.status !== "BESTAETIGT" ? ` (${a.status === "EINGELADEN" ? "Einladung" : "Anfrage"})` : ""}`,
    status: a.shift.status === "ABGESAGT" ? "CANCELLED" : a.status === "BESTAETIGT" ? "CONFIRMED" : "TENTATIVE", updatedAt: a.shift.updatedAt, categories: ["Dienst"],
  }));
  if (hasAnywhere(ctx, "event.view")) {
    const evs = await prisma.event.findMany({ where: { AND: [scopeWhere(ctx, "event.view") as Prisma.EventWhereInput, { startsAt: { gte: from, lte: to } }] }, take: 300 });
    for (const e of evs) events.push({ uid: `event:${e.id}@hypax`, start: e.startsAt, end: e.endsAt, summary: e.name, location: e.location ?? undefined, status: e.cancelled ? "CANCELLED" : "CONFIRMED", categories: ["Veranstaltung"], updatedAt: e.updatedAt });
  }
  return buildIcs("HelferNet – Meine Dienste", events);
}

export { canIn };
