import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { scenario, mkAccountHelper, mkQual } from "./fixtures";
import { prisma } from "../../src/server/db";
import { HttpError } from "../../src/server/errors";
import { applyRecommendation, assignHelper, cancelShift, completeShift, createShift, decideAssignment, getRecommendation, getShift, listShifts, publishShift, removeFromShift, respondToInvitation, setShiftResources, signUpForShift, updateMySignup, updateShift, withdrawFromShift, getEventSignup } from "../../src/server/services/shifts";
import { setAvailability } from "../../src/server/services/availability";
import { expiringQualifications } from "../../src/server/services/qualifications";

let S: Awaited<ReturnType<typeof scenario>>;
const rejects = (p: Promise<unknown>, status: number, re?: RegExp) =>
  assert.rejects(p, (e: unknown) => e instanceof HttpError && e.status === status && (!re || re.test(e.message)), `erwartet HTTP ${status}${re ? " " + re : ""}`);

const future = (days: number, hour = 18, len = 8) => {
  const d = new Date(Date.now() + days * 86_400_000);
  d.setUTCHours(hour, 0, 0, 0);
  return { startsAt: d.toISOString(), endsAt: new Date(d.getTime() + len * 3_600_000).toISOString() };
};
const id = (name: string) => S.qt.get(name)!;

beforeEach(async () => { S = await scenario(); });

async function crew() {
  const planner = await mkAccountHelper(S.berA.id, "Paula", "Planerin", "DIENSTPLANER");
  const sh1 = await mkAccountHelper(S.berA.id, "Sven", "Sani");
  const sh2 = await mkAccountHelper(S.berA.id, "Sara", "Sani");
  const rs = await mkAccountHelper(S.berA.id, "Rita", "Retter");
  const driver = await mkAccountHelper(S.berA.id, "Dirk", "Fahrer", "HELFER", { functions: ["HELFER", "FAHRER"] });
  const none = await mkAccountHelper(S.berA.id, "Nico", "Nichts");
  const future1 = new Date(Date.now() + 400 * 86_400_000);
  await mkQual(sh1.helper.id, id("Sanitätshelfer"), future1);
  await mkQual(sh2.helper.id, id("Sanitätshelfer"), future1);
  await mkQual(rs.helper.id, id("Rettungssanitäter"), future1);
  await mkQual(driver.helper.id, id("Führerschein Klasse C1"));
  return { planner, sh1, sh2, rs, driver, none };
}

