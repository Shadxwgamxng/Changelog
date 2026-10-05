// ---------------------------------------------------------------------------------------------
// Messumgebung: Hintergrund + Einsatzlage (Ausbreitung aus sim.ts) + Brandrauch (fire.ts) + Messquellen (Admin/Szenario).
// Liefert den WAHREN Umgebungszustand an einer Position – ohne Gerät. Das Gerät (engine.ts) macht daraus einen Messwert.
// Spieler sehen Quellen NIE direkt (keine API dafür) – nur über das Messgerät.
// ---------------------------------------------------------------------------------------------
import { db, get, list, insert, update, now, audit } from '../db.js';
import { readingsAt, activeIncident, state, PID_LAMP_EV } from '../sim.js';
import { smokeAt, hasFire } from '../fire.js';
import { gameToLL, llToOffset } from '../geo.js';

export type SourceType = 'RADIOLOGICAL' | 'CHEMICAL' | 'BIOLOGICAL';
export interface Pos { x: number; y: number; z: number }
export interface ImsHit { G: number; H: number; T: number; substance_id: string | null; code: string | null; group: string | null }
export interface Env {
  dose: number;            // µSv/h (Ortsdosisleistung)
  cps: number;             // β/γ-Zählrate Kontaminationsmonitor
  alphaCps: number;
  voc: number;             // ppm
  gases: Record<string, number>; // O2 Vol%, CO/H2S/SO2/HCN/NO2/HCl/iBut ppm, CH4 %UEG, CO2 Vol%
  ims: ImsHit;
  nearest: { id: string; type: string; d: number } | null; // nur Debug
}

export const BG = { dose: 0.085, cps: 1.1, alphaCps: 0.02, voc: 0.06, co: 0.4, o2: 20.9, co2: 0.042 }; // Hintergrund (Simulation)
const taper = (d: number, R: number) => (d <= R ? 1 : d >= 1.5 * R ? 0 : Math.cos(((d - R) / (0.5 * R)) * (Math.PI / 2)) ** 2); // weicher Auslauf hinter dem wirksamen Radius

// ---- Quellen (DB) ------------------------------------------------------------------------------
export const sourceDefaults: Record<SourceType, { intensity: number; radius: number; unit: string }> = {
  RADIOLOGICAL: { intensity: 50, radius: 40, unit: 'µSv/h in 1 m' },
  CHEMICAL: { intensity: 60, radius: 80, unit: 'ppm im Kern' },
  BIOLOGICAL: { intensity: 1, radius: 30, unit: '–' },
};
const nextSourceId = () => 'SOURCE-' + String(((db.prepare('SELECT COUNT(*) c FROM measurement_sources').get() as any).c ?? 0) + 1).padStart(3, '0');
export function addSource(by: string, b: { type: string; x: number; y: number; z: number; intensity?: number; radius?: number; substance_id?: string | null; note?: string }) {
  const type = String(b.type).toUpperCase() as SourceType; if (!(type in sourceDefaults)) throw new Error('Typ ungültig');
  const d = sourceDefaults[type]; const intensity = Number.isFinite(+b.intensity!) && +b.intensity! > 0 ? Math.min(+b.intensity!, 1e6) : d.intensity; const radius = Number.isFinite(+b.radius!) && +b.radius! > 0 ? Math.min(+b.radius!, 2000) : d.radius;
  let substance_id: string | null = b.substance_id ? String(b.substance_id) : null;
  if (substance_id) { const t = type === 'RADIOLOGICAL' ? 'radionuclides' : type === 'CHEMICAL' ? 'substances' : 'biological_agents'; if (!get(t, substance_id)) throw new Error('Stoff nicht in der Stoffdatenbank'); }
  const row = { id: nextSourceId(), type, x: +b.x, y: +b.y, z: +b.z, intensity, radius, substance_id, active: 1, incident_id: activeIncident()?.id ?? null, created_by: by, created_at: now(), note: b.note ?? null };
  insert('measurement_sources', row); audit(by, 'create', 'source', row.id, { type, intensity, radius, substance_id }); return row;
}
export const clearSources = (by: string) => { const n = (db.prepare('SELECT COUNT(*) c FROM measurement_sources WHERE active = 1').get() as any).c; db.exec('UPDATE measurement_sources SET active = 0'); audit(by, 'clear', 'source', '*', { n }); return n as number; };
export const activeSources = () => { const inc = activeIncident()?.id ?? null; return list('measurement_sources', 'WHERE active = 1').filter((s: any) => !s.incident_id || s.incident_id === inc); };
export const countSources = () => activeSources().length;

// ---- Umgebung an einer Position -----------------------------------------------------------------
function plume(dx: number, dy: number, R: number, windFrom: number) {
  const th = ((windFrom + 180) % 360) * (Math.PI / 180); const ux = Math.sin(th), uy = Math.cos(th);
  const along = dx * ux + dy * uy, cross = -dx * uy + dy * ux;
  const sx = along > 0 ? 0.6 * R : 0.12 * R, sy = 0.18 * R + Math.max(0, along) * 0.1;
  return Math.exp(-(along * along) / (2 * sx * sx) - (cross * cross) / (2 * sy * sy));
}

