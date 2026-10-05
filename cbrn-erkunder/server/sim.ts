import { EventEmitter } from 'node:events';
import { db, get, list, insert, update, now, getSetting, setSetting, audit } from './db.js';
import { offsetToLL, llToOffset, distM, bearing, compass, MODE, gameToLL } from './geo.js';

// ---------------------------------------------------------------------------------------------
// Simulationsengine. Stoffdaten stammen aus der (realen) Datenbank, Messereignisse sind SIMULIERT.
// Der Arbeitsablauf: Messwert -> Gerätehinweis -> Stoffgruppe -> mögliche Stoffe -> weitere Messung/Probe -> Laborbefund.
// ---------------------------------------------------------------------------------------------
export const bus = new EventEmitter();
export const emit = (type: string, payload: any) => bus.emit('event', { type, payload, ts: now() });

export const BG = { dose: 0.09, o2: 20.9, co: 0.5, pid: 0.1, cps: 1.2 };
const PID_LAMP_EV = 10.6;
const rnd = (a = 1) => (Math.random() - 0.5) * 2 * a;
const gauss = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 0.58;

// ---- Test-Route (nur mit DEV_DRIVE=1): liegende Acht um das Einsatzzentrum
const ROUTE = Array.from({ length: 480 }, (_, i) => { const t = (i / 480) * Math.PI * 2; return { x: 750 * Math.sin(t), y: 480 * Math.sin(2 * t) }; });
ROUTE.push(ROUTE[0]);
const CUM = [0]; for (let i = 1; i < ROUTE.length; i++) CUM.push(CUM[i - 1] + Math.hypot(ROUTE[i].x - ROUTE[i - 1].x, ROUTE[i].y - ROUTE[i - 1].y));
export const routeLL = () => ROUTE.map((p) => { const l = offsetToLL(p.x, p.y); return [l.lon, l.lat]; });
function routePos(s: number) {
  const L = CUM[CUM.length - 1]; s = ((s % L) + L) % L;
  let i = 1; while (CUM[i] < s) i++;
  const f = (s - CUM[i - 1]) / (CUM[i] - CUM[i - 1]);
  return { x: ROUTE[i - 1].x + (ROUTE[i].x - ROUTE[i - 1].x) * f, y: ROUTE[i - 1].y + (ROUTE[i].y - ROUTE[i - 1].y) * f };
}

// ---- Laufzeitzustand
export const state = {
  drive: process.env.DEV_DRIVE === '1', s: 0, s2: 0, speed: 12, seen: {} as Record<string, number>, // m/s
  weather: { temperature: 11.4, humidity: 78, pressure: 1014, wind_speed: 3.4, wind_from: 315, cloud_okta: 5, precipitation: 0 },
  live: {} as Record<string, any>,
  fivem: { last: 0, info: null as any },
  trackLen: 0, mpCount: 0, lastTrackPos: null as null | { lat: number; lon: number },
  run: null as null | { id: string; vehicle_id: string; name: string; started_at: string; started_by: string; dist: number; points: number; maxDose: number; maxPid: number; source: string; mission_id: string | null },
  gameWeather: null as null | { type: string; wind_speed: number; wind_from: number; hour: number; minute: number; at: number },
  cooldown: new Map<string, number>(), tick: 0,
};
export const fivemConnected = () => Date.now() - state.fivem.last < 10000;

