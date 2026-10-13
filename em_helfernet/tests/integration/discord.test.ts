import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { scenario, mkAccountHelper } from "./fixtures";
import { prisma } from "../../src/server/db";
import { HttpError } from "../../src/server/errors";
import { getSession } from "../../src/server/auth";
import { discordAuthorizeUrl, fetchDiscordProfile, linkDiscord, loginWithDiscord, unlinkDiscord } from "../../src/server/discord";
import { setDiscordId } from "../../src/server/services/users";
import { resetRateLimit } from "../../src/lib/rate-limit";

let S: Awaited<ReturnType<typeof scenario>>;
beforeEach(async () => { S = await scenario(); resetRateLimit(); process.env.DISCORD_CLIENT_ID = "123"; process.env.DISCORD_CLIENT_SECRET = "geheim"; });
afterEach(() => { delete process.env.DISCORD_CLIENT_ID; delete process.env.DISCORD_CLIENT_SECRET; });
const rejects = (p: Promise<unknown>, status: number) => assert.rejects(p, (e: unknown) => e instanceof HttpError && e.status === status);
const profile = (id = "123456789012345678") => ({ id, username: "maxi", globalName: "Max" });

test("Discord: nur verknüpfte Konten können sich anmelden; Verknüpfung ist eindeutig", async () => {
  const a = await mkAccountHelper(S.berA.id, "Max", "Muster");
  const b = await mkAccountHelper(S.berA.id, "Eva", "Beispiel");
  await rejects(loginWithDiscord(profile()), 401);
  await linkDiscord(a.ctx, profile());
  const r = await loginWithDiscord(profile(), { ip: "1.2.3.4" });
  assert.equal(r.status, "ok");
  assert.equal((await getSession(r.token))?.userId, a.user.id);
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: a.user.id } })).discordName, "Max (@maxi)");
  await rejects(linkDiscord(b.ctx, profile()), 409);
  await unlinkDiscord(a.ctx);
  await rejects(loginWithDiscord(profile()), 401);
});

test("Discord: 2FA bleibt Pflicht, gesperrte Konten kommen nicht rein, Initialpasswort muss nicht mehr geändert werden", async () => {
  const a = await mkAccountHelper(S.berA.id, "Tina", "Totp");
  await prisma.user.update({ where: { id: a.user.id }, data: { discordId: "223456789012345678", totpEnabled: true, mustChangePw: true } });
  const r = await loginWithDiscord(profile("223456789012345678"));
  assert.equal(r.status, "2fa");
  assert.equal((await getSession(r.token))?.twoFactorOk, false);
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: a.user.id } })).mustChangePw, false);
  await prisma.user.update({ where: { id: a.user.id }, data: { active: false } });
  await rejects(loginWithDiscord(profile("223456789012345678")), 401);
});

test("Discord: Leitung trägt Discord-ID ein (nur für verwaltete Konten, gültiges Format, eindeutig)", async () => {
  const leitung = await mkAccountHelper(S.berA.id, "Lea", "Leitung", "EINHEITENLEITER");
  const h = await mkAccountHelper(S.berA.id, "Udo", "User");
  const fremd = await mkAccountHelper(S.berB.id, "Fritz", "Fremd");
  await rejects(setDiscordId(leitung.ctx, h.user.id, "abc"), 400);
  await setDiscordId(leitung.ctx, h.user.id, "323456789012345678");
  assert.equal((await loginWithDiscord(profile("323456789012345678"))).status, "ok");
  await rejects(setDiscordId(leitung.ctx, fremd.user.id, "423456789012345678"), 403);
  await rejects(setDiscordId(S.adminCtx, fremd.user.id, "323456789012345678"), 409);
  await setDiscordId(leitung.ctx, h.user.id, "");
  await rejects(loginWithDiscord(profile("323456789012345678")), 401);
});

test("Discord: OAuth-Aufruf und Profilabruf", async () => {
  const url = new URL(discordAuthorizeUrl("login.abc"));
  assert.equal(url.host, "discord.com");
  assert.equal(url.searchParams.get("scope"), "identify");
  assert.equal(url.searchParams.get("state"), "login.abc");
  assert.match(url.searchParams.get("redirect_uri")!, /\/api\/auth\/discord\/callback$/);
  const calls: string[] = [];
  const fake = (async (input: string | URL | Request, init?: RequestInit) => {
    const u = String(input); calls.push(u);
    if (u.endsWith("/oauth2/token")) { assert.match(String(init?.body), /code=c0de/); return new Response(JSON.stringify({ access_token: "tok" })); }
    assert.equal((init?.headers as Record<string, string>).authorization, "Bearer tok");
    return new Response(JSON.stringify({ id: "523456789012345678", username: "lena", global_name: null }));
  }) as typeof fetch;
  assert.deepEqual(await fetchDiscordProfile("c0de", fake), { id: "523456789012345678", username: "lena", globalName: null });
  assert.equal(calls.length, 2);
  const failing = (async () => new Response("nope", { status: 400 })) as typeof fetch;
  await rejects(fetchDiscordProfile("x", failing), 401);
});
