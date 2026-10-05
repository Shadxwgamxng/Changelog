import { db, get, list, insert, update, now, audit } from './db.js';
import { emit, activeIncident, state, stopRun, systemStatus, resetDevices } from './sim.js';
import { crewOf } from './auth.js';
import { publicSample } from './samples.js';
import { compass } from './geo.js';
import { resetAgs } from './ags.js';
import { addFire, listFires, FIRE_SIZES, FIRE_TYPES } from './fire.js';

// ---------------------------------------------------------------------------------------------
// Einsatz: Grunddaten, aus denen die Simulation ihre (verdeckte) Lage rechnet. Der Wahrheitsstoff wird dem
// Erkunder NICHT angezeigt, solange der Einsatz läuft – außer die Lage meldet den Stoff ausdrücklich als bekannt.
// ---------------------------------------------------------------------------------------------
export const CATEGORIES: Record<string, string> = { C: 'Chemisch', R: 'Radiologisch', B: 'Biologisch', U: 'Unbekannt', F: 'Brand (Rauchgas)' };
export const ROLES = ['Messtechniker (Maschinist)', 'Gruppenführer CBRN-ErkW', 'Messtrupp'];
export const AMOUNTS = ['gering', 'mittel', 'groß'];
const SIZE: Record<string, Record<string, [number, number]>> = { // [Radius m, Spitzenwert]
  C: { gering: [150, 15], mittel: [300, 40], 'groß': [600, 100] },
  R: { gering: [120, 10], mittel: [200, 40], 'groß': [350, 120] },
  B: { gering: [60, 0], mittel: [100, 0], 'groß': [150, 0] },
};
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

function pickTruth(cat: string): { ref_type: string; ref_id: string; category: string } {
  const chem = () => ({ ref_type: 'substance', ref_id: pick(list('substances', "WHERE cbrn_category = 'C' AND ims_sim = 1")).id, category: 'C' });
  const rad = () => ({ ref_type: 'radionuclide', ref_id: pick(list('radionuclides').filter((n: any) => n.gamma_kev?.length && n.id !== 'k-40')).id, category: 'R' });
  const bio = () => ({ ref_type: 'biological', ref_id: pick(list('biological_agents')).id, category: 'B' });
  if (cat === 'C') return chem(); if (cat === 'R') return rad(); if (cat === 'B') return bio();
  return Math.random() < 0.65 ? { ...chem(), category: 'U' } : { ...rad(), category: 'U' };
}

export function publicIncident(inc: any) {
  if (!inc) return null;
  const reveal = inc.status !== 'AKTIV' || inc.known;
  const { ref_type, ref_id, peak, ...rest } = inc;
  const ref = reveal && ref_type !== 'fire' ? (ref_type === 'substance' ? get('substances', ref_id) : ref_type === 'radionuclide' ? get('radionuclides', ref_id) : get('biological_agents', ref_id)) : null;
  return { ...rest, category_text: CATEGORIES[inc.category] ?? inc.category, ref_type: reveal ? ref_type : null, ref_id: reveal ? ref_id : null, ref_name: ref?.name ?? null, ref_hidden: !reveal };
}