// ---- Szenario & Ausbreitung
export function activeScenario() {
  const sc = get('scenarios', getSetting('active_scenario', 'sc-chlor'));
  if (!sc) return null;
  const ref = sc.ref_type === 'substance' ? get('substances', sc.ref_id) : sc.ref_type === 'radionuclide' ? get('radionuclides', sc.ref_id) : get('biological_agents', sc.ref_id);
  return { sc, ref, src: getSetting('source_offset', { x: 160, y: 90 }) as { x: number; y: number } };
}
function concAt(x: number, y: number, A: NonNullable<ReturnType<typeof activeScenario>>, windFrom: number, t: number) {
  const { sc, src } = A; const th = ((windFrom + 180) % 360) * (Math.PI / 180); // Wind kommt AUS windFrom, Fahne zieht nach windFrom+180
  const ux = Math.sin(th), uy = Math.cos(th);
  const dx = x - src.x, dy = y - src.y, along = dx * ux + dy * uy, cross = -dx * uy + dy * ux;
  const r = sc.radius_m, sx = along > 0 ? 0.75 * r : 0.1 * r, sy = 0.2 * r + Math.max(0, along) * 0.08;
  const turb = 1 + 0.18 * Math.sin(t / 7) + 0.08 * gauss();
  return sc.peak * Math.exp(-(along * along) / (2 * sx * sx) - (cross * cross) / (2 * sy * sy)) * Math.max(0.2, turb);
}
export function truthAt(x: number, y: number) {
  const A = activeScenario(); if (!A) return { c: 0, A };
  if (A.sc.category === 'R') { const r = Math.hypot(x - A.src.x, y - A.src.y); return { c: A.sc.peak * (225 / Math.max(r * r, 225)) * (r > 3 * A.sc.radius_m ? 0 : 1), A }; }
  if (A.sc.category === 'B') return { c: 0, A };
  return { c: concAt(x, y, A, state.weather.wind_from, state.tick * 2), A };
}

const PID_GROUPS_AROM = ['Aromatische Kohlenwasserstoffe', 'Lösemittel', 'VOC-Gemische'];
function pidGroups(sub: any) {
  if (!sub) return ['Flüchtige organische Verbindungen (VOC)'];
  const g = (sub.substance_group ?? '').toLowerCase();
  if (g.includes('aromat')) return PID_GROUPS_AROM;
  if (g.includes('lösemittel') || g.includes('alkohol') || g.includes('keton')) return ['Lösemittel', 'Sauerstoffhaltige VOC', 'VOC-Gemische'];
  return ['Anorganische/organische Verbindungen mit Ionisierungsenergie < 10,6 eV', 'VOC-Gemische'];
}

export function mgmgChannels(): string[] { return getSetting('mgmg_channels', ['O2', 'CO', 'H2S', 'LEL', 'CH4']); }

export function readingsAt(x: number, y: number, speed: number) {
  const { c, A } = truthAt(x, y);
  const sc = A?.sc, ref = A?.ref;
  const chem = !!sc && (sc.category === 'C' || sc.category === 'U') && ref;
  const rad = !!sc && sc.category === 'R';
  const ch = mgmgChannels();
  // PID – Ansprechen nur, wenn Ionisierungsenergie < Lampenenergie
  const pidResp = chem && ref.ie_ev != null && ref.ie_ev < PID_LAMP_EV;
  const pid = Math.max(0, BG.pid + rnd(0.05) + (pidResp ? c : 0));
  // MGMG
  const isFlam = chem && ref.lel_vol;
  const mg: Record<string, number> = {
    O2: +(BG.o2 + rnd(0.05) - (chem ? c / 10000 : 0)).toFixed(1),
    CO: +Math.max(0, BG.co + rnd(0.5) + (chem && ref.cas === '630-08-0' ? c : 0)).toFixed(0),
    H2S: +Math.max(0, (chem && ref.cas === '7783-06-4' ? c : 0)).toFixed(1),
    LEL: +Math.max(0, isFlam ? (c / (ref.lel_vol * 10000)) * 100 : 0).toFixed(1),
    CH4: 0,
  };
  const channels = Object.fromEntries(ch.map((k) => [k, mg[k] ?? null]));
  // IMS (Simulationsannahme: ims_sim je Stoff)
  const ratio = chem ? c / sc.peak : 0;
  let ims: any = { state: 'ONLINE', mode: 'AKTIV', level: null, result: 'KEIN TREFFER', confidence: null, substance_id: null, group: null, candidates: [] };
  if (chem && ref.ims_sim && ratio > 0.03) {
    const sameGroup = list('substances', 'WHERE ims_sim = 1 AND id != ? AND substance_group = ?', [ref.id, ref.substance_group]).slice(0, 2);
    if (ratio < 0.15) ims = { ...ims, level: 'hinweis', result: `HINWEIS – Stoffklasse: ${ref.substance_group}`, group: ref.substance_group };
    else if (ratio < 0.4) ims = { ...ims, level: 'verdacht', result: `VERDACHT – ${ref.substance_group}`, group: ref.substance_group, candidates: [ref.id, ...sameGroup.map((s: any) => s.id)] };
    else ims = { ...ims, level: 'moegliche_identifikation', result: 'MÖGLICHER STOFF', confidence: Math.round(Math.min(0.95, 0.5 + ratio * 0.45) * 100), substance_id: ref.id, group: ref.substance_group, candidates: [ref.id, ...sameGroup.map((s: any) => s.id)] };
  }
  const dose = Math.max(0.03, BG.dose + rnd(0.012) + (rad ? c : 0));
  const cps = Math.max(0, BG.cps + gauss() * 0.5 + (rad ? c * 6 : 0));
  return { c, pid: { value: +pid.toFixed(2), unit: 'ppm', groups: pid > 2 ? pidGroups(ref && pidResp ? ref : null) : [] },
    mgmg: { channels }, ims, dose: { value: +dose.toFixed(3), unit: 'µSv/h' }, como: { value: +cps.toFixed(1), unit: 'cps' },
    fmg: { speed_kmh: +(speed * 3.6).toFixed(0) } };
}

