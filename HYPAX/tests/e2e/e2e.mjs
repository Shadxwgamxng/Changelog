// End-to-End-Test gegen einen laufenden Server (npm run build && npm start) mit Demo-Daten (npm run db:seed).
//   BASE_URL=http://localhost:3100 node tests/e2e/e2e.mjs
import { chromium } from "playwright-core";
import assert from "node:assert/strict";

const base = process.env.BASE_URL || "http://localhost:3100";
const PW = "Demo#Passwort1";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const errors = [];
let passed = 0;
const step = async (name, fn) => { try { await fn(); passed++; console.log("  ✓", name); } catch (e) { console.log("  ✗", name, "\n    ", e.message.split("\n").slice(0, 6).join(" | ").slice(0, 400)); errors.push(name); } };

async function login(email, password = PW) {
  const ctx = await browser.newContext({ locale: "de-DE", timezoneId: "Europe/Berlin", viewport: { width: 1280, height: 900 }, baseURL: base });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`pageerror ${e.message}`));
  await page.goto("/login");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", password);
  await page.click("button[type=submit]");
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 });
  return { ctx, page };
}
const api = (ctx, method, path, body, headers = {}) => ctx.request.fetch(base + "/api/v1" + path, { method, headers: { "content-type": "application/json", origin: base, ...headers }, data: body ? JSON.stringify(body) : undefined });

console.log("Anmeldung & Sitzung");
await step("API ohne Anmeldung: 401", async () => { const r = await fetch(base + "/api/v1/helpers"); assert.equal(r.status, 401); });
await step("Seite ohne Anmeldung leitet auf /login", async () => { const r = await fetch(base + "/shifts", { redirect: "manual" }); assert.ok([307, 308].includes(r.status)); assert.match(r.headers.get("location"), /\/login/); });
await step("falsches Passwort wird abgelehnt", async () => {
  const ctx = await browser.newContext({ baseURL: base }); const p = await ctx.newPage();
  await p.goto("/login"); await p.fill("input[name=email]", "max@demo.hypax.de"); await p.fill("input[name=password]", "falsch"); await p.click("button[type=submit]");
  await p.waitForSelector("form [role=alert]"); assert.match(await p.textContent("form [role=alert]"), /falsch|gesperrt/i); await ctx.close();
});
await step("Sicherheits-Header gesetzt", async () => { const r = await fetch(base + "/login"); assert.equal(r.headers.get("x-frame-options"), "DENY"); assert.equal(r.headers.get("x-content-type-options"), "nosniff"); });

const max = await login("max@demo.hypax.de");
const planer = await login("planer@demo.hypax.de");
const leitung = await login("bereitschaft@demo.hypax.de");
const fremd = await login("fremd@demo.hypax.de");
const admin = await login("admin@demo.hypax.de");
const ben = await login("ben.brandt@demo.hypax.de");
const sara = await login("sara.sanitz@demo.hypax.de");
const tim = await login("tim.thaler@demo.hypax.de");

console.log("Dashboard");
await step("Helfer-Dashboard zeigt Begrüßung, Dienste, Qualifikationswarnung", async () => {
  await max.page.goto("/"); const t = await max.page.textContent("main");
  assert.match(t, /Guten (Morgen|Tag|Abend), Max!/); assert.match(t, /Deine nächsten Dienste/); assert.match(t, /Sanitätsdienst Stadtfest/); assert.match(t, /Sanitätshelfer.*läuft in \d+ Tagen ab/);
  assert.ok(!/Führungsübersicht/.test(t), "normale Helfer sehen keine Führungsübersicht");
});
await step("Leitungs-Dashboard zeigt Führungsübersicht", async () => { await leitung.page.goto("/"); assert.match(await leitung.page.textContent("main"), /Führungsübersicht[\s\S]*Offene Positionen/); });