export function envAt(pos: Pos): Env {
  const wind = state.weather.wind_from; const ll = gameToLL(pos.x, pos.y); const o = llToOffset(ll.lat, ll.lon);
  const r = readingsAt(o.x, o.y, 0, 'CBRN') as any; // Einsatzlage (Wolke aus dem Einsatz)
  const g: Record<string, number> = { O2: BG.o2, CO: BG.co, H2S: 0, CH4: 0, CO2: BG.co2, SO2: 0, iBut: 0, HCN: 0, NO2: 0, HCl: 0 };
  for (const [k, v] of Object.entries(r.mgmg.channels as Record<string, number | null>)) if (v != null) g[k === 'LEL' ? 'CH4' : k] = k === 'CO2' ? v / 10000 : v;
  let dose = Math.max(0, r.dose.value - 0.09) + BG.dose, cps = Math.max(0, r.como.value - 1.2) + BG.cps, voc = Math.max(0, r.pid.value - 0.1) + BG.voc, alpha = BG.alphaCps;
  const ims: ImsHit = { G: 0, H: 0, T: 0, substance_id: null, code: null, group: null };
  const inc = r.ims; if (inc?.level) { const bars = inc.level === 'hinweis' ? 2 : inc.level === 'verdacht' ? 4 : Math.min(8, 5 + Math.round((inc.confidence ?? 60) / 33)); const s = inc.substance_id ? get('substances', inc.substance_id) : null; imsAdd(ims, bars, s, inc.group); }
  if (hasFire()) { const sm = smokeAt(o.x, o.y, wind, Date.now() / 1000); g.CO += sm.gases.CO; g.CO2 += sm.gases.CO2 / 10000; g.HCN += sm.gases.HCN; g.NO2 += sm.gases.NO2; g.HCl += sm.gases.HCl; g.SO2 += sm.gases.SO2; voc += sm.gases.VOC; g.O2 -= sm.gases.CO2 / 10000; }
  let nearest: Env['nearest'] = null;
  for (const s of activeSources()) {
    const dx = pos.x - s.x, dy = pos.y - s.y, dz = pos.z - s.z, d = Math.hypot(dx, dy, dz); const w = taper(d, s.radius);
    if (!nearest || d < nearest.d) nearest = { id: s.id, type: s.type, d };
    if (w <= 0) continue;
    if (s.type === 'RADIOLOGICAL') {
      dose += (s.intensity / Math.max(d, 0.3) ** 2) * w; // Abstandsgesetz: intensity = µSv/h in 1 m, Mindestabstand 0,3 m (keine Unendlichkeitsstelle)
      cps += s.intensity * 8 / (1 + (d / 0.4) ** 2) * w;
      const nuc = s.substance_id ? get('radionuclides', s.substance_id) : null; if (!nuc || /alpha|α/i.test(JSON.stringify(nuc.radiation ?? ''))) alpha += s.intensity * 1.5 / (1 + (d / 0.25) ** 2) * w;
    } else if (s.type === 'CHEMICAL') {
      const c = s.intensity * plume(dx, dy, s.radius, wind) * w; if (c <= 0) continue;
      const ref = s.substance_id ? get('substances', s.substance_id) : null;
      if (!ref || (ref.ie_ev != null && ref.ie_ev < PID_LAMP_EV)) voc += c;
      if (ref?.cas === '630-08-0') g.CO += c; if (ref?.cas === '7783-06-4') g.H2S += c; if (ref?.cas === '7446-09-5') g.SO2 += c;
      if (ref?.lel_vol) g.CH4 += (c / (ref.lel_vol * 10000)) * 100;
      g.O2 -= c / 10000;
      imsAdd(ims, Math.min(8, Math.round((c / s.intensity) * 8 + (c > 0.5 ? 0.5 : 0))), ref, ref?.substance_group ?? null);
    }
  }
  g.O2 = Math.max(0, g.O2);
  return { dose, cps, alphaCps: alpha, voc, gases: g, ims, nearest };
}

function imsAdd(ims: ImsHit, bars: number, s: any, group: string | null) {
  if (bars <= 0) return;
  const grp = String(s?.substance_group ?? group ?? ''); const cls: 'G' | 'H' | 'T' = /nerv/i.test(grp) ? 'G' : /haut|blister|lost|senf/i.test(grp) ? 'H' : 'T'; // SIM: Klassenzuordnung aus Stoffgruppe
  if (bars > ims[cls]) { ims[cls] = bars; ims.substance_id = s?.id ?? ims.substance_id; ims.group = grp || ims.group; ims.code = s?.formula ?? s?.name?.slice(0, 5)?.toUpperCase() ?? cls; }
}