test("Kompletter Ablauf: Anmeldung → Bestätigung → Besetzung aktualisiert sich", async () => {
  const c = await crew();
  const t = future(30);
  const shift = await createShift(c.planner.ctx, {
    unitId: S.berA.id, name: "Sanitätsdienst Stadtfest", kind: "SANITAETSDIENST", ...t, meetingPoint: "Unterkunft",
    requirements: [
      { label: "Rettungssanitäter", count: 1, qualTypeIds: [id("Rettungssanitäter")] },
      { label: "Sanitätshelfer", count: 2, qualTypeIds: [id("Sanitätshelfer")] },
      { label: "Fahrer", count: 1, functionKey: "FAHRER", qualTypeIds: [id("Führerschein Klasse B")] },
    ],
  });
  // Entwurf ist für Helfer unsichtbar
  await rejects(getShift(c.sh1.ctx, shift.id), 404);
  assert.equal((await listShifts(c.sh1.ctx)).length, 0);
  await rejects(signUpForShift(c.sh1.ctx, shift.id), 404);
  await publishShift(c.planner.ctx, shift.id);
  const notif = await prisma.notification.findMany({ where: { userId: c.sh1.user.id, type: "DIENST_NEU" } });
  assert.equal(notif.length, 1);

  let d = await getShift(c.sh1.ctx, shift.id);
  assert.equal(d.summary.needed, 4);
  assert.equal(d.summary.confirmed, 0);

  // Helfer ohne Qualifikation darf sich nicht anmelden
  await rejects(signUpForShift(c.none.ctx, shift.id), 409, /Qualifikation/);
  // Sanitätshelfer meldet sich an
  const { assignment } = await signUpForShift(c.sh1.ctx, shift.id, "Bin dabei");
  assert.equal(assignment.status, "ANGEFRAGT");
  await rejects(signUpForShift(c.sh1.ctx, shift.id), 409); // doppelt
  const pn = await prisma.notification.findMany({ where: { userId: c.planner.user.id, type: "DIENST_ANFRAGE" } });
  assert.equal(pn.length, 1);

  // Helfer selbst darf nicht entscheiden
  await rejects(decideAssignment(c.sh1.ctx, assignment.id, "CONFIRM"), 403);
  // Planer bestätigt → Position wird automatisch passend gewählt
  const confirmed = await decideAssignment(c.planner.ctx, assignment.id, "CONFIRM");
  assert.equal(confirmed.status, "BESTAETIGT");
  d = await getShift(c.planner.ctx, shift.id);
  assert.equal(d.summary.confirmed, 1);
  assert.equal(d.summary.open, 3);
  const shPos = d.requirements.find((r) => r.label === "Sanitätshelfer")!;
  assert.equal(shPos.filled, 1);
  assert.equal(confirmed.requirementId, shPos.id);
  const conf = await prisma.notification.findMany({ where: { userId: c.sh1.user.id, type: "DIENST_BESTAETIGT" } });
  assert.equal(conf.length, 1);

  // Zweite Sanitäterin + Rettungssanitäter rücken nach; Position „Sanitätshelfer“ (2) wird voll
  await assignHelper(c.planner.ctx, shift.id, c.sh2.helper.id);
  const rsA = await assignHelper(c.planner.ctx, shift.id, c.rs.helper.id);
  // RS „deckt“ SH ab, wird aber der besseren freien Position zugeordnet (RS-Position leer; beide passen → höchste Passung)
  assert.ok(rsA.requirementId);
  d = await getShift(c.planner.ctx, shift.id);
  assert.equal(d.summary.confirmed, 3);

  // Überbuchung verhindern
  const extra = await mkAccountHelper(S.berA.id, "Extra", "Sani");
  await mkQual(extra.helper.id, id("Sanitätshelfer"), null);
  const shPositionFull = d.requirements.find((r) => r.label === "Sanitätshelfer")!;
  if (shPositionFull.filled >= shPositionFull.count) {
    await rejects(assignHelper(c.planner.ctx, shift.id, extra.helper.id, { requirementId: shPositionFull.id }), 409, /voll/);
  }
});

test("Zusage/Absage: Absage gibt die Position frei und benachrichtigt die Planer", async () => {
  const c = await crew();
  const shift = await createShift(c.planner.ctx, { unitId: S.berA.id, name: "Bereitschaftsabend", kind: "BEREITSCHAFTSABEND", ...future(5, 19, 3), requirements: [{ label: "Helfer", count: 1, qualTypeIds: [] }] });
  await publishShift(c.planner.ctx, shift.id);
  await assignHelper(c.planner.ctx, shift.id, c.sh1.helper.id, { mode: "EINLADEN" });
  let d = await getShift(c.sh1.ctx, shift.id);
  assert.equal(d.mine?.status, "EINGELADEN");
  await respondToInvitation(c.sh1.ctx, shift.id, true);
  d = await getShift(c.planner.ctx, shift.id);
  assert.equal(d.summary.filledPositions, 1);
  await withdrawFromShift(c.sh1.ctx, shift.id, "Krank");
  d = await getShift(c.planner.ctx, shift.id);
  assert.equal(d.summary.filledPositions, 0);
  const n = await prisma.notification.count({ where: { userId: c.planner.user.id, type: "DIENST_ABGESAGT" } });
  assert.ok(n >= 1);
  // Warteliste & Ablehnung
  const r = await signUpForShift(c.sh2.ctx, shift.id);
  const wl = await decideAssignment(c.planner.ctx, r.assignment.id, "WAITLIST");
  assert.equal(wl.status, "WARTELISTE");
  const again = await decideAssignment(c.planner.ctx, r.assignment.id, "CONFIRM");
  assert.equal(again.status, "BESTAETIGT");
  await removeFromShift(c.planner.ctx, again.id);
  assert.equal((await getShift(c.planner.ctx, shift.id)).summary.confirmed, 0);
});