console.log("Dienste: Anmeldung → Entscheidung → Besetzung");
const shiftId = (await (await api(planer.ctx, "GET", "/shifts?limit=50")).json()).find((s) => s.name === "Sanitätsdienst Stadtfest").id;
await step("Helfer ohne Qualifikation kann sich nicht anmelden", async () => {
  await tim.page.goto(`/shifts/${shiftId}`); await tim.page.click("text=Für Dienst anmelden"); await tim.page.waitForSelector("form [role=alert]");
  assert.match(await tim.page.textContent("form [role=alert]"), /Qualifikation/);
});
let before;
await step("qualifizierter Helfer meldet sich an", async () => {
  before = (await (await api(planer.ctx, "GET", `/shifts/${shiftId}`)).json()).summary;
  await ben.page.goto(`/shifts/${shiftId}`); await ben.page.click("text=Für Dienst anmelden");
  await ben.page.waitForSelector("text=Deine Anfrage wurde an den Dienstplaner übermittelt.", { timeout: 15000 });
});
await step("Planer bestätigt in der Oberfläche → Besetzung aktualisiert sich", async () => {
  before = (await (await api(planer.ctx, "GET", `/shifts/${shiftId}`)).json()).summary;
  await planer.page.goto(`/shifts/${shiftId}`);
  const row = planer.page.locator("li", { hasText: "Brandt, Ben" }).first();
  await row.getByRole("button", { name: "Bestätigen" }).click();
  await planer.page.waitForTimeout(1200);
  const after = (await (await api(planer.ctx, "GET", `/shifts/${shiftId}`)).json()).summary;
  assert.equal(after.confirmed, before.confirmed + 1);
  assert.equal(after.requested, before.requested - 1);
});
await step("Helfer sieht seine Zusage; Benachrichtigung ist angekommen", async () => {
  await ben.page.goto(`/shifts/${shiftId}`); assert.match(await ben.page.textContent("main"), /eingeteilt \/ hast zugesagt/);
  const n = await (await api(ben.ctx, "GET", "/notifications")).json(); assert.ok(n.some((x) => x.type === "DIENST_BESTAETIGT"));
});
await step("als nicht verfügbar eingetragen: Anfrage möglich, Bestätigung nur mit ausdrücklicher Ausnahme", async () => {
  await sara.page.goto(`/shifts/${shiftId}`); await sara.page.click("text=Für Dienst anmelden"); await sara.page.waitForSelector("text=Deine Anfrage wurde an den Dienstplaner übermittelt.", { timeout: 15000 });
  await planer.page.goto(`/shifts/${shiftId}`);
  const row = planer.page.locator("li", { hasText: "Sanitz, Sara" }).first();
  await row.getByRole("button", { name: "Bestätigen" }).click();
  await planer.page.waitForSelector("li:has-text('Sanitz, Sara') form p", { timeout: 15000 });
  assert.match(await row.textContent(), /nicht verfügbar/);
});
await step("Empfehlung: nur geeignete Helfer, Prozentwerte", async () => {
  const rec = await (await api(planer.ctx, "GET", `/shifts/${shiftId}/recommendation`)).json();
  const rs = rec.requirements.find((r) => r.label === "Rettungssanitäter");
  assert.ok(rs.candidates.every((c) => c.eligible && c.score >= 0 && c.score <= 100));
  assert.ok(!rs.candidates.some((c) => c.name.includes("Thaler")), "Tim ohne Qualifikation darf nicht vorgeschlagen werden");
});
await step("Helfer darf keine Empfehlung abrufen / nicht entscheiden (403)", async () => {
  assert.equal((await api(max.ctx, "GET", `/shifts/${shiftId}/recommendation`)).status(), 403);
  assert.equal((await api(max.ctx, "POST", `/shifts/${shiftId}/publish`)).status(), 403);
});