// ---- Gammaspektrum (simuliert) + Nuklidzuordnung aus Linienlage
export function spectrumAt(x: number, y: number) {
  const r = readingsAt(x, y, 0); const A = activeScenario();
  const N = 512, keV = 4; const excess = Math.max(0, r.dose.value - BG.dose);
  const lines: [number, number][] = [[1460.8, 14]]; // K-40 (natürlicher Untergrund)
  if (A?.sc.category === 'R' && A.ref?.gamma_kev) for (const e of A.ref.gamma_kev) lines.push([e, 160 * (excess / 0.5 + 0.05) ** 0.9]);
  const counts = Array.from({ length: N }, (_, i) => {
    const E = (i + 0.5) * keV; let v = 30 * Math.exp(-E / 500) + 2 + excess * 40 * Math.exp(-E / 700);
    for (const [e, a] of lines) { const sg = (0.07 * Math.sqrt(e * 661.7)) / 2.355; v += a * Math.exp(-((E - e) ** 2) / (2 * sg * sg)); }
    return Math.max(0, Math.round(v + gauss() * Math.sqrt(v)));
  });
  const nucs = list('radionuclides').filter((n: any) => n.gamma_kev?.length);
  const score = (e: number) => {
    const i = Math.round(e / keV - 0.5), w = 4;
    const peak = counts.slice(i - w, i + w + 1).reduce((a, b) => a + b, 0);
    const base = (counts.slice(i - 3 * w, i - w).reduce((a, b) => a + b, 0) + counts.slice(i + w + 1, i + 3 * w + 1).reduce((a, b) => a + b, 0)) / 2 * ((2 * w + 1) / (2 * w));
    return (peak - base) / Math.sqrt(Math.max(base, 1));
  };
  const ids = nucs.map((n: any) => ({ id: n.id, name: n.name, natural: n.id === 'k-40', z: Math.min(...n.gamma_kev.map(score)), best: Math.max(...n.gamma_kev.map(score)), gamma_kev: n.gamma_kev }))
    .filter((o: any) => o.z > 3).sort((a: any, b: any) => b.z - a.z);
  return { kev_per_channel: keV, counts, dose: r.dose.value, candidates: ids, simulated: true };
}

// ---- Messwertspeicherung / Alarme
const seqNow = () => ((db.prepare('SELECT MAX(seq) m FROM measurements').get() as any).m ?? 0) + 1;
const mpId = (n: number) => 'MP-' + String(n).padStart(6, '0');
export function createAlarm(a: { source: string; category: string; description: string; lat: number; lon: number; vehicle_id: string; measurement_id?: string | null }, key: string) {
  const last = state.cooldown.get(key) ?? 0; if (Date.now() - last < 90000) return null; state.cooldown.set(key, Date.now());
  const n = ((db.prepare("SELECT COUNT(*) c FROM alarms").get() as any).c ?? 0) + 1;
  const row = { id: 'ALM-' + String(n).padStart(5, '0'), ts: now(), status: 'OFFEN', ...a };
  insert('alarms', row); emit('alarm.created', row); return row;
}

function activeMissionFor(vehicle_id: string) {
  return list('missions', "WHERE vehicle_id = ? AND status IN ('IN BEARBEITUNG','ANGENOMMEN') ORDER BY created_at DESC LIMIT 1", [vehicle_id])[0];
}