export function createIncident(by: string, b: any) {
  const name = String(b.name ?? '').trim(); if (!name) return { error: 'Einsatzstichwort fehlt' };
  const cat = String(b.category ?? ''); if (!CATEGORIES[cat]) return { error: 'Gefahrenart ungültig' };
  const lat = Number(b.lat), lon = Number(b.lon); if (!Number.isFinite(lat) || !Number.isFinite(lon)) return { error: 'Einsatzstelle fehlt – bitte auf der Karte markieren' };
  const amount = AMOUNTS.includes(b.amount) ? b.amount : 'mittel';
  let truth: { ref_type: string; ref_id: string; category: string };
  if (cat === 'F') truth = { ref_type: 'fire', ref_id: '-', category: 'F' };
  else if (b.ref_type && b.ref_id) {
    const row = get(b.ref_type === 'substance' ? 'substances' : b.ref_type === 'radionuclide' ? 'radionuclides' : 'biological_agents', b.ref_id);
    if (!row) return { error: 'Gewählter Stoff nicht gefunden' };
    truth = { ref_type: b.ref_type, ref_id: b.ref_id, category: row.cbrn_category === 'U' ? 'U' : b.ref_type === 'substance' ? 'C' : b.ref_type === 'radionuclide' ? 'R' : 'B' };
    if (cat === 'U') truth.category = 'U';
  } else truth = pickTruth(cat);
  const fsz = { gering: 'klein', mittel: 'mittel', 'groß': 'groß' } as Record<string, string>;
  const [radius_m, peak] = truth.category === 'F' ? [FIRE_SIZES[fsz[amount]].r, 0] : SIZE[truth.category === 'U' ? (truth.ref_type === 'radionuclide' ? 'R' : 'C') : truth.category][amount];
  // Nur die erste Anmeldung legt den Einsatz an; alle weiteren steigen in den laufenden Einsatz ein.
  if (activeIncident()) return { error: 'Es läuft bereits ein Einsatz – er wurde von einer anderen Person angelegt' };
  const n = ((db.prepare('SELECT COUNT(*) c FROM incidents').get() as any).c ?? 0) + 1;
  const inc = { id: 'E-' + String(n).padStart(4, '0'), name, status: 'AKTIV', created_at: now(), created_by: by, location_text: String(b.location_text ?? '').trim() || null, report: String(b.report ?? '').trim() || null,
    category: truth.category, ref_type: truth.ref_type, ref_id: truth.ref_id, known: b.known ? 1 : 0, amount, radius_m, peak, lat, lon };
  insert('incidents', inc);
  if (cat === 'F') addFire(by, { lat, lon, size: fsz[amount], type: FIRE_TYPES[String(b.fire_type)] ? String(b.fire_type) : 'GEBAEUDE', label: 'Brandstelle' });
  for (const c of crewOf()) noteCrew(c.name, c.role, c.vehicle_id); audit(by, 'create', 'incident', inc.id, { name, category: truth.category, amount, known: !!b.known });
  emit('incident.changed', publicIncident(inc)); emit('system.status', systemStatus()); return { incident: publicIncident(inc) };
}

/** Hält fest, wer am laufenden Einsatz beteiligt war (auch wenn die Person sich später abmeldet). */
export function noteCrew(name: string, funktion: string, vehicle_id: string) {
  const inc = activeIncident(); if (!inc) return;
  db.prepare('INSERT OR IGNORE INTO incident_crew(incident_id,name,funktion,vehicle_id,since) VALUES(?,?,?,?,?)').run(inc.id, name, funktion, vehicle_id, now());
}

const REQUIRED: [string, string][] = [['where', 'Wo (Einsatzort)'], ['what', 'Was (Lage / Einsatzgeschehen)'], ['measures', 'Durchgeführte Maßnahmen'], ['result', 'Ergebnis / Feststellungen']];
const num = (v: any) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Math.max(0, Math.round(Number(v))));