test("Empfehlung: nur geeignete Helfer – Qualifikation, Verfügbarkeit, Überschneidung, Ablauf", async () => {
  const c = await crew();
  const t = future(40);
  const shift = await createShift(c.planner.ctx, {
    unitId: S.berA.id, name: "Stadtfest", kind: "SANITAETSDIENST", ...t,
    requirements: [{ label: "Rettungssanitäter", count: 1, qualTypeIds: [id("Rettungssanitäter")] }, { label: "Sanitätshelfer", count: 2, qualTypeIds: [id("Sanitätshelfer")] }],
  });
  await publishShift(c.planner.ctx, shift.id);

  // abgelaufene Qualifikation, nicht verfügbar, Überschneidung
  const expired = await mkAccountHelper(S.berA.id, "Ewald", "Abgelaufen");
  await mkQual(expired.helper.id, id("Sanitätshelfer"), new Date(Date.now() + 10 * 86_400_000)); // läuft VOR dem Dienst ab
  const unavailable = await mkAccountHelper(S.berA.id, "Uta", "Nichtda");
  await mkQual(unavailable.helper.id, id("Sanitätshelfer"));
  const day = t.startsAt.slice(0, 10);
  await setAvailability(unavailable.ctx, unavailable.helper.id, { startDate: day, endDate: day, status: "NICHT_VERFUEGBAR", reason: "PRIVAT" });
  const busy = await mkAccountHelper(S.berA.id, "Bodo", "Beschaeftigt");
  await mkQual(busy.helper.id, id("Sanitätshelfer"));
  const other = await createShift(c.planner.ctx, { unitId: S.berA.id, name: "Anderer Dienst", kind: "SONSTIGES", startsAt: new Date(new Date(t.startsAt).getTime() - 2 * 3_600_000).toISOString(), endsAt: new Date(new Date(t.startsAt).getTime() + 3_600_000).toISOString() });
  await publishShift(c.planner.ctx, other.id);
  await assignHelper(c.planner.ctx, other.id, busy.helper.id);
  const pending = await mkAccountHelper(S.berA.id, "Pino", "Wunsch");
  await mkQual(pending.helper.id, id("Sanitätshelfer"));
  await setAvailability(pending.ctx, pending.helper.id, { startDate: day, endDate: day, status: "VERFUEGBAR" });
  await signUpForShift(pending.ctx, shift.id);

  const rec = await getRecommendation(c.planner.ctx, shift.id);
  const rsReq = rec.requirements.find((r) => r.label === "Rettungssanitäter")!;
  const shReq = rec.requirements.find((r) => r.label === "Sanitätshelfer")!;
  assert.deepEqual(rsReq.candidates.map((x) => x.helperId), [c.rs.helper.id], "nur der Rettungssanitäter ist für RS geeignet");
  const shIds = shReq.candidates.map((x) => x.helperId);
  for (const bad of [c.none, expired, unavailable, busy]) assert.ok(!shIds.includes(bad.helper.id), `${bad.helper.lastName} darf nicht vorgeschlagen werden`);
  for (const good of [c.sh1, c.sh2, pending, c.rs]) assert.ok(shIds.includes(good.helper.id), `${good.helper.lastName} fehlt`);
  assert.equal(shIds[0], pending.helper.id, "Selbstmeldung + bestätigte Verfügbarkeit führt");
  assert.ok(shReq.excluded >= 4);
  // „Beste Besetzung“ besetzt RS-Position mit dem RS und lässt ihn nicht doppelt zu
  const rsSlot = rec.proposal.find((p) => p.label === "Rettungssanitäter")!;
  const shSlot = rec.proposal.find((p) => p.label === "Sanitätshelfer")!;
  assert.equal(rsSlot.filled[0].helperId, c.rs.helper.id);
  assert.ok(!shSlot.filled.some((f) => f.helperId === c.rs.helper.id));
  assert.equal(shSlot.filled.length, 2);
  assert.ok(rsSlot.filled[0].score <= 100 && rsSlot.filled[0].score > 40);

  // Übernehmen prüft serverseitig erneut: manipulierte Vorschläge werden abgelehnt
  const res = await applyRecommendation(c.planner.ctx, shift.id, [
    { requirementId: rsSlot.requirementId, helperId: c.none.helper.id }, // unqualifiziert → abgelehnt
    { requirementId: shSlot.requirementId, helperId: unavailable.helper.id }, // nicht verfügbar → abgelehnt
    { requirementId: rsSlot.requirementId, helperId: c.rs.helper.id },
    ...shSlot.filled.map((f) => ({ requirementId: shSlot.requirementId, helperId: f.helperId })),
  ]);
  assert.equal(res.skipped.length, 2);
  assert.equal(res.applied.length, 3);
  const d = await getShift(c.planner.ctx, shift.id);
  assert.equal(d.summary.open, 0);
  assert.equal(d.summary.pct, 100);
});

