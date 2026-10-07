import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { scenario, mkAccountHelper, mkQual, mkHelper } from "./fixtures";
import { prisma } from "../../src/server/db";
import { HttpError } from "../../src/server/errors";
import { addDocumentVersion, downloadDocument, getDocument, listDocuments, uploadDocument } from "../../src/server/services/documents";
import { createAlert, getAlert, listAlerts, respondToAlert } from "../../src/server/services/alerts";
import { inbox, readMessage, sendMessage, createAnnouncement, listAnnouncements } from "../../src/server/services/messages";
import { calendarEntries, exportCalendarIcs, personalIcsByToken } from "../../src/server/services/calendar";
import { buildReport, exportReport } from "../../src/server/services/reports";
import { hoursReport, ownHours } from "../../src/server/services/stats";
import { runMaintenance } from "../../src/server/services/maintenance";
import { createIncident, getIncident, listIncidents } from "../../src/server/services/incidents";
import { issueMaterial, listMaterials, returnMaterial, materialWarnings } from "../../src/server/services/materials";
import { createVehicle, vehicleWarnings, addMaintenance } from "../../src/server/services/vehicles";
import { globalSearch } from "../../src/server/services/search";
import { listAudit } from "../../src/server/services/audit-log";
import { getDashboard } from "../../src/server/services/dashboard";
import { setPreferences } from "../../src/server/services/notifications";
import { notifyUsers } from "../../src/server/notify";
import { regenerateIcalToken } from "../../src/server/auth";
import { addHelperQualification } from "../../src/server/services/qualifications";

let S: Awaited<ReturnType<typeof scenario>>;
const rejects = (p: Promise<unknown>, status: number, re?: RegExp) =>
  assert.rejects(p, (e: unknown) => e instanceof HttpError && e.status === status && (!re || re.test(e.message)), `erwartet HTTP ${status}${re ? " " + re : ""}`);
const PDF = Buffer.from("%PDF-1.4\n%test\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");

beforeEach(async () => { S = await scenario(); });