export function endIncident(by: string, id: string, form: any = {}) {
  const inc = get('incidents', id); if (!inc || inc.status !== 'AKTIV') return { error: 'Kein aktiver Einsatz mit dieser Kennung' };
  const f = form ?? {}; const missing = REQUIRED.filter(([k]) => !String(f[k] ?? '').trim()).map(([, l]) => l);
  if (missing.length) return { error: `Einsatzbericht unvollständig: ${missing.join(', ')}` };
  for (const vid of Object.keys(state.runs)) stopRun(by, vid);
  resetDevices(); resetAgs();
  const ended = now(); const t = (v: any) => String(v ?? '').trim() || null;
  const crew = list('incident_crew', 'WHERE incident_id = ? ORDER BY since', [id]).map((c: any) => ({ name: c.name, funktion: c.funktion, vehicle_id: c.vehicle_id, vehicle: get('vehicles', c.vehicle_id)?.name ?? c.vehicle_id }));
  const people = new Set(crew.map((c: any) => c.name.toLowerCase())).size;
  const runs = list('runs', 'WHERE incident_id = ?', [id]);
  const q = (sql: string, ...a: any[]) => (db.prepare(sql).get(...a) as any);
  const meas = q('SELECT COUNT(*) c, SUM(CASE WHEN status != ? THEN 1 ELSE 0 END) a FROM measurements WHERE incident_id = ?', 'NORMAL', id);
  const samples = list('samples', 'WHERE ts >= ? ORDER BY ts', [inc.created_at]).map((x: any) => publicSample(x.id)!);
  const alarms = list('alarms', 'WHERE ts >= ? ORDER BY ts', [inc.created_at]);
  const w = db.prepare('SELECT * FROM weather_records ORDER BY ts DESC LIMIT 1').get() as any;
  const ims = list('measurements', "WHERE incident_id = ? AND device = 'IMS' AND substance_id IS NOT NULL", [id]).map((m: any) => m.substance_id);
  const imsNames = [...new Set(ims)].map((sid) => get('substances', sid as string)?.name).filter(Boolean);
  const truthRow = inc.ref_type === 'fire' ? null : inc.ref_type === 'substance' ? get('substances', inc.ref_id) : inc.ref_type === 'radionuclide' ? get('radionuclides', inc.ref_id) : get('biological_agents', inc.ref_id);
  const startMs = Date.parse(inc.created_at), endMs = Date.parse(ended);
  const data = {
    kind: 'EINSATZBERICHT_E', title: inc.name, simulated: true, number: `EB-${inc.id}`, author: by,
    notice: 'SIMULATION – Messwerte, Identifikationen und Laborergebnisse sind nicht real. Fachdaten ungeprüft.',
    incident: { id: inc.id, name: inc.name, category: inc.category, category_text: CATEGORIES[inc.category], amount: inc.amount, lat: inc.lat, lon: inc.lon, report: inc.report, created_by: inc.created_by },
    where: t(f.where), what: t(f.what), measures: t(f.measures), result: t(f.result), handover: t(f.handover), remarks: t(f.remarks), other_forces: t(f.other_forces),
    injured: num(f.injured), evacuated: num(f.evacuated),
    start: inc.created_at, end: ended, duration_min: Math.max(0, Math.round((endMs - startMs) / 60000)),
    forces_count: num(f.forces_count) ?? people, crew_count: people, crew, vehicles: [...new Set(crew.map((c: any) => c.vehicle))],
    stats: { runs: runs.length, run_distance_m: Math.round(runs.reduce((a: number, r: any) => a + (r.distance_m ?? 0), 0)), measurements: meas?.c ?? 0, anomalies: meas?.a ?? 0, samples: samples.length, alarms: alarms.length,
      max_dose: runs.reduce((a: number, r: any) => Math.max(a, r.max_dose ?? 0), 0), max_pid: runs.reduce((a: number, r: any) => Math.max(a, r.max_pid ?? 0), 0) },
    samples: samples.map((s: any) => ({ id: s.id, kind: `${s.type_text}${s.label ? ' · ' + s.label : ''}`, ts: s.ts, lab_status: s.status_text, lab_text: s.lab_result?.text ?? null })), alarms: alarms.map((a: any) => ({ id: a.id, ts: a.ts, category: a.category, description: a.description })),
    device_findings: imsNames, weather: w ? { temperature: w.temperature, humidity: w.humidity, pressure: w.pressure, wind_speed: w.wind_speed, wind_from: w.wind_from, wind_from_text: compass(w.wind_from) } : null,
    fires: listFires().map((f: any) => ({ id: f.id, label: f.label, type_text: f.type_text, size: f.size, lat: f.lat, lon: f.lon })),
    run_modes: [...new Set(runs.map((r: any) => r.mode ?? 'CBRN'))],
    truth: { known: !!inc.known, type: inc.ref_type, name: truthRow?.name ?? null, cas: truthRow?.cas ?? null },
  };
  update('incidents', id, { status: 'BEENDET', ended_at: ended }); insert('reports', { id: data.number, mission_id: null, incident_id: id, created_at: ended, created_by: by, data }, true);
  audit(by, 'end', 'incident', id, { report: data.number }); emit('incident.changed', null); emit('system.status', systemStatus());
  return { incident: publicIncident(get('incidents', id)), report: { id: data.number, ...data } };
}