console.log("Rechte & Datenschutz über die API");
const helpersOf = async (c) => (await (await api(c.ctx, "GET", "/helpers?pageSize=100")).json()).items;
await step("Helfer sieht Kollegen ohne Kontakt-/Sensibeldaten", async () => {
  const items = await helpersOf(max); const other = items.find((h) => h.lastName === "Beispiel" && h.firstName === "Peter");
  assert.ok(other); for (const f of ["email", "phone", "birthDate", "internalNotes", "street", "memberNumber"]) assert.ok(!(f in other), f);
});
await step("Bereitschaftsleiter sieht Kontaktdaten + Notizen, nicht Fremde", async () => {
  const items = await helpersOf(leitung); const p = items.find((h) => h.firstName === "Peter");
  assert.ok(p.email && p.birthDate && "internalNotes" in p); assert.ok(!items.some((h) => h.lastName === "Fremd"));
});
await step("fremde Einheit: Helfer & Dienst unsichtbar (404), Liste leer von Fremddaten", async () => {
  const peterId = (await helpersOf(max)).find((h) => h.firstName === "Peter").id;
  assert.equal((await api(fremd.ctx, "GET", `/helpers/${peterId}`)).status(), 404);
  assert.equal((await api(fremd.ctx, "GET", `/shifts/${shiftId}`)).status(), 404);
  assert.ok(!(await helpersOf(fremd)).some((h) => h.unitName === "Bereitschaft Musterstadt"));
});
await step("Dienstplaner darf keine Helferdaten ändern (403)", async () => {
  const peterId = (await helpersOf(max)).find((h) => h.firstName === "Peter").id;
  assert.equal((await api(planer.ctx, "PATCH", `/helpers/${peterId}`, { firstName: "X" })).status(), 403);
  assert.equal((await api(planer.ctx, "DELETE", `/helpers/${peterId}`)).status(), 403);
});
await step("CSRF: fremder Origin wird abgelehnt", async () => {
  const r = await api(max.ctx, "POST", `/shifts/${shiftId}/withdraw`, {}, { origin: "https://evil.example", "sec-fetch-site": "cross-site" });
  assert.equal(r.status(), 403);
});
await step("Eingabevalidierung liefert 400 statt 500", async () => { const r = await api(leitung.ctx, "POST", "/shifts", { unitId: "x", name: "" }); assert.equal(r.status(), 400); });
await step("private Verfügbarkeitsgründe sind für Planer nicht sichtbar", async () => {
  const maxId = (await (await api(max.ctx, "GET", "/me")).json()).helperId;
  const own = await (await api(max.ctx, "GET", `/helpers/${maxId}/availability?from=2020-01-01&to=2099-01-01`)).json();
  assert.ok(own.some((e) => e.reason === "URLAUB"));
  const seen = await (await api(planer.ctx, "GET", `/helpers/${maxId}/availability?from=2020-01-01&to=2099-01-01`)).json();
  assert.ok(seen.length && seen.every((e) => !("reason" in e) && !("note" in e)));
});

console.log("Alarmierung");
await step("Rückmeldung wird live in der Leitungsansicht gezählt", async () => {
  const alerts = await (await api(leitung.ctx, "GET", "/alerts")).json(); const a = alerts.find((x) => x.status === "AKTIV");
  const before = (await (await api(leitung.ctx, "GET", `/alerts/${a.id}`)).json()).counts;
  await max.page.goto(`/alerts/${a.id}`); await max.page.getByRole("button", { name: /Ich komme$/ }).click(); await max.page.waitForTimeout(1000);
  await leitung.page.goto(`/alerts/${a.id}`); const t = await leitung.page.textContent("main");
  const after = (await (await api(leitung.ctx, "GET", `/alerts/${a.id}`)).json()).counts;
  assert.equal(after.KOMME, before.KOMME + 1); assert.match(t, /Rückmeldungen/);
});