test("Dokumente: Zugriffsstufen, Versionierung, verschlüsselte Ablage, Upload-Prüfung", async () => {
  const bl = await mkAccountHelper(S.berA.id, "Bea", "Boss", "BEREITSCHAFTSLEITER");
  const h1 = await mkAccountHelper(S.berA.id, "Hans", "Helfer");
  const h2 = await mkAccountHelper(S.berA.id, "Heidi", "Helfer2");
  const foreign = await mkAccountHelper(S.berB.id, "Fritz", "Fremd");

  const pub = await uploadDocument(bl.ctx, { unitId: S.berA.id, title: "Dienstanweisung 1", category: "DIENSTANWEISUNG", access: "HELFER" }, { filename: "da.pdf", mime: "application/pdf", data: PDF });
  const lead = await uploadDocument(bl.ctx, { unitId: S.berA.id, title: "Interner Prüfbericht", category: "PRUEFBERICHT", access: "FUEHRUNG" }, { filename: "p.pdf", mime: "application/pdf", data: PDF });
  const personal = await uploadDocument(h1.ctx, { unitId: S.berA.id, title: "Mein Sanitäter-Zeugnis", category: "QUALIFIKATIONSNACHWEIS", access: "PERSOENLICH", ownerHelperId: h1.helper.id }, { filename: "z.pdf", mime: "application/pdf", data: PDF });

  const titles = async (c: typeof h1.ctx) => (await listDocuments(c)).map((d) => d.title).sort();
  assert.deepEqual(await titles(h1.ctx), ["Dienstanweisung 1", "Mein Sanitäter-Zeugnis"]);
  assert.deepEqual(await titles(h2.ctx), ["Dienstanweisung 1"], "Kollege sieht weder Führungs- noch persönliche Dokumente");
  assert.deepEqual(await titles(foreign.ctx), []);
  assert.ok((await titles(bl.ctx)).includes("Mein Sanitäter-Zeugnis"), "Leitung sieht persönliche Nachweise (Qualifikationsprüfung)");
  await rejects(getDocument(h2.ctx, personal.id), 404);
  await rejects(downloadDocument(h2.ctx, lead.id), 404);
  await rejects(downloadDocument(foreign.ctx, pub.id), 404);
  await rejects(uploadDocument(h2.ctx, { unitId: S.berA.id, title: "x", category: "INTERN", access: "HELFER" }, { filename: "a.pdf", mime: "application/pdf", data: PDF }), 403);
  await rejects(uploadDocument(h2.ctx, { unitId: S.berA.id, title: "fremd", category: "QUALIFIKATIONSNACHWEIS", access: "PERSOENLICH", ownerHelperId: h1.helper.id }, { filename: "a.pdf", mime: "application/pdf", data: PDF }), 403);

  const dl = await downloadDocument(h1.ctx, personal.id);
  assert.deepEqual(dl.data, PDF);
  // Datei im Speicher ist verschlüsselt (kein Klartext)
  const v = await prisma.documentVersion.findFirstOrThrow({ where: { documentId: personal.id } });
  const raw = await (await import("node:fs/promises")).readFile(`${process.env.STORAGE_DIR}/${v.storageKey.slice(0, 2)}/${v.storageKey}`);
  assert.ok(!raw.includes(Buffer.from("%PDF-")));
  assert.equal(await addDocumentVersion(bl.ctx, pub.id, { filename: "da2.pdf", mime: "application/pdf", data: Buffer.concat([PDF, Buffer.from("v2")]) }), 2);
  assert.equal((await downloadDocument(h2.ctx, pub.id, 1)).data.length, PDF.length, "alte Version bleibt abrufbar");
  assert.ok((await downloadDocument(h2.ctx, pub.id)).data.length > PDF.length);
  // Upload-Prüfungen
  await rejects(uploadDocument(bl.ctx, { unitId: S.berA.id, title: "evil", category: "INTERN", access: "HELFER" }, { filename: "x.exe", mime: "application/x-msdownload", data: Buffer.from("MZ") }), 400, /nicht erlaubt/);
  await rejects(uploadDocument(bl.ctx, { unitId: S.berA.id, title: "fake", category: "INTERN", access: "HELFER" }, { filename: "x.pdf", mime: "application/pdf", data: Buffer.from("<html>") }), 400, /passt nicht/);
  await rejects(uploadDocument(bl.ctx, { unitId: S.berA.id, title: "big", category: "INTERN", access: "HELFER" }, { filename: "x.pdf", mime: "application/pdf", data: Buffer.concat([PDF, Buffer.alloc(11 * 1024 * 1024)]) }), 400, /größer/);
  assert.ok(await prisma.auditLog.findFirst({ where: { action: "document.download", entityId: personal.id } }), "Abruf wird protokolliert");
});

test("Alarmierung: Empfängerkreis, Rückmeldungen live, Rechte", async () => {
  const zf = await mkAccountHelper(S.berA.id, "Zora", "Zug", "ZUGFUEHRER");
  const a = await mkAccountHelper(S.berA.id, "Anton", "A", "HELFER", { groupName: "Gruppe 1" });
  const b = await mkAccountHelper(S.berA.id, "Berta", "B", "HELFER", { groupName: "Gruppe 2" });
  const inactive = await mkAccountHelper(S.berA.id, "Ina", "Inaktiv", "HELFER", { status: "INAKTIV" });
  const foreign = await mkAccountHelper(S.berB.id, "Fred", "Fremd");
  await mkQual(a.helper.id, S.qt.get("Sanitätshelfer")!);

  await rejects(createAlert(a.ctx, { unitId: S.berA.id, title: "x", audienceType: "EINHEIT" }), 403);
  const all = await createAlert(zf.ctx, { unitId: S.berA.id, title: "Sanitätsdienst", message: "Bitte kommen", meetingPoint: "Unterkunft", meetingTime: "2027-07-18T18:30", audienceType: "EINHEIT" });
  assert.equal(all.recipients, 3, "Zugführer, Anton, Berta – nicht der Inaktive, nicht Fremde");
  const g = await createAlert(zf.ctx, { unitId: S.berA.id, title: "Gruppe", audienceType: "GRUPPE", audienceRef: "Gruppe 1" });
  assert.equal(g.recipients, 1);
  const q = await createAlert(zf.ctx, { unitId: S.berA.id, title: "Quali", audienceType: "QUALIFIKATION", audienceRef: S.qt.get("Sanitätshelfer")! });
  assert.equal(q.recipients, 1);
  await rejects(createAlert(zf.ctx, { unitId: S.berA.id, title: "leer", audienceType: "QUALIFIKATION", audienceRef: S.qt.get("Rettungssanitäter")! }), 409);
  await rejects(createAlert(zf.ctx, { unitId: S.berB.id, title: "fremd", audienceType: "EINHEIT" }), 403);

  assert.ok(await prisma.notification.findFirst({ where: { userId: a.user.id, type: "ALARM" } }));
  assert.ok(!(await prisma.notification.findFirst({ where: { userId: foreign.user.id, type: "ALARM" } })));

  await respondToAlert(a.ctx, all.alert.id, "KOMME");
  await respondToAlert(b.ctx, all.alert.id, "VIELLEICHT");
  const detail = await getAlert(zf.ctx, all.alert.id);
  assert.deepEqual({ k: detail.counts.KOMME, v: detail.counts.VIELLEICHT, n: detail.counts.KANN_NICHT, o: detail.counts.OFFEN }, { k: 1, v: 1, n: 0, o: 1 });
  assert.equal(detail.recipients!.length, 3);
  const asHelper = await getAlert(a.ctx, all.alert.id);
  assert.equal(asHelper.myResponse, "KOMME");
  assert.equal(asHelper.recipients, undefined, "Empfänger sehen keine Namensliste der Rückmeldungen");
  await rejects(getAlert(foreign.ctx, all.alert.id), 404);
  await rejects(respondToAlert(foreign.ctx, all.alert.id, "KOMME"), 404);
  await rejects(respondToAlert(inactive.ctx, all.alert.id, "KOMME"), 404);
  assert.equal((await listAlerts(foreign.ctx)).length, 0);
});