export function storeMeasurement(m: any, silent = false) {
  const seq = seqNow();
  const row = { id: mpId(seq), seq, ts: now(), data_source: 'SIMULATED', ...m };
  insert('measurements', row); if (!silent) emit('measurement.created', row); return row;
}

const LEVEL_TXT: Record<string, string> = { hinweis: 'Hinweis', verdacht: 'Verdacht', moegliche_identifikation: 'Mögliche Identifikation', bestaetigt: 'Bestätigte Identifikation' };
export const levelText = (l: string | null) => (l ? LEVEL_TXT[l] : '–');

function evaluateAndStore(v: any, pos: { lat: number; lon: number }, r: ReturnType<typeof readingsAt>, mission: any, forceRoutine: boolean) {
  const base = { lat: pos.lat, lon: pos.lon, vehicle_id: v.id, mission_id: mission?.id ?? null, run_id: v.id === 'CBRN-01' ? state.run?.id ?? null : null };
  const rows: any[] = [];
  const throttle = state.tick % 3 === 0;
  // PID
  if (r.pid.value >= 2 && throttle) rows.push({ ...base, device: 'PID', value: r.pid.value, unit: 'ppm', status: r.pid.value >= 50 ? 'HOCH' : 'ERHÖHT', level: 'hinweis', headline: 'Erhöhte VOC-Anzeige (Screening)', candidates: r.pid.groups, remark: 'PID allein identifiziert keinen Stoff.' });
  // IMS
  if (r.ims.level && throttle) rows.push({ ...base, device: 'IMS', value: r.ims.confidence, unit: r.ims.confidence != null ? '%' : null, status: r.ims.level === 'moegliche_identifikation' ? 'AUSWERTUNG ERFORDERLICH' : 'ERHÖHT', level: r.ims.level, headline: r.ims.result, substance_id: r.ims.level === 'moegliche_identifikation' ? r.ims.substance_id : null, candidates: r.ims.candidates, remark: 'Simulierte IMS-Auswertung; Bestätigung durch weitere Messung/Probe erforderlich.' });
  // MGMG
  const ch = r.mgmg.channels as Record<string, number | null>;
  const bad = (ch.O2 != null && ch.O2 < 19.5) || (ch.CO ?? 0) > 30 || (ch.H2S ?? 0) > 5 || (ch.LEL ?? 0) > 10;
  const raised = (ch.CO ?? 0) > 5 || (ch.H2S ?? 0) > 0.5 || (ch.LEL ?? 0) > 1;
  if ((bad || raised) && throttle) rows.push({ ...base, device: 'MGMG', value: ch.LEL ?? null, unit: '%LEL', channels: ch, status: bad ? 'ALARM' : 'ERHÖHT', level: 'hinweis', headline: bad ? 'Grenzwert-/Alarmschwelle überschritten (Schwelle, Simulation)' : 'Kanalanzeige erhöht', remark: 'Alarmschwellen (Simulation): O₂ < 19,5 %, CO > 30 ppm, H₂S > 5 ppm, EX > 10 %UEG – konfigurierbar.' });
  // Dosisleistung
  if (r.dose.value >= 0.3 && throttle) rows.push({ ...base, device: 'DLM', value: r.dose.value, unit: 'µSv/h', status: r.dose.value >= 1 ? 'ALARM' : 'ERHÖHT', level: 'hinweis', headline: 'Erhöhte Dosisleistung', remark: 'Nuklidzuordnung über Gammaspektrum (simuliert).' });
  // FMG – routinemäßiger georeferenzierter Messpunkt
  if (forceRoutine) rows.push({ ...base, device: 'FMG', value: r.dose.value, unit: 'µSv/h', status: 'NORMAL', level: null, headline: 'FMG-Routinemesspunkt', remark: null });
  const saved = rows.map((row) => storeMeasurement(row));
  for (const m of saved) {
    if (m.device === 'IMS' && m.level === 'moegliche_identifikation') {
      const s = get('substances', m.substance_id);
      createAlarm({ source: 'IMS', category: 'CHEMISCH', description: `IMS: mögliche Identifikation ${s?.name ?? '?'} (simuliert)`, lat: m.lat, lon: m.lon, vehicle_id: v.id, measurement_id: m.id }, `${v.id}-ims`);
    }
    if (m.device === 'MGMG' && m.status === 'ALARM') createAlarm({ source: 'MGMG', category: 'CHEMISCH', description: 'MGMG: Alarmschwelle überschritten (Schwelle, Simulation)', lat: m.lat, lon: m.lon, vehicle_id: v.id, measurement_id: m.id }, `${v.id}-mgmg`);
    if (m.device === 'DLM' && m.status === 'ALARM') createAlarm({ source: 'DLM', category: activeScenario()?.sc.category === 'N' ? 'NUKLEAR' : 'RADIOLOGISCH', description: `Dosisleistung ${m.value} µSv/h (Schwelle 1 µSv/h, Simulation)`, lat: m.lat, lon: m.lon, vehicle_id: v.id, measurement_id: m.id }, `${v.id}-dlm`);
    if (m.device === 'PID' && m.status === 'HOCH') createAlarm({ source: 'PID', category: activeScenario()?.sc.category === 'U' ? 'UNBEKANNT' : 'CHEMISCH', description: `PID-Screening HOCH (${m.value} ppm)`, lat: m.lat, lon: m.lon, vehicle_id: v.id, measurement_id: m.id }, `${v.id}-pid`);
  }
}

