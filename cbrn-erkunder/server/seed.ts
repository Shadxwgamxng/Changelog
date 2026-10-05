import gestisJson from './data/gestis-index.json' with { type: 'json' };
import { db, insert, list, get, now, setSetting, getSetting } from './db.js';
import { substances as subs1 } from './data/substances.js';
import { substances2 } from './data/substances2.js';
import { deriveTraits, buildResponse, radResponse, bioResponse } from './data/derive.js';
import { radionuclides, bioAgents } from './data/nuclides.js';
import { sources, devices, methods, tubes, vehicles } from './data/misc.js';
import fs from 'node:fs';
import path from 'node:path';
import { offsetToLL } from './geo.js';

// Abgeleitete P-Sätze (GHS-Standardtexte, nur Einstufungsinformation – keine Einsatzanweisung)
function pFor(s: { ghs: string[]; h: string[] }) {
  const p = new Set<string>();
  if (s.ghs.includes('GHS02')) ['P210', 'P233'].forEach((x) => p.add(x));
  if (s.ghs.includes('GHS06') || s.h.some((h) => h.startsWith('H33'))) ['P260', 'P284', 'P304+P340', 'P310'].forEach((x) => p.add(x));
  if (s.ghs.includes('GHS05')) ['P280', 'P303+P361+P353', 'P305+P351+P338'].forEach((x) => p.add(x));
  if (s.ghs.includes('GHS04')) p.add('P403+P233');
  return [...p];
}

export const REF_VERSION = 6; // erhöhen, wenn sich Referenzdaten (Stoffe, Handlungsempfehlungen …) ändern

// Referenzdaten (fachliche Stammdaten) – werden bei Versionswechsel neu eingespielt (Admin-Änderungen daran gehen dabei verloren).
// Ergebnis von tools/gestis-index-check.ts: CAS-Nummer/Name mit dem öffentlichen GESTIS-Stoffindex abgeglichen (nur Index, keine Artikeldaten)
function gestisIndex(): Record<string, { zvg: string; gestis_name: string; cas_match: boolean }> {
  return gestisJson as any;
}
const CHECK_DATE = '2026-10-04';

export function syncReference() {
  const gi = gestisIndex();
  const tubeCas = new Set(tubes.map((t) => t.cas));
  const tx = db.transaction(() => {
    for (const s of sources) insert('sources', { ...s, retrieved_at: s.id === 'gestis' && Object.keys(gi).length ? CHECK_DATE : null, data_stand: s.id === 'gestis' && Object.keys(gi).length ? 'Stoffindex (CAS, Name, ZVG-Nr.)' : null }, true);
    for (const s of [...subs1, ...substances2]) {
      const methodsAuto = [...(s.ie_ev != null && s.ie_ev < 10.6 ? ['PID-Screening'] : []), ...(tubeCas.has(s.cas) ? ['Prüfröhrchen'] : []), ...(s.lel_vol ? ['Ex-Messung (MGMG)'] : []), ...(s.ph === 'sauer' || s.ph === 'basisch' ? ['pH-Messung'] : []), 'Laboranalytik'];
      const devicesAuto = [...(s.ie_ev != null && s.ie_ev < 10.6 ? ['PID'] : []), ...(s.lel_vol ? ['MGMG'] : []), ...(s.ims_sim ? ['IMS'] : []), ...(tubeCas.has(s.cas) ? ['Prüfröhrchen'] : [])];
      const full = { ...s, methods: s.methods.length ? s.methods : methodsAuto, devices: s.methods.length || s.devices.length ? s.devices : devicesAuto };
      const traits = deriveTraits(full);
      insert('substances', { ...full, p: pFor(full), ims_sim: s.ims_sim ? 1 : 0, quality: gi[s.id]?.cas_match ? 'identity' : 'unverified', last_checked: gi[s.id]?.cas_match ? CHECK_DATE : null, gestis_zvg: gi[s.id]?.zvg ?? null, traits, response: buildResponse(full, traits) }, true);
    }
    for (const r of radionuclides) insert('radionuclides', { ...r, quality: 'unverified', response: radResponse(r as any) }, true);
    for (const b of bioAgents) insert('biological_agents', { ...b, quality: 'unverified', response: bioResponse(b as any) }, true);
    for (const d of devices) insert('measurement_devices', d, true);
    for (const m of methods) insert('measurement_methods', m, true);
    for (const t of tubes) insert('test_tubes', t, true);
  });
  tx();
  setSetting('ref_version', REF_VERSION);
}

// Ältere Datenbanken (Fahrzeuge CBRN-01 …): Betriebsdaten verwerfen und neue Fahrzeuge anlegen
function migrateVehicles() {
  if ((db.prepare("SELECT COUNT(*) c FROM vehicles WHERE id LIKE 'FFW-%'").get() as any).c >= 2) return;
  db.exec('PRAGMA foreign_keys = OFF');
  for (const t of ['vehicles', 'crew', 'missions', 'measurements', 'samples', 'sample_events', 'alarms', 'runs', 'reports', 'audit_log', 'sessions']) db.exec(`DELETE FROM ${t}`);
  db.exec('PRAGMA foreign_keys = ON');
  for (const v of vehicles) insert('vehicles', { ...v, ...offsetToLL(0, 0) });
}

export function seedIfEmpty() {
  if ((db.prepare('SELECT COUNT(*) c FROM sources').get() as any).c > 0) { migrateVehicles(); if (getSetting('ref_version', 0) < REF_VERSION) syncReference(); return; }
  syncReference();
  const tx = db.transaction(() => {
    for (const v of vehicles) insert('vehicles', { ...v, ...offsetToLL(0, 0) }); // Start am Einsatzzentrum; Position kommt ab dann aus GTA
    setSetting('mgmg_channels', ['O2', 'CO', 'H2S', 'LEL', 'CH4']); setSetting('fivem_origin', { x: 0, y: 0, scale: 1 });
  });
  tx();
  // Datensatz-Statistik der Quellen wird zur Laufzeit berechnet
}
export { list, get, now, getSetting };