test("Nachrichten & Bekanntmachungen: Empfängerprüfung, Lesestatus, Sichtbarkeit", async () => {
  const bl = await mkAccountHelper(S.berA.id, "Bea", "Boss", "BEREITSCHAFTSLEITER");
  const a = await mkAccountHelper(S.berA.id, "Anton", "A");
  const b = await mkAccountHelper(S.berA.id, "Berta", "B");
  const foreign = await mkAccountHelper(S.berB.id, "Fred", "Fremd");

  await sendMessage(bl.ctx, { subject: "Info", body: "Hallo alle", audience: { kind: "UNIT", unitId: S.berA.id } });
  assert.equal((await inbox(a.ctx)).length, 1);
  assert.equal((await inbox(foreign.ctx)).length, 0);
  await rejects(sendMessage(a.ctx, { subject: "Spam", body: "x", audience: { kind: "UNIT", unitId: S.berA.id } }), 403);
  await rejects(sendMessage(a.ctx, { subject: "Fremd", body: "x", audience: { kind: "USERS", userIds: [foreign.user.id] } }), 403);
  await sendMessage(a.ctx, { subject: "Hi Berta", body: "privat", audience: { kind: "USERS", userIds: [b.user.id] } });
  const m = (await inbox(b.ctx)).find((x) => x.subject === "Hi Berta")!;
  assert.equal(m.read, false);
  assert.equal((await readMessage(b.ctx, m.id)).body, "privat");
  assert.equal((await inbox(b.ctx)).find((x) => x.id === m.id)!.read, true);
  await rejects(readMessage(foreign.ctx, m.id), 404);
  await rejects(readMessage(bl.ctx, m.id), 404); // auch Leitung liest keine Privatnachrichten
  await sendMessage(a.ctx, { subject: "An Leitung", body: "Frage", audience: { kind: "LEADERS", unitId: S.berA.id } });
  assert.ok((await inbox(bl.ctx)).some((x) => x.subject === "An Leitung"));
  await rejects(sendMessage(foreign.ctx, { subject: "x", body: "x", audience: { kind: "LEADERS", unitId: S.berA.id } }), 403);

  await createAnnouncement(bl.ctx, { unitId: S.berA.id, title: "Bereitschaftsabend Donnerstag 19:00", body: "Bitte pünktlich", important: true });
  assert.equal((await listAnnouncements(b.ctx)).length, 1);
  assert.equal((await listAnnouncements(foreign.ctx)).length, 0);
  await rejects(createAnnouncement(a.ctx, { unitId: S.berA.id, title: "x", body: "y" }), 403);
  // Übergeordnete Einheit informiert Untereinheiten
  const ovl = await mkAccountHelper(S.ovA.id, "Olaf", "Leiter", "EINHEITENLEITER");
  await createAnnouncement(ovl.ctx, { unitId: S.ovA.id, title: "Ortsverein-Info", body: "für alle" });
  assert.equal((await listAnnouncements(a.ctx)).length, 2);
  assert.equal((await listAnnouncements(foreign.ctx)).length, 0);
});