// ---- Wetter
function weatherStep() {
  if (applyGameWeather()) return;
  const w = state.weather;
  w.wind_from = (w.wind_from + rnd(2.5) + 360) % 360; w.wind_speed = Math.max(0.3, Math.min(14, w.wind_speed + rnd(0.25)));
  w.temperature += rnd(0.05); w.humidity = Math.max(30, Math.min(100, w.humidity + rnd(0.4))); w.pressure += rnd(0.05);
  w.cloud_okta = Math.max(0, Math.min(8, Math.round(w.cloud_okta + rnd(0.3)))); w.precipitation = w.cloud_okta >= 7 && w.humidity > 90 ? 0.4 : 0;
}
export function weatherNow() { const w = state.weather; return { ts: now(), temperature: +w.temperature.toFixed(1), humidity: +w.humidity.toFixed(0), pressure: +w.pressure.toFixed(1), wind_speed: +w.wind_speed.toFixed(1), wind_from: +w.wind_from.toFixed(0), wind_from_text: compass(w.wind_from), cloud_okta: w.cloud_okta, precipitation: +w.precipitation.toFixed(1), data_source: 'SIMULATED', game_weather: state.gameWeather && Date.now() - state.gameWeather.at < 20000 ? state.gameWeather.type : null }; }

// ---- FiveM-Adapter-Eingang (optional). Die Weboberfläche setzt FiveM nicht voraus.
export interface FivemIn {
  vehicle?: string; lat?: number; lon?: number; x?: number; y?: number; speed_kmh?: number; heading?: number; player?: string; mission?: string; in_vehicle?: boolean;
  weather?: { type?: string; wind_speed?: number; wind_from?: number; hour?: number; minute?: number };
}
export function ingestFivem(d: FivemIn) {
  const id = d.vehicle ?? 'CBRN-01'; const v = get('vehicles', id); if (!v) return false;
  const was = fivemConnected();
  if (d.weather?.type) state.gameWeather = { type: String(d.weather.type).toUpperCase(), wind_speed: d.weather.wind_speed ?? 0, wind_from: d.weather.wind_from ?? 0, hour: d.weather.hour ?? 12, minute: d.weather.minute ?? 0, at: Date.now() };
  const hasPos = (d.lat != null && d.lon != null) || (d.x != null && d.y != null);
  if (hasPos) {
    let lat = d.lat, lon = d.lon;
    if (lat == null || lon == null) {
      if (MODE === 'gta5') { const p = gameToLL(d.x ?? 0, d.y ?? 0); lat = p.lat; lon = p.lon; } // Spielkoordinaten direkt
      else { const o = getSetting('fivem_origin', { x: 0, y: 0, scale: 1 }); const p = offsetToLL(((d.x ?? 0) - o.x) * o.scale, ((d.y ?? 0) - o.y) * o.scale); lat = p.lat; lon = p.lon; }
    }
    state.seen[id] = Date.now();
    update('vehicles', id, { lat, lon, heading: d.heading ?? v.heading, speed: d.speed_kmh ?? 0, online: 1, gps_fix: 1, link: 'ONLINE', status: v.status === 'OFFLINE' ? 'EINSATZBEREIT' : v.status, power: v.power === 'NICHT VERFÜGBAR' ? 'OK' : v.power });
    emit('vehicle.position', get('vehicles', id));
  }
  if (id === 'CBRN-01') {
    state.fivem = { last: Date.now(), info: { player: d.player ?? state.fivem.info?.player ?? null, mission: d.mission ?? null, heading: d.heading ?? null, in_vehicle: d.in_vehicle ?? hasPos, game_weather: state.gameWeather?.type ?? null, game_time: state.gameWeather ? `${String(state.gameWeather.hour).padStart(2, '0')}:${String(state.gameWeather.minute).padStart(2, '0')}` : null } };
    if (!was) emit('system.status', systemStatus());
  }
  return true;
}

