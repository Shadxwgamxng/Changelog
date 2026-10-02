/**
 * Lokaler Ein-Klick-Start (ohne Docker, ohne PostgreSQL-Installation):
 *   - startet eine eingebettete PostgreSQL-Datenbank (Daten in ./data/db)
 *   - wendet Migrationen an, legt beim allerersten Start Demo-Daten an
 *   - baut die App (nur beim ersten Start) und startet sie auf http://localhost:3000
 * Beenden mit Strg+C – dabei wird auch die Datenbank sauber gestoppt.
 * Nur für lokales Testen gedacht; für produktiven Betrieb siehe README (Deployment).
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

const PG_PORT = Number(process.env.LOCAL_PG_PORT || 5433);
const APP_PORT = Number(process.env.PORT || 3000);
const DB_DIR = path.join(root, "data", "db");

Object.assign(process.env, {
  DATABASE_URL: `postgresql://panel:panel@localhost:${PG_PORT}/shak_panel?schema=public`,
  APP_URL: `http://localhost:${APP_PORT}`,
  AUTH_COOKIE_SECURE: "false",
  UPLOADS_DIR: path.join(root, "data", "uploads"),
  NODE_ENV: "production",
});

const log = (msg) => console.log(`\n▶ ${msg}`);

function portFree(port) {
  return new Promise((resolve) => {
    const s = net.createServer().once("error", () => resolve(false)).once("listening", () => s.close(() => resolve(true)));
    s.listen(port, "127.0.0.1");
  });
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", shell: true, env: process.env });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} endete mit Code ${code}`))));
  });
}

async function main() {
  if (!(await portFree(PG_PORT))) throw new Error(`Port ${PG_PORT} (Datenbank) ist belegt. Läuft das Panel schon in einem anderen Fenster? Sonst: LOCAL_PG_PORT=5434 setzen.`);
  if (!(await portFree(APP_PORT))) throw new Error(`Port ${APP_PORT} ist belegt. Läuft das Panel schon in einem anderen Fenster?`);

  log("Datenbank wird gestartet …");
  const firstRun = !existsSync(path.join(DB_DIR, "PG_VERSION"));
  mkdirSync(path.dirname(DB_DIR), { recursive: true });
  const pg = new EmbeddedPostgres({ databaseDir: DB_DIR, user: "panel", password: "panel", port: PG_PORT, persistent: true, onLog: () => {}, onError: () => {} });
  if (firstRun) await pg.initialise();
  await pg.start();
  if (firstRun) await pg.createDatabase("shak_panel");

  let app = null;
  let stopping = false;
  const shutdown = async (code = 0) => {
    if (stopping) return;
    stopping = true;
    console.log("\n▶ Wird beendet …");
    if (app && !app.killed) app.kill();
    await pg.stop().catch(() => {});
    process.exit(code);
  };
  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));

  try {
    log("Datenbank-Tabellen werden angelegt/aktualisiert …");
    await run("npx", ["prisma", "migrate", "deploy"]);
    log("Demo-Daten (nur beim ersten Start) …");
    await run("npx", ["prisma", "db", "seed"]);

    if (!existsSync(path.join(root, ".next", "BUILD_ID"))) {
      log("App wird gebaut (nur beim ersten Start, dauert ca. 1–2 Minuten) …");
      await run("npx", ["next", "build"]);
    }

    log(`App startet auf http://localhost:${APP_PORT}`);
    // Direkt über Node starten (ohne Shell-Umweg), damit Beenden wirklich den Server stoppt
    app = spawn(process.execPath, [path.join(root, "node_modules", "next", "dist", "bin", "next"), "start", "-p", String(APP_PORT)], { stdio: "inherit", env: process.env });
    app.on("exit", (code) => shutdown(code ?? 0));

    console.log("\n──────────────────────────────────────────────────────────");
    console.log(` Panel läuft:  http://localhost:${APP_PORT}`);
    console.log(" Login:        admin@example.local");
    console.log(" Passwort:     DEMO-Passwort-2026!   (Demo-Accounts)");
    console.log(" Beenden:      Strg+C in diesem Fenster");
    console.log("──────────────────────────────────────────────────────────");
    if (process.platform === "win32") spawn("cmd", ["/c", "start", "", `http://localhost:${APP_PORT}`], { stdio: "ignore" });
  } catch (err) {
    console.error("\n✖", err.message);
    await shutdown(1);
  }
}

main().catch((err) => {
  console.error("\n✖", err.message);
  process.exit(1);
});