console.log("Dokumente, Export, Kalender");
await step("Dokument hochladen, verschlüsselt ablegen, nur Berechtigte laden herunter", async () => {
  const pdf = Buffer.from("%PDF-1.4\n% e2e\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");
  await leitung.page.goto("/documents/new"); await leitung.page.fill("input[name=title]", "E2E Dienstanweisung"); await leitung.page.selectOption("select[name=category]", "DIENSTANWEISUNG"); await leitung.page.selectOption("select[name=access]", "FUEHRUNG");
  await leitung.page.setInputFiles("input[type=file]", { name: "da.pdf", mimeType: "application/pdf", buffer: pdf });
  await leitung.page.click("button[type=submit]"); await leitung.page.waitForURL(/\/documents\/(?!new)[a-z0-9]+$/);
  const id = leitung.page.url().split("/").pop();
  const ok = await leitung.ctx.request.get(`${base}/api/v1/documents/${id}/download`); assert.equal(ok.status(), 200); assert.deepEqual(Buffer.from(await ok.body()), pdf);
  assert.equal((await max.ctx.request.get(`${base}/api/v1/documents/${id}/download`)).status(), 404);
  assert.equal((await fremd.ctx.request.get(`${base}/api/v1/documents/${id}/download`)).status(), 404);
});
await step("Bericht-Export als PDF, Excel, CSV (nur mit Recht)", async () => {
  const leitungOv = await login("leitung@demo.hypax.de");
  for (const [f, magic] of [["pdf", "%PDF-"], ["xlsx", "PK"], ["csv", "﻿"]]) {
    const r = await leitungOv.ctx.request.get(`${base}/api/v1/reports/hours?format=${f}&from=2026-01-01&to=2027-12-31`); assert.equal(r.status(), 200, f);
    assert.ok((await r.body()).toString("utf8").startsWith(magic), f);
  }
  assert.equal((await max.ctx.request.get(`${base}/api/v1/reports/hours?format=pdf`)).status(), 403);
  await leitungOv.ctx.close();
});
await step("Kalender-Export (iCalendar) und persönlicher Abo-Link", async () => {
  const r = await max.ctx.request.get(`${base}/api/v1/calendar.ics?from=2026-01-01&to=2027-12-31&t=DIENST`); assert.equal(r.status(), 200);
  const ics = await r.text(); assert.match(ics, /BEGIN:VCALENDAR/); assert.match(ics, /Sanitätsdienst/);
  await max.page.goto("/account"); await max.page.getByRole("button", { name: "Kalender-Link erzeugen" }).click(); await max.page.waitForSelector("input[aria-label='Kalender-Link']");
  const url = await max.page.inputValue("input[aria-label='Kalender-Link']");
  const feed = await fetch(url.replace(/^https?:\/\/[^/]+/, base)); assert.equal(feed.status, 200); assert.match(await feed.text(), /BEGIN:VCALENDAR/);
  assert.equal((await fetch(`${base}/api/calendar/falsch-falsch-falsch-falsch.ics`)).status, 404);
});
await step("Globale Suche respektiert Rechte", async () => {
  const mine = await (await api(max.ctx, "GET", "/search?q=Beispiel")).json(); assert.ok(mine.some((h) => h.type === "Helfer"));
  assert.ok(!mine.some((h) => /Beispielstädter/.test(h.title)), "Helfer anderer Einheit werden nicht gefunden");
  assert.ok((await (await api(admin.ctx, "GET", "/search?q=Beispielstädter")).json()).length >= 1);
});
await step("Audit-Log: nur Berechtigte; Einträge für Aktionen vorhanden", async () => {
  assert.equal((await api(max.ctx, "GET", "/audit")).status(), 403);
  const a = await (await api(admin.ctx, "GET", "/audit?q=Sanitz")).json(); assert.ok(a.items.length >= 1);
});

console.log("Oberfläche: alle Hauptseiten laden ohne Fehler (Desktop + Smartphone)");
const pages = ["/", "/shifts", `/shifts/${shiftId}`, "/calendar", "/calendar?view=week", "/calendar?view=list", "/availability", "/helpers", "/qualifications", "/qualifications?tab=ablauf", "/qualifications?tab=arten", "/vehicles", "/materials", "/documents", "/messages", "/messages?tab=neu", "/messages?tab=announcements", "/notifications", "/hours", "/reports", "/reports?r=qualifications", "/alerts", "/incidents", "/events", "/admin/units", "/admin/users", "/admin/users?tab=rollen", "/admin/audit", "/account", "/search?q=Max", "/shifts/new", "/helpers/new", "/alerts/new", "/events/new", "/vehicles/new", "/materials/new", "/incidents/new"];
for (const [label, vp, who] of [["Desktop", { width: 1280, height: 900 }, admin], ["Smartphone", { width: 390, height: 844 }, leitung]]) {
  await step(`${label}: ${pages.length} Seiten`, async () => {
    const p = await who.ctx.newPage(); await p.setViewportSize(vp); const bad = []; let cur = "";
    p.on("pageerror", (e) => bad.push(`${cur}: ${e.message.slice(0, 160)}`)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) bad.push(`${cur}: ${m.text().slice(0, 160)}`); });
    for (const path of pages.filter((x) => who === admin || !x.startsWith("/admin"))) { cur = path;
      const r = await p.goto(base + path, { waitUntil: "networkidle" });
      if (r.status() >= 400) bad.push(`${path} → HTTP ${r.status()}`);
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
      if (overflow && vp.width < 500) bad.push(`${path}: horizontaler Überlauf auf dem Smartphone`);
    }
    await p.close(); assert.deepEqual(bad, []);
  });
}

for (const c of [max, planer, leitung, fremd, admin, sara, tim]) await c.ctx.close();
await browser.close();
console.log(`\n${passed} Schritte bestanden, ${errors.length} Fehler`);
process.exit(errors.length ? 1 : 0);