test("Benachrichtigungs-Einstellungen werden respektiert", async () => {
  const a = await mkAccountHelper(S.berA.id, "Anton", "A");
  await setPreferences(a.ctx, [{ type: "NACHRICHT", inApp: false, email: false, push: false }]);
  await notifyUsers([a.user.id], { type: "NACHRICHT", title: "Test" });
  await notifyUsers([a.user.id], { type: "ALARM", title: "Alarm" });
  const types = (await prisma.notification.findMany({ where: { userId: a.user.id } })).map((n) => n.type);
  assert.deepEqual(types, ["ALARM"]);
  await notifyUsers([a.user.id], { type: "SYSTEM", title: "dedupe", dedupeKey: "k1" });
  await notifyUsers([a.user.id], { type: "SYSTEM", title: "dedupe", dedupeKey: "k1" });
  assert.equal(await prisma.notification.count({ where: { userId: a.user.id, dedupeKey: "k1" } }), 1);
});

test("Kalender: Filter, Sichtbarkeit, ICS-Export und persönlicher Feed", async () => {
  const pl = await mkAccountHelper(S.berA.id, "Paul", "Planer", "DIENSTPLANER");
  const a = await mkAccountHelper(S.berA.id, "Anton", "A");
  const foreign = await mkAccountHelper(S.berB.id, "Fred", "Fremd");
  const start = new Date(Date.now() + 10 * 86_400_000);
  const mk = (name: string, kind: "SANITAETSDIENST" | "AUSBILDUNG" | "BESPRECHUNG", status: "OFFEN" | "ENTWURF" = "OFFEN") => prisma.shift.create({ data: { unitId: S.berA.id, name, kind, startsAt: start, endsAt: new Date(start.getTime() + 3_600_000), status } });
  const s1 = await mk("Sanitätsdienst", "SANITAETSDIENST"), s2 = await mk("Ausbildungsabend", "AUSBILDUNG"); await mk("Besprechung", "BESPRECHUNG"); await mk("Entwurf", "SANITAETSDIENST", "ENTWURF");
  await prisma.event.create({ data: { unitId: S.berA.id, name: "Stadtfest", startsAt: start, endsAt: new Date(start.getTime() + 8 * 3_600_000) } });
  await prisma.vehicle.create({ data: { unitId: S.berA.id, name: "RTW", tuvDue: new Date(start.toISOString().slice(0, 10)) } });
  await prisma.shiftAssignment.create({ data: { shiftId: s1.id, helperId: a.helper.id, status: "BESTAETIGT", source: "PLANER" } });
  const range = { from: new Date(Date.now()), to: new Date(Date.now() + 30 * 86_400_000) };

  const all = await calendarEntries(a.ctx, range);
  assert.ok(!all.some((e) => e.title === "Entwurf"), "Entwürfe sind für Helfer unsichtbar");
  assert.ok(all.some((e) => e.type === "VERANSTALTUNG") && all.some((e) => e.type === "FAHRZEUG"));
  assert.deepEqual((await calendarEntries(a.ctx, { ...range, types: ["AUSBILDUNG"] })).map((e) => e.title), ["Ausbildungsabend"]);
  assert.deepEqual((await calendarEntries(a.ctx, { ...range, mine: true })).map((e) => e.title), ["Sanitätsdienst"]);
  assert.ok((await calendarEntries(pl.ctx, range)).some((e) => e.title === "Entwurf"));
  assert.deepEqual(await calendarEntries(foreign.ctx, range), []);
  void s2;

  const ics = await exportCalendarIcs(a.ctx, { ...range, types: ["DIENST", "AUSBILDUNG"] });
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /SUMMARY:Sanitätsdienst/);
  assert.doesNotMatch(ics, /SUMMARY:Stadtfest/);
  const token = await regenerateIcalToken(a.ctx);
  const feed = (await personalIcsByToken(token))!;
  assert.match(feed, /SUMMARY:Sanitätsdienst/);
  assert.doesNotMatch(feed, /Ausbildungsabend/, "persönlicher Feed enthält nur eigene Dienste");
  assert.equal(await personalIcsByToken("falsch-falsch-falsch-falsch-falsch"), null);
});