// ---- Messfahrt (Run)
export function runInfo() { const R = state.run; return R ? { id: R.id, name: R.name, vehicle_id: R.vehicle_id, started_at: R.started_at, distance_m: Math.round(R.dist), points: R.points, source: R.source, max_dose: R.maxDose, max_pid: R.maxPid } : null; }
function saveRun() {
  const R = state.run; if (!R) return;
  const pts = (db.prepare('SELECT COUNT(*) c FROM measurements WHERE run_id = ?').get(R.id) as any).c; R.points = pts;
  update('runs', R.id, { distance_m: Math.round(R.dist), points: pts, max_dose: R.maxDose, max_pid: R.maxPid });
}
export function startRun(userId: string, name?: string) {
  if (state.run) return { error: 'Es läuft bereits eine Messfahrt' };
  const n = ((db.prepare('SELECT COUNT(*) c FROM runs').get() as any).c ?? 0) + 1;
  const mission = list('missions', "WHERE vehicle_id = 'CBRN-01' AND status = 'IN BEARBEITUNG' LIMIT 1")[0];
  const R = { id: 'MF-' + String(n).padStart(4, '0'), vehicle_id: 'CBRN-01', name: name || `Messfahrt ${n}`, started_at: now(), started_by: userId, dist: 0, points: 0, maxDose: 0, maxPid: 0, source: fivemConnected() ? 'FIVEM' : 'OFFLINE', mission_id: mission?.id ?? null };
  state.run = R; state.lastTrackPos = null;
  insert('runs', { id: R.id, vehicle_id: R.vehicle_id, name: R.name, started_at: R.started_at, started_by: userId, distance_m: 0, points: 0, source: R.source, mission_id: R.mission_id });
  audit(userId, 'start', 'run', R.id, { source: R.source }); emit('run.started', runInfo()); return { run: runInfo() };
}
export function stopRun(userId: string) {
  const R = state.run; if (!R) return { error: 'Keine Messfahrt aktiv' };
  saveRun(); update('runs', R.id, { ended_at: now() }); state.run = null;
  audit(userId, 'stop', 'run', R.id, { distance_m: Math.round(R.dist) }); emit('run.stopped', get('runs', R.id)); return { run: get('runs', R.id) };
}
// GTA-Wetterlagen -> abgeleitete Wetterwerte (GTA kennt keine Temperatur/Luftfeuchte; Werte sind Näherungen, SIMULIERT)
const GTA_WX: Record<string, { t: number; rh: number; p: number; okta: number; rain: number }> = {
  EXTRASUNNY: { t: 31, rh: 35, p: 1018, okta: 0, rain: 0 }, CLEAR: { t: 26, rh: 45, p: 1016, okta: 1, rain: 0 }, CLOUDS: { t: 22, rh: 60, p: 1013, okta: 5, rain: 0 }, SMOG: { t: 24, rh: 55, p: 1012, okta: 4, rain: 0 },
  FOGGY: { t: 16, rh: 96, p: 1014, okta: 8, rain: 0 }, OVERCAST: { t: 19, rh: 75, p: 1010, okta: 8, rain: 0 }, RAIN: { t: 15, rh: 90, p: 1004, okta: 8, rain: 2.5 }, THUNDER: { t: 16, rh: 92, p: 1000, okta: 8, rain: 6 },
  CLEARING: { t: 18, rh: 80, p: 1008, okta: 6, rain: 0.4 }, NEUTRAL: { t: 22, rh: 55, p: 1013, okta: 3, rain: 0 }, SNOW: { t: -1, rh: 85, p: 1008, okta: 8, rain: 1 }, BLIZZARD: { t: -6, rh: 88, p: 1002, okta: 8, rain: 3 },
  SNOWLIGHT: { t: 0, rh: 82, p: 1010, okta: 7, rain: 0.5 }, XMAS: { t: 0, rh: 82, p: 1010, okta: 6, rain: 0 }, HALLOWEEN: { t: 12, rh: 80, p: 1011, okta: 6, rain: 0 },
};
function applyGameWeather() {
  const g = state.gameWeather; if (!g || Date.now() - g.at > 20000) return false;
  const m = GTA_WX[g.type] ?? GTA_WX.NEUTRAL; const w = state.weather;
  const diurnal = 4 * Math.sin(((g.hour + g.minute / 60 - 9) / 24) * 2 * Math.PI);
  w.temperature = m.t + diurnal; w.humidity = Math.max(20, Math.min(100, m.rh - diurnal * 1.5)); w.pressure = m.p; w.cloud_okta = m.okta; w.precipitation = m.rain;
  w.wind_speed = Math.max(0, g.wind_speed); w.wind_from = ((g.wind_from % 360) + 360) % 360; return true;
}

