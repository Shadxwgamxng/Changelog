import PDFDocument from 'pdfkit';
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
    kind: 'EINSATZBERICHT', simulated: true, notice: 'SIMULATION – Messwerte, GPS, Einsatz und Identifikationen sind nicht real. Fachdaten ungeprüft (siehe Quellenstatus).',
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

export function reportPdf(id: string, d: any): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 }); const chunks: Buffer[] = []; doc.on('data', (c) => chunks.push(c)); doc.on('end', () => resolve(Buffer.concat(chunks)));
    const H = (t: string) => { doc.moveDown(0.8).fontSize(11).fillColor('#1f4f8a').text(t.toUpperCase()).fillColor('#000').fontSize(9); doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#999').stroke(); doc.moveDown(0.3); };
    doc.fontSize(16).text(`Einsatzbericht ${d.number}`); doc.fontSize(9).fillColor('#b00').text('SIMULATION – keine reale CBRN-Messung').fillColor('#000');
    doc.text(`Fahrzeug: ${d.vehicle?.name}   Auftrag: ${d.mission.id}   Gebiet: ${d.mission.sector_name}   Priorität: ${d.mission.priority}   Messprofil: ${d.mission.profile}`);
    doc.text(`Start: ${d.start}   Ende: ${d.end ?? 'laufend'}   Erstellt von: ${d.author}`);
    H('Besatzung'); d.crew.forEach((c: any) => doc.text(`${c.role}: ${c.name}`));
    H('Messgeräte / Messpunkte'); doc.text(`Geräte: ${d.devices.join(', ') || '–'}   Messpunkte: ${d.measurement_count}   Auffälligkeiten: ${d.anomalies}`);
    H('Auffälligkeiten'); d.measurements.filter((m: any) => m.status !== 'NORMAL').slice(0, 40).forEach((m: any) => doc.text(`${m.id}  ${m.ts.slice(11, 19)}  ${m.device}  ${m.value ?? ''} ${m.unit ?? ''}  ${m.status}  ${m.headline ?? ''}  [${levelText(m.level)}]`));
    H('Stoffreferenzen'); if (!d.substance_refs.length) doc.text('keine'); d.substance_refs.forEach((s: any) => doc.text(`${s.name} (CAS ${s.cas}) – Datenstatus: ${s.quality}  Quelle: ${s.source}`));
    H('Proben'); if (!d.samples.length) doc.text('keine'); d.samples.forEach((s: any) => doc.text(`${s.id}  ${s.kind}  ${s.ts.slice(11, 19)}  Labor: ${s.lab_status}${s.lab_result ? ' – ' + s.lab_result.text : ''}`));
    H('Wetter (Wind: meteorologische Richtung – kommt AUS)'); const w = d.weather.at(-1); doc.text(w ? `${w.temperature} °C, ${w.humidity} %, ${w.pressure} hPa, ${w.wind_speed} m/s aus ${w.wind_from_text} (${w.wind_from}°)` : 'NICHT VERFÜGBAR');
    H('Track'); if (d.track.length > 1) {
      const xs = d.track.map((p: number[]) => p[0]), ys = d.track.map((p: number[]) => p[1]); const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const bx = 40, by = doc.y + 4, W = 515, Hh = 150; doc.rect(bx, by, W, Hh).strokeColor('#999').stroke();
      const px = (x: number) => bx + 8 + ((x - x0) / (x1 - x0 || 1)) * (W - 16), py = (y: number) => by + Hh - 8 - ((y - y0) / (y1 - y0 || 1)) * (Hh - 16);
      doc.moveTo(px(xs[0]), py(ys[0])); d.track.forEach((p: number[]) => doc.lineTo(px(p[0]), py(p[1]))); doc.strokeColor('#1f5fa8').stroke(); doc.y = by + Hh + 6;
    } else doc.text('NICHT VERFÜGBAR');
    H('Bemerkungen'); doc.text(d.remarks || '–');
    doc.end();
  });
}