test("Dienststunden & Berichte: Berechtigung, Zahlen, Export, Formel-Injektion", async () => {
  const bl = await mkAccountHelper(S.berA.id, "Bea", "Boss", "BEREITSCHAFTSLEITER");
  const a = await mkAccountHelper(S.berA.id, "Anton", "=cmd|' /C calc'!A0", "HELFER");
  const b = await mkAccountHelper(S.berB.id, "Berta", "B");
  const base = new Date(Date.now() - 20 * 86_400_000);
  const mkShift = async (unitId: string, kind: "AUSBILDUNG" | "SANITAETSDIENST", hours: number, helperId: string, minutes?: number) => {
    const s = await prisma.shift.create({ data: { unitId, name: `${kind}`, kind, startsAt: base, endsAt: new Date(base.getTime() + hours * 3_600_000), status: "ABGESCHLOSSEN" } });
    await prisma.shiftAssignment.create({ data: { shiftId: s.id, helperId, status: "BESTAETIGT", source: "PLANER", workedMinutes: minutes ?? hours * 60 } });
  };
  await mkShift(S.berA.id, "SANITAETSDIENST", 8, a.helper.id);
  await mkShift(S.berA.id, "AUSBILDUNG", 3, a.helper.id);
  await mkShift(S.berB.id, "SANITAETSDIENST", 6, b.helper.id);
  const range = { from: new Date(Date.now() - 60 * 86_400_000), to: new Date() };

  const h = await hoursReport(bl.ctx, range);
  assert.equal(h.totalMinutes, 11 * 60, "Leitung sieht nur Stunden der eigenen Einheit");
  assert.equal(h.trainingMinutes, 180);
  assert.equal((await hoursReport(S.adminCtx, range)).totalMinutes, 17 * 60);
  await rejects(hoursReport(a.ctx, range), 403);
  const own = await ownHours(a.ctx, new Date().getFullYear());
  assert.equal(own.totalMinutes + (await ownHours(a.ctx, new Date().getFullYear() - 1)).totalMinutes, 660);

  const table = await buildReport(bl.ctx, "hours", range);
  assert.equal(table.rows.length, 1);
  const csv = (await exportReport(bl.ctx, "hours", range, "csv")).buffer.toString("utf8");
  assert.match(csv, /'=cmd/, "Formel-Injektion wird entschärft");
  const xlsx = await exportReport(bl.ctx, "hours", range, "xlsx");
  assert.equal(xlsx.buffer.subarray(0, 2).toString(), "PK");
  const pdf = await exportReport(bl.ctx, "hours", range, "pdf");
  assert.equal(pdf.buffer.subarray(0, 5).toString(), "%PDF-");
  await rejects(exportReport(a.ctx, "hours", range, "csv"), 403);
  for (const k of ["helpers", "shifts", "qualifications"] as const) assert.ok((await buildReport(bl.ctx, k, range)).rows.length > 0, k);
});

test("Einsätze: datensparsam, Teilnehmer nur aus der Einheit, Nummernvergabe", async () => {
  const zf = await mkAccountHelper(S.berA.id, "Zora", "Zug", "ZUGFUEHRER");
  const h = await mkAccountHelper(S.berA.id, "Hans", "Helfer");
  const foreign = await mkHelper(S.berB.id, "Fred", "Fremd");
  const car = await prisma.vehicle.create({ data: { unitId: S.berA.id, name: "RTW" } });
  const t = new Date(Date.now() - 3 * 3_600_000).toISOString();
  const i1 = await createIncident(zf.ctx, { unitId: S.berA.id, kind: "Sanitätsdienst", startedAt: t, endedAt: new Date().toISOString(), helpers: [{ helperId: h.helper.id, role: "Sanitäter" }], vehicleIds: [car.id], documentation: "Verlauf ohne Patientendaten" });
  const i2 = await createIncident(zf.ctx, { unitId: S.berA.id, kind: "Übung", startedAt: t });
  assert.match(i1.number, /^\d{4}-001$/);
  assert.match(i2.number, /^\d{4}-002$/);
  await rejects(createIncident(zf.ctx, { unitId: S.berA.id, kind: "x", startedAt: t, helpers: [{ helperId: foreign.id }] }), 400);
  await rejects(createIncident(h.ctx, { unitId: S.berA.id, kind: "x", startedAt: t }), 403);
  await rejects(getIncident(h.ctx, i1.id), 404);
  assert.equal((await listIncidents(h.ctx)).length, 0);
  assert.equal((await listIncidents(zf.ctx)).length, 2);
  const cols = await prisma.$queryRaw<{ column_name: string }[]>`SELECT column_name FROM information_schema.columns WHERE table_name = 'Incident'`;
  assert.ok(!cols.some((c) => /patient|diagnos|birth|name$/i.test(c.column_name.replace("kind", ""))), "keine Patientenfelder im Schema");
  const hrs = await hoursReport(zf.ctx, { from: new Date(Date.now() - 86_400_000), to: new Date(Date.now() + 86_400_000) });
  assert.ok(hrs.incidentMinutes >= 179 && hrs.incidentMinutes <= 181);
});

test("Material & Fahrzeuge: Ausgabe/Rückgabe, Bestandswarnungen, Fälligkeiten", async () => {
  const lead = await mkAccountHelper(S.berA.id, "Bea", "Boss", "BEREITSCHAFTSLEITER");
  const h = await mkAccountHelper(S.berA.id, "Hans", "Helfer");
  const m = await prisma.materialItem.create({ data: { unitId: S.berA.id, name: "AED", quantity: 3, minQuantity: 2, expiresAt: new Date(Date.now() + 20 * 86_400_000) } });
  const issue = await issueMaterial(lead.ctx, m.id, h.helper.id, 2);
  await rejects(issueMaterial(lead.ctx, m.id, h.helper.id, 2), 409, /verfügbar/);
  await rejects(issueMaterial(h.ctx, m.id, h.helper.id, 1), 403);
  let item = (await listMaterials(lead.ctx))[0];
  assert.equal(item.available, 1);
  assert.ok(item.flags.includes("MINDESTBESTAND") && item.flags.includes("ABLAUF_BALD"));
  assert.ok((await materialWarnings(lead.ctx)).some((w) => w.flag === "MINDESTBESTAND"));
  await returnMaterial(lead.ctx, issue.id);
  item = (await listMaterials(lead.ctx))[0];
  assert.equal(item.available, 3);
  assert.ok(!item.flags.includes("MINDESTBESTAND"));
  assert.equal((await listMaterials((await mkAccountHelper(S.berB.id, "F", "Fremd")).ctx)).length, 0);

  const v = await createVehicle(lead.ctx, { unitId: S.berA.id, name: "RTW 1", tuvDue: "2020-01-01", huDue: new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10) });
  const w = await vehicleWarnings(lead.ctx);
  assert.ok(w.some((x) => x.kind === "TÜV" && x.level === "rot"));
  assert.ok(w.some((x) => x.kind === "HU" && x.level === "gelb"));
  await addMaintenance(lead.ctx, v.id, { date: "2027-01-01", description: "Ölwechsel", odometerKm: 50_000 });
  await addMaintenance(lead.ctx, v.id, { date: "2027-02-01", description: "Reifen", odometerKm: 40_000 });
  assert.equal((await prisma.vehicle.findUniqueOrThrow({ where: { id: v.id } })).odometerKm, 50_000, "Kilometerstand nur vorwärts");
  await rejects(createVehicle(h.ctx, { unitId: S.berA.id, name: "Hack" }), 403);
});