test("Ausnahme-Zuteilung nur mit ausdrücklichem Override und wird protokolliert", async () => {
  const c = await crew();
  const shift = await createShift(c.planner.ctx, { unitId: S.berA.id, name: "Dienst Override", kind: "SANITAETSDIENST", ...future(20), requirements: [{ label: "Rettungssanitäter", count: 1, qualTypeIds: [id("Rettungssanitäter")] }] });
  await publishShift(c.planner.ctx, shift.id);
  const reqId = (await getShift(c.planner.ctx, shift.id)).requirements[0].id;
  await rejects(assignHelper(c.planner.ctx, shift.id, c.none.helper.id, { requirementId: reqId }), 409, /Nicht geeignet/);
  await assignHelper(c.planner.ctx, shift.id, c.none.helper.id, { requirementId: reqId, override: true });
  const log = await prisma.auditLog.findFirst({ where: { action: "shift.assign", entityType: "ShiftAssignment" }, orderBy: { at: "desc" } });
  assert.match(log!.summary, /Ausnahme/);
});

test("Rechte: fremde Einheit sieht Dienst nicht, Helfer können nichts verwalten", async () => {
  const c = await crew();
  const foreign = await mkAccountHelper(S.berB.id, "Fred", "Fremd");
  const shift = await createShift(c.planner.ctx, { unitId: S.berA.id, name: "Intern", kind: "SONSTIGES", ...future(9) });
  await publishShift(c.planner.ctx, shift.id);
  await rejects(getShift(foreign.ctx, shift.id), 404);
  await rejects(signUpForShift(foreign.ctx, shift.id), 404);
  await rejects(publishShift(c.sh1.ctx, shift.id), 403);
  await rejects(updateShift(c.sh1.ctx, shift.id, { unitId: S.berA.id, name: "x", kind: "SONSTIGES", ...future(9) }), 403);
  await rejects(updateShift(foreign.ctx, shift.id, { unitId: S.berA.id, name: "x", kind: "SONSTIGES", ...future(9) }), 404);
  await rejects(createShift(c.planner.ctx, { unitId: S.berB.id, name: "x", kind: "SONSTIGES", ...future(9) }), 403);
  await rejects(getRecommendation(c.sh1.ctx, shift.id), 403);
  assert.ok(!(await listShifts(foreign.ctx)).some((s) => s.id === shift.id));
});

