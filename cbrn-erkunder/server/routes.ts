import type { App as FastifyInstance, Req as FastifyRequest } from './router.js';
import { db, get, list, insert, update, remove, audit, now, getSetting, setSetting, TABLES, columns } from './db.js';
import { state, emit, fivemConnected, systemStatus, weatherNow, ingestFivem, spectrumAt, mgmgChannels, activeIncident, devState, setDevicePower, routeLL, levelText, startRun, stopRun, runInfo } from './sim.js';
import { analyze } from './analysis.js';
import { ORIGIN_LABEL } from './data/derive.js';
import { SECTORS, sectorPolygon, llToOffset, compass, CENTER, MODE } from './geo.js';
import { config } from './config.js';
import { buildReport, reportCsv } from './report.js';
import { validateImport } from './import.js';
import { listSamples, publicSample, startAnalysis, archiveSample, storedCount, SC } from './samples.js';
import { allInst } from './hdev/service.js';
import { DEVICES } from './hdev/defs.js';
import { agsList, agsDon, agsDoff, agsRefill } from './ags.js';
import { addFire, removeFire, listFires } from './fire.js';
import { createIncident, endIncident, publicIncident } from './incident.js';
import { authUser, createSession, crewOf, endSession, getSession, touch, purgeSessions } from './auth.js';

const LEVEL: Record<string, number> = { erkunder: 1, truppfuehrer: 2, messleitung: 3, admin: 4 };
const ADMIN_TABLES = ['substances', 'radionuclides', 'biological_agents', 'measurement_devices', 'measurement_methods', 'sources', 'test_tubes', 'vehicles'];
import { ROLES, noteCrew } from './incident.js';
const FUNKTIONEN = ROLES;
const PUBLIC = [/^\/api\/meta$/, /^\/api\/auth\/(vehicles|login)$/];

