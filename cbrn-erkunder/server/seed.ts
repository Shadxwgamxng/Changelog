import { db, insert, list, get, now, setSetting, getSetting } from './db.js';
import { substances } from './data/substances.js';
import { radionuclides, bioAgents } from './data/nuclides.js';
import { sources, devices, methods, tubes, users, vehicles, crew, scenarios } from './data/misc.js';
import { offsetToLL, llToOffset, KIEL } from './geo.js';

// Seed-Positionen sind relativ zum Kieler Demo-Zentrum notiert und werden auf das aktive Kartenzentrum übertragen.
const rel = (lat: number, lon: number) => { const o = llToOffset(lat, lon, KIEL); return offsetToLL(o.x, o.y); };

// Abgeleitete P-Sätze (GHS-Standardtexte, nur Einstufungsinformation – keine Einsatzanweisung)
function pFor(s: { ghs: string[]; h: string[] }) {
  const p = new Set<string>();
  if (s.ghs.includes('GHS02')) ['P210', 'P233'].forEach((x) => p.add(x));
  if (s.ghs.includes('GHS06') || s.h.some((h) => h.startsWith('H33'))) ['P260', 'P284', 'P304+P340', 'P310'].forEach((x) => p.add(x));
  if (s.ghs.includes('GHS05')) ['P280', 'P303+P361+P353', 'P305+P351+P338'].forEach((x) => p.add(x));
  if (s.ghs.includes('GHS04')) p.add('P403+P233');
  return [...p];
}

