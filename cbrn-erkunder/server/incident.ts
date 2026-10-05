import { db, get, list, insert, update, now, audit } from './db.js';
import { emit, activeIncident, state, stopRun, systemStatus } from './sim.js';

// ---------------------------------------------------------------------------------------------
// Einsatz: Grunddaten, aus denen die Simulation ihre (verdeckte) Lage rechnet. Der Wahrheitsstoff wird dem
// Erkunder NICHT angezeigt, solange der Einsatz läuft – außer die Lage meldet den Stoff ausdrücklich als bekannt.
// ---------------------------------------------------------------------------------------------
export const CATEGORIES: Record<string, string> = { C: 'Chemisch', R: 'Radiologisch', B: 'Biologisch', U: 'Unbekannt' };
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
  const ref = reveal ? (ref_type === 'substance' ? get('substances', ref_id) : ref_type === 'radionuclide' ? get('radionuclides', ref_id) : get('biological_agents', ref_id)) : null;
  return { ...rest, category_text: CATEGORIES[inc.category] ?? inc.category, ref_type: reveal ? ref_type : null, ref_id: reveal ? ref_id : null, ref_name: ref?.name ?? null, ref_hidden: !reveal };
}

export function createIncident(by: string, b: any) {
  const name = String(b.name ?? '').trim(); if (!name) return { error: 'Einsatzstichwort fehlt' };
  const cat = String(b.category ?? ''); if (!CATEGORIES[cat]) return { error: 'Gefahrenart ungültig' };
  const lat = Number(b.lat), lon = Number(b.lon); if (!Number.isFinite(lat) || !Number.isFinite(lon)) return { error: 'Einsatzstelle fehlt – bitte auf der Karte markieren' };
  const amount = AMOUNTS.includes(b.amount) ? b.amount : 'mittel';
  let truth: { ref_type: string; ref_id: string; category: string };
  if (b.ref_type && b.ref_id) {
    const row = get(b.ref_type === 'substance' ? 'substances' : b.ref_type === 'radionuclide' ? 'radionuclides' : 'biological_agents', b.ref_id);
    if (!row) return { error: 'Gewählter Stoff nicht gefunden' };
    truth = { ref_type: b.ref_type, ref_id: b.ref_id, category: row.cbrn_category === 'U' ? 'U' : b.ref_type === 'substance' ? 'C' : b.ref_type === 'radionuclide' ? 'R' : 'B' };
    if (cat === 'U') truth.category = 'U';
  } else truth = pickTruth(cat);
  const [radius_m, peak] = SIZE[truth.category === 'U' ? (truth.ref_type === 'radionuclide' ? 'R' : 'C') : truth.category][amount];
  // laufenden Einsatz beenden (nur ein aktiver Einsatz)
  const old = activeIncident(); if (old) endIncident(by, old.id);
  const n = ((db.prepare('SELECT COUNT(*) c FROM incidents').get() as any).c ?? 0) + 1;
  const inc = { id: 'E-' + String(n).padStart(4, '0'), name, status: 'AKTIV', created_at: now(), created_by: by, location_text: String(b.location_text ?? '').trim() || null, report: String(b.report ?? '').trim() || null,
    category: truth.category, ref_type: truth.ref_type, ref_id: truth.ref_id, known: b.known ? 1 : 0, amount, radius_m, peak, lat, lon };
  insert('incidents', inc); audit(by, 'create', 'incident', inc.id, { name, category: truth.category, amount, known: !!b.known });
  emit('incident.changed', publicIncident(inc)); emit('system.status', systemStatus()); return { incident: publicIncident(inc) };
}

export function endIncident(by: string, id: string) {
  const inc = get('incidents', id); if (!inc || inc.status !== 'AKTIV') return { error: 'Kein aktiver Einsatz mit dieser Kennung' };
  for (const vid of Object.keys(state.runs)) stopRun(by, vid);
  update('incidents', id, { status: 'BEENDET', ended_at: now() }); audit(by, 'end', 'incident', id);
  emit('incident.changed', null); emit('system.status', systemStatus()); return { incident: publicIncident(get('incidents', id)) };
}
