// Lagekarte für Sanitätsdienste: Objekte (Symbole, Linien, Flächen, Texte) auf einer Karte, je Dienst gespeichert.
// Lesen: wer den Dienst sehen darf. Bearbeiten: shift.edit in der Einheit des Dienstes (solange der Dienst nicht beendet ist).
import type { MapObject, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db";
import { audit } from "../audit";
import { conflict, forbidden, notFound } from "../errors";
import { canIn, type Ctx } from "../context";
import { loadUnits } from "../units";
import { visibleWhere } from "./shifts";
import { AREA_STYLES, LINE_STYLES, MAP_MAX_ZOOM, MAP_SIZE, MAP_TILE_URL, MAX_OBJECTS, MAX_POINTS, isPreset, presetForVehicle } from "@/lib/lagekarte";

// Koordinaten im Kartensystem der Lagekarte (siehe lib/lagekarte.ts): lat 0…−256, lng 0…256
const lat = z.number().min(-MAP_SIZE).max(0), lng = z.number().min(0).max(MAP_SIZE);
const point = z.tuple([lat, lng]);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Farbe als #RRGGBB").nullable().optional();
const text = (max: number) => z.string().trim().max(max).nullable().optional().transform((v) => (v ? v : null));
/** Wie `text`, behält aber „nicht angegeben“ (undefined) bei – wichtig für Teil-Updates (Verschieben darf die Beschriftung nicht löschen). */
const textKeep = (max: number) => z.string().trim().max(max).nullable().optional().transform((v) => (v === undefined ? undefined : v ? v : null));

const base = { label: text(80), note: text(500), color };
export const objectInput = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("MARKER"), preset: z.string().refine(isPreset, "Unbekanntes Symbol"), coords: point, ...base }),
  z.object({ kind: z.literal("TEXT"), preset: z.literal("text").default("text"), coords: point, ...base }),
  z.object({ kind: z.literal("LINE"), preset: z.string().refine((p) => LINE_STYLES.some((s) => s.id === p), "Unbekannter Linienstil"), coords: z.array(point).min(2).max(MAX_POINTS), ...base }),
  z.object({ kind: z.literal("AREA"), preset: z.string().refine((p) => AREA_STYLES.some((s) => s.id === p), "Unbekannter Flächenstil"), coords: z.array(point).min(3).max(MAX_POINTS), ...base }),
]);
export type ObjectInput = z.infer<typeof objectInput>;

const patchInput = z.object({
  preset: z.string().max(40).optional(), coords: z.union([point, z.array(point).min(2).max(MAX_POINTS)]).optional(),
  label: textKeep(80), note: textKeep(500), color,
});

export interface MapObjectView { id: string; kind: MapObject["kind"]; preset: string; coords: unknown; label: string | null; note: string | null; color: string | null; updatedAt: Date }
const view = (o: MapObject): MapObjectView => ({ id: o.id, kind: o.kind, preset: o.preset, coords: o.coords, label: o.label, note: o.note, color: o.color, updatedAt: o.updatedAt });

async function loadShift(ctx: Ctx, shiftId: string) {
  const s = await prisma.shift.findFirst({
    where: { AND: [{ id: shiftId }, visibleWhere(ctx)] },
    include: { vehicles: { include: { vehicle: { select: { id: true, name: true, callSign: true, type: true } } } } },
  });
  if (!s) throw notFound("Dienst nicht gefunden.");
  if (s.kind !== "SANITAETSDIENST") throw notFound("Lagekarten gibt es nur für Sanitätsdienste.");
  const unit = (await loadUnits()).get(s.unitId)!;
  return { shift: s, canEdit: canIn(ctx, "shift.edit", unit) && (s.status === "ENTWURF" || s.status === "OFFEN") };
}

export async function getLagekarte(ctx: Ctx, shiftId: string) {
  const { shift: s, canEdit } = await loadShift(ctx, shiftId);
  const objects = await prisma.mapObject.findMany({ where: { shiftId }, orderBy: { createdAt: "asc" } });
  return {
    shiftId, name: s.name, unitId: s.unitId, status: s.status, location: s.location, meetingPoint: s.meetingPoint, canEdit,
    view: s.mapLat != null && s.mapLng != null ? { lat: s.mapLat, lng: s.mapLng, zoom: s.mapZoom ?? 16 } : null,
    vehicles: s.vehicles.map((v) => ({ id: v.vehicle.id, label: v.vehicle.callSign || v.vehicle.name, preset: presetForVehicle(v.vehicle.type, v.vehicle.name) })),
    objects: objects.map(view),
    config: { tileUrl: MAP_TILE_URL },
  };
}