export function seedIfEmpty() {
  if ((db.prepare('SELECT COUNT(*) c FROM sources').get() as any).c > 0) return;
  const tx = db.transaction(() => {
    for (const s of sources) insert('sources', { ...s, retrieved_at: null, data_stand: null });
    for (const s of substances) insert('substances', { ...s, p: pFor(s), ims_sim: s.ims_sim ? 1 : 0, quality: 'unverified', last_checked: null });
    for (const r of radionuclides) insert('radionuclides', { ...r, quality: 'unverified' });
    for (const b of bioAgents) insert('biological_agents', { ...b, quality: 'unverified' });
    for (const d of devices) insert('measurement_devices', d);
    for (const m of methods) insert('measurement_methods', m);
    for (const t of tubes) insert('test_tubes', t);
    for (const u of users) insert('users', u);
    for (const v of vehicles) insert('vehicles', { ...v, ...rel(v.lat, v.lon) });
    for (const c of crew) insert('crew', c);
    for (const s of scenarios) insert('scenarios', s);
    setSetting('active_scenario', 'sc-chlor'); setSetting('source_offset', { x: 160, y: 90 });
    setSetting('mgmg_channels', ['O2', 'CO', 'H2S', 'LEL', 'CH4']); setSetting('fivem_origin', { x: 0, y: 0, scale: 1 });
    const t0 = Date.now();
    const iso = (min: number) => new Date(t0 - min * 60000).toISOString();
    insert('missions', { id: '2026-0140', vehicle_id: 'CBRN-03', sector: 'SUED', priority: 'NORMAL', profile: 'CHEMISCH', status: 'ABGESCHLOSSEN', created_by: 'u-mlk', created_at: iso(95), updated_at: iso(40), started_at: iso(85), ended_at: iso(40), notes: 'Erkundung Sektor Süd abgeschlossen (Demo).' });
    insert('missions', { id: '2026-0141', vehicle_id: 'CBRN-02', sector: 'OST', priority: 'NORMAL', profile: 'CHEMISCH', status: 'IN BEARBEITUNG', created_by: 'u-mlk', created_at: iso(30), updated_at: iso(25), started_at: iso(25), notes: null });
    insert('missions', { id: '2026-0142', vehicle_id: 'CBRN-01', sector: 'NORD', priority: 'HOCH', profile: 'CHEMISCH + RADIOLOGISCH', status: 'IN BEARBEITUNG', created_by: 'u-mlk', created_at: iso(12), updated_at: iso(10), started_at: iso(10), notes: null });
    // Historische Demo-Messpunkte entlang eines Tracks
    let seq = 400;
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2; const p = offsetToLL(-500 + 80 * i * 0.6, -450 + 40 * i * 0.6 + 120 * Math.sin(a));
      seq++;
      insert('measurements', { id: 'MP-' + String(seq).padStart(6, '0'), seq, ts: iso(90 - i * 2), lat: p.lat, lon: p.lon, vehicle_id: 'CBRN-03', mission_id: '2026-0140', device: 'FMG', value: +(0.08 + Math.random() * 0.03).toFixed(3), unit: 'µSv/h', status: 'NORMAL', headline: 'FMG-Routinemesspunkt', data_source: 'SIMULATED' });
    }
    const hp = offsetToLL(-300, -380);
    insert('measurements', { id: 'MP-000421', seq: 421, ts: iso(55), lat: hp.lat, lon: hp.lon, vehicle_id: 'CBRN-03', mission_id: '2026-0140', device: 'PID', value: 12.4, unit: 'ppm', status: 'ERHÖHT', level: 'hinweis', headline: 'Erhöhte VOC-Anzeige (Screening)', candidates: ['Aromatische Kohlenwasserstoffe', 'Lösemittel', 'VOC-Gemische'], remark: 'PID allein identifiziert keinen Stoff.', data_source: 'SIMULATED' });
    const w = { temperature: 11.2, humidity: 80, pressure: 1014, wind_speed: 3.1, wind_from: 310, wind_from_text: 'NW', cloud_okta: 5, precipitation: 0 };
    const mk = (id: string, minAgo: number, kind: string, desc: string, lab: string, status: string, truth: any, res: any, evs: [number, string][]) => {
      insert('samples', { id, ts: iso(minAgo), lat: hp.lat, lon: hp.lon, kind, description: desc, color: 'farblos', consistency: kind === 'FLÜSSIG' ? 'dünnflüssig' : '–', odor: 'NICHT BEURTEILT', turbidity: 'klar', readings: { PID: '12,4 ppm', Dosisleistung: '0,09 µSv/h' }, weather: w, location: 'Demo-Entnahmeort Süd', taken_by: 'Messtrupp 3', mission_id: '2026-0140', vehicle_id: 'CBRN-03', transport_status: 'ÜBERGEBEN', lab_status: status, onsite_assessment: lab, lab_result: res, truth_ref: truth, updated_at: iso(minAgo - 5) });
      for (const [m, st] of evs) db.prepare('INSERT INTO sample_events(sample_id,ts,status,note,by_user) VALUES(?,?,?,?,?)').run(id, iso(m), st, null, 'u-erk');
    };
    mk('P-2026-00421', 50, 'FLÜSSIG', 'Flüssigkeitsprobe aus Auffangwanne', 'UNBEKANNT', 'BEFUND EINGEGANGEN', { type: 'substance', id: 'toluol' }, { finding: 'BEFUND', klass: 'Aromatischer Kohlenwasserstoff / Lösemittel', substance_id: 'toluol', text: 'AROMATISCHER KOHLENWASSERSTOFF / LÖSEMITTEL', simulated: true }, [[50, 'ENTNOMMEN'], [46, 'VERPACKT'], [40, 'ÜBERGEBEN'], [34, 'LABOR EINGEGANGEN'], [30, 'ANALYSE'], [20, 'BEFUND EINGEGANGEN']]);
    mk('P-2026-00422', 45, 'FEST', 'Bodenprobe', 'VERDACHT', 'BEFUND EINGEGANGEN', null, { finding: 'KEIN CBRN-RELEVANTER BEFUND', text: 'KEIN CBRN-RELEVANTER BEFUND', simulated: true }, [[45, 'ENTNOMMEN'], [41, 'VERPACKT'], [36, 'ÜBERGEBEN'], [30, 'LABOR EINGEGANGEN'], [24, 'ANALYSE'], [15, 'BEFUND EINGEGANGEN']]);
    mk('P-2026-00423', 20, 'LUFT', 'Luftprobe (Adsorberröhrchen)', 'UNBEKANNT', 'LABOR EINGEGANGEN', { type: 'substance', id: 'toluol' }, null, [[20, 'ENTNOMMEN'], [17, 'VERPACKT'], [12, 'ÜBERGEBEN'], [6, 'LABOR EINGEGANGEN']]);
    db.prepare('INSERT INTO alarms(id,ts,source,lat,lon,category,status,description,vehicle_id,measurement_id) VALUES(?,?,?,?,?,?,?,?,?,?)').run('ALM-00001', iso(55), 'PID', hp.lat, hp.lon, 'CHEMISCH', 'QUITTIERT', 'PID-Screening erhöht (12,4 ppm)', 'CBRN-03', 'MP-000421');
    db.prepare('INSERT INTO alarms(id,ts,source,lat,lon,category,status,description,vehicle_id,measurement_id) VALUES(?,?,?,?,?,?,?,?,?,?)').run('ALM-00002', iso(30), 'DFÜ', rel(54.29, 10.17).lat, rel(54.29, 10.17).lon, 'NETZWERK', 'OFFEN', 'CBRN-04: Datenverbindung unterbrochen', 'CBRN-04', null);
    db.prepare('INSERT INTO alarms(id,ts,source,lat,lon,category,status,description,vehicle_id,measurement_id) VALUES(?,?,?,?,?,?,?,?,?,?)').run('ALM-00003', iso(8), 'SYSTEM', rel(54.3233, 10.1228).lat, rel(54.3233, 10.1228).lon, 'SYSTEM', 'OFFEN', 'DEMO MODE aktiv – alle Daten sind simuliert', 'CBRN-01', null);
    const aud = db.prepare('INSERT INTO audit_log(ts,user_id,action,entity,entity_id,detail) VALUES(?,?,?,?,?,?)');
    aud.run(iso(55), 'u-erk', 'create', 'measurement', 'MP-000421', null); aud.run(iso(50), 'u-erk', 'create', 'sample', 'P-2026-00421', null);
    aud.run(iso(20), 'SYSTEM', 'lab_result', 'sample', 'P-2026-00421', null);
  });
  tx();
  // Datensatz-Statistik der Quellen wird zur Laufzeit berechnet
}
export { list, get, now, getSetting };
