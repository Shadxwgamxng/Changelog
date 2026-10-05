// ---------------------------------------------------------------------------------------------
// Brandeinsatz / Rauchgasmessung: Brandstellen (vom Einsatzteam auf der Karte eingezeichnet) erzeugen eine Rauchfahne,
// die dem Wind folgt. Alle Konzentrationen sind SIMULIERT (plausible Größenordnungen, keine echten Messwerte).
// ---------------------------------------------------------------------------------------------
import { db, get, list, insert, update, now, audit } from './db.js';
import { emit } from './sim.js';
import { llToOffset } from './geo.js';

export const FIRE_SIZES: Record<string, { f: number; r: number; label: string }> = {
  klein: { f: 0.5, r: 150, label: 'klein' }, mittel: { f: 1, r: 300, label: 'mittel' }, 'groß': { f: 2, r: 550, label: 'groß' },
};
/** Spitzenwerte (ppm) im Kern der Rauchfahne bei „mittel“ – je Brandart verschiedene Zusammensetzung (Simulationsannahme). */
export const FIRE_TYPES: Record<string, { label: string; gases: Record<string, number>; main: string }> = {
  GEBAEUDE: { label: 'Gebäudebrand', gases: { CO: 120, CO2: 3000, HCN: 6, NO2: 3, HCl: 8, SO2: 2, VOC: 60 }, main: 'Kohlenmonoxid, Kohlendioxid, Blausäure, Stickoxide und Chlorwasserstoff aus Einrichtung/Baustoffen' },
  FAHRZEUG: { label: 'Fahrzeugbrand', gases: { CO: 90, CO2: 2500, HCN: 8, NO2: 4, HCl: 25, SO2: 6, VOC: 120 }, main: 'Kohlenmonoxid, Chlorwasserstoff aus Kabeln/Kunststoffen, Schwefeldioxid und organische Verbrennungsprodukte' },
  INDUSTRIE: { label: 'Industrie-/Lagerbrand (Kunststoffe)', gases: { CO: 150, CO2: 3500, HCN: 18, NO2: 5, HCl: 40, SO2: 10, VOC: 180 }, main: 'Kohlenmonoxid, Blausäure, Chlorwasserstoff, Schwefeldioxid und organische Verbrennungsprodukte' },
  VEGETATION: { label: 'Vegetations-/Flächenbrand', gases: { CO: 100, CO2: 2000, HCN: 1, NO2: 2, HCl: 0.5, SO2: 1, VOC: 50 }, main: 'Kohlenmonoxid, Kohlendioxid und organische Verbrennungsprodukte' },
};
export const GAS_BG: Record<string, number> = { CO: 0.5, CO2: 420, HCN: 0, NO2: 0, HCl: 0, SO2: 0, VOC: 0.1 };
/** Alarmschwellen der Simulation (ppm, konfigurierbar/ohne amtlichen Anspruch). */
export const GAS_ALARM: Record<string, number> = { CO: 30, CO2: 5000, HCN: 2, NO2: 0.5, HCl: 2, SO2: 0.5 };

const err = (msg: string, code = 400) => Object.assign(new Error(msg), { statusCode: code });
const activeIncidentId = () => (db.prepare("SELECT id FROM incidents WHERE status = 'AKTIV' ORDER BY created_at DESC LIMIT 1").get() as any)?.id as string | undefined;
export const activeFires = () => { const id = activeIncidentId(); return id ? list('incident_fires', 'WHERE incident_id = ? AND active = 1 ORDER BY created_at', [id]) : []; };
export const hasFire = () => activeFires().length > 0;

/** Form der Rauchfahne (0..1): lang in Windrichtung, schmal quer dazu, mit leichtem Wabern. */
function shape(x: number, y: number, src: { x: number; y: number }, r: number, windFrom: number, t: number) {
  const th = ((windFrom + 180) % 360) * (Math.PI / 180); const ux = Math.sin(th), uy = Math.cos(th);
  const dx = x - src.x, dy = y - src.y, along = dx * ux + dy * uy, cross = -dx * uy + dy * ux;
  const sx = along > 0 ? 1.0 * r : 0.12 * r, sy = 0.16 * r + Math.max(0, along) * 0.10;
  const turb = 1 + 0.15 * Math.sin(t / 6) + 0.05 * Math.sin(t / 2.3);
  return Math.exp(-(along * along) / (2 * sx * sx) - (cross * cross) / (2 * sy * sy)) * Math.max(0.3, turb);
}

/** Gaskonzentrationen am Ort (Spielkoordinaten relativ zum Einsatzzentrum) aus allen aktiven Brandstellen. */
export function smokeAt(x: number, y: number, windFrom: number, t: number) {
  const gases: Record<string, number> = { CO: 0, CO2: 0, HCN: 0, NO2: 0, HCl: 0, SO2: 0, VOC: 0 }; let total = 0;
  for (const f of activeFires()) {
    const sz = FIRE_SIZES[f.size] ?? FIRE_SIZES.mittel; const ty = FIRE_TYPES[f.type] ?? FIRE_TYPES.GEBAEUDE;
    const s = shape(x, y, llToOffset(f.lat, f.lon), sz.r, windFrom, t); total += s * sz.f;
    for (const g of Object.keys(gases)) gases[g] += ty.gases[g] * sz.f * s;
  }
  return { gases, density: total };
}

export const publicFire = (f: any) => ({ ...f, type_text: FIRE_TYPES[f.type]?.label ?? f.type, size_text: f.size });
export function listFires() { return activeFires().map(publicFire); }

export function addFire(by: string, b: { lat: number; lon: number; size?: string; type?: string; label?: string }) {
  const incident = activeIncidentId(); if (!incident) throw err('Kein aktiver Einsatz');
  const lat = Number(b.lat), lon = Number(b.lon); if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw err('Bitte die Brandstelle auf der Karte markieren');
  const size = FIRE_SIZES[String(b.size)] ? String(b.size) : 'mittel'; const type = FIRE_TYPES[String(b.type)] ? String(b.type) : 'GEBAEUDE';
  const n = ((db.prepare('SELECT COUNT(*) c FROM incident_fires').get() as any).c ?? 0) + 1;
  const id = 'F-' + String(n).padStart(3, '0');
  insert('incident_fires', { id, incident_id: incident, lat, lon, size, type, active: 1, created_by: by, created_at: now(), label: String(b.label ?? '').trim().slice(0, 60) || null });
  audit(by, 'create', 'fire', id, { incident, size, type }); emit('fires.changed', listFires()); return publicFire(get('incident_fires', id));
}
export function removeFire(by: string, id: string) {
  const f = get('incident_fires', id); if (!f || !f.active) throw err('Brandstelle nicht gefunden', 404);
  update('incident_fires', id, { active: 0 }); audit(by, 'extinguish', 'fire', id); emit('fires.changed', listFires()); return { ok: true };
}
