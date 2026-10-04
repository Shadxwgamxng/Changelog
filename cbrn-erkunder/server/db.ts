import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const dbFile = process.env.DB_FILE ?? path.resolve(process.cwd(), 'data', 'cbrn.db');
fs.mkdirSync(path.dirname(dbFile), { recursive: true });
// node:sqlite (in Node ab 22.5 eingebaut) – kein nativer Build/Python/Compiler nötig, läuft auch unter Windows.
const raw = new DatabaseSync(dbFile);
raw.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
export const db = Object.assign(raw, {
  transaction<A extends unknown[], R>(fn: (...a: A) => R) {
    return (...a: A): R => {
      raw.exec('BEGIN');
      try { const r = fn(...a); raw.exec('COMMIT'); return r; } catch (e) { raw.exec('ROLLBACK'); throw e; }
    };
  },
});

// Schema ist bewusst portables SQL (TEXT/INTEGER/REAL) – Umstieg auf PostgreSQL = Treiber + Typnamen anpassen.
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS sources (id TEXT PRIMARY KEY, name TEXT NOT NULL, document TEXT, url TEXT, publisher_priority INTEGER, retrieved_at TEXT, data_stand TEXT);
CREATE TABLE IF NOT EXISTS substances (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, synonyms TEXT, cas TEXT, formula TEXT, molar_mass REAL, state TEXT, color TEXT, odor TEXT,
  substance_group TEXT, cbrn_category TEXT NOT NULL, subcategory TEXT, un_number TEXT, ghs TEXT, signal_word TEXT, h TEXT, p TEXT,
  vapor_pressure TEXT, density TEXT, water_solubility TEXT, melting_point TEXT, boiling_point TEXT, fire_info TEXT,
  lel_vol REAL, uel_vol REAL, ie_ev REAL, ims_sim INTEGER DEFAULT 0, methods TEXT, devices TEXT,
  source_id TEXT REFERENCES sources(id), quality TEXT DEFAULT 'unverified', last_checked TEXT, notes TEXT, traits TEXT, response TEXT, gestis_zvg TEXT);
CREATE TABLE IF NOT EXISTS radionuclides (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, element TEXT, z INTEGER, a INTEGER, half_life TEXT, half_life_s REAL, decay TEXT, radiation TEXT, gamma_kev TEXT,
  applications TEXT, occurrence TEXT, measurability TEXT, cbrn_category TEXT, source_id TEXT REFERENCES sources(id), quality TEXT DEFAULT 'unverified', last_checked TEXT, notes TEXT, response TEXT);
CREATE TABLE IF NOT EXISTS biological_agents (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT, disease TEXT, properties TEXT, transmission TEXT, environmental_stability TEXT, detection TEXT,
  lab_relevance TEXT, risk_group TEXT, cbrn_category TEXT DEFAULT 'B', source_id TEXT REFERENCES sources(id), quality TEXT DEFAULT 'unverified', last_checked TEXT, notes TEXT, response TEXT);
CREATE TABLE IF NOT EXISTS measurement_devices (id TEXT PRIMARY KEY, short TEXT, name TEXT, kind TEXT, description TEXT, unit TEXT, source_id TEXT);
CREATE TABLE IF NOT EXISTS measurement_methods (id TEXT PRIMARY KEY, name TEXT, description TEXT);
CREATE TABLE IF NOT EXISTS test_tubes (id TEXT PRIMARY KEY, manufacturer TEXT, product TEXT, tube_type TEXT, analyte TEXT, cas TEXT, range_text TEXT, unit TEXT, application TEXT, storage_status TEXT, lot TEXT, expiry TEXT);
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT, role TEXT, callsign TEXT);
CREATE TABLE IF NOT EXISTS vehicles (id TEXT PRIMARY KEY, name TEXT, status TEXT, link TEXT, online INTEGER, lat REAL, lon REAL, heading REAL, speed REAL, gps_fix INTEGER, power TEXT);
CREATE TABLE IF NOT EXISTS crew (id TEXT PRIMARY KEY, vehicle_id TEXT, role TEXT, name TEXT);
CREATE TABLE IF NOT EXISTS scenarios (id TEXT PRIMARY KEY, name TEXT, category TEXT, ref_type TEXT, ref_id TEXT, radius_m REAL, devices TEXT, weather TEXT, peak REAL, unit TEXT);
CREATE TABLE IF NOT EXISTS missions (
  id TEXT PRIMARY KEY, vehicle_id TEXT, sector TEXT, priority TEXT, profile TEXT, status TEXT, created_by TEXT, created_at TEXT, updated_at TEXT,
  started_at TEXT, ended_at TEXT, notes TEXT);
CREATE TABLE IF NOT EXISTS measurements (
  id TEXT PRIMARY KEY, seq INTEGER, ts TEXT, lat REAL, lon REAL, vehicle_id TEXT, mission_id TEXT, device TEXT, value REAL, unit TEXT, channels TEXT,
  substance_id TEXT, candidates TEXT, status TEXT, level TEXT, headline TEXT, remark TEXT, data_source TEXT DEFAULT 'SIMULATED', run_id TEXT);
CREATE INDEX IF NOT EXISTS ix_meas_ts ON measurements(ts);
CREATE TABLE IF NOT EXISTS samples (
  id TEXT PRIMARY KEY, ts TEXT, lat REAL, lon REAL, kind TEXT, description TEXT, color TEXT, consistency TEXT, odor TEXT, turbidity TEXT,
  readings TEXT, weather TEXT, location TEXT, taken_by TEXT, mission_id TEXT, vehicle_id TEXT, transport_status TEXT, lab_status TEXT,
  onsite_assessment TEXT, lab_result TEXT, truth_ref TEXT, updated_at TEXT, analysis TEXT);
