// Globale Suche – jede Quelle läuft durch dieselben Sichtbarkeitsfilter wie die jeweilige Listenansicht.
import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { hasAnywhere, scopeWhere, visibleUnits, type Ctx } from "../context";
import { listHelpers } from "./helpers";
import { visibleWhere } from "./shifts";
import { documentVisibility } from "./documents";
import { listQualTypes } from "./qualifications";
import { fmtRange } from "@/lib/dates";
import { SHIFT_KIND_LABEL } from "@/lib/constants";

export interface SearchHit { type: "Helfer" | "Dienst" | "Veranstaltung" | "Fahrzeug" | "Material" | "Qualifikation" | "Dokument" | "Einheit"; id: string; title: string; subtitle?: string; link: string }

export async function globalSearch(ctx: Ctx, raw: string, limit = 6): Promise<SearchHit[]> {
  const q = raw.trim().slice(0, 80);
  if (q.length < 2) return [];
  const contains = { contains: q, mode: "insensitive" as const };
  const [helpers, shifts, events, vehicles, materials, docs, quals, units] = await Promise.all([
    listHelpers(ctx, { q, pageSize: limit, status: "ALLE" }),
    prisma.shift.findMany({ where: { AND: [visibleWhere(ctx), { OR: [{ name: contains }, { location: contains }, { description: contains }] }] }, take: limit, orderBy: { startsAt: "desc" }, include: { unit: { select: { name: true } } } }),
    hasAnywhere(ctx, "event.view") ? prisma.event.findMany({ where: { AND: [scopeWhere(ctx, "event.view") as Prisma.EventWhereInput, { OR: [{ name: contains }, { location: contains }] }] }, take: limit, orderBy: { startsAt: "desc" } }) : [],
    hasAnywhere(ctx, "vehicle.view") ? prisma.vehicle.findMany({ where: { AND: [scopeWhere(ctx, "vehicle.view") as Prisma.VehicleWhereInput, { OR: [{ name: contains }, { callSign: contains }, { plate: contains }] }] }, take: limit }) : [],
    hasAnywhere(ctx, "material.view") ? prisma.materialItem.findMany({ where: { AND: [scopeWhere(ctx, "material.view") as Prisma.MaterialItemWhereInput, { OR: [{ name: contains }, { category: contains }, { serialNumber: contains }] }] }, take: limit }) : [],
    prisma.document.findMany({ where: { AND: [documentVisibility(ctx), { title: contains }] }, take: limit, orderBy: { createdAt: "desc" } }),
    listQualTypes(ctx),
    visibleUnits(ctx),
  ]);
  const ql = q.toLowerCase();
  return [
    ...helpers.items.slice(0, limit).map((h): SearchHit => ({ type: "Helfer", id: h.id, title: `${h.firstName} ${h.lastName}`, subtitle: h.unitName, link: `/helpers/${h.id}` })),
    ...shifts.map((s): SearchHit => ({ type: "Dienst", id: s.id, title: s.name, subtitle: `${SHIFT_KIND_LABEL[s.kind]} · ${fmtRange(s.startsAt, s.endsAt)} · ${s.unit.name}`, link: `/shifts/${s.id}` })),
    ...events.map((e): SearchHit => ({ type: "Veranstaltung", id: e.id, title: e.name, subtitle: fmtRange(e.startsAt, e.endsAt), link: `/events/${e.id}` })),
    ...vehicles.map((v): SearchHit => ({ type: "Fahrzeug", id: v.id, title: v.name, subtitle: [v.callSign, v.plate].filter(Boolean).join(" · "), link: `/vehicles/${v.id}` })),
    ...materials.map((m): SearchHit => ({ type: "Material", id: m.id, title: m.name, subtitle: m.category ?? undefined, link: `/materials/${m.id}` })),
    ...quals.filter((t) => t.name.toLowerCase().includes(ql)).slice(0, limit).map((t): SearchHit => ({ type: "Qualifikation", id: t.id, title: t.name, subtitle: `${t.holders} Inhaber`, link: `/qualifications?type=${t.id}` })),
    ...docs.map((d): SearchHit => ({ type: "Dokument", id: d.id, title: d.title, link: `/documents/${d.id}` })),
    ...units.filter((u) => u.name.toLowerCase().includes(ql)).slice(0, limit).map((u): SearchHit => ({ type: "Einheit", id: u.id, title: u.name, link: `/admin/units` })),
  ];
}