type Cal = { ax: number; bx: number; ay: number; by: number };
type CalPt = { bx: number; by: number; gx: number; gy: number };
const CAL0: Cal = { ax: 1, bx: 0, ay: 1, by: 0 };
/** Kartenbild-Grenzen nach Abgleich: Spielkoordinate = a · Bildkoordinate + b (je Achse: Maßstab und Versatz). Ohne Abgleich gilt der alte Kartenversatz. */
function calOf(): Cal { const c = getSetting('gta_cal', null) as Cal | null; if (c) return c; const o = getSetting('gta_offset', { dx: 0, dy: 0 }) as { dx: number; dy: number }; return { ax: 1, bx: o.dx, ay: 1, by: o.dy }; }
function shiftedBounds() {
  const b = config.gta5.bounds; const c = calOf();
  return { minX: c.ax * b.minX + c.bx, maxX: c.ax * b.maxX + c.bx, minY: c.ay * b.minY + c.by, maxY: c.ay * b.maxY + c.by };
}
/** Löst je Achse game = a · base + b aus allen Abgleichpunkten (1 Punkt: nur Versatz; ab 2 Punkten mit genügend Abstand: auch Maßstab, begrenzt auf ±25 %). */
function solveCal(pts: CalPt[]): Cal {
  const axis = (bs: number[], gs: number[]) => {
    const n = bs.length, mb = bs.reduce((x, y) => x + y, 0) / n, mg = gs.reduce((x, y) => x + y, 0) / n;
    const v = bs.reduce((x, y) => x + (y - mb) ** 2, 0), c = bs.reduce((x, y, i) => x + (y - mb) * (gs[i] - mg), 0);
    let a = n >= 2 && Math.sqrt(v / n) > 150 ? c / v : 1; a = Math.min(1.25, Math.max(0.8, a)); return { a, b: mg - a * mb };
  };
  const x = axis(pts.map((p) => p.bx), pts.map((p) => p.gx)), y = axis(pts.map((p) => p.by), pts.map((p) => p.gy));
  return { ax: x.a, bx: x.b, ay: y.a, by: y.b };
}
/** Punkt hinzufügen: angezeigte Kartenposition (Meter) + wahre Spielposition. Der angezeigte Punkt wird mit der aktuellen Karte zurück auf Bildkoordinaten gerechnet. */
function addCalPoint(dispX: number, dispY: number, gx: number, gy: number) {
  const c = calOf(); const pts = (getSetting('gta_calpts', []) as CalPt[]).slice(-5);
  const base = { bx: (dispX - c.bx) / c.ax, by: (dispY - c.by) / c.ay };
  const kept = pts.filter((p) => Math.hypot(p.bx - base.bx, p.by - base.by) > 60); // fast gleiche Stelle ersetzt den alten Punkt
  kept.push({ ...base, gx, gy }); setSetting('gta_calpts', kept); const n = solveCal(kept); setSetting('gta_cal', n);
  const err = Math.round(kept.reduce((m, p) => Math.max(m, Math.hypot(n.ax * p.bx + n.bx - p.gx, n.ay * p.by + n.by - p.gy)), 0));
  return { cal: n, points: kept.length, max_error_m: err };
}
export function registerRoutes(app: FastifyInstance) {
  // Zugriffsschutz: alles unter /api außer Anmeldung, Metadaten und FiveM-Adapter braucht eine gültige Anmeldung am Fahrzeug.
  app.addHook('onRequest', async (req) => {
    const url = req.url.split('?')[0]; if (!url.startsWith('/api/') || PUBLIC.some((r) => r.test(url))) return;
    if (!authUser(req)) throw Object.assign(new Error('Nicht angemeldet'), { statusCode: 401 });
  });
  const user = (req: FastifyRequest) => authUser(req)!;
  const need = (req: FastifyRequest, _lvl = 1) => user(req); // nach der Anmeldung voller Zugriff
  const nf = (what: string) => Object.assign(new Error(`${what} nicht gefunden`), { statusCode: 404 });
  const q = (req: FastifyRequest) => req.query as Record<string, string>;

  app.get('/api/meta', async () => ({
    app: 'CBRN Erkunder Software', version: '0.1.0', sectors: Object.entries(SECTORS).map(([k, v]) => ({ key: k, name: v.name, polygon: sectorPolygon(k) })),
    center: CENTER, route: routeLL(),
    map: MODE === 'gta5' ? { mode: 'gta5', image: config.gta5.image, bounds: shiftedBounds(), offset: getSetting('gta_offset', { dx: 0, dy: 0 }), cal: calOf(), points: (getSetting('gta_calpts', []) as CalPt[]).length } : { mode: 'geo', tileUrl: config.geo.tileUrl, attribution: config.geo.attribution }, mgmg_channels: mgmgChannels(),
    disclaimer: 'Fachdaten: öffentliche Quellen, ungeprüft (QUELLE ERFORDERLICH). Messwerte, GPS, Einsätze, Identifikationen und Laborergebnisse: SIMULIERT.',
  }));

  // ---------- Anmeldung am Fahrzeug
  app.get('/api/auth/vehicles', async () => ({
    vehicles: list('vehicles').map((v: any) => ({ id: v.id, name: v.name, connected: fivemConnected(v.id), crew: crewOf(v.id).map((c) => ({ name: c.name, funktion: c.role })) })),
    funktionen: FUNKTIONEN,
  }));
  app.post('/api/auth/login', async (req, rep) => {
    const b = (req.body ?? {}) as any; const name = String(b.name ?? '').trim().slice(0, 60); const funktion = String(b.funktion ?? '').trim().slice(0, 60);
    const v = get('vehicles', String(b.vehicle_id ?? ''));
    if (!v) throw Object.assign(new Error('Bitte ein Fahrzeug auswählen'), { statusCode: 400 });
    if (name.length < 2) throw Object.assign(new Error('Bitte den Namen eingeben'), { statusCode: 400 });
    if (!FUNKTIONEN.includes(funktion)) throw Object.assign(new Error('Bitte eine Funktion aus der Liste wählen'), { statusCode: 400 });
    purgeSessions(); const token = createSession(v.id, name, funktion); audit(`${name} (${funktion})`, 'login', 'vehicle', v.id);
    noteCrew(name, funktion, v.id); emit('crew.changed', { vehicle_id: v.id }); rep.code(201); return { token, session: { vehicle_id: v.id, vehicle_name: v.name, name, funktion } };
  });
  app.get('/api/auth/me', async (req) => { const u = user(req); touch(u.token); noteCrew(u.name, u.callsign, u.vehicle_id); return { vehicle_id: u.vehicle_id, vehicle_name: get('vehicles', u.vehicle_id)?.name, name: u.name, funktion: u.callsign }; });
  app.post('/api/auth/logout', async (req) => { const u = user(req); endSession(u.token); audit(u.id, 'logout', 'vehicle', u.vehicle_id); emit('crew.changed', { vehicle_id: u.vehicle_id }); return { ok: true }; });

  // ---------- System
  app.get('/api/system/status', async () => ({ ...systemStatus(), drive: state.drive, fivem_origin: getSetting('fivem_origin'), gta_offset: getSetting('gta_offset', { dx: 0, dy: 0 }), mgmg_channels: mgmgChannels(), now: now(), uptime_s: Math.round(process.uptime()) }));
  // Karte kalibrieren: dx/dy = Strecke (m, Ost/Nord) vom angezeigten Fahrzeugpunkt zur tatsächlich markierten Stelle. Das Kartenbild wird um diese Strecke zurückgeschoben.
  const mapPayload = () => ({ offset: getSetting('gta_offset', { dx: 0, dy: 0 }), cal: calOf(), points: (getSetting('gta_calpts', []) as CalPt[]).length, bounds: shiftedBounds() });
  // Kartenabgleich: x/y = Stelle auf der Karte (Meter, x = Ost, y = Nord), an der man tatsächlich steht. Vergleich mit der echten FiveM-Position des Fahrzeugs.
  app.post('/api/system/calibrate-point', async (req) => {
    const u = need(req); const b = (req.body ?? {}) as any; const x = Number(b.x), y = Number(b.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw Object.assign(new Error('Ungültige Position'), { statusCode: 400 });
    if (!fivemConnected(u.vehicle_id)) throw Object.assign(new Error('Keine FiveM-Verbindung – der Abgleich braucht die echte Spielposition (im Fahrzeug sitzen und Computer anmelden).'), { statusCode: 409 });
    const v = get('vehicles', u.vehicle_id); const gx = v.lon * 111320, gy = v.lat * 111320;
    if (Math.hypot(x - gx, y - gy) > 4000) throw Object.assign(new Error('Markierte Stelle liegt zu weit von der Fahrzeugposition entfernt'), { statusCode: 400 });
    const r = addCalPoint(x, y, gx, gy); audit(u.id, 'calibrate', 'map', 'gta_cal', r); const map = mapPayload(); emit('map.changed', map); return { ...map, ...r };
  });
  app.post('/api/system/calibrate', async (req) => { // älterer Einzelpunkt-Abgleich (dx/dy = markiert − Fahrzeug) bzw. reset
    const u = need(req); const b = (req.body ?? {}) as any;
    if (b.reset) { setSetting('gta_offset', { dx: 0, dy: 0 }); setSetting('gta_cal', null); setSetting('gta_calpts', []); audit(u.id, 'calibrate', 'map', 'reset'); const map = mapPayload(); emit('map.changed', map); return map; }
    const dx = Number(b.dx), dy = Number(b.dy); if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.abs(dx) > 5000 || Math.abs(dy) > 5000) throw Object.assign(new Error('Ungültiger Versatz'), { statusCode: 400 });
    const v = get('vehicles', u.vehicle_id); const gx = v.lon * 111320, gy = v.lat * 111320; addCalPoint(gx + dx, gy + dy, gx, gy);
    const map = mapPayload(); emit('map.changed', map); return map;
  });
  app.post('/api/system/config', async (req) => {
    const u = need(req, 4); const b = req.body as any;
    if (b.mgmg_channels) setSetting('mgmg_channels', b.mgmg_channels);
    if (b.fivem_origin) setSetting('fivem_origin', b.fivem_origin);
    if (b.gta_offset) { setSetting('gta_offset', { dx: Number(b.gta_offset.dx) || 0, dy: Number(b.gta_offset.dy) || 0 }); setSetting('gta_cal', null); setSetting('gta_calpts', []); } // manueller Versatz ersetzt den Punkt-Abgleich
    audit(u.id, 'config', 'system', 'config', b); return { ok: true };
  });

  // ---------- Fachdatenbanken
  app.get('/api/substances', async (req) => {
    const p = q(req); const where: string[] = []; const a: any[] = [];
    if (p.q) { const l = `%${p.q.toLowerCase()}%`; where.push('(lower(name) LIKE ? OR lower(synonyms) LIKE ? OR cas LIKE ? OR lower(un_number) LIKE ? OR lower(formula) LIKE ? OR lower(substance_group) LIKE ?)'); a.push(l, l, l, l, l, l); }
    if (p.cat) { where.push('cbrn_category = ?'); a.push(p.cat); }
    if (p.sub) { where.push('subcategory = ?'); a.push(p.sub); }
    if (p.state) { where.push('state = ?'); a.push(p.state); }
    if (p.group) { where.push('substance_group LIKE ?'); a.push(`%${p.group}%`); }
    if (p.hazard) { where.push('ghs LIKE ?'); a.push(`%${p.hazard}%`); }
    if (p.method) { where.push('methods LIKE ?'); a.push(`%${p.method}%`); }
    if (p.device) { where.push('devices LIKE ?'); a.push(`%${p.device}%`); }
    if (p.cas) { where.push('cas LIKE ?'); a.push(`%${p.cas}%`); }
    if (p.un) { where.push('un_number LIKE ?'); a.push(`%${p.un}%`); }
    return list('substances', where.length ? 'WHERE ' + where.join(' AND ') : '', a, 'ORDER BY subcategory, name');
  });
  app.get('/api/substances/:id', async (req) => { const s = get('substances', (req.params as any).id); if (!s) throw nf('Stoff'); return { ...s, source: get('sources', s.source_id) }; });
  app.get('/api/radionuclides', async () => list('radionuclides', '', [], 'ORDER BY z, a'));
  app.get('/api/radionuclides/:id', async (req) => { const s = get('radionuclides', (req.params as any).id); if (!s) throw nf('Radionuklid'); return { ...s, source: get('sources', s.source_id) }; });
  app.get('/api/biological-agents', async () => list('biological_agents', '', [], 'ORDER BY kind, name'));
  app.get('/api/biological-agents/:id', async (req) => { const s = get('biological_agents', (req.params as any).id); if (!s) throw nf('Agens'); return { ...s, source: get('sources', s.source_id) }; });
  app.get('/api/devices', async () => list('measurement_devices'));
  app.get('/api/methods', async () => list('measurement_methods'));
  app.get('/api/test-tubes', async () => list('test_tubes'));
  app.get('/api/sources', async () => list('sources', '', [], 'ORDER BY publisher_priority').map((s: any) => ({
    ...s, records: ['substances', 'radionuclides', 'biological_agents'].reduce((n, t) => n + (db.prepare(`SELECT COUNT(*) c FROM ${t} WHERE source_id = ?`).get(s.id) as any).c, 0) })));

  app.get('/api/search', async (req) => {
    const t = (q(req).q ?? '').trim().toLowerCase(); if (t.length < 1) return [];
    const l = `%${t}%`; const out: any[] = [];
    for (const s of list('substances', 'WHERE lower(name) LIKE ? OR lower(synonyms) LIKE ? OR cas LIKE ? OR lower(un_number) LIKE ? OR lower(formula) LIKE ? OR lower(substance_group) LIKE ? LIMIT 12', [l, l, l, l, l, l]))
      out.push({ type: 'substance', id: s.id, title: s.name, cas: s.cas, un: s.un_number, category: s.cbrn_category, sub: s.subcategory, state: s.state, formula: s.formula });
    for (const r of list('radionuclides', 'WHERE lower(name) LIKE ? OR lower(element) LIKE ? LIMIT 6', [l, l])) out.push({ type: 'radionuclide', id: r.id, title: r.name, category: r.cbrn_category, sub: r.element });
    for (const b of list('biological_agents', 'WHERE lower(name) LIKE ? OR lower(disease) LIKE ? LIMIT 6', [l, l])) out.push({ type: 'biological', id: b.id, title: b.name, category: 'B', sub: b.kind });
    return out;
  });

  // ---------- Fahrzeuge / Live
  app.get('/api/vehicles', async () => list('vehicles'));
  app.get('/api/vehicles/:id', async (req) => { const v = get('vehicles', (req.params as any).id); if (!v) throw nf('Fahrzeug'); return { ...v, crew: crewOf(v.id) }; });
  app.get('/api/crew', async (req) => crewOf(q(req).vehicle));
  app.get('/api/live', async () => ({ vehicles: state.live, weather: weatherNow(), status: systemStatus() }));
  app.get('/api/live/spectrum', async (req) => { const v = get('vehicles', q(req).vehicle ?? user(req).vehicle_id); if (!v) throw nf('Fahrzeug'); const { x, y } = llToOffset(v.lat, v.lon); return { ...spectrumAt(x, y), label: 'SIMULIERTE AUSWERTUNG', data_source: 'SIMULATED' }; });
  // ---------- Einsatz
  app.get('/api/hdev', async (req) => { need(req, 1); return allInst().map((i) => ({ id: i.id, type: i.type, label: DEVICES[i.type].label, short: DEVICES[i.type].short, model: DEVICES[i.type].model, vehicle_id: i.vehicleId ?? i.key, battery: Math.round(i.battery), status: i.holder ? 'IN VERWENDUNG' : i.battery <= 1 ? 'AKKU LEER' : 'VERFÜGBAR', holder: i.holder?.name ?? null, phase: i.phase })); });
  app.get('/api/ags', async (req) => agsList(need(req, 1).vehicle_id));
  for (const [act, fn] of [['don', agsDon], ['doff', agsDoff], ['refill', agsRefill]] as const) app.post(`/api/ags/:slot/${act}`, async (req) => { const u = need(req, 1); return fn(u.vehicle_id, Number((req.params as any).slot), u.name); });
  app.get('/api/fires', async () => listFires());
  app.post('/api/fires', async (req, rep) => { const u = need(req); rep.code(201); return addFire(u.id, (req.body ?? {}) as any); });
  app.delete('/api/fires/:id', async (req) => { const u = need(req); return removeFire(u.id, (req.params as any).id); });
  app.get('/api/incident', async () => publicIncident(activeIncident()));
  app.get('/api/incidents', async () => list('incidents', '', [], 'ORDER BY created_at DESC').map(publicIncident));
  app.post('/api/incidents', async (req, rep) => { const u = need(req); const r = createIncident(u.id, req.body ?? {}); if ((r as any).error) throw Object.assign(new Error((r as any).error), { statusCode: 400 }); rep.code(201); return r; });
  app.post('/api/incidents/:id/end', async (req) => { const u = need(req); const r = endIncident(u.id, (req.params as any).id, req.body); if ((r as any).error) throw Object.assign(new Error((r as any).error), { statusCode: 409 }); return r; });
  app.get('/api/track', async (req) => {
    const p = q(req); const vid = p.vehicle ?? user(req).vehicle_id; const run = p.run ?? state.runs[vid]?.id;
    const rows = (run ? db.prepare("SELECT lat,lon,ts FROM measurements WHERE run_id = ? ORDER BY seq DESC LIMIT 1500").all(run) : db.prepare("SELECT lat,lon,ts FROM measurements WHERE vehicle_id = ? ORDER BY seq DESC LIMIT 400").all(vid)) as any[];
    return rows.reverse();
  });

  // ---------- Geräte ein-/ausschalten (Aufwärmzeit)
  app.post('/api/devices/:key/power', async (req) => { const u = need(req); const r = setDevicePower(u.id, u.vehicle_id, (req.params as any).key, !!(req.body as any)?.on); if ((r as any).error) throw Object.assign(new Error((r as any).error), { statusCode: 400 }); return r; });

  // ---------- Messfahrten
  app.get('/api/runs', async () => list('runs', '', [], 'ORDER BY started_at DESC LIMIT 100').map((r: any) => (state.runs[r.vehicle_id]?.id === r.id ? { ...r, distance_m: Math.round(state.runs[r.vehicle_id].dist), active: true } : r)));
  app.get('/api/runs/active', async (req) => ({ run: runInfo(user(req).vehicle_id) }));
  app.post('/api/runs/start', async (req, rep) => { const u = need(req, 1); const b = (req.body ?? {}) as any; const r = startRun(u.id, u.vehicle_id, b.name, b.lat != null ? { lat: Number(b.lat), lon: Number(b.lon) } : undefined, b.mode === 'BRAND' ? 'BRAND' : 'CBRN'); if ((r as any).error) throw Object.assign(new Error((r as any).error), { statusCode: 409 }); rep.code(201); return r; });
  app.post('/api/runs/stop', async (req) => { const u = need(req, 1); const r = stopRun(u.id, u.vehicle_id); if ((r as any).error) throw Object.assign(new Error((r as any).error), { statusCode: 409 }); return r; });

  // ---------- Probenanalyse (Entscheidungshilfe)
  app.get('/api/analysis/options', async () => ({ origins: Object.entries(ORIGIN_LABEL).map(([k, v]) => ({ key: k, label: v })) }));
  app.post('/api/analysis', async (req) => { need(req, 1); return analyze((req.body ?? {}) as any); });
  app.post('/api/samples/:id/analysis', async (req) => {
    const u = need(req, 1); const id = (req.params as any).id; const s = get('samples', id); if (!s) throw nf('Probe');
    const obs = (req.body as any) ?? {}; const res = analyze({ ...obs, kind: s.kind }); const top = res.candidates[0];
    const label = !top || top.score < 3 ? 'UNBEKANNT' : `${top.level === 'moegliche_identifikation' ? 'MÖGLICHE IDENTIFIKATION' : top.level === 'verdacht' ? 'VERDACHT' : 'HINWEIS'}: ${top.name.toUpperCase()}`;
    update('samples', id, { analysis: { observations: obs, result: res, at: now(), by: u.id }, onsite_assessment: label, updated_at: now() });
    audit(u.id, 'analysis', 'sample', id, { top: top?.id, level: top?.level, score: top?.score }); emit('sample.updated', get('samples', id));
    return { ...res, label };
  });

  // ---------- Aufträge
  app.get('/api/missions', async () => list('missions', '', [], 'ORDER BY created_at DESC').map((m: any) => ({ ...m, sector_name: SECTORS[m.sector]?.name ?? m.sector })));
  app.post('/api/missions', async (req, rep) => {
    const u = need(req, 3); const b = req.body as any;
    if (!get('vehicles', b.vehicle_id)) throw Object.assign(new Error('Fahrzeug erforderlich'), { statusCode: 400 });
    if (!SECTORS[b.sector]) throw Object.assign(new Error('Gebiet erforderlich'), { statusCode: 400 });
    const n = ((db.prepare("SELECT MAX(CAST(substr(id,6) AS INTEGER)) m FROM missions").get() as any).m ?? 0) + 1;
    const m = { id: `2026-${String(n).padStart(4, '0')}`, vehicle_id: b.vehicle_id, sector: b.sector, priority: b.priority ?? 'NORMAL', profile: b.profile ?? 'CHEMISCH', status: 'ÜBERMITTELT', created_by: u.id, created_at: now(), updated_at: now(), notes: b.notes ?? null };
    insert('missions', m); audit(u.id, 'create', 'mission', m.id, m); emit('mission.created', m); rep.code(201); return m;
  });
  const TRANS: Record<string, { from: string[]; lvl: number }> = {
    'ANGENOMMEN': { from: ['ÜBERMITTELT'], lvl: 1 }, 'IN BEARBEITUNG': { from: ['ÜBERMITTELT', 'ANGENOMMEN'], lvl: 1 },
    'ABGESCHLOSSEN': { from: ['IN BEARBEITUNG', 'ANGENOMMEN'], lvl: 2 }, 'ABGEBROCHEN': { from: ['ÜBERMITTELT', 'ANGENOMMEN', 'IN BEARBEITUNG'], lvl: 3 },
  };
  app.patch('/api/missions/:id', async (req) => {
    const id = (req.params as any).id; const m = get('missions', id); if (!m) throw nf('Auftrag'); const b = req.body as any;
    const t = TRANS[b.status]; if (!t) throw Object.assign(new Error('Ungültiger Status'), { statusCode: 400 }); const u = need(req, t.lvl);
    if (!t.from.includes(m.status)) throw Object.assign(new Error(`Übergang ${m.status} → ${b.status} nicht möglich`), { statusCode: 409 });
    update('missions', id, { status: b.status, updated_at: now(), started_at: b.status === 'IN BEARBEITUNG' ? now() : m.started_at, ended_at: ['ABGESCHLOSSEN', 'ABGEBROCHEN'].includes(b.status) ? now() : null, notes: b.notes ?? m.notes });
    audit(u.id, 'status', 'mission', id, { from: m.status, to: b.status }); const r = get('missions', id); emit('mission.updated', r); return r;
  });

  // ---------- Messpunkte
  app.get('/api/measurements', async (req) => {
    const p = q(req); const w: string[] = []; const a: any[] = [];
    for (const k of ['vehicle_id', 'device', 'mission_id', 'status']) if (p[k]) { w.push(`${k} = ?`); a.push(p[k]); }
    if (p.anomalies) w.push("status != 'NORMAL'");
    if (p.since) { w.push('ts >= ?'); a.push(p.since); }
    return list('measurements', w.length ? 'WHERE ' + w.join(' AND ') : '', a, `ORDER BY seq DESC LIMIT ${Math.min(+p.limit || 200, 2000)}`);
  });
  app.get('/api/measurements/:id', async (req) => { const m = get('measurements', (req.params as any).id); if (!m) throw nf('Messpunkt'); return { ...m, substance: m.substance_id ? get('substances', m.substance_id) : null, audit: list('audit_log', "WHERE entity = 'measurement' AND entity_id = ?", [m.id], 'ORDER BY id') }; });
  app.post('/api/measurements', async (req, rep) => {
    const u = need(req, 1); const b = req.body as any; const seq = ((db.prepare('SELECT MAX(seq) m FROM measurements').get() as any).m ?? 0) + 1;
    const v = get('vehicles', b.vehicle_id ?? u.vehicle_id)!;
    const row = { id: 'MP-' + String(seq).padStart(6, '0'), seq, ts: now(), lat: b.lat ?? v.lat, lon: b.lon ?? v.lon, vehicle_id: v.id, mission_id: b.mission_id ?? null, device: b.device ?? 'MANUELL', value: b.value ?? null, unit: b.unit ?? null,
      status: b.status ?? 'AUSWERTUNG ERFORDERLICH', level: b.level ?? null, headline: b.headline ?? 'Manuelle Eingabe', remark: b.remark ?? null, data_source: 'MANUAL' };
    insert('measurements', row); audit(u.id, 'create', 'measurement', row.id, row); emit('measurement.created', row); rep.code(201); return row;
  });
  app.patch('/api/measurements/:id', async (req) => {
    const u = need(req, 1); const id = (req.params as any).id; const m = get('measurements', id); if (!m) throw nf('Messpunkt'); const b = req.body as any;
    const allowed = ['remark', 'headline', 'status', 'substance_id', 'level']; const patch: any = {}; const diff: any = {};
    for (const k of allowed) if (b[k] !== undefined && b[k] !== m[k]) { patch[k] = b[k]; diff[k] = { from: m[k], to: b[k] }; }
    if (!Object.keys(patch).length) return m;
    update('measurements', id, patch); audit(u.id, 'update', 'measurement', id, diff); const r = get('measurements', id); emit('measurement.updated', r); return r;
  });

  // ---------- Proben
  app.get('/api/samples', async () => listSamples());
  app.get('/api/samples/capacity', async (req) => { const vid = q(req).vehicle ?? user(req).vehicle_id; return { vehicle_id: vid, stored: storedCount(vid), max: SC.maxSamples }; });
  app.get('/api/samples/:id', async (req) => { const s = publicSample((req.params as any).id); if (!s) throw nf('Probe'); return s; });
  app.post('/api/samples/:id/analyses', async (req, rep) => { const u = need(req); const b = (req.body ?? {}) as any; const s = startAnalysis((req.params as any).id, String(b.type ?? ''), u.id, b.comment); rep.code(201); return s; });
  app.post('/api/samples/:id/archive', async (req) => archiveSample((req.params as any).id, need(req).id));

  // ---------- Wetter, Alarme, Audit, Lage
  app.get('/api/weather', async (req) => ({ current: weatherNow(), history: (db.prepare('SELECT * FROM weather_records ORDER BY id DESC LIMIT ?').all(Math.min(+q(req).limit || 120, 1000)) as any[]).reverse().map((w) => ({ ...w, wind_from_text: compass(w.wind_from) })) }));
  app.get('/api/alarms', async () => list('alarms', '', [], 'ORDER BY ts DESC LIMIT 300'));
  app.patch('/api/alarms/:id', async (req) => { const u = need(req, 1); const id = (req.params as any).id; if (!get('alarms', id)) throw nf('Alarm'); update('alarms', id, { status: (req.body as any).status }); audit(u.id, 'status', 'alarm', id, req.body); return get('alarms', id); });
  app.get('/api/audit', async (req) => list('audit_log', q(req).entity ? 'WHERE entity = ?' : '', q(req).entity ? [q(req).entity] : [], 'ORDER BY id DESC LIMIT 300'));
  app.get('/api/situation', async () => {
    const cnt = (cat: string) => (db.prepare("SELECT COUNT(*) c FROM alarms WHERE category = ? AND status != 'ERLEDIGT' AND status != 'QUITTIERT'").get(cat) as any).c;
    return { CHEMISCH: cnt('CHEMISCH'), RADIOLOGISCH: cnt('RADIOLOGISCH'), BIOLOGISCH: cnt('BIOLOGISCH'), NUKLEAR: cnt('NUKLEAR'), UNBEKANNT: cnt('UNBEKANNT'), system: cnt('SYSTEM'), netzwerk: cnt('NETZWERK') };
  });

  // ---------- Berichte
  app.get('/api/reports', async () => list('reports', '', [], 'ORDER BY created_at DESC').map((r: any) => ({ id: r.id, mission_id: r.mission_id, created_at: r.created_at, created_by: r.created_by, kind: r.data?.kind ?? 'AUFTRAGSBERICHT', title: r.data?.title ?? null })));
  app.post('/api/reports', async (req, rep) => {
    const u = need(req, 2); const mid = (req.body as any).mission_id; const m = get('missions', mid); if (!m) throw nf('Auftrag');
    const id = `B-${mid}`; const data = buildReport(mid, u.name); insert('reports', { id, mission_id: mid, created_at: now(), created_by: u.id, data }, true);
    audit(u.id, 'create', 'report', id); rep.code(201); return { id, ...data };
  });
  app.get('/api/reports/:id', async (req) => { const r = get('reports', (req.params as any).id); if (!r) throw nf('Bericht'); return { id: r.id, created_at: r.created_at, ...r.data }; });
  app.get('/api/reports/:id/csv', async (req) => { const r = get('reports', (req.params as any).id); if (!r) throw nf('Bericht'); return { filename: `${r.id}.csv`, text: reportCsv(r.data) }; });

  // ---------- Import / Admin
  app.post('/api/import/:table', async (req) => {
    const u = need(req, 4); const table = (req.params as any).table; if (!['substances', 'radionuclides', 'biological_agents', 'test_tubes'].includes(table)) throw Object.assign(new Error('Tabelle nicht importierbar'), { statusCode: 400 });
    const b = req.body as any; const res = validateImport(table, b.format, b.content);
    if (b.commit) { const tx = db.transaction(() => { for (const r of [...res.valid, ...res.review]) insert(table, { ...r, quality: 'unverified' }, true); }); tx(); audit(u.id, 'import', table, table, { valid: res.valid.length, review: res.review.length }); }
    return { total: res.total, valid: res.valid.length, review: res.review.map((r: any) => ({ id: r.id, name: r.name, reasons: r._reasons })), invalid: res.invalid, committed: !!b.commit };
  });
  app.get('/api/admin/:table', async (req) => { need(req, 4); const t = (req.params as any).table; if (!ADMIN_TABLES.includes(t)) throw nf('Tabelle'); return list(t); });
  app.put('/api/admin/:table/:id', async (req) => {
    const u = need(req, 4); const { table, id } = req.params as any; if (!ADMIN_TABLES.includes(table)) throw nf('Tabelle');
    const before = get(table, id); const body = { ...(req.body as any), id };
    const bad = Object.keys(body).filter((k) => !columns(table).includes(k)); if (bad.length) throw Object.assign(new Error(`Unbekannte Felder: ${bad.join(', ')}`), { statusCode: 400 });
    insert(table, body, true); audit(u.id, before ? 'update' : 'create', table, id, before ? { before } : undefined); return get(table, id);
  });
  app.delete('/api/admin/:table/:id', async (req) => { const u = need(req, 4); const { table, id } = req.params as any; if (!ADMIN_TABLES.includes(table)) throw nf('Tabelle'); remove(table, id); audit(u.id, 'delete', table, id); return { ok: true }; });
}
