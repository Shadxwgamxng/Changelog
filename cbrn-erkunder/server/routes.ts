import type { FastifyInstance, FastifyRequest } from 'fastify';
import { db, get, list, insert, update, remove, audit, now, getSetting, setSetting, TABLES, columns } from './db.js';
import { state, emit, fivemConnected, systemStatus, weatherNow, ingestFivem, spectrumAt, currentSnapshotAt, completeLab, mgmgChannels, routeLL, levelText } from './sim.js';
import { SECTORS, sectorPolygon, llToOffset, compass, CENTER, MODE } from './geo.js';
import { config } from './config.js';
import { buildReport, reportCsv, reportPdf } from './report.js';
import { validateImport } from './import.js';

const LEVEL: Record<string, number> = { erkunder: 1, truppfuehrer: 2, messleitung: 3, admin: 4 };
const ADMIN_TABLES = ['substances', 'radionuclides', 'biological_agents', 'measurement_devices', 'measurement_methods', 'sources', 'scenarios', 'test_tubes', 'vehicles', 'crew', 'users'];

export function registerRoutes(app: FastifyInstance) {
  const user = (req: FastifyRequest) => get('users', String(req.headers['x-user-id'] ?? 'u-erk')) ?? get('users', 'u-erk')!;
  const need = (req: FastifyRequest, lvl: number) => { const u = user(req); if ((LEVEL[u.role] ?? 0) < lvl) throw Object.assign(new Error(`Rolle ${u.role} darf diese Aktion nicht ausführen`), { statusCode: 403 }); return u; };
  const nf = (what: string) => Object.assign(new Error(`${what} nicht gefunden`), { statusCode: 404 });
  const q = (req: FastifyRequest) => req.query as Record<string, string>;

  app.get('/api/meta', async () => ({
    app: 'CBRN Erkunder Software', version: '0.1.0', sectors: Object.entries(SECTORS).map(([k, v]) => ({ key: k, name: v.name, polygon: sectorPolygon(k) })),
    roles: Object.keys(LEVEL), center: CENTER, route: routeLL(),
    map: MODE === 'gta5' ? { mode: 'gta5', image: config.gta5.image, bounds: config.gta5.bounds } : { mode: 'geo', tileUrl: config.geo.tileUrl, attribution: config.geo.attribution }, users: list('users'), mgmg_channels: mgmgChannels(),
    disclaimer: 'Fachdaten: öffentliche Quellen, ungeprüft (QUELLE ERFORDERLICH). Messwerte, GPS, Einsätze, Identifikationen und Laborergebnisse: SIMULIERT.',
  }));

  // ---------- System
  app.get('/api/system/status', async () => ({ ...systemStatus(), drive: state.drive, fivem_origin: getSetting('fivem_origin'), mgmg_channels: mgmgChannels(), now: now(), uptime_s: Math.round(process.uptime()) }));
  app.post('/api/system/drive', async (req) => { const u = need(req, 1); state.drive = !!(req.body as any).on; audit(u.id, 'drive', 'system', 'demo-drive', { on: state.drive }); return { drive: state.drive }; });
  app.post('/api/system/scenario', async (req) => {
    const u = need(req, 3); const b = req.body as any; const sc = get('scenarios', b.id); if (!sc) throw nf('Szenario');
    setSetting('active_scenario', sc.id); if (b.source_offset) setSetting('source_offset', b.source_offset);
    audit(u.id, 'activate', 'scenario', sc.id); emit('system.status', systemStatus()); return systemStatus();
  });
  app.post('/api/system/config', async (req) => {
    const u = need(req, 4); const b = req.body as any;
    if (b.mgmg_channels) setSetting('mgmg_channels', b.mgmg_channels);
    if (b.fivem_origin) setSetting('fivem_origin', b.fivem_origin);
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
  app.get('/api/vehicles/:id', async (req) => { const v = get('vehicles', (req.params as any).id); if (!v) throw nf('Fahrzeug'); return { ...v, crew: list('crew', 'WHERE vehicle_id = ?', [v.id]) }; });
  app.get('/api/crew', async (req) => list('crew', q(req).vehicle ? 'WHERE vehicle_id = ?' : '', q(req).vehicle ? [q(req).vehicle] : []));
  app.get('/api/live', async () => ({ vehicles: state.live, track_km: +(state.trackLen / 1000).toFixed(2), mp_count: (db.prepare('SELECT COUNT(*) c FROM measurements').get() as any).c, weather: weatherNow(), status: systemStatus(), drive: state.drive }));
  app.get('/api/live/spectrum', async (req) => { const v = get('vehicles', q(req).vehicle ?? 'CBRN-01'); if (!v) throw nf('Fahrzeug'); const { x, y } = llToOffset(v.lat, v.lon); return { ...spectrumAt(x, y), label: 'SIMULIERTE AUSWERTUNG', data_source: 'SIMULATED' }; });
  app.get('/api/scenarios', async () => list('scenarios'));
  app.get('/api/scenario/active', async () => { const id = getSetting('active_scenario'); const sc = get('scenarios', id); return { ...sc, source_offset: getSetting('source_offset') }; });
  app.get('/api/track', async (req) => {
    const rows = db.prepare("SELECT lat,lon,ts FROM measurements WHERE vehicle_id = ? ORDER BY seq DESC LIMIT 400").all(q(req).vehicle ?? 'CBRN-01') as any[];
    return rows.reverse();
  });

  // ---------- Aufträge
  app.get('/api/missions', async () => list('missions', '', [], 'ORDER BY created_at DESC').map((m: any) => ({ ...m, sector_name: SECTORS[m.sector]?.name ?? m.sector })));
  app.post('/api/missions', async (req, rep) => {
    const u = need(req, 3); const b = req.body as any;
    if (!get('vehicles', b.vehicle_id)) throw Object.assign(new Error('Fahrzeug erforderlich'), { statusCode: 400 });
    if (!SECTORS[b.sector]) throw Object.assign(new Error('Gebiet erforderlich'), { statusCode: 400 });
    const n = ((db.prepare("SELECT MAX(CAST(substr(id,6) AS INTEGER)) m FROM missions").get() as any).m ?? 141) + 1;
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
    const u = need(req, 1); const b = req.body as any; const seq = ((db.prepare('SELECT MAX(seq) m FROM measurements').get() as any).m ?? 420) + 1;
    const v = get('vehicles', b.vehicle_id ?? 'CBRN-01')!;
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
  const sampleFull = (id: string) => { const s = get('samples', id); if (!s) throw nf('Probe'); const { truth_ref, ...pub } = s; return { ...pub, events: list('sample_events', 'WHERE sample_id = ?', [id], 'ORDER BY id') }; };
  app.get('/api/samples', async () => list('samples', '', [], 'ORDER BY ts DESC').map(({ truth_ref, ...s }: any) => s));
  app.get('/api/samples/:id', async (req) => sampleFull((req.params as any).id));
  app.post('/api/samples', async (req, rep) => {
    const u = need(req, 1); const b = req.body as any; const v = get('vehicles', b.vehicle_id ?? 'CBRN-01')!;
    const n = ((db.prepare("SELECT COUNT(*) c FROM samples").get() as any).c ?? 0) + 421; const id = `P-2026-${String(n).padStart(5, '0')}`;
    const snap = currentSnapshotAt(v.id); const wx = weatherNow();
    const mission = list('missions', "WHERE vehicle_id = ? AND status = 'IN BEARBEITUNG' LIMIT 1", [v.id])[0];
    const kinds = ['FEST', 'FLÜSSIG', 'LUFT', 'BIOLOGISCH', 'RADIOLOGISCH', 'CHEMISCH'];
    const kind = kinds.includes(b.kind) ? b.kind : 'FLÜSSIG';
    const readings = { PID: `${snap.r.pid.value} ppm`, Dosisleistung: `${snap.r.dose.value} µSv/h`, IMS: snap.r.ims.result, pH: b.ph ?? 'NICHT GEMESSEN', ...(b.readings ?? {}) };
    const row = { id, ts: now(), lat: v.lat, lon: v.lon, kind, description: b.description ?? '', color: b.color ?? null, consistency: b.consistency ?? null, odor: b.odor ?? null, turbidity: b.turbidity ?? null,
      readings, weather: wx, location: b.location ?? null, taken_by: b.taken_by ?? u.callsign, mission_id: mission?.id ?? b.mission_id ?? null, vehicle_id: v.id, transport_status: 'ENTNOMMEN', lab_status: 'AUSSTEHEND',
      onsite_assessment: snap.r.ims.level ? levelText(snap.r.ims.level).toUpperCase() : 'UNBEKANNT', lab_result: null, truth_ref: snap.truth ?? (kind === 'BIOLOGISCH' && getSetting('active_scenario') === 'sc-bio' ? { type: 'biological', id: 'b-anthracis' } : null), updated_at: now() };
    insert('samples', row); db.prepare('INSERT INTO sample_events(sample_id,ts,status,note,by_user) VALUES(?,?,?,?,?)').run(id, now(), 'ENTNOMMEN', null, u.id);
    audit(u.id, 'create', 'sample', id); emit('sample.created', sampleFull(id)); rep.code(201); return sampleFull(id);
  });
  const FLOW = ['ENTNOMMEN', 'VERPACKT', 'ÜBERGEBEN', 'LABOR EINGEGANGEN', 'ANALYSE', 'BEFUND EINGEGANGEN'];
  app.post('/api/samples/:id/events', async (req) => {
    const u = need(req, 1); const id = (req.params as any).id; const s = get('samples', id); if (!s) throw nf('Probe'); const b = req.body as any;
    const cur = FLOW.indexOf(s.lab_status === 'AUSSTEHEND' ? s.transport_status : s.lab_status); const nx = FLOW[cur + 1]; const status = b.status ?? nx;
    if (!FLOW.includes(status)) throw Object.assign(new Error('Ungültiger Status'), { statusCode: 400 });
    if (status === 'BEFUND EINGEGANGEN') throw Object.assign(new Error('Laborbefund wird vom Labor (Simulation) erzeugt'), { statusCode: 409 });
    const lab = ['LABOR EINGEGANGEN', 'ANALYSE'].includes(status);
    update('samples', id, { transport_status: lab ? 'ÜBERGEBEN' : status, lab_status: lab ? status : s.lab_status, updated_at: now() });
    db.prepare('INSERT INTO sample_events(sample_id,ts,status,note,by_user) VALUES(?,?,?,?,?)').run(id, now(), status, b.note ?? null, u.id);
    audit(u.id, 'status', 'sample', id, { status }); emit('sample.updated', sampleFull(id)); return sampleFull(id);
  });
  app.post('/api/samples/:id/lab', async (req) => { const u = need(req, 3); const id = (req.params as any).id; if (!get('samples', id)) throw nf('Probe'); completeLab(id, u.id); return sampleFull(id); });
  app.patch('/api/samples/:id', async (req) => {
    const u = need(req, 1); const id = (req.params as any).id; const s = get('samples', id); if (!s) throw nf('Probe'); const b = req.body as any; const diff: any = {}; const patch: any = {};
    for (const k of ['description', 'color', 'consistency', 'odor', 'turbidity', 'location', 'onsite_assessment']) if (b[k] !== undefined && b[k] !== s[k]) { patch[k] = b[k]; diff[k] = { from: s[k], to: b[k] }; }
    if (Object.keys(patch).length) { update('samples', id, { ...patch, updated_at: now() }); audit(u.id, 'update', 'sample', id, diff); emit('sample.updated', sampleFull(id)); }
    return sampleFull(id);
  });

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
  app.get('/api/reports', async () => list('reports', '', [], 'ORDER BY created_at DESC').map((r: any) => ({ id: r.id, mission_id: r.mission_id, created_at: r.created_at, created_by: r.created_by })));
  app.post('/api/reports', async (req, rep) => {
    const u = need(req, 2); const mid = (req.body as any).mission_id; const m = get('missions', mid); if (!m) throw nf('Auftrag');
    const id = `B-${mid}`; const data = buildReport(mid, u.name); insert('reports', { id, mission_id: mid, created_at: now(), created_by: u.id, data }, true);
    audit(u.id, 'create', 'report', id); rep.code(201); return { id, ...data };
  });
  app.get('/api/reports/:id', async (req) => { const r = get('reports', (req.params as any).id); if (!r) throw nf('Bericht'); return { id: r.id, created_at: r.created_at, ...r.data }; });
  app.get('/api/reports/:id/csv', async (req, rep) => { const r = get('reports', (req.params as any).id); if (!r) throw nf('Bericht'); rep.header('content-type', 'text/csv; charset=utf-8').header('content-disposition', `attachment; filename="${r.id}.csv"`); return '﻿' + reportCsv(r.data); });
  app.get('/api/reports/:id/pdf', async (req, rep) => { const r = get('reports', (req.params as any).id); if (!r) throw nf('Bericht'); const buf = await reportPdf(r.id, r.data); rep.header('content-type', 'application/pdf').header('content-disposition', `attachment; filename="${r.id}.pdf"`); return buf; });

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

  // ---------- FiveM-Adapter (optional; die Web-App funktioniert ohne)
  app.post('/api/adapter/fivem/telemetry', async (req) => {
    const token = process.env.FIVEM_TOKEN ?? 'dev-token';
    if (req.headers['x-adapter-token'] !== token) throw Object.assign(new Error('Adapter-Token ungültig'), { statusCode: 401 });
    return { ok: ingestFivem(req.body as any) };
  });
  app.get('/api/adapter/fivem/status', async () => ({ connected: fivemConnected(), info: state.fivem.info, last: state.fivem.last }));
}