CREATE TABLE IF NOT EXISTS sample_events (id INTEGER PRIMARY KEY AUTOINCREMENT, sample_id TEXT, ts TEXT, status TEXT, note TEXT, by_user TEXT);
CREATE TABLE IF NOT EXISTS weather_records (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, temperature REAL, humidity REAL, pressure REAL, wind_speed REAL, wind_from REAL, cloud_okta REAL, precipitation REAL, data_source TEXT DEFAULT 'SIMULATED');
CREATE TABLE IF NOT EXISTS alarms (id TEXT PRIMARY KEY, ts TEXT, source TEXT, lat REAL, lon REAL, category TEXT, status TEXT, description TEXT, vehicle_id TEXT, measurement_id TEXT);
CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, mission_id TEXT, created_at TEXT, created_by TEXT, data TEXT);
CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, user_id TEXT, action TEXT, entity TEXT, entity_id TEXT, detail TEXT);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, vehicle_id TEXT, name TEXT, started_at TEXT, ended_at TEXT, started_by TEXT, distance_m REAL DEFAULT 0, points INTEGER DEFAULT 0, max_dose REAL, max_pid REAL, source TEXT, mission_id TEXT);
`;
db.exec(SCHEMA);
// Migration älterer Datenbanken: fehlende Spalten ergänzen
for (const [t, c] of [['substances', 'traits'], ['substances', 'response'], ['substances', 'gestis_zvg'], ['radionuclides', 'response'], ['biological_agents', 'response'], ['measurements', 'run_id'], ['samples', 'analysis']] as const) {
  const cols = (db.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).map((x) => x.name);
  if (!cols.includes(c)) db.exec(`ALTER TABLE ${t} ADD COLUMN ${c} TEXT`);
}

const JSON_COLS: Record<string, string[]> = {
  substances: ['synonyms', 'ghs', 'h', 'p', 'methods', 'devices', 'traits', 'response'],
  radionuclides: ['radiation', 'gamma_kev', 'response'],
  biological_agents: ['response'],
  measurements: ['channels', 'candidates'],
  samples: ['readings', 'weather', 'lab_result', 'truth_ref', 'analysis'],
  scenarios: ['devices'],
  reports: ['data'],
};
export const TABLES = ['sources', 'substances', 'radionuclides', 'biological_agents', 'measurement_devices', 'measurement_methods', 'test_tubes', 'users', 'vehicles', 'crew', 'scenarios', 'missions', 'measurements', 'samples', 'weather_records', 'alarms', 'reports', 'audit_log', 'runs'];

const colCache = new Map<string, string[]>();
export const columns = (t: string) => {
  if (!colCache.has(t)) colCache.set(t, (db.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).map((c) => c.name));
  return colCache.get(t)!;
};
export function parse<T = any>(table: string, row: any): T {
  if (!row) return row;
  const o = { ...row };
  for (const c of JSON_COLS[table] ?? []) if (typeof o[c] === 'string') { try { o[c] = JSON.parse(o[c]); } catch { /* leave */ } }
  return o;
}
const ser = (table: string, k: string, v: any) => (v !== null && typeof v === 'object' ? JSON.stringify(v) : (JSON_COLS[table] ?? []).includes(k) && v !== null && v !== undefined && typeof v !== 'string' ? JSON.stringify(v) : v ?? null);
const ok = (v: any) => (typeof v === 'boolean' ? (v ? 1 : 0) : v);

export function list<T = any>(table: string, where = '', params: any[] = [], order = ''): T[] {
  return (db.prepare(`SELECT * FROM ${table} ${where} ${order}`).all(...params) as any[]).map((r) => parse<T>(table, r));
}
export function get<T = any>(table: string, id: string | number, key = 'id'): T | undefined {
  return parse<T>(table, db.prepare(`SELECT * FROM ${table} WHERE ${key} = ?`).get(id));
}
export function insert(table: string, obj: Record<string, any>, replace = false) {
  const cols = columns(table).filter((c) => obj[c] !== undefined);
  db.prepare(`INSERT ${replace ? 'OR REPLACE' : ''} INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...cols.map((c) => ok(ser(table, c, obj[c]))));
}
export function update(table: string, id: string | number, obj: Record<string, any>) {
  const cols = columns(table).filter((c) => c !== 'id' && obj[c] !== undefined);
  if (!cols.length) return;
  db.prepare(`UPDATE ${table} SET ${cols.map((c) => `${c} = ?`).join(',')} WHERE id = ?`).run(...cols.map((c) => ok(ser(table, c, obj[c]))), id);
}
export const remove = (table: string, id: string | number) => db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);

export const getSetting = (k: string, d: any = null) => { const r = db.prepare('SELECT value FROM settings WHERE key=?').get(k) as any; return r ? JSON.parse(r.value) : d; };
export const setSetting = (k: string, v: any) => { db.prepare('INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)').run(k, JSON.stringify(v)); };

export const now = () => new Date().toISOString();
export function audit(user: string, action: string, entity: string, entityId: string, detail?: any) {
  const ts = now();
  const info = db.prepare('INSERT INTO audit_log(ts,user_id,action,entity,entity_id,detail) VALUES(?,?,?,?,?,?)').run(ts, user, action, entity, entityId, detail ? JSON.stringify(detail) : null);
  return { id: info.lastInsertRowid, ts, user_id: user, action, entity, entity_id: entityId, detail };
}
