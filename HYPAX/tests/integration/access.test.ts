import { test, before } from "node:test";
import assert from "node:assert/strict";
import { scenario, mkAccountHelper, mkUser, mkHelper, ctxOf } from "./fixtures";
import { prisma } from "../../src/server/db";
import { getHelper, listHelpers, updateHelper, createHelper, anonymizeHelper, exportHelperData } from "../../src/server/services/helpers";
import { createUnit } from "../../src/server/services/units";
import { assignRole, createUser } from "../../src/server/services/users";
import { getAvailability, setAvailability } from "../../src/server/services/availability";
import { audit } from "../../src/server/audit";
import { HttpError } from "../../src/server/errors";

let S: Awaited<ReturnType<typeof scenario>>;
const rejects = (p: Promise<unknown>, status: number) =>
  assert.rejects(p, (e: unknown) => e instanceof HttpError && e.status === status, `erwartet HTTP ${status}`);

before(async () => { S = await scenario(); });

test("Mandantentrennung: Helfer sieht nur die eigene Einheit; Leiter des Ortsvereins den Teilbaum, nicht Fremde", async () => {
  const a1 = await mkAccountHelper(S.berA.id, "Anna", "Alpha");
  const a2 = await mkAccountHelper(S.berA.id, "Bernd", "Bravo");
  const b1 = await mkAccountHelper(S.berB.id, "Carla", "Charlie");
  const leader = await mkAccountHelper(S.ovA.id, "Lena", "Leitung", "EINHEITENLEITER");
  const leaderCtx = await ctxOf((await prisma.helper.findUniqueOrThrow({ where: { id: leader.helper.id } })).userId!);
  // Leiter hat Rolle nur für UNIT-Scope in ovA → muss SUBTREE bekommen
  await prisma.roleAssignment.updateMany({ where: { userId: leader.user.id }, data: { scope: "SUBTREE" } });
  const lctx = await ctxOf(leader.user.id);
  assert.ok(leaderCtx);

  const names = (r: Awaited<ReturnType<typeof listHelpers>>) => r.items.map((i) => i.lastName).sort();
  assert.deepEqual(names(await listHelpers(a1.ctx)), ["Alpha", "Bravo"]);
  assert.ok(!names(await listHelpers(a1.ctx)).includes("Charlie"));
  assert.deepEqual(names(await listHelpers(b1.ctx)), ["Charlie"]);
  assert.ok(names(await listHelpers(lctx)).includes("Alpha") && !names(await listHelpers(lctx)).includes("Charlie"));

  await rejects(getHelper(a1.ctx, b1.helper.id), 404); // Existenz wird nicht verraten
  await rejects(getHelper(lctx, b1.helper.id), 404);
  assert.equal((await getHelper(a1.ctx, a2.helper.id)).lastName, "Bravo");
  // Suche darf fremde Helfer nicht finden
  assert.equal((await listHelpers(a1.ctx, { q: "Charlie" })).total, 0);
  // Systemadministrator sieht alles
  assert.ok(names(await listHelpers(S.adminCtx)).includes("Charlie"));
});

test("Felderschutz: normale Helfer sehen keine Kontakt-/Sensibeldaten von Kollegen", async () => {
  const a = await mkAccountHelper(S.berA.id, "Dora", "Delta", "HELFER", { email: "dora@x.de", phone: "0171", birthDate: new Date("1990-05-05"), internalNotes: "intern!", street: "Weg 1" });
  const peer = await mkAccountHelper(S.berA.id, "Emil", "Echo");
  const gf = await mkAccountHelper(S.berA.id, "Gina", "Gruppe", "GRUPPENFUEHRER");
  const bl = await mkAccountHelper(S.berA.id, "Bea", "Boss", "BEREITSCHAFTSLEITER");

  const asPeer = await getHelper(peer.ctx, a.helper.id);
  for (const f of ["email", "phone", "street", "birthDate", "internalNotes", "memberNumber"]) assert.ok(!(f in asPeer), `Peer sieht ${f}`);
  assert.equal(JSON.stringify(asPeer).includes("dora@x.de"), false);

  const asGf = (await getHelper(gf.ctx, a.helper.id)) as Record<string, unknown>;
  assert.equal(asGf.email, "dora@x.de");
  assert.ok(!("birthDate" in asGf) && !("internalNotes" in asGf));

  const asBl = (await getHelper(bl.ctx, a.helper.id)) as Record<string, unknown>;
  assert.equal(asBl.internalNotes, "intern!");
  assert.ok(asBl.birthDate);

  const self = (await getHelper(a.ctx, a.helper.id)) as Record<string, unknown>;
  assert.ok(self.birthDate && self.email);
  assert.ok(!("internalNotes" in self), "Eigene interne Notizen sind für den Helfer selbst nicht sichtbar");
  // Mitgliedsnummer-Suche funktioniert nur, wo Kontaktdaten sichtbar sind
  const num = (await prisma.helper.findUniqueOrThrow({ where: { id: a.helper.id } })).memberNumber!;
  assert.equal((await listHelpers(peer.ctx, { q: num })).total, 0);
  assert.equal((await listHelpers(gf.ctx, { q: num })).total, 1);
});

