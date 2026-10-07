import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { ZodError } from "zod";
import { scenario, mkAccountHelper } from "./fixtures";
import { prisma } from "../../src/server/db";
import { HttpError } from "../../src/server/errors";
import { createMapObject, deleteMapObject, getLagekarte, setMapView, updateMapObject } from "../../src/server/services/lagekarte";
import { createShift, publishShift, setShiftResources } from "../../src/server/services/shifts";

let S: Awaited<ReturnType<typeof scenario>>;
const rejects = (p: Promise<unknown>, status: number) => assert.rejects(p, (e: unknown) => e instanceof HttpError && e.status === status, `erwartet HTTP ${status}`);
const future = (days: number) => { const d = new Date(Date.now() + days * 86_400_000); d.setUTCHours(16, 0, 0, 0); return { startsAt: d.toISOString(), endsAt: new Date(d.getTime() + 6 * 3_600_000).toISOString() }; };
beforeEach(async () => { S = await scenario(); });

async function setup() {
  const planner = await mkAccountHelper(S.berA.id, "Paula", "Planerin", "DIENSTPLANER");
  const helper = await mkAccountHelper(S.berA.id, "Hans", "Helfer");
  const foreign = await mkAccountHelper(S.berB.id, "Fred", "Fremd");
  const shift = await createShift(planner.ctx, { unitId: S.berA.id, name: "Sanitätsdienst Stadtfest", kind: "SANITAETSDIENST", ...future(20) });
  return { planner, helper, foreign, shift };
}

test("Lagekarte gibt es nur für Sanitätsdienste; Entwürfe sind für Helfer unsichtbar", async () => {
  const { planner, helper, shift } = await setup();
  const other = await createShift(planner.ctx, { unitId: S.berA.id, name: "Bereitschaftsabend", kind: "BEREITSCHAFTSABEND", ...future(5) });
  await publishShift(planner.ctx, other.id);
  await rejects(getLagekarte(planner.ctx, other.id), 404);
  await rejects(getLagekarte(helper.ctx, shift.id), 404); // Entwurf
  await publishShift(planner.ctx, shift.id);
  const map = await getLagekarte(helper.ctx, shift.id);
  assert.equal(map.canEdit, false);
  assert.equal((await getLagekarte(planner.ctx, shift.id)).canEdit, true);
});

test("Bearbeiten nur mit Recht in der Einheit; Fremde sehen nichts", async () => {
  const { planner, helper, foreign, shift } = await setup();
  await publishShift(planner.ctx, shift.id);
  const o = await createMapObject(planner.ctx, shift.id, { kind: "MARKER", preset: "rtw", coords: [-48.1351, 11.582], label: "RTW 71/83-1" });
  assert.equal((await getLagekarte(helper.ctx, shift.id)).objects.length, 1);
  await rejects(createMapObject(helper.ctx, shift.id, { kind: "MARKER", preset: "aed", coords: [-48, 11] }), 403);
  await rejects(updateMapObject(helper.ctx, o.id, { label: "x" }), 403);
  await rejects(deleteMapObject(helper.ctx, o.id), 403);
  await rejects(getLagekarte(foreign.ctx, shift.id), 404);
  await rejects(createMapObject(foreign.ctx, shift.id, { kind: "MARKER", preset: "aed", coords: [-48, 11] }), 404);
  await rejects(deleteMapObject(foreign.ctx, o.id), 404);
  await rejects(setMapView(helper.ctx, shift.id, { lat: -48, lng: 11, zoom: 5 }), 403);
});

test("Eingaben werden streng validiert", async () => {
  const { planner, shift } = await setup();
  const bad = (x: unknown) => assert.rejects(createMapObject(planner.ctx, shift.id, x), ZodError);
  await bad({ kind: "MARKER", preset: "gibtsnicht", coords: [-48, 11] });
  await bad({ kind: "MARKER", preset: "rtw", coords: [1, 11] });
  await bad({ kind: "MARKER", preset: "rtw", coords: [-48, 257] });
  await bad({ kind: "MARKER", preset: "rtw", coords: ["48", 11] });
  await bad({ kind: "LINE", preset: "absperrung", coords: [[-48, 11]] });
  await bad({ kind: "AREA", preset: "veranstaltung", coords: [[-48, 11], [-48.1, 11.1]] });
  await bad({ kind: "AREA", preset: "rtw", coords: [[-48, 11], [-48.1, 11.1], [-48.2, 11]] });
  await bad({ kind: "LINE", preset: "zaun", coords: Array.from({ length: 401 }, (_, i) => [-48 - i / 10000, 11]) });
  await bad({ kind: "MARKER", preset: "rtw", coords: [-48, 11], color: "rot" });
  await bad({ kind: "MARKER", preset: "rtw", coords: [-48, 11], label: "x".repeat(81) });
  await bad({ kind: "NEU", preset: "rtw", coords: [-48, 11] });
  assert.equal(await prisma.mapObject.count(), 0);
  // Gültige Linien/Flächen/Texte
  await createMapObject(planner.ctx, shift.id, { kind: "LINE", preset: "rettungsweg", coords: [[-48, 11], [-48.001, 11.001]], label: "Zufahrt Nord" });
  await createMapObject(planner.ctx, shift.id, { kind: "AREA", preset: "gefahrenbereich", coords: [[-48, 11], [-48.1, 11.1], [-48.2, 11]], color: "#ff0000" });
  await createMapObject(planner.ctx, shift.id, { kind: "TEXT", coords: [-48, 11], label: "Bühne" });
  assert.equal(await prisma.mapObject.count(), 3);
});

