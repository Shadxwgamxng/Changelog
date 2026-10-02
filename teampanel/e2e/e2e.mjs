/**
 * Browser-End-to-End-Test (Desktop + Smartphone-Viewport) gegen eine laufende Instanz mit Demo-Daten.
 *
 * Voraussetzungen: `npm run db:seed` (frische Demo-Daten), App läuft (`npm run build && npm start`),
 * Chromium vorhanden. Aufruf:
 *   BASE_URL=http://localhost:3000 CHROME_PATH=/pfad/zu/chrome npm run test:e2e
 * Der Test legt Daten mit zufälligem Suffix an; zum Zurücksetzen `SEED_FORCE=true npm run db:seed`.
 */
import { chromium } from "playwright-core";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const exe = process.env.CHROME_PATH || undefined;
const base = process.env.BASE_URL || "http://localhost:3000";
const PW = process.env.SEED_DEMO_PASSWORD || "DEMO-Passwort-2026!";
{
  // Rate-Limit-Zähler früherer Läufe löschen, sonst sperrt die IP-Begrenzung die Test-Logins
  const db = new PrismaClient();
  await db.rateLimit.deleteMany();
  await db.$disconnect();
}
const stamp = Date.now().toString(36);
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
let failures = 0;
const results = [];
process.on("exit", () => console.log("\n" + results.join("\n")));
function check(name, cond, extra = "") {
  results.push(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : "  ← " + extra}`);
  if (!cond) failures++;
}

async function newPage(viewport = { width: 1280, height: 900 }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { console.log("PAGEERROR", e.message); failures++; });
  return { ctx, page };
}
async function login(page, id, pw = PW) {
  await page.goto(base + "/login");
  await page.fill("input[name=identifier]", id);
  await page.fill("input[name=password]", pw);
  await page.click("button[type=submit]");
}
async function loginOk(page, id, pw = PW) {
  await login(page, id, pw);
  await page.waitForURL(base + "/", { timeout: 15000 });
  await page.waitForSelector("h1");
}
const dialog = (page) => page.locator("dialog[open]");
async function goto(page, path) {
  const r = await page.goto(base + path);
  await page.waitForLoadState("domcontentloaded");
  await page.waitForSelector("h1", { timeout: 15000 });
  return r;
}
async function toastText(page) {
  const t = page.locator('[aria-live="polite"] [role=status], [aria-live="polite"] [role=alert]').first();
  await t.waitFor({ timeout: 8000 });
  return (await t.innerText()).trim();
}

// ───────────── 1) Login / Rate limit / geschützte Seiten ─────────────
{
  const { ctx, page } = await newPage();
  await login(page, "member@example.local", "falsches-passwort-1");
  await page.waitForSelector('form [role=alert]');
  check("Login mit falschem Passwort zeigt generischen Fehler", (await page.locator('form [role=alert]').innerText()).includes("Benutzername oder Passwort ist falsch"));
  for (let i = 0; i < 9; i++) {
    await page.fill("input[name=identifier]", `ratelimit-${stamp}`);
    await page.fill("input[name=password]", "x");
    await page.click("button[type=submit]");
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(500);
  check("Rate Limit sperrt nach Fehlversuchen", (await page.locator('form [role=alert]').innerText()).includes("Zu viele Fehlversuche"));
  const r = await ctx.request.get(base + "/admin", { maxRedirects: 0 });
  check("Geschützte Seite ohne Login → Redirect zum Login", r.status() === 307 && r.headers()["location"]?.endsWith("/login"), `${r.status()}`);
  const f = await ctx.request.get(base + "/api/files/avatars/00000000000000000000000000000000.png");
  check("Dateiauslieferung ohne Login → 401", f.status() === 401, `${f.status()}`);
  const up = await ctx.request.post(base + "/api/upload", { multipart: { kind: "avatars", file: { name: "x.png", mimeType: "image/png", buffer: Buffer.from("x") } } });
  check("Upload ohne Login → 401", up.status() === 401, `${up.status()}`);
  await ctx.close();
}

// ───────────── 2) Mitglied: Rollenrechte, Zu-/Absage, Logout ─────────────
let memberCtx;
{
  const { ctx, page } = await newPage({ width: 390, height: 844 });
  memberCtx = ctx;
  await loginOk(page, "member@example.local");
  check("Dashboard begrüßt mit „Moin, Jonas!“", (await page.locator("h1").innerText()).toLowerCase().includes("moin, jonas"));
  const navText = await page.locator("nav[aria-label=Hauptnavigation], body").first().innerText();
  await page.getByRole("button", { name: "Menü öffnen" }).click();
  check("Mitglied sieht keine „Administration“ im Menü", !(await page.locator('[role=dialog]').innerText()).includes("Administration"));
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Menü schließen" }).first().click().catch(() => {});

  for (const p of ["/admin", "/admin/members", "/admin/audit", "/admin/team", "/admin/requirements", "/events/new", `/admin/members/xyz`]) {
    const r = await page.goto(base + p);
    await page.waitForSelector("text=/nicht gefunden/i", { timeout: 8000 }).catch(() => {});
    const body = await page.locator("body").innerText();
    check(`Mitglied: ${p} nicht erreichbar`, r.status() === 404 && body.toLowerCase().includes("nicht gefunden"), `${r.status()}`);
  }

  // Zu-/Absage per Dashboard (Handy)
  await goto(page, "/");
  const decline = page.getByRole("button", { name: "Absagen" }).first();
  await decline.click();
  await page.waitForFunction(() => document.querySelector('button[aria-pressed="true"]')?.textContent?.includes("Absagen"), null, { timeout: 8000 });
  check("Absage per Handy-Button gespeichert", true);
  await page.getByRole("button", { name: "Zusagen" }).first().click();
  await page.waitForFunction(() => document.querySelector('button[aria-pressed="true"]')?.textContent?.includes("Zusagen"), null, { timeout: 8000 });
  check("Zusage per Handy-Button gespeichert", true);

  // Ausrüstung: Status ändern
  await goto(page, "/equipment");
  const sel = page.locator("select[aria-label^='Status für Funkgerät']");
  await sel.selectOption("ORDERED");
  await page.waitForTimeout(800);
  await page.reload();
  await page.waitForSelector("h1");
  check("Eigene Ausrüstung: Status „Bestellt“ persistiert", (await page.locator("select[aria-label^='Status für Funkgerät']").inputValue()) === "ORDERED");
  await page.locator("select[aria-label^='Status für Funkgerät']").selectOption("MISSING");
  await page.waitForTimeout(600);

  // Mobile Layout: kein horizontaler Überlauf
  for (const p of ["/", "/events", "/equipment", "/calendar", "/team", "/announcements", "/shopping", "/shopping/team", "/profile"]) {
    await goto(page, p);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`Mobil: ${p} ohne horizontalen Überlauf`, overflow <= 1, `${overflow}px`);
  }

  // Profil bearbeiten
  await goto(page, "/profile");
  await page.fill("input[name=bio]", "").catch(() => {});
  await page.fill("textarea[name=bio]", `Bio ${stamp}`);
  await page.getByRole("button", { name: "Profil speichern" }).click();
  check("Profil speichern → Erfolgsmeldung", (await toastText(page)).includes("Profil gespeichert"));

  // Logout
  await page.getByRole("button", { name: "Menü öffnen" }).first().click();
  await page.getByRole("button", { name: "Abmelden" }).click();
  await page.waitForURL(/\/login/);
  await page.goto(base + "/");
  check("Nach Logout ist das Dashboard geschützt", page.url().endsWith("/login"));
}

// ───────────── 3) Admin: Mitglieder, Events, Ausrüstung, Einkauf, News ─────────────
const adm = await newPage();
const page = adm.page;
await loginOk(page, "admin@example.local");
check("Admin sieht „Administration“", (await page.locator("aside").innerText()).includes("Administration"));

// Mitglied anlegen
const newUser = `test${stamp}`;
await goto(page, "/admin/members");
await page.getByRole("button", { name: "Mitglied hinzufügen" }).click();
let d = dialog(page);
await d.locator("input[name=firstName]").fill("Test");
await d.locator("input[name=lastName]").fill("Mitglied");
await d.locator("input[name=callsign]").fill(`Tester${stamp.slice(-3)}`);
await d.locator("input[name=username]").fill(newUser);
await d.locator("input[name=email]").fill(`${newUser}@example.local`);
await d.getByRole("button", { name: "Mitglied anlegen" }).click();
await d.getByText("Mitglied angelegt").waitFor({ timeout: 10000 });
const creds = await d.locator("input[readonly]").evaluateAll((els) => els.map((e) => e.value));
check("Mitglied anlegen liefert Zugangsdaten", creds.length === 2 && creds[0] === newUser && creds[1].length >= 12, JSON.stringify(creds));
const tempPw = creds[1];
await d.getByRole("button", { name: "Fertig" }).click();
await page.reload();
check("Neues Mitglied erscheint in der Verwaltung", (await page.locator("table").first().innerText()).includes(`@${newUser}`));

// Doppelter Benutzername → Fehler
await page.getByRole("button", { name: "Mitglied hinzufügen" }).click();
d = dialog(page);
await d.locator("input[name=firstName]").fill("Dup");
await d.locator("input[name=lastName]").fill("Licate");
await d.locator("input[name=username]").fill(newUser);
await d.locator("input[name=email]").fill(`dup-${newUser}@example.local`);
await d.getByRole("button", { name: "Mitglied anlegen" }).click();
await d.getByText("Benutzername ist bereits vergeben").first().waitFor({ timeout: 8000 });
check("Doppelter Benutzername wird abgelehnt (verständliche Meldung)", true);
await page.keyboard.press("Escape");

// Admin darf keinen ADMIN/SUPERADMIN vergeben
await page.getByRole("button", { name: "Mitglied hinzufügen" }).click();
d = dialog(page);
const roleOpts = await d.locator("select[name=role] option").allInnerTexts();
check("Admin kann nur Teamleitung/Mitglied vergeben", JSON.stringify(roleOpts.sort()) === JSON.stringify(["Mitglied", "Teamleitung"]), JSON.stringify(roleOpts));
await page.keyboard.press("Escape");

// Rolle ändern (Teamleitung) über Detailseite
await goto(page, "/admin/members?q=" + newUser);
await page.getByRole("button", { name: /Aktionen für/ }).click();
await page.getByRole("menuitem", { name: "Bearbeiten" }).click();
await page.waitForURL(/\/admin\/members\//);
await page.waitForSelector("select[name=role]");
await page.selectOption("select[name=role]", "TEAMLEITUNG");
await page.fill("textarea[name=adminNotes]", `Geheime Notiz ${stamp}`);
await page.getByRole("button", { name: "Speichern" }).first().click();
check("Rolle ändern → Erfolgsmeldung", (await toastText(page)).includes("Mitglied gespeichert"));
const memberDetailUrl = page.url();
const memberId = memberDetailUrl.split("/").pop();

// Passwort-Link erzeugen
await goto(page, "/admin/members?q=" + newUser);
await page.getByRole("button", { name: /Aktionen für/ }).click();
await page.getByRole("menuitem", { name: "Passwort-Link erstellen" }).click();
await dialog(page).locator("input[readonly]").waitFor();
const resetUrl = await dialog(page).locator("input[readonly]").inputValue();
check("Admin kann Passwort-Link erzeugen", resetUrl.includes("/reset-password/"));
await page.keyboard.press("Escape");

// Event erstellen
const evTitle = `E2E Spieltag ${stamp}`;
await goto(page, "/events/new");
await page.fill("input[name=title]", evTitle);
await page.fill("input[name=startsAt]", "2026-12-12T09:00");
await page.fill("input[name=endsAt]", "2026-12-12T17:00");
await page.fill("input[name=location]", "Testgelände");
await page.fill("input[name=maxParticipants]", "2");
await page.fill("input[name=cost]", "12,50");
await page.getByRole("button", { name: "Termin erstellen" }).click();
await page.waitForURL(/\/events\/(?!new)[a-z0-9]+$/, { timeout: 15000 });
await page.waitForSelector("h1");
check("Spieltag erstellen → Detailseite", (await page.locator("h1").innerText()).includes(evTitle.toUpperCase()) || (await page.locator("h1").innerText()).toLowerCase().includes(evTitle.toLowerCase()));
check("Event: Kosten formatiert", (await page.locator("main").innerText()).includes("12,50"));
const evUrl = page.url();
const evId = evUrl.split("/").pop();

// Teilnehmerlimit: Admin + (neues Mitglied) + Ghost → 3. Zusage muss scheitern
await page.getByRole("button", { name: "Zusagen" }).first().click();
await page.waitForFunction(() => document.querySelector('button[aria-pressed="true"]')?.textContent?.includes("Zusagen"));
// Admin trägt neues Mitglied ein
check("Admin sieht Teilnehmerübersicht inkl. „Noch keine Antwort“", (await page.locator("main").innerText()).toLowerCase().includes("noch keine antwort"));
await page.getByRole("button", { name: `Teilnahme von ${"Tester" + stamp.slice(-3)} bearbeiten` }).click();
d = dialog(page);
await d.locator("input[value=ACCEPTED]").check({ force: true });
await d.locator("input[name=canDrive]").check();
await d.locator("input[name=freeSeats]").fill("3");
await d.getByRole("button", { name: "Antwort speichern" }).click();
await page.waitForTimeout(1200);
check("Admin trägt Teilnahme für Mitglied ein", (await page.locator("table").first().innerText()).includes("Tester"));

// Termin im Kalender + Liste
await goto(page, "/calendar?m=2026-12&view=month");
check("Kalender (Monat) zeigt Event", (await page.locator("main").innerText()).toLowerCase().includes(evTitle.toLowerCase()));
await goto(page, "/calendar?m=2026-12&view=list");
check("Kalender (Liste) zeigt Event", (await page.locator("main").innerText()).toLowerCase().includes(evTitle.toLowerCase()));
await goto(page, `/events?range=all&q=${stamp}`);
check("Eventsuche/Filter funktioniert", (await page.locator("main").innerText()).toLowerCase().includes(evTitle.toLowerCase()));

// Ausrüstung erstellen
const eqName = `E2E Funkgerät ${stamp}`;
await goto(page, "/equipment/catalog");
await page.getByRole("button", { name: "Neue Ausrüstung" }).click();
d = dialog(page);
await d.locator("input[name=name]").fill(eqName);
await d.locator("select[name=category]").selectOption("RADIO");
await d.locator("input[name=required]").check();
await d.locator("input[name=price]").fill("49,99");
await d.locator("input[name=shopUrl]").fill("https://example.com/produkt");
await d.getByRole("button", { name: "Anlegen" }).click();
check("Ausrüstung erstellen → Erfolg", (await toastText(page)).includes("Ausrüstung angelegt"));
await page.reload();
await page.waitForSelector("h1");
const card = page.locator("article, div.panel").filter({ hasText: eqName }).first();
check("Ausrüstung im Katalog sichtbar mit Preis & Shop-Link", (await card.innerText()).includes("49,99") && (await page.locator(`a[href="https://example.com/produkt"][target=_blank]`).count()) > 0);
check("Shop-Link hat rel=noopener", ((await page.locator(`a[href="https://example.com/produkt"]`).first().getAttribute("rel")) || "").includes("noopener"));

// Anforderung zuweisen (an neues Mitglied)
await goto(page, "/admin/requirements");
const form = page.locator("main form").first();
await form.getByLabel(/Tester/).check();
await form.getByLabel(eqName).check();
await form.getByRole("button", { name: "Zuweisen" }).click();
check("Ausrüstung zuweisen → Erfolg", (await toastText(page)).includes("Anforderung"));

// Shopping: Team-Artikel
const shopName = `E2E Artikel ${stamp}`;
await goto(page, "/shopping/team");
await page.getByRole("button", { name: "Artikel hinzufügen" }).click();
d = dialog(page);
await d.locator("input[name=name]").fill(shopName);
await d.locator("select[name=equipmentId]").selectOption({ label: eqName });
await d.locator("input[name=url]").fill("https://example.com/shop");
await d.getByRole("button", { name: "Hinzufügen" }).click();
await toastText(page);
await page.reload();
await page.waitForSelector("h1");
const shopCard = page.locator("div.panel").filter({ hasText: shopName }).first();
check("Einkaufsartikel zeigt Bedarf („N Mitglieder benötigen“)", /Mitglied(er)? benötigen? diesen Artikel/.test(await shopCard.innerText()), await shopCard.innerText());

// Ankündigung (dringend)
const annTitle = `E2E Dringend ${stamp}`;
await goto(page, "/announcements");
await page.getByRole("button", { name: "Neue Ankündigung" }).click();
d = dialog(page);
await d.locator("input[name=title]").fill(annTitle);
await d.locator("textarea[name=body]").fill("<script>alert(1)</script> Text mit HTML");
await d.locator("select[name=priority]").selectOption("URGENT");
await d.getByRole("button", { name: "Veröffentlichen" }).click();
check("Ankündigung veröffentlichen → Erfolg", (await toastText(page)).includes("veröffentlicht"));
await page.reload();
check("XSS: HTML in Ankündigung wird als Text dargestellt", (await page.locator("main").innerText()).includes("<script>alert(1)</script>"));

// Einladungslink
await goto(page, "/admin/members");
await page.getByRole("button", { name: "Einladungslink" }).click();
d = dialog(page);
await d.getByRole("button", { name: "Link erzeugen" }).click();
await d.locator("input[readonly]").waitFor();
const inviteUrl = await d.locator("input[readonly]").inputValue();
check("Einladungslink erzeugt", inviteUrl.includes("/register/"));
await page.keyboard.press("Escape");

// Audit-Log
await goto(page, "/admin/audit");
const auditText = await page.locator("main").innerText();
const auditLower = auditText.toLowerCase();
check("Audit-Log: Rolle geändert", auditText.includes("hat") && auditText.includes("die Rolle Teamleitung gegeben"));
check("Audit-Log: Spieltag erstellt", auditText.includes(`hat den Termin „${evTitle}“`));
check("Audit-Log: Ausrüstung zugewiesen", auditText.includes(`${eqName} zu `));
await goto(page, "/admin");
check("Admin-Dashboard zeigt Kennzahlen", (await page.locator("main").innerText()).includes("OFFENE ANFORDERUNGEN") || (await page.locator("main").innerText()).toLowerCase().includes("offene anforderungen"));

// ───────────── 4) Neuer User: Erstlogin, Rolle Teamleitung, Passwortwechsel ─────────────
{
  const { ctx, page: p2 } = await newPage();
  await loginOk(p2, newUser, tempPw);
  check("Neues Mitglied kann sich anmelden", true);
  check("Hinweis zum vorläufigen Passwort sichtbar", (await p2.locator("main").innerText()).includes("vorläufiges Passwort"));
  check("Teamleitung sieht Administration", (await p2.locator("aside").innerText()).includes("Administration"));
  await p2.goto(base + "/admin/audit");
  check("Teamleitung: Audit-Log gesperrt (404)", (await p2.locator("body").innerText()).toLowerCase().includes("nicht gefunden"));
  await goto(p2, "/admin/members");
  check("Teamleitung: Mitgliederübersicht sichtbar", (await p2.locator("main").innerText()).toLowerCase().includes("teammitglieder"));
  check("Teamleitung: kein „Mitglied hinzufügen“", (await p2.getByRole("button", { name: "Mitglied hinzufügen" }).count()) === 0);
  await goto(p2, `/team/${memberId}`);
  check("Teamleitung sieht eigene Notiz nicht (Admin-Notizen nur Admin)", !(await p2.locator("main").innerText()).includes("Geheime Notiz"));
  await goto(p2, "/shopping");
  check("Persönliche Einkaufsliste zeigt zugewiesene Ausrüstung", (await p2.locator("main").innerText()).toLowerCase().includes(eqName.toLowerCase()));
  await goto(p2, "/profile?tab=password");
  await p2.fill("input[name=current]", tempPw);
  await p2.fill("input[name=password]", "NeuesPasswort-2026x");
  await p2.fill("input[name=confirm]", "NeuesPasswort-2026x");
  await p2.getByRole("button", { name: "Passwort ändern" }).click();
  check("Passwort ändern → Erfolg", (await toastText(p2)).includes("Passwort geändert"));
  await ctx.close();
  const { ctx: c3, page: p3 } = await newPage();
  await login(p3, newUser, tempPw);
  await p3.waitForSelector('form [role=alert]');
  check("Altes Passwort funktioniert nach Änderung nicht mehr", true);
  await loginOk(p3, newUser, "NeuesPasswort-2026x");
  check("Login mit neuem Passwort", true);
  // Admin-Notizen: Admin sieht, Teamleitung nicht
  await c3.close();
}

// Passwort-Reset über Link
{
  const { ctx, page: p } = await newPage();
  await p.goto(resetUrl);
  await p.waitForSelector("h2");
  await p.fill("input[name=password]", "ResetPasswort-2026y");
  await p.fill("input[name=confirm]", "ResetPasswort-2026y");
  await p.getByRole("button", { name: "Passwort speichern" }).click();
  await p.waitForURL(/\/login/, { timeout: 10000 });
  await loginOk(p, newUser, "ResetPasswort-2026y");
  check("Passwort-Reset per Link funktioniert", true);
  await p.goto(resetUrl);
  check("Reset-Link ist nur einmal verwendbar", (await p.locator("body").innerText()).includes("ungültig"));
  await ctx.close();
}

// Registrierung über Einladung
{
  const { ctx, page: p } = await newPage();
  const regUser = `reg${stamp}`;
  await p.goto(inviteUrl);
  await p.waitForSelector("h2");
  await p.fill("input[name=firstName]", "Neu");
  await p.fill("input[name=lastName]", "Rekrut");
  await p.fill("input[name=username]", regUser);
  await p.fill("input[name=email]", `${regUser}@example.local`);
  await p.fill("input[name=password]", "Rekrut-Passwort-2026");
  await p.fill("input[name=confirm]", "Rekrut-Passwort-2026");
  await p.getByRole("button", { name: "Konto erstellen" }).click();
  await p.waitForURL(base + "/", { timeout: 15000 });
  check("Registrierung per Einladungslink", true);
  const { ctx: c2, page: p2 } = await newPage();
  await p2.goto(inviteUrl);
  check("Einladungslink nur einmal nutzbar", (await p2.locator("body").innerText()).includes("ungültig"));
  await c2.close();
  // Neuer Rekrut (Mitglied): Zusagen scheitert, wenn Event voll (max 2: Admin + Tester)
  await goto(p, `/events/${evId}`);
  const accept = p.getByRole("button", { name: "Zusagen" }).first();
  check("Event voll: „Zusagen“ ist gesperrt", await accept.isDisabled());
  check("Event zeigt Status „Voll“", (await p.locator("main").innerText()).toLowerCase().includes("voll"));
  await ctx.close();
}

// Ghost: dringende Ankündigung auf dem Dashboard
{
  const { ctx, page: p } = await newPage();
  await loginOk(p, "member@example.local");
  check("Dringende Ankündigung fällt im Dashboard auf", (await p.locator("main").innerText()).toLowerCase().includes(annTitle.toLowerCase()));
  await ctx.close();
}

// ───────────── 5) Umgehungsversuche: Server Action als Mitglied replizieren ─────────────
{
  // Aktion „createEvent“ als Admin abgreifen
  let captured = null;
  adm.page.on("request", (req) => {
    const h = req.headers();
    if (req.method() === "POST" && h["next-action"] && req.url().includes("/events/new")) captured = { url: req.url(), headers: h, body: req.postDataBuffer() };
  });
  await goto(adm.page, "/events/new");
  await adm.page.fill("input[name=title]", `Capture ${stamp}`);
  await adm.page.fill("input[name=startsAt]", "2026-12-20T10:00");
  await adm.page.fill("input[name=location]", "X");
  await adm.page.getByRole("button", { name: "Termin erstellen" }).click();
  await adm.page.waitForURL(/\/events\/(?!new)[a-z0-9]+$/);
  check("Server-Action-Request abgegriffen", Boolean(captured));
  const { ctx, page: p } = await newPage();
  await loginOk(p, "member@example.local");
  const cookies = await ctx.cookies();
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  const headers = { ...captured.headers, cookie: cookieHeader };
  delete headers["content-length"];
  const res = await ctx.request.post(captured.url, { headers, data: captured.body });
  const text = await res.text();
  check("Manipulierter Request (Mitglied → createEvent) wird serverseitig abgelehnt", text.includes("Berechtigung") && !text.includes('"id"'), text.slice(0, 300));
  const events = await ctx.request.get(base + "/events?range=all&q=Capture");
  check("…und es wurde kein zweites Event angelegt (nur das des Admins existiert)", ((await events.text()).match(new RegExp(`>Capture ${stamp}<`, "gi")) || []).length === 1);
  // Pfad-Traversal Dateiauslieferung
  const t = await ctx.request.get(base + "/api/files/..%2F..%2F.env");
  check("Pfad-Traversal auf /api/files blockiert", t.status() === 404, `${t.status()}`);
  const evil = await ctx.request.post(base + "/api/upload", { multipart: { kind: "team", file: { name: "x.png", mimeType: "image/png", buffer: Buffer.from("PNG") } } });
  check("Upload „team“ als Mitglied → 403", evil.status() === 403, `${evil.status()}`);
  const svg = await ctx.request.post(base + "/api/upload", { multipart: { kind: "avatars", file: { name: "x.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg onload=alert(1)></svg>") } } });
  check("Upload von SVG/Nicht-Bild wird abgelehnt (400)", svg.status() === 400, `${svg.status()}`);
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  const good = await ctx.request.post(base + "/api/upload", { multipart: { kind: "avatars", file: { name: "a.png", mimeType: "image/png", buffer: png } } });
  const gj = await good.json();
  check("Upload gültiges PNG → URL", good.status() === 200 && gj.url?.startsWith("/api/files/avatars/"), JSON.stringify(gj));
  const got = await ctx.request.get(base + gj.url);
  check("Hochgeladenes Bild abrufbar (nosniff, image/png)", got.status() === 200 && got.headers()["content-type"] === "image/png" && got.headers()["x-content-type-options"] === "nosniff");
  await ctx.close();
}

// Cookie-Flags
{
  const { ctx, page: p } = await newPage();
  await loginOk(p, "member@example.local");
  const c = (await ctx.cookies()).find((x) => x.name === "shak_session");
  check("Session-Cookie: HttpOnly + SameSite=Lax", c?.httpOnly === true && c?.sameSite === "Lax", JSON.stringify(c));
  await ctx.close();
}

await browser.close();
console.log(`\n${results.length - failures} / ${results.length} bestanden, ${failures} fehlgeschlagen`);
process.exit(failures ? 1 : 0);
