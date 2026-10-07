// HelferNet lokal betreiben – ohne Docker. Plattformunabhängig (Windows, macOS, Linux).
//   node scripts/local.mjs            Demo-Daten beim ersten Start
//   node scripts/local.mjs --no-demo  ohne Demo-Daten
// Ist unter DATABASE_URL (.env) schon eine PostgreSQL-Datenbank erreichbar, wird sie genutzt.
// Sonst startet das Skript eine eingebettete PostgreSQL-Instanz (Daten in ./pgdata).
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
const noDemo = process.argv.includes("--no-demo");
const PORT = process.env.PORT || "3000";
const log = (m) => console.log(`\n▶ ${m}`);
const run = (cmd, args, env = {}) => {
  const r = process.platform === "win32"
    ? spawnSync([cmd, ...args].join(" "), { stdio: "inherit", shell: true, env: { ...process.env, ...env } })
    : spawnSync(cmd, args, { stdio: "inherit", env: { ...process.env, ...env } });
  if (r.status !== 0) throw new Error(`Befehl fehlgeschlagen: ${cmd} ${args.join(" ")}`);
};

// 1) Konfiguration
if (!existsSync(".env")) {
  writeFileSync(".env", `DATABASE_URL="postgresql://hypax:hypax@localhost:5432/hypax?schema=public"\n`);
  log(".env angelegt");
}
let env = readFileSync(".env", "utf8");
const has = (k) => new RegExp(`^${k}=`, "m").test(env);
const add = (k, v) => { appendFileSync(".env", `${env.endsWith("\n") ? "" : "\n"}${k}="${v}"\n`); env += `${k}="${v}"\n`; };
if (!has("APP_URL")) add("APP_URL", `http://localhost:${PORT}`);
if (!has("APP_ENCRYPTION_KEY")) { add("APP_ENCRYPTION_KEY", randomBytes(32).toString("base64")); log("Verschlüsselungsschlüssel erzeugt – gut aufbewahren: ohne ihn sind Dokumente unlesbar (.env sichern!)"); }
if (!has("STORAGE_DIR")) add("STORAGE_DIR", "./storage");
if (!has("CRON_SECRET")) add("CRON_SECRET", randomBytes(24).toString("hex"));
const dbUrl = new URL(/^DATABASE_URL="?([^"\n]+)"?/m.exec(env)?.[1] ?? "");
const dbPort = Number(dbUrl.port || 5432);

// 2) Datenbank
const reachable = (port, host = "127.0.0.1") => new Promise((res) => { const s = net.connect({ port, host }); s.once("connect", () => { s.destroy(); res(true); }); s.once("error", () => res(false)); s.setTimeout(1500, () => { s.destroy(); res(false); }); });
let embedded = null;
if (await reachable(dbPort)) {
  log(`PostgreSQL unter localhost:${dbPort} erreichbar – wird verwendet`);
} else if (["localhost", "127.0.0.1"].includes(dbUrl.hostname)) {
  log("Keine Datenbank erreichbar – starte eingebettete PostgreSQL (Daten in ./pgdata) …");
  try {
  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  embedded = new EmbeddedPostgres({
    databaseDir: path.join(root, "pgdata"), port: dbPort, user: decodeURIComponent(dbUrl.username), password: decodeURIComponent(dbUrl.password),
    persistent: true, initdbFlags: ["--encoding=UTF8", "--locale=C"], onLog: () => {}, onError: (e) => { if (String(e).match(/error|fatal/i)) console.error(String(e)); },
  });
  if (!existsSync(path.join(root, "pgdata", "PG_VERSION"))) await embedded.initialise();
  await embedded.start();
  // Datenbank immer mit UTF-8 anlegen (unter Windows wäre der Standard WIN1252 – dort scheitern Umlaute/Emojis).
  const dbName = dbUrl.pathname.slice(1).replace(/[^A-Za-z0-9_]/g, "");
  const admin = embedded.getPgClient("postgres");
  await admin.connect();
  const create = () => admin.query(`CREATE DATABASE "${dbName}" ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C' TEMPLATE template0`);
  const found = await admin.query("SELECT pg_encoding_to_char(encoding) AS enc FROM pg_database WHERE datname = $1", [dbName]);
  if (!found.rows.length) await create();
  else if (found.rows[0].enc !== "UTF8") {
    log(`Datenbank "${dbName}" hat die Kodierung ${found.rows[0].enc} statt UTF8 (Altlast eines früheren Startversuchs) – wird neu angelegt`);
    await admin.query(`DROP DATABASE "${dbName}" WITH (FORCE)`);
    await create();
    try { (await import("node:fs")).rmSync(".local-initialized", { force: true }); } catch { /* egal */ }
  }
  await admin.end();
  } catch (e) {
    console.error(`\n✘ Die eingebettete Datenbank konnte nicht gestartet werden:\n${String(e.message).split("\n").slice(0, 3).join("\n")}\n\nAlternativen: eigene PostgreSQL-16-Datenbank installieren und DATABASE_URL in .env setzen, oder Docker verwenden (docker-compose.yml).`);
    process.exit(1);
  }
} else {
  throw new Error(`Die Datenbank ${dbUrl.host} ist nicht erreichbar. Bitte DATABASE_URL in .env prüfen.`);
}
const stopDb = async () => { try { await embedded?.stop(); } catch { /* ignore */ } };
process.on("SIGINT", async () => { await stopDb(); process.exit(0); });
process.on("SIGTERM", async () => { await stopDb(); process.exit(0); });

try {
  // 3) Schema, Demo-Daten, Build
  log("Datenbank-Schema einrichten");
  run("npx", ["prisma", "migrate", "deploy"]);
  mkdirSync("storage", { recursive: true });
  if (!existsSync(".local-initialized")) {
    if (noDemo) log('Ohne Demo-Daten gestartet. Ersten Administrator anlegen:  npm run bootstrap -- deine@mail.de "Sicheres#Passwort1"');
    else { log("Demo-Daten anlegen"); run("npx", ["tsx", "prisma/seed.ts"]); }
    writeFileSync(".local-initialized", new Date().toISOString());
  }
  // Neu bauen, wenn noch kein Build existiert oder Quelldateien neuer sind (z. B. nach einem Update des Ordners)
  const newest = (p) => { try { const st = statSync(p); return st.isDirectory() ? Math.max(...readdirSync(p).map((f) => newest(path.join(p, f))), 0) : st.mtimeMs; } catch { return 0; } };
  const builtAt = existsSync(path.join(".next", "BUILD_ID")) ? statSync(path.join(".next", "BUILD_ID")).mtimeMs : 0;
  const srcAt = Math.max(...["src", "public", "prisma", "package.json", "next.config.mjs", "tailwind.config.ts"].map(newest));
  if (!builtAt || srcAt > builtAt) { log("Anwendung bauen (einmalig, dauert ein paar Minuten)"); run("npx", ["next", "build"]); }

  // 4) Starten
  console.log(`\n✔ HelferNet läuft auf http://localhost:${PORT}   (Beenden mit Strg+C)`);
  if (!noDemo) console.log("  Demo-Login: admin@demo.hypax.de  oder  max@demo.hypax.de   Passwort: Demo#Passwort1");
  const child = process.platform === "win32"
    ? spawn(`npx next start -p ${PORT}`, { stdio: "inherit", shell: true })
    : spawn("npx", ["next", "start", "-p", PORT], { stdio: "inherit" });
  child.on("exit", async (code) => { await stopDb(); process.exit(code ?? 0); });
} catch (e) {
  console.error(`\n✘ ${e.message}`);
  await stopDb();
  process.exit(1);
}