async function editable(ctx: Ctx, shiftId: string) {
  const { shift, canEdit } = await loadShift(ctx, shiftId);
  if (!canEdit) throw canIn(ctx, "shift.view", (await loadUnits()).get(shift.unitId)!) && (shift.status === "ABGESCHLOSSEN" || shift.status === "ABGESAGT") ? conflict("Der Dienst ist beendet – die Lagekarte ist schreibgeschützt.") : forbidden();
  return shift;
}

export async function createMapObject(ctx: Ctx, shiftId: string, raw: unknown) {
  const input = objectInput.parse(raw);
  const shift = await editable(ctx, shiftId);
  if ((await prisma.mapObject.count({ where: { shiftId } })) >= MAX_OBJECTS) throw conflict(`Maximal ${MAX_OBJECTS} Objekte pro Lagekarte.`);
  const o = await prisma.mapObject.create({ data: { shiftId, kind: input.kind, preset: input.preset, coords: input.coords as Prisma.InputJsonValue, label: input.label ?? null, note: input.note ?? null, color: input.color ?? null, createdById: ctx.userId } });
  await audit(ctx, { action: "lagekarte.add", entityType: "MapObject", entityId: o.id, unitId: shift.unitId, summary: `Lagekarte „${shift.name}“: ${input.kind === "MARKER" ? "Symbol" : input.kind === "TEXT" ? "Text" : input.kind === "LINE" ? "Linie" : "Fläche"} „${input.preset}“${input.label ? ` (${input.label})` : ""} hinzugefügt` });
  return view(o);
}

export async function updateMapObject(ctx: Ctx, objectId: string, raw: unknown) {
  const patch = patchInput.parse(raw);
  const o = await prisma.mapObject.findUnique({ where: { id: objectId } });
  if (!o) throw notFound();
  const shift = await editable(ctx, o.shiftId).catch((e) => { throw (e as { status?: number }).status === 404 ? notFound() : e; });
  // Typ-Konsistenz prüfen
  const merged = { kind: o.kind, preset: patch.preset ?? o.preset, coords: patch.coords ?? (o.coords as unknown) };
  objectInput.parse({ ...merged, label: patch.label !== undefined ? patch.label : o.label, note: patch.note !== undefined ? patch.note : o.note, color: patch.color !== undefined ? patch.color : o.color });
  const data: Prisma.MapObjectUpdateInput = {};
  if (patch.preset !== undefined) data.preset = patch.preset;
  if (patch.coords !== undefined) data.coords = patch.coords as Prisma.InputJsonValue;
  if (patch.label !== undefined) data.label = patch.label ?? null;
  if (patch.note !== undefined) data.note = patch.note ?? null;
  if (patch.color !== undefined) data.color = patch.color ?? null;
  const u = await prisma.mapObject.update({ where: { id: objectId }, data });
  // Reine Verschiebungen werden nicht einzeln protokolliert (zu viel Rauschen), inhaltliche Änderungen schon.
  if (patch.preset !== undefined || patch.label !== undefined || patch.note !== undefined) {
    await audit(ctx, { action: "lagekarte.update", entityType: "MapObject", entityId: objectId, unitId: shift.unitId, summary: `Lagekarte „${shift.name}“: Objekt „${u.preset}“${u.label ? ` (${u.label})` : ""} geändert` });
  }
  return view(u);
}

export async function deleteMapObject(ctx: Ctx, objectId: string) {
  const o = await prisma.mapObject.findUnique({ where: { id: objectId } });
  if (!o) throw notFound();
  const shift = await editable(ctx, o.shiftId).catch((e) => { throw (e as { status?: number }).status === 404 ? notFound() : e; });
  await prisma.mapObject.delete({ where: { id: objectId } });
  await audit(ctx, { action: "lagekarte.delete", entityType: "MapObject", entityId: objectId, unitId: shift.unitId, summary: `Lagekarte „${shift.name}“: Objekt „${o.preset}“${o.label ? ` (${o.label})` : ""} entfernt` });
}

export async function setMapView(ctx: Ctx, shiftId: string, raw: unknown) {
  const v = z.object({ lat, lng, zoom: z.number().int().min(0).max(MAP_MAX_ZOOM) }).parse(raw);
  await editable(ctx, shiftId);
  await prisma.shift.update({ where: { id: shiftId }, data: { mapLat: v.lat, mapLng: v.lng, mapZoom: v.zoom } });
}