export function systemStatus() {
  return { web: 'ONLINE', database: 'ONLINE', api: 'ONLINE', websocket: 'ONLINE', fivem: fivemConnected() ? 'CONNECTED' : 'NOT CONNECTED', data_source: fivemConnected() ? 'FIVEM (Position real, Messwerte simuliert)' : 'WARTET AUF FIVEM', fivem_info: state.fivem.info, scenario: getSetting('active_scenario', 'sc-chlor') };
}

// ---- Haupttick
let timer: NodeJS.Timeout | null = null;
export function startSim() {
  if (timer) return; setSetting('boot', now());
  timer = setInterval(() => { try { tick(); } catch (e) { console.error('sim tick', e); } }, 2000);
}
function tick() {
  state.tick++; const dt = 2;
  weatherStep();
  if (state.tick % 5 === 0) emit('weather.updated', weatherNow());
  if (state.tick % 30 === 0) { const w = weatherNow(); db.prepare('INSERT INTO weather_records(ts,temperature,humidity,pressure,wind_speed,wind_from,cloud_okta,precipitation) VALUES(?,?,?,?,?,?,?,?)').run(w.ts, w.temperature, w.humidity, w.pressure, w.wind_speed, w.wind_from, w.cloud_okta, w.precipitation); }
  // Verbindungsstatus: Fahrzeuge ohne Telemetrie werden getrennt (CBRN-01 bleibt als Arbeitsplatz erhalten)
  for (const v of list('vehicles')) {
    const live = Date.now() - (state.seen[v.id] ?? 0) < 15000;
    if (v.id === 'CBRN-01') { const want = live ? 'ONLINE' : 'OFFLINE'; if (v.link !== want) { update('vehicles', v.id, { link: want, gps_fix: live ? 1 : 0, speed: live ? v.speed : 0 }); emit('vehicle.status', get('vehicles', v.id)); } }
    else if (v.online && !live) { update('vehicles', v.id, { online: 0, link: 'OFFLINE', status: 'OFFLINE', gps_fix: 0, speed: 0 }); emit('vehicle.status', get('vehicles', v.id)); }
  }
  const vehicles = list('vehicles');
  for (const v of vehicles) {
    if (!v.online) continue;
    let x: number, y: number, speed = 0;
    if (v.id === 'CBRN-01') {
      if (fivemConnected()) { ({ x, y } = llToOffset(v.lat, v.lon)); speed = v.speed / 3.6; }
      else if (state.drive) { state.s += state.speed * dt; ({ x, y } = routePos(state.s)); speed = state.speed; const ll = offsetToLL(x, y); const h = bearing({ lat: v.lat, lon: v.lon }, ll); update('vehicles', v.id, { lat: ll.lat, lon: ll.lon, heading: h, speed: speed * 3.6 }); }
      else { ({ x, y } = llToOffset(v.lat, v.lon)); update('vehicles', v.id, { speed: 0 }); }
    } else ({ x, y } = llToOffset(v.lat, v.lon));
    const cur = get('vehicles', v.id)!; const pos = { lat: cur.lat, lon: cur.lon };
    const r = readingsAt(x!, y!, speed);
    state.live[v.id] = { ts: now(), lat: pos.lat, lon: pos.lon, speed_kmh: +(speed * 3.6).toFixed(0), heading: cur.heading, ...r };
    if (v.id === 'CBRN-01') {
      if (state.lastTrackPos) { const dd = distM(state.lastTrackPos, pos); state.trackLen += dd; if (state.run) state.run.dist += dd; } state.lastTrackPos = pos;
      if (state.run && state.tick % 5 === 0) saveRun();
      emit('reading.live', { vehicle_id: v.id, ...state.live[v.id], track_km: +(state.trackLen / 1000).toFixed(2), run: runInfo(), mp_count: (db.prepare('SELECT COUNT(*) c FROM measurements').get() as any).c });
    }
    emit('vehicle.position', cur);
    const mission = activeMissionFor(v.id);
    if (v.id === 'CBRN-01' && state.run) {
      const R = state.run; if (state.lastTrackPos) { /* Strecke wird unten über trackLen geführt */ }
      R.maxDose = Math.max(R.maxDose, r.dose.value); R.maxPid = Math.max(R.maxPid, r.pid.value);
    }
    if ((v.id === 'CBRN-01' && (state.run || mission)) || (v.id !== 'CBRN-01' && mission)) evaluateAndStore(cur, pos, r, mission, v.id === 'CBRN-01' && !!state.run && state.tick % 2 === 0 && (speed > 0 || state.tick % 10 === 0));
  }
  // Simulierte Laborbefunde
  for (const s of list('samples', "WHERE lab_status = 'ANALYSE' AND lab_result IS NULL")) {
    const age = (Date.now() - new Date(s.updated_at ?? s.ts).getTime()) / 1000; if (age < 90) continue;
    completeLab(s.id, 'SYSTEM');
  }
}