test("Änderungen: Besetzung im Audit, Benachrichtigung der Besatzung, keine Unterschreitung eingeteilter Plätze", async () => {
  const c = await crew();
  const shift = await createShift(c.planner.ctx, { unitId: S.berA.id, name: "Stadtfest", kind: "SANITAETSDIENST", ...future(15), requirements: [{ label: "Helfer", count: 6, qualTypeIds: [] }] });
  await publishShift(c.planner.ctx, shift.id);
  const d0 = await getShift(c.planner.ctx, shift.id);
  await assignHelper(c.planner.ctx, shift.id, c.sh1.helper.id);
  await updateShift(c.planner.ctx, shift.id, { unitId: S.berA.id, name: "Stadtfest", kind: "SANITAETSDIENST", ...future(15), meetingPoint: "Neuer Treffpunkt", requirements: [{ id: d0.requirements[0].id, label: "Helfer", count: 8, qualTypeIds: [] }] });
  const log = await prisma.auditLog.findFirst({ where: { action: "shift.update", entityId: shift.id } });
  assert.match(log!.summary, /Besetzung von 6 auf 8 Helfer/);
  assert.ok(await prisma.notification.findFirst({ where: { userId: c.sh1.user.id, type: "DIENST_GEAENDERT" } }));
  await assignHelper(c.planner.ctx, shift.id, c.sh2.helper.id);
  await rejects(updateShift(c.planner.ctx, shift.id, { unitId: S.berA.id, name: "Stadtfest", kind: "SANITAETSDIENST", ...future(15), requirements: [{ id: d0.requirements[0].id, label: "Helfer", count: 1, qualTypeIds: [] }] }), 409, /bereits 2 Eingeteilte/);
  await rejects(updateShift(c.planner.ctx, shift.id, { unitId: S.berA.id, name: "Stadtfest", kind: "SANITAETSDIENST", ...future(15), requirements: [] }), 409, /bereits Eingeteilte/);
});

test("Fahrzeuge & Material: Doppelbuchung und Bestand werden verhindert", async () => {
  const c = await crew();
  const car = await prisma.vehicle.create({ data: { unitId: S.berA.id, name: "RTW 1" } });
  const broken = await prisma.vehicle.create({ data: { unitId: S.berA.id, name: "KTW", status: "IN_WARTUNG" } });
  const aed = await prisma.materialItem.create({ data: { unitId: S.berA.id, name: "AED", quantity: 2 } });
  const t = future(60);
  const s1 = await createShift(c.planner.ctx, { unitId: S.berA.id, name: "Dienst 1", kind: "SANITAETSDIENST", ...t });
  const s2 = await createShift(c.planner.ctx, { unitId: S.berA.id, name: "Dienst 2", kind: "SANITAETSDIENST", ...t });
  await setShiftResources(c.planner.ctx, s1.id, { vehicleIds: [car.id], materials: [{ materialId: aed.id, quantity: 2 }] });
  await rejects(setShiftResources(c.planner.ctx, s2.id, { vehicleIds: [car.id] }), 409, /bereits im Dienst/);
  await rejects(setShiftResources(c.planner.ctx, s2.id, { materials: [{ materialId: aed.id, quantity: 1 }] }), 409, /frei/);
  await rejects(setShiftResources(c.planner.ctx, s2.id, { vehicleIds: [broken.id] }), 409, /nicht einsatzbereit/);
  await setShiftResources(c.planner.ctx, s1.id, { vehicleIds: [car.id], materials: [{ materialId: aed.id, quantity: 1 }] });
  await setShiftResources(c.planner.ctx, s2.id, { materials: [{ materialId: aed.id, quantity: 1 }] });
});