test("Wartungslauf: Ablaufwarnungen einmalig, Löschkonzept, Audit-Aufbewahrung", async () => {
  const lead = await mkAccountHelper(S.berA.id, "Bea", "Boss", "BEREITSCHAFTSLEITER");
  const a = await mkAccountHelper(S.berA.id, "Anton", "A");
  const day = 86_400_000;
  await mkQual(a.helper.id, S.qt.get("Sanitätshelfer")!, new Date(Date.now() + 45 * day));
  await mkQual(a.helper.id, S.qt.get("Erste-Hilfe-Ausbildung")!, new Date(Date.now() + 5 * day));
  const r1 = await runMaintenance();
  assert.equal(r1.qualWarnings, 2);
  const r2 = await runMaintenance();
  assert.equal(r2.qualWarnings, 0, "keine Doppelwarnung");
  assert.ok(await prisma.notification.findFirst({ where: { userId: lead.user.id, title: { contains: "Erste-Hilfe" } } }), "Leitung wird bei < 7 Tagen informiert");
  // abgelaufene Qualifikation markiert den Helfer im Dashboard
  await mkQual(a.helper.id, S.qt.get("Sprechfunk (BOS)")!, new Date(Date.now() - 2 * day));
  const dash = await getDashboard(a.ctx);
  assert.ok(dash.qualWarnings.some((q) => q.name === "Sprechfunk (BOS)" && q.state === "ABGELAUFEN"));
  assert.ok(dash.qualWarnings.some((q) => q.name === "Sanitätshelfer" && q.state === "LAEUFT_AB" && q.daysLeft === 45));
  // Löschkonzept
  const gone = await mkAccountHelper(S.berA.id, "Gerd", "Gegangen", "HELFER", { status: "AUSGETRETEN", leftAt: new Date(Date.now() - 800 * day), email: "g@x.de" });
  const recent = await mkAccountHelper(S.berA.id, "Rene", "Recent", "HELFER", { status: "AUSGETRETEN", leftAt: new Date(Date.now() - 30 * day), email: "r@x.de" });
  const r3 = await runMaintenance();
  assert.equal(r3.anonymized, 1);
  assert.equal((await prisma.helper.findUniqueOrThrow({ where: { id: gone.helper.id } })).email, null);
  assert.equal((await prisma.helper.findUniqueOrThrow({ where: { id: recent.helper.id } })).email, "r@x.de");
  // Audit-Aufbewahrung: alte Einträge werden gelöscht, neue nicht – und nur über diesen Weg
  await prisma.$executeRawUnsafe(`INSERT INTO "AuditLog"(id, at, "actorLabel", action, "entityType", summary) VALUES ('old1', now() - interval '5 years', 'x', 'old', 'T', 'uralt')`);
  const r4 = await runMaintenance();
  assert.equal(r4.auditDeleted, 1);
  assert.equal(await prisma.auditLog.count({ where: { id: "old1" } }), 0);
  await assert.rejects(prisma.auditLog.deleteMany({}), /unveränderlich/);
});

