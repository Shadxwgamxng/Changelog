// Entwicklungshilfe: meldet sich an und macht Screenshots.  node scripts/shot.mjs <email> <outDir> <pfad>[:mobile] ...
import { chromium } from "playwright-core";
const [email, outDir, ...paths] = process.argv.slice(2);
const base = process.env.BASE_URL || "http://localhost:3100";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const wide = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "de-DE", timezoneId: "Europe/Berlin", colorScheme: process.env.SCHEME || "dark" });
const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "de-DE", timezoneId: "Europe/Berlin", colorScheme: process.env.SCHEME || "dark" });
for (const ctx of [wide, mob]) {
  const p = await ctx.newPage();
  await p.goto(base + "/login");
  await p.fill('input[name=email]', email);
  await p.fill('input[name=password]', process.env.PW || "Demo#Passwort1");
  await p.click('button[type=submit]');
  await p.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 });
  await p.close();
}
const errors = [];
for (const spec of paths) {
  const [path, mode] = spec.split("@");
  const ctx = mode === "mobile" ? mob : wide;
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(`${path}: ${e.message}`));
  p.on("console", (m) => { if (m.type() === "error") errors.push(`${path}: console ${m.text().slice(0, 200)}`); });
  const res = await p.goto(base + path, { waitUntil: "networkidle" });
  const name = path.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "home";
  await p.screenshot({ path: `${outDir}/${name}${mode === "mobile" ? "-m" : ""}.png`, fullPage: true });
  console.log(res.status(), path, mode ?? "desktop");
  await p.close();
}
if (errors.length) console.log("FEHLER:\n" + errors.join("\n"));
await browser.close();