test("Abschluss bucht Dienststunden; Absage benachrichtigt", async () => {
  const c = await crew();
  const start = new Date(Date.now() - 6 * 3_600_000), end = new Date(Date.now() - 2 * 3_600_000);
  const shift = await prisma.shift.create({ data: { unitId: S.berA.id, name: "Gestern", kind: "BEREITSCHAFTSABEND", startsAt: start, endsAt: end, status: "OFFEN" } });
  await prisma.shiftAssignment.create({ data: { shiftId: shift.id, helperId: c.sh1.helper.id, status: "BESTAETIGT", source: "PLANER" } });
  await completeShift(c.planner.ctx, shift.id);
  const a = await prisma.shiftAssignment.findFirstOrThrow({ where: { shiftId: shift.id } });
  assert.equal(a.workedMinutes, 240);
  await rejects(completeShift(c.planner.ctx, shift.id), 409);
  const s2 = await createShift(c.planner.ctx, { unitId: S.berA.id, name: "Wird abgesagt", kind: "SONSTIGES", ...future(3) });
  await publishShift(c.planner.ctx, s2.id);
  await assignHelper(c.planner.ctx, s2.id, c.sh2.helper.id);
  await cancelShift(c.planner.ctx, s2.id, "Wetter");
  assert.ok(await prisma.notification.findFirst({ where: { userId: c.sh2.user.id, type: "DIENST_ABGESAGT" } }));
});

test("Auslaufende Qualifikationen werden gemeldet (nur im sichtbaren Bereich)", async () => {
  const c = await crew();
  const x = await mkAccountHelper(S.berA.id, "Xaver", "Ablauf");
  await mkQual(x.helper.id, id("Erste-Hilfe-Ausbildung"), new Date(Date.now() + 20 * 86_400_000));
  const y = await mkAccountHelper(S.berB.id, "Yvonne", "Fremd");
  await mkQual(y.helper.id, id("Erste-Hilfe-Ausbildung"), new Date(Date.now() - 5 * 86_400_000));
  const rows = await expiringQualifications(c.planner.ctx, 60);
  assert.ok(rows.some((r) => r.helperId === x.helper.id && r.state === "LAEUFT_AB"));
  assert.ok(!rows.some((r) => r.helperId === y.helper.id));
  const all = await expiringQualifications(S.adminCtx, 60);
  assert.ok(all.some((r) => r.helperId === y.helper.id && r.state === "ABGELAUFEN"));
  assert.deepEqual(await expiringQualifications(x.ctx, 60), []); // normale Helfer sehen keine Übersicht
});

// ───────────── Teilzeit-Meldungen und Einteilung im gemeldeten Zeitraum ─────────────

const at = (base: string, hours: number) => new Date(new Date(base).getTime() + hours * 3_600_000);

