import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { scenario, mkUser } from "./fixtures";
import { prisma } from "../../src/server/db";
import { HttpError } from "../../src/server/errors";
import { beginTotpSetup, changePassword, completeTwoFactor, confirmTotpSetup, ctxFromToken, disableTotp, getSession, login, logout } from "../../src/server/auth";
import { loadCtx } from "../../src/server/context";
import { decryptString } from "../../src/lib/crypto";
import { totpAt } from "../../src/lib/totp";
import { resetRateLimit } from "../../src/lib/rate-limit";
import { sha256 } from "../../src/lib/crypto";

beforeEach(async () => { await scenario(); resetRateLimit(); });
const rejects = (p: Promise<unknown>, status: number) => assert.rejects(p, (e: unknown) => e instanceof HttpError && e.status === status);

test("Login, Session, Logout – Token wird nie im Klartext gespeichert", async () => {
  const u = await mkUser("anna@test.de", { password: "Sicher#Passwort1" });
  const r = await login("ANNA@test.de ", "Sicher#Passwort1", { ip: "1.1.1.1" });
  assert.equal(r.status, "ok");
  const sess = await prisma.session.findMany();
  assert.equal(sess.length, 1);
  assert.notEqual(sess[0].id, (r as { token: string }).token);
  assert.equal(sess[0].id, sha256((r as { token: string }).token));
  assert.equal((await ctxFromToken((r as { token: string }).token))!.userId, u.id);
  await logout((r as { token: string }).token);
  assert.equal(await getSession((r as { token: string }).token), null);
  assert.equal(await ctxFromToken("quatsch"), null);
});

test("Falsche Anmeldedaten: einheitliche Fehlermeldung, Sperre nach 5 Versuchen", async () => {
  await mkUser("bob@test.de", { password: "Sicher#Passwort1" });
  const msgs = new Set<string>();
  for (const [mail, pw] of [["bob@test.de", "falsch"], ["gibtsnicht@test.de", "falsch"]]) {
    try { await login(mail, pw); } catch (e) { msgs.add((e as Error).message); }
  }
  assert.equal(msgs.size, 1, "kein Hinweis, ob die E-Mail existiert");
  for (let i = 0; i < 4; i++) await login("bob@test.de", "falsch").catch(() => {});
  await rejects(login("bob@test.de", "Sicher#Passwort1"), 401); // gesperrt, auch mit richtigem Passwort
  const u = await prisma.user.findUniqueOrThrow({ where: { email: "bob@test.de" } });
  assert.ok(u.lockedUntil && u.lockedUntil > new Date());
  await prisma.user.update({ where: { id: u.id }, data: { lockedUntil: new Date(Date.now() - 1000) } });
  assert.equal((await login("bob@test.de", "Sicher#Passwort1")).status, "ok");
  assert.ok(await prisma.auditLog.findFirst({ where: { action: "auth.locked" } }));
});

test("Rate-Limit pro IP", async () => {
  for (let i = 0; i < 30; i++) await login(`x${i}@test.de`, "falsch", { ip: "9.9.9.9" }).catch(() => {});
  await rejects(login("x@test.de", "falsch", { ip: "9.9.9.9" }), 429);
});

test("Inaktivitäts-Timeout und deaktivierte Konten", async () => {
  const u = await mkUser("cy@test.de", { password: "Sicher#Passwort1" });
  const { token } = (await login("cy@test.de", "Sicher#Passwort1")) as { token: string };
  assert.ok(await getSession(token));
  await prisma.session.updateMany({ data: { lastSeenAt: new Date(Date.now() - 31 * 60_000) } });
  assert.equal(await getSession(token), null, "nach 30 Min. Inaktivität abgemeldet");
  assert.equal(await prisma.session.count(), 0);
  const t2 = ((await login("cy@test.de", "Sicher#Passwort1")) as { token: string }).token;
  await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
  assert.equal(await getSession(t2), null, "absolutes Ablaufdatum");
  const t3 = ((await login("cy@test.de", "Sicher#Passwort1")) as { token: string }).token;
  await prisma.user.update({ where: { id: u.id }, data: { active: false } });
  assert.equal(await ctxFromToken(t3), null);
  await rejects(login("cy@test.de", "Sicher#Passwort1"), 401);
  await assert.rejects(loadCtx(u.id));
});

test("2FA: Einrichtung, Login-Zwang, Wiederherstellungscode nur einmal nutzbar", async () => {
  const u = await mkUser("dee@test.de", { password: "Sicher#Passwort1" });
  let ctx = await loadCtx(u.id);
  const { secret } = await beginTotpSetup(ctx);
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).totpEnabled, false);
  await assert.rejects(confirmTotpSetup(ctx, "000000"));
  const codes = await confirmTotpSetup(ctx, totpAt(secret, Date.now()));
  assert.equal(codes.length, 8);
  const stored = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
  assert.ok(stored.totpEnabled && stored.totpSecretEnc && !stored.totpSecretEnc.includes(secret));
  assert.equal(decryptString(stored.totpSecretEnc!), secret);
  assert.ok(!stored.recoveryHashes.includes(codes[0]), "Codes nur als Hash");

  const r = await login("dee@test.de", "Sicher#Passwort1");
  assert.equal(r.status, "2fa");
  const token = (r as { token: string }).token;
  assert.equal(await ctxFromToken(token), null, "ohne 2. Faktor kein Zugriff");
  await rejects(completeTwoFactor(token, "123456"), 401);
  await completeTwoFactor(token, totpAt(secret, Date.now()));
  assert.ok(await ctxFromToken(token));

  const r2 = (await login("dee@test.de", "Sicher#Passwort1")) as { token: string };
  await completeTwoFactor(r2.token, codes[0]);
  assert.ok(await ctxFromToken(r2.token));
  const r3 = (await login("dee@test.de", "Sicher#Passwort1")) as { token: string };
  await rejects(completeTwoFactor(r3.token, codes[0]), 401); // schon verbraucht

  ctx = await loadCtx(u.id);
  await assert.rejects(disableTotp(ctx, "falsch"));
  await disableTotp(ctx, "Sicher#Passwort1");
  assert.equal((await login("dee@test.de", "Sicher#Passwort1")).status, "ok");
});

test("Passwortwechsel: Richtlinie, altes Passwort nötig, andere Sitzungen werden beendet", async () => {
  const u = await mkUser("eve@test.de", { password: "Sicher#Passwort1" });
  const t1 = ((await login("eve@test.de", "Sicher#Passwort1")) as { token: string }).token;
  const t2 = ((await login("eve@test.de", "Sicher#Passwort1")) as { token: string }).token;
  const ctx = await loadCtx(u.id);
  await assert.rejects(changePassword(ctx, "falsch", "Neues#Passwort22", t1), /aktuelle Passwort/);
  await assert.rejects(changePassword(ctx, "Sicher#Passwort1", "kurz", t1), /Passwort braucht/);
  await assert.rejects(changePassword(ctx, "Sicher#Passwort1", "Sicher#Passwort1", t1), /unterscheiden/);
  await changePassword(ctx, "Sicher#Passwort1", "Neues#Passwort22", t1);
  assert.ok(await getSession(t1));
  assert.equal(await getSession(t2), null);
  await rejects(login("eve@test.de", "Sicher#Passwort1"), 401);
  assert.equal((await login("eve@test.de", "Neues#Passwort22")).status, "ok");
});
