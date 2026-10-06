import { db, get, list } from './db.js';
import { SECTORS, compass } from './geo.js';
import { levelText } from './sim.js';
import { crewOf } from './auth.js';

export function buildReport(missionId: string, author: string) {
  const m = get('missions', missionId)!; const v = get('vehicles', m.vehicle_id);
  const from = m.started_at ?? m.created_at; const to = m.ended_at ?? new Date().toISOString();
  const meas = list('measurements', 'WHERE mission_id = ? ORDER BY seq', [missionId]);
  const samples = list('samples', 'WHERE mission_id = ? ORDER BY ts', [missionId]).map(({ truth_ref, ...s }: any) => s);
  const wx = (db.prepare('SELECT * FROM weather_records WHERE ts BETWEEN ? AND ? ORDER BY ts').all(from, to) as any[]).map((w) => ({ ...w, wind_from_text: compass(w.wind_from) }));
  const alarms = list('alarms', 'WHERE vehicle_id = ? AND ts BETWEEN ? AND ? ORDER BY ts', [m.vehicle_id, from, to]);
  const subIds = new Set<string>(); meas.forEach((x: any) => x.substance_id && subIds.add(x.substance_id)); samples.forEach((s: any) => s.lab_result?.substance_id && subIds.add(s.lab_result.substance_id));
  const refs = [...subIds].map((id) => { const s = get('substances', id); return { id, name: s?.name, cas: s?.cas, category: s?.cbrn_category, quality: s?.quality, source: get('sources', s?.source_id)?.name }; });
  const devices = [...new Set(meas.map((x: any) => x.device))];
  const anomalies = meas.filter((x: any) => x.status !== 'NORMAL');
  return {
    kind: 'EINSATZBERICHT', simulated: true, notice: '',
    number: `E-${missionId}`, author, mission: { ...m, sector_name: SECTORS[m.sector]?.name ?? m.sector }, vehicle: v, crew: crewOf(m.vehicle_id),
    start: from, end: m.ended_at ?? null, devices, measurement_count: meas.length, measurements: meas, anomalies: anomalies.length, samples, weather: wx, alarms, substance_refs: refs,
    track: meas.map((x: any) => [x.lon, x.lat]), remarks: m.notes ?? '',
  };
}

const esc = (v: any) => { const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export function reportCsv(d: any) {
  const h = ['id', 'ts', 'lat', 'lon', 'vehicle_id', 'device', 'value', 'unit', 'status', 'level', 'headline', 'substance_id', 'data_source'];
  return [h.join(';'), ...d.measurements.map((m: any) => h.map((k) => esc(m[k])).join(';'))].join('\n');
}