test("Teilzeit: Melden für einen Zeitraum, Einteilen genau dafür, Position zeitlich teilen", async () => {
  const c = await crew();
  const t = future(20, 12, 6); // 12–18 Uhr UTC
  const shift = await createShift(c.planner.ctx, { unitId: S.berA.id, name: "Ausbildungstag", kind: "AUSBILDUNG", ...t, requirements: [{ label: "Sanitätshelfer", count: 1, qualTypeIds: [id("Sanitätshelfer")] }] });
  await publishShift(c.planner.ctx, shift.id);

  // Zeitraum muss im Dienst liegen und mindestens 15 Minuten haben
  await rejects(signUpForShift(c.sh1.ctx, shift.id, null, { from: at(t.startsAt, -1), to: at(t.startsAt, 2) }), 400, /innerhalb/);
  await rejects(signUpForShift(c.sh1.ctx, shift.id, null, { from: at(t.startsAt, 2), to: at(t.startsAt, 2.1) }), 400, /15 Minuten/);

  // Sven kann 12–15, Sara 15–18
  const a1 = (await signUpForShift(c.sh1.ctx, shift.id, null, { from: t.startsAt, to: at(t.startsAt, 3) })).assignment;
  const a2 = (await signUpForShift(c.sh2.ctx, shift.id, null, { from: at(t.startsAt, 3), to: t.endsAt })).assignment;
  let mine = (await getShift(c.sh1.ctx, shift.id)).mine!;
  assert.ok(mine.availableLabel && /Uhr/.test(mine.availableLabel));

  // Meldung ändern (nur offene Meldungen)
  await updateMySignup(c.sh1.ctx, shift.id, "doch bis 15:00", { from: t.startsAt, to: at(t.startsAt, 3) });
  mine = (await getShift(c.sh1.ctx, shift.id)).mine!;
  assert.equal(mine.note, "doch bis 15:00");

  // Planer teilt im gemeldeten Zeitraum ein (Standard = gemeldeter Zeitraum)
  const c1 = await decideAssignment(c.planner.ctx, a1.id, "CONFIRM");
  assert.equal(c1.plannedFrom?.toISOString(), new Date(t.startsAt).toISOString());
  assert.equal(c1.plannedTo?.toISOString(), at(t.startsAt, 3).toISOString());
  let d = await getShift(c.planner.ctx, shift.id);
  let pos = d.requirements[0];
  assert.equal(pos.filled, 0, "nur teilweise besetzt");
  assert.equal(pos.gaps.length, 1);
  await rejects(updateMySignup(c.sh1.ctx, shift.id, null, {}), 409); // bereits eingeteilt

  // Außerhalb des gemeldeten Zeitraums nur als Ausnahme
  await rejects(decideAssignment(c.planner.ctx, a2.id, "CONFIRM", { from: at(t.startsAt, 2), to: t.endsAt }), 409, /gemeldeten Zeitraums/);
  // Überschneidung mit Sven auf derselben Position (1 Platz) ist zu viel – auch mit Ausnahme
  await rejects(decideAssignment(c.planner.ctx, a2.id, "CONFIRM", { from: at(t.startsAt, 2), to: t.endsAt, override: true, requirementId: pos.id }), 409, /voll besetzt/);
  // Im gemeldeten Zeitraum passt Sara lückenlos auf denselben Platz
  await decideAssignment(c.planner.ctx, a2.id, "CONFIRM");
  d = await getShift(c.planner.ctx, shift.id);
  pos = d.requirements[0];
  assert.equal(pos.filled, 1, "Platz durch zwei Teilzeit-Einteilungen voll abgedeckt");
  assert.equal(pos.people, 2);
  assert.equal(pos.gaps.length, 0);
  assert.equal(d.summary.open, 0);

  // Stunden werden nach eingeteiltem Zeitraum gebucht
  await prisma.shift.update({ where: { id: shift.id }, data: { startsAt: new Date(Date.now() - 6 * 3_600_000), endsAt: new Date(Date.now() - 1000) } });
  await prisma.shiftAssignment.updateMany({ where: { shiftId: shift.id }, data: { plannedFrom: null, plannedTo: null } });
  await prisma.shiftAssignment.update({ where: { id: a1.id }, data: { plannedFrom: new Date(Date.now() - 6 * 3_600_000), plannedTo: new Date(Date.now() - 3 * 3_600_000 - 1000) } });
  await completeShift(c.planner.ctx, shift.id);
  const worked = await prisma.shiftAssignment.findUniqueOrThrow({ where: { id: a1.id } });
  assert.ok(worked.workedMinutes! >= 179 && worked.workedMinutes! <= 180, `3 h statt 6 h gebucht (${worked.workedMinutes})`);
  const full = await prisma.shiftAssignment.findUniqueOrThrow({ where: { id: a2.id } });
  assert.equal(full.workedMinutes, 360);
});