test("Suche, Audit-Einsicht und Dashboard respektieren Berechtigungen", async () => {
  const bl = await mkAccountHelper(S.berA.id, "Bea", "Boss", "EINHEITENLEITER");
  const a = await mkAccountHelper(S.berA.id, "Anton", "Alpha");
  const foreign = await mkAccountHelper(S.berB.id, "Fred", "Alphabet");
  await prisma.vehicle.create({ data: { unitId: S.berB.id, name: "Alpha-Fahrzeug fremd" } });
  await prisma.vehicle.create({ data: { unitId: S.berA.id, name: "Alpha-Fahrzeug" } });
  await prisma.shift.create({ data: { unitId: S.berB.id, name: "Alpha-Dienst fremd", kind: "SONSTIGES", startsAt: new Date(), endsAt: new Date(Date.now() + 3_600_000), status: "OFFEN" } });
  const hits = await globalSearch(a.ctx, "alpha");
  assert.deepEqual(hits.map((h) => h.title).sort(), ["Alpha-Fahrzeug", "Anton Alpha"]);
  assert.ok((await globalSearch(S.adminCtx, "alpha")).length > hits.length);
  assert.deepEqual(await globalSearch(a.ctx, "a"), [], "zu kurze Suche");
  await rejects(listAudit(a.ctx), 403);
  await prisma.auditLog.create({ data: { actorLabel: "x", action: "t", entityType: "T", summary: "Eintrag Einheit B", unitId: S.berB.id } });
  await prisma.auditLog.create({ data: { actorLabel: "x", action: "t", entityType: "T", summary: "Eintrag Einheit A", unitId: S.berA.id } });
  const sums = (await listAudit(bl.ctx)).items.map((i) => i.summary);
  assert.ok(sums.includes("Eintrag Einheit A") && !sums.includes("Eintrag Einheit B"));
  assert.ok((await listAudit(S.adminCtx)).items.map((i) => i.summary).includes("Eintrag Einheit B"));
  const dash = await getDashboard(a.ctx);
  assert.equal(dash.leadership, null, "normale Helfer erhalten keinen Führungsbereich");
  assert.ok((await getDashboard(bl.ctx)).leadership);
  void foreign; void addHelperQualification;
});
