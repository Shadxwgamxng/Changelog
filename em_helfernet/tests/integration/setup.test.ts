import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { resetDb } from "./fixtures";
import { prisma } from "../../src/server/db";
import { HttpError } from "../../src/server/errors";
import { needsSetup, runSetup } from "../../src/server/setup";
import { login } from "../../src/server/auth";
import { loadCtx } from "../../src/server/context";
import { createShift, getShift, listShifts } from "../../src/server/services/shifts";
import { createHelper, listHelpers } from "../../src/server/services/helpers";

const base = { orgName: "Rettungsdienst Los Santos", unitType: "SONSTIGE", email: "Chef@Example.org", password: "Sicher#Passwort1", password2: "Sicher#Passwort1" };
const rejects = (p: Promise<unknown>, status: number) => assert.rejects(p, (e: unknown) => e instanceof HttpError && e.status === status);

beforeEach(async () => { await resetDb(); delete process.env.SETUP_TOKEN; });
afterEach(() => { delete process.env.SETUP_TOKEN; });

test("Ersteinrichtung: legt Einheit, Superadmin, Rollen und Qualifikationen an – nur einmal", async () => {
  assert.equal(await needsSetup(), true);
  const { userId } = await runSetup(base);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  assert.equal(user.email, "chef@example.org");
  assert.equal(user.systemRole, "SUPERADMIN");
  assert.equal(user.mustChangePw, false);
  const units = await prisma.orgUnit.findMany();
  assert.equal(units.length, 1);
  assert.equal(units[0].path, `/${units[0].id}/`);
  assert.ok((await prisma.roleDefinition.count()) > 0);
  assert.ok((await prisma.qualificationType.count()) > 0);
  assert.equal((await login("chef@example.org", "Sicher#Passwort1")).status, "ok");
  assert.equal(await needsSetup(), false);
  await rejects(runSetup({ ...base, email: "zweiter@example.org" }), 403);
  assert.equal(await prisma.user.count(), 1);
});

test("Ersteinrichtung: Einrichtungs-Code und Eingaben werden geprüft", async () => {
  process.env.SETUP_TOKEN = "geheim123";
  await rejects(runSetup(base), 403);
  await rejects(runSetup({ ...base, token: "falsch" }), 403);
  await rejects(runSetup({ ...base, token: "geheim123", password2: "anders#Passwort1" }), 400);
  await rejects(runSetup({ ...base, token: "geheim123", password: "kurz", password2: "kurz" }), 400);
  await rejects(runSetup({ ...base, token: "geheim123", unitType: "QUATSCH" }), 400);
  assert.equal(await prisma.user.count(), 0);
  await runSetup({ ...base, token: "geheim123" });
  assert.equal(await prisma.user.count(), 1);
});

test("Ersteinrichtung: gleichzeitige Versuche legen nur einen Administrator an", async () => {
  const results = await Promise.allSettled([runSetup(base), runSetup({ ...base, email: "b@example.org" }), runSetup({ ...base, email: "c@example.org" })]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(await prisma.user.count(), 1);
  assert.equal(await prisma.orgUnit.count(), 1);
});

test("Nach der Ersteinrichtung: Superadmin sieht eigene Entwürfe und angelegte Helfer", async () => {
  const { userId } = await runSetup(base);
  const ctx = await loadCtx(userId);
  const unit = await prisma.orgUnit.findFirstOrThrow();
  const shift = await createShift(ctx, { unitId: unit.id, eventId: "", responsibleId: "", name: "Erster Dienst", kind: "SONSTIGES", startsAt: "2027-03-01T18:00", endsAt: "2027-03-01T21:00", requirements: [] });
  assert.equal(shift.status, "ENTWURF");
  assert.equal((await getShift(ctx, shift.id)).name, "Erster Dienst");
  assert.equal((await listShifts(ctx, {})).length, 1);
  await createHelper(ctx, { unitId: unit.id, firstName: "Erika", lastName: "Muster" });
  assert.equal((await listHelpers(ctx)).total, 1);
});