test("Meldeschluss: danach keine Selbstmeldung mehr, Planer kann weiter einteilen", async () => {
  const c = await crew();
  const t = future(10);
  const shift = await createShift(c.planner.ctx, { unitId: S.berA.id, name: "Bereitschaftsabend", kind: "BEREITSCHAFTSABEND", ...t, signupDeadline: new Date(Date.now() + 86_400_000).toISOString(), requirements: [] });
  await publishShift(c.planner.ctx, shift.id);
  await signUpForShift(c.sh1.ctx, shift.id);
  await prisma.shift.update({ where: { id: shift.id }, data: { signupDeadline: new Date(Date.now() - 1000) } });
  const d = await getShift(c.sh2.ctx, shift.id);
  assert.equal(d.signupClosed, true);
  await rejects(signUpForShift(c.sh2.ctx, shift.id), 409, /Meldeschluss/);
  await rejects(updateMySignup(c.sh1.ctx, shift.id, null, {}), 409, /Meldeschluss/);
  await assignHelper(c.planner.ctx, shift.id, c.sh2.helper.id);
  // Meldeschluss nach Dienstende ist ungültig
  await assert.rejects(createShift(c.planner.ctx, { unitId: S.berA.id, name: "X", kind: "SONSTIGES", ...t, signupDeadline: at(t.endsAt, 1).toISOString(), requirements: [] }));
});

test("Veranstaltung mit mehreren Schichten: Uhrzeiten über Mitternacht, Meldeschluss der Veranstaltung", async () => {
  const c = await crew();
  const ev = await prisma.event.create({ data: { unitId: S.berA.id, name: "Festival", startsAt: new Date(Date.now() + 20 * 86_400_000), endsAt: new Date(Date.now() + 22 * 86_400_000), organizer: "Seeufer GmbH" } });
  // Schicht 16:30–01:30 Berliner Zeit
  const day = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10);
  const next = new Date(Date.now() + 21 * 86_400_000).toISOString().slice(0, 10);
  const s1 = await createShift(c.planner.ctx, { unitId: S.berA.id, eventId: ev.id, name: "Fr Früh", kind: "SANITAETSDIENST", startsAt: `${day}T16:30`, endsAt: `${next}T01:30`, requirements: [] });
  const s2 = await createShift(c.planner.ctx, { unitId: S.berA.id, eventId: ev.id, name: "Sa", kind: "SANITAETSDIENST", startsAt: `${next}T14:00`, endsAt: `${next}T20:00`, requirements: [] });
  await publishShift(c.planner.ctx, s1.id); await publishShift(c.planner.ctx, s2.id);

  // Uhrzeit „00:30“ liegt nach Mitternacht innerhalb der Schicht
  const { assignment } = await signUpForShift(c.sh1.ctx, s1.id, null, { from: "22:00", to: "00:30" });
  assert.equal(assignment.availableTo!.getTime() - assignment.availableFrom!.getTime(), 150 * 60_000);
  await rejects(updateMySignup(c.sh1.ctx, s1.id, null, { from: "15:00", to: "18:00" }), 400, /innerhalb/);

  const view = await getEventSignup(c.sh1.ctx, ev.id);
  assert.equal(view.total, 2);
  assert.equal(view.shifts[0].mine?.status, "ANGEFRAGT");
  assert.match(view.shifts[0].mine!.label!, /22:00–00:30/);
  assert.equal(view.shifts[1].mine, null);

  // Meldeschluss der Veranstaltung gilt für Schichten ohne eigenen
  await prisma.event.update({ where: { id: ev.id }, data: { signupDeadline: new Date(Date.now() - 1000) } });
  await rejects(signUpForShift(c.sh1.ctx, s2.id), 409, /Meldeschluss/);
  assert.equal((await getEventSignup(c.sh1.ctx, ev.id)).shifts[1].signupClosed, true);
  // Fremde sehen die Veranstaltung nicht
  const foreign = await mkAccountHelper(S.berB.id, "Fiona", "Fremd");
  await rejects(getEventSignup(foreign.ctx, ev.id), 404);
});