test("Dienstplaner darf keine Stammdaten ändern, Helfer nicht anlegen", async () => {
  const planner = await mkAccountHelper(S.berA.id, "Paul", "Planer", "DIENSTPLANER");
  const target = await mkAccountHelper(S.berA.id, "Tom", "Ziel");
  await rejects(updateHelper(planner.ctx, target.helper.id, { firstName: "Hack" }), 403);
  await rejects(createHelper(planner.ctx, { unitId: S.berA.id, firstName: "A", lastName: "B" }), 403);
  await rejects(anonymizeHelper(planner.ctx, target.helper.id), 403);
  await rejects(exportHelperData(planner.ctx, target.helper.id), 403);
  const normal = await mkAccountHelper(S.berA.id, "Nina", "Normal");
  await rejects(updateHelper(normal.ctx, normal.helper.id, { lastName: "Selbst" }), 403); // auch nicht das eigene Profil über die Verwaltung
});

test("Leiter einer Einheit kann nicht in fremder Einheit schreiben", async () => {
  const bl = await mkAccountHelper(S.berA.id, "Karl", "Chef", "BEREITSCHAFTSLEITER");
  const foreign = await mkHelper(S.berB.id, "Fritz", "Fremd");
  await rejects(updateHelper(bl.ctx, foreign.id, { firstName: "X" }), 404);
  await rejects(createHelper(bl.ctx, { unitId: S.berB.id, firstName: "A", lastName: "B" }), 403);
  const own = await mkHelper(S.berA.id, "Olga", "Eigen");
  await updateHelper(bl.ctx, own.id, { groupName: "Gruppe 1" });
  // Verschieben in fremde Einheit verboten
  await rejects(updateHelper(bl.ctx, own.id, { unitId: S.berB.id }), 403);
});

test("Rechte-Eskalation: Verwalter kann nur Rechte vergeben, die er selbst hat", async () => {
  const el = await mkAccountHelper(S.ovA.id, "Ernst", "Einheitenleiter", "EINHEITENLEITER");
  await prisma.roleAssignment.updateMany({ where: { userId: el.user.id }, data: { scope: "SUBTREE" } });
  const elCtx = await ctxOf(el.user.id);
  const target = await mkAccountHelper(S.berA.id, "Tina", "Ziel2");
  // unit.manage / role.manage besitzt der Einheitenleiter nicht → Rolle mit diesen Rechten (per Grant) nicht vergebbar
  await rejects(assignRole(elCtx, { userId: target.user.id, unitId: S.berA.id, roleKey: "HELFER", scope: "UNIT", grants: ["role.manage"] }), 403);
  await assignRole(elCtx, { userId: target.user.id, unitId: S.berA.id, roleKey: "DIENSTPLANER", scope: "UNIT" });
  // Nicht in fremder Einheit
  const foreignUser = await mkAccountHelper(S.berB.id, "Uwe", "Fremd2");
  await rejects(assignRole(elCtx, { userId: foreignUser.user.id, unitId: S.berB.id, roleKey: "HELFER", scope: "UNIT" }), 403);
  // Einheit anlegen nur mit unit.manage
  await rejects(createUnit(elCtx, { name: "Neu", type: "BEREITSCHAFT", parentId: S.ovA.id }), 403);
  await createUnit(S.adminCtx, { name: "Neu", type: "BEREITSCHAFT", parentId: S.ovA.id });
});