export function completeLab(sampleId: string, by: string) {
  const s = get('samples', sampleId); if (!s) return null;
  const t = s.truth_ref; let res: any;
  if (t?.type === 'substance') { const sub = get('substances', t.id); res = { finding: 'BEFUND', klass: sub?.substance_group ?? 'NICHT VERFÜGBAR', substance_id: sub?.id, text: `${(sub?.substance_group ?? '').toUpperCase()}`, simulated: true }; }
  else if (t?.type === 'radionuclide') { const n = get('radionuclides', t.id); res = { finding: 'BEFUND', klass: 'RADIONUKLID', substance_id: null, nuclide_id: n?.id, text: `Radionuklid ${n?.name} (Gammaspektrometrie)`, simulated: true }; }
  else if (t?.type === 'biological') { const b = get('biological_agents', t.id); res = { finding: 'BEFUND', klass: 'BIOLOGISCH', substance_id: null, bio_id: b?.id, text: `${b?.name} (PCR, Sonderlabor)`, simulated: true }; }
  else res = { finding: 'KEIN CBRN-RELEVANTER BEFUND', klass: null, text: 'KEIN CBRN-RELEVANTER BEFUND', simulated: true };
  update('samples', sampleId, { lab_result: res, lab_status: 'BEFUND EINGEGANGEN', updated_at: now() });
  db.prepare('INSERT INTO sample_events(sample_id,ts,status,note,by_user) VALUES(?,?,?,?,?)').run(sampleId, now(), 'BEFUND EINGEGANGEN', 'Simuliertes Laborergebnis', by);
  audit(by, 'lab_result', 'sample', sampleId, res); emit('sample.updated', get('samples', sampleId)); return get('samples', sampleId);
}

export function currentSnapshotAt(vehicleId: string) {
  const v = get('vehicles', vehicleId)!; const { x, y } = llToOffset(v.lat, v.lon); const r = readingsAt(x, y, 0); const { A } = truthAt(x, y);
  return { r, A, pos: { lat: v.lat, lon: v.lon }, truth: A && truthAt(x, y).c > (A.sc.peak * 0.03) ? { type: A.sc.ref_type, id: A.sc.ref_id } : null };
}