test("Ändern, Verschieben, Löschen – Protokoll nur bei inhaltlichen Änderungen", async () => {
  const { planner, shift } = await setup();
  const o = await createMapObject(planner.ctx, shift.id, { kind: "MARKER", preset: "ktw", coords: [-48.1, 11.5], label: "KTW 1", note: "Notiz", color: "#00aa00" });
  const moved = await updateMapObject(planner.ctx, o.id, { coords: [-48.2, 11.6] });
  assert.deepEqual([moved.label, moved.note, moved.color], ["KTW 1", "Notiz", "#00aa00"], "Verschieben darf Beschriftung/Notiz/Farbe nicht löschen");
  assert.equal(await prisma.auditLog.count({ where: { action: "lagekarte.update", entityId: o.id } }), 0, "Verschieben wird nicht protokolliert");
  const u = await updateMapObject(planner.ctx, o.id, { label: "KTW 2", note: "Wartet am Haupteingang", preset: "rtw" });
  assert.deepEqual([u.label, u.preset, u.coords], ["KTW 2", "rtw", [-48.2, 11.6]]);
  const cleared = await updateMapObject(planner.ctx, o.id, { label: "", note: null });
  assert.deepEqual([cleared.label, cleared.note], [null, null], "leere Eingabe löscht die Beschriftung bewusst");
  assert.equal(cleared.preset, "rtw");
  await assert.rejects(updateMapObject(planner.ctx, o.id, { preset: "gibtsnicht" }), ZodError);
  await assert.rejects(updateMapObject(planner.ctx, o.id, { coords: [[-48, 11], [-48.1, 11.1]] }), ZodError, "Marker darf keine Linienkoordinaten bekommen");
  await deleteMapObject(planner.ctx, o.id);
  assert.equal(await prisma.mapObject.count(), 0);
  assert.equal(await prisma.auditLog.count({ where: { entityId: o.id, action: { in: ["lagekarte.add", "lagekarte.update", "lagekarte.delete"] } } }), 4, "Anlegen, 2 inhaltliche Änderungen, Löschen");
});

test("Gespeicherte Ansicht, Fahrzeuge des Dienstes, Obergrenze, Schreibschutz nach Abschluss", async () => {
  const { planner, helper, shift } = await setup();
  const rtw = await prisma.vehicle.create({ data: { unitId: S.berA.id, name: "RTW 1", callSign: "Rotkreuz 71/83-1", type: "RTW" } });
  await setShiftResources(planner.ctx, shift.id, { vehicleIds: [rtw.id] });
  await setMapView(planner.ctx, shift.id, { lat: -48.137, lng: 11.575, zoom: 5 });
  await assert.rejects(setMapView(planner.ctx, shift.id, { lat: -48, lng: 11, zoom: 99 }), ZodError);
  await publishShift(planner.ctx, shift.id);
  const map = await getLagekarte(helper.ctx, shift.id);
  assert.deepEqual(map.view, { lat: -48.137, lng: 11.575, zoom: 5 });
  assert.deepEqual(map.vehicles, [{ id: rtw.id, label: "Rotkreuz 71/83-1", preset: "rtw" }]);
  assert.ok(map.config.tileUrl.includes("{z}"));
  // Obergrenze
  await prisma.mapObject.createMany({ data: Array.from({ length: 400 }, () => ({ shiftId: shift.id, kind: "MARKER" as const, preset: "aed", coords: [-48, 11], createdById: planner.user.id })) });
  await rejects(createMapObject(planner.ctx, shift.id, { kind: "MARKER", preset: "aed", coords: [-48, 11] }), 409);
  // Abgeschlossen → schreibgeschützt (lesbar bleibt sie)
  await prisma.shift.update({ where: { id: shift.id }, data: { status: "ABGESCHLOSSEN" } });
  assert.equal((await getLagekarte(planner.ctx, shift.id)).canEdit, false);
  await rejects(createMapObject(planner.ctx, shift.id, { kind: "MARKER", preset: "aed", coords: [-48, 11] }), 409);
  // Löschen des Dienstes entfernt die Objekte (Kaskade)
  await prisma.shift.delete({ where: { id: shift.id } });
  assert.equal(await prisma.mapObject.count(), 0);
});