test("Verfügbarkeit: private Gründe sind nur für den Helfer selbst sichtbar", async () => {
  const me = await mkAccountHelper(S.berA.id, "Vera", "Verfuegbar");
  const planner = await mkAccountHelper(S.berA.id, "Pia", "Planerin", "DIENSTPLANER");
  const peer = await mkAccountHelper(S.berA.id, "Pit", "Peer");
  await setAvailability(me.ctx, me.helper.id, { startDate: "2027-07-10", endDate: "2027-07-12", status: "NICHT_VERFUEGBAR", reason: "KRANKHEIT", note: "Grippe" });
  const from = new Date("2027-07-01"), to = new Date("2027-07-31");
  const own = await getAvailability(me.ctx, me.helper.id, from, to);
  assert.equal(own[0].reason, "KRANKHEIT");
  const seen = await getAvailability(planner.ctx, me.helper.id, from, to);
  assert.equal(seen[0].status, "NICHT_VERFUEGBAR");
  assert.ok(!("reason" in seen[0]) && !("note" in seen[0]));
  await rejects(getAvailability(peer.ctx, me.helper.id, from, to), 403);
  await rejects(setAvailability(planner.ctx, me.helper.id, { startDate: "2027-07-20", endDate: "2027-07-20", status: "VERFUEGBAR" }), 403);
  // Überlappende Eingaben werden sauber getrennt: Mitte überschreiben
  await setAvailability(me.ctx, me.helper.id, { startDate: "2027-07-11", endDate: "2027-07-11", status: "VERFUEGBAR" });
  const split = (await getAvailability(me.ctx, me.helper.id, from, to)).map((e) => `${e.startDate.toISOString().slice(8, 10)}-${e.endDate.toISOString().slice(8, 10)}:${e.status}`);
  assert.deepEqual(split, ["10-10:NICHT_VERFUEGBAR", "11-11:VERFUEGBAR", "12-12:NICHT_VERFUEGBAR"]);
});

test("Audit-Log ist per Datenbank-Trigger unveränderlich", async () => {
  await audit(S.adminCtx, { action: "test", entityType: "Test", summary: "Eintrag" });
  const row = await prisma.auditLog.findFirstOrThrow({ where: { action: "test" } });
  await assert.rejects(prisma.auditLog.update({ where: { id: row.id }, data: { summary: "manipuliert" } }), /unveränderlich/);
  await assert.rejects(prisma.auditLog.delete({ where: { id: row.id } }), /unveränderlich/);
  await assert.rejects(prisma.auditLog.deleteMany({}), /unveränderlich/);
  await assert.rejects(prisma.$executeRawUnsafe(`TRUNCATE "AuditLog"`), /unveränderlich/);
  assert.equal(await prisma.auditLog.count({ where: { id: row.id } }), 1);
});

test("Anonymisierung entfernt personenbezogene Daten, Export liefert sie vorher", async () => {
  const bl = await mkAccountHelper(S.berA.id, "Bruno", "Boss2", "BEREITSCHAFTSLEITER");
  const h = await mkAccountHelper(S.berA.id, "Gustav", "Gehen", "HELFER", { email: "g@x.de", phone: "123", birthDate: new Date("1980-01-01"), internalNotes: "n" });
  const exp = await exportHelperData(h.ctx, h.helper.id);
  assert.equal(exp.helper.email, "g@x.de");
  await anonymizeHelper(bl.ctx, h.helper.id);
  const after = await prisma.helper.findUniqueOrThrow({ where: { id: h.helper.id } });
  assert.equal(after.status, "ANONYMISIERT");
  assert.equal(after.firstName, "Gelöscht");
  assert.ok(!after.email && !after.phone && !after.birthDate && !after.internalNotes && !after.userId);
  assert.equal(await prisma.user.count({ where: { id: h.user.id } }), 0);
  const log = await prisma.auditLog.findMany({ where: { entityId: h.helper.id } });
  assert.ok(log.length >= 1);
  assert.ok(!JSON.stringify(log).includes("g@x.de"));
});

test("Benutzer anlegen: Verwalter nur für Helfer der eigenen Einheit", async () => {
  const bl = await mkAccountHelper(S.ovA.id, "Ole", "OV-Leiter", "EINHEITENLEITER");
  await prisma.roleAssignment.updateMany({ where: { userId: bl.user.id }, data: { scope: "SUBTREE" } });
  const ctx = await ctxOf(bl.user.id);
  const mine = await mkHelper(S.berA.id, "Mia", "Meine");
  const foreign = await mkHelper(S.berB.id, "Max", "Fremd3");
  await rejects(createUser(ctx, { email: "x1@test.de", helperId: foreign.id }), 403);
  await rejects(createUser(ctx, { email: "x2@test.de" }), 403);
  const r = await createUser(ctx, { email: "x3@test.de", helperId: mine.id });
  assert.ok(r.initialPassword && r.initialPassword.length > 10);
  const u = await prisma.user.findUniqueOrThrow({ where: { id: r.id } });
  assert.ok(!u.passwordHash.includes(r.initialPassword!));
  assert.ok(u.mustChangePw);
  void mkUser;
});
