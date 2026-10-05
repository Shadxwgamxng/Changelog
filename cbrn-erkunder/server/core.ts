import { db, getSetting, setSetting, initDb } from './db.js';
import { config } from './config.js';
import { seedIfEmpty } from './seed.js';
import { registerRoutes } from './routes.js';
import { startSim } from './sim.js';
import { purgeSessions } from './auth.js';
import { App } from './router.js';

/** Startet Datenbank, Referenzdaten, Simulation und Router. Gemeinsam für FiveM-Server und Entwicklungs-Testserver. */
export async function boot(opts: { dbFile: string | null; wasmFile: string }) {
  await initDb(opts.dbFile, opts.wasmFile);
  // Kartenmodus gewechselt (geo <-> gta5)? Betriebsdaten sind modusgebunden -> frisch aufsetzen.
  const seeded = getSetting('map_mode', null);
  if (seeded && seeded !== config.mapMode) {
    console.log(`[cbrn] Kartenmodus ${seeded} -> ${config.mapMode}: Daten werden neu angelegt.`);
    db.exec('PRAGMA foreign_keys = OFF');
    for (const t of ['sources', 'substances', 'radionuclides', 'biological_agents', 'measurement_devices', 'measurement_methods', 'test_tubes', 'users', 'vehicles', 'crew', 'scenarios', 'missions', 'measurements', 'samples', 'sample_events', 'weather_records', 'alarms', 'reports', 'audit_log', 'runs', 'incidents', 'sessions', 'settings']) db.exec(`DELETE FROM ${t}`);
    db.exec('PRAGMA foreign_keys = ON');
  }
  seedIfEmpty();
  db.exec("UPDATE runs SET ended_at = COALESCE(ended_at, started_at) WHERE ended_at IS NULL"); // Reste einer unterbrochenen Messfahrt schließen
  setSetting('map_mode', config.mapMode);
  purgeSessions();
  const app = new App(); registerRoutes(app); startSim();
  setInterval(() => db.save(), 30000);
  return app;
}
