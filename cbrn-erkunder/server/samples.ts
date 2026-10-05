// ---------------------------------------------------------------------------------------------
// Sample Service: Proben, Lagerung, Analysen, Historie. Unabhängig von UI und FiveM (wird von den Spiel-Events,
// der Computer-API und später Messleitung/Berichten/Labor gemeinsam genutzt). Alle Regeln stehen hier.
// ---------------------------------------------------------------------------------------------
import { db, get, list, insert, update, now, audit, getSetting, setSetting } from './db.js';
import { emit, sampleTruth, activeIncident } from './sim.js';
import { gameToLL, distM } from './geo.js';
import { crewOf } from './auth.js';

export type SampleStatus = 'COLLECTED' | 'TRANSPORT' | 'STORED' | 'ANALYSIS' | 'COMPLETED' | 'ARCHIVED';
export type AnalysisType = 'CHEMICAL' | 'BIOLOGICAL' | 'RADIOLOGICAL' | 'GENERAL';
export const STATUS_TEXT: Record<SampleStatus, string> = { COLLECTED: 'ENTNOMMEN', TRANSPORT: 'TRANSPORT', STORED: 'EINGELAGERT', ANALYSIS: 'IN ANALYSE', COMPLETED: 'ANALYSE ABGESCHLOSSEN', ARCHIVED: 'ARCHIVIERT' };
export const SAMPLE_TYPES: Record<string, string> = { BODEN: 'Boden', WASSER: 'Wasser', LUFT: 'Luft', FLUESSIGKEIT: 'Flüssigkeit', FESTSTOFF: 'Feststoff', ABSTRICH: 'Abstrich', SONSTIGE: 'Sonstige' };
export const ANALYSIS_TYPES: Record<AnalysisType, string> = { CHEMICAL: 'Chemisch', RADIOLOGICAL: 'Radiologisch', BIOLOGICAL: 'Biologisch', GENERAL: 'Allgemeine Untersuchung' };

export interface SampleConfig { maxSamples: number; analysisDurations: Record<string, number>; containerType: string }
export const SC: SampleConfig = { maxSamples: 20, analysisDurations: { CHEMICAL: 60000, RADIOLOGICAL: 45000, BIOLOGICAL: 120000, GENERAL: 30000 }, containerType: 'UNIVERSAL SAMPLE CONTAINER' };
export function applySampleConfig(c: Partial<SampleConfig> | null | undefined) {
  if (!c) return; if (c.maxSamples) SC.maxSamples = c.maxSamples; if (c.containerType) SC.containerType = c.containerType;
  if (c.analysisDurations) for (const [k, v] of Object.entries(c.analysisDurations)) if (Number(v) > 0) SC.analysisDurations[k] = Number(v);
}

const err = (msg: string, code = 400) => Object.assign(new Error(msg), { statusCode: code });
const nextSeq = (key: string) => { const n = (getSetting(key, 0) as number) + 1; setSetting(key, n); return n; };

export function logEvent(sampleId: string, status: string, note: string | null, by: string) {
  db.prepare('INSERT INTO sample_events(sample_id,ts,status,note,by_user) VALUES(?,?,?,?,?)').run(sampleId, now(), status, note, by);
}

/** Ausgabeform für Oberfläche/API – ohne verdecktes Wahrheitsprofil. */
export function publicSample(id: string, withDetails = true) {
  const s = get('samples', id); if (!s) return null;
  const { truth_ref, truth_ratio, collected_license, ...pub } = s as any;
  const out: any = { ...pub, status_text: STATUS_TEXT[pub.status as SampleStatus] ?? pub.status, type_text: SAMPLE_TYPES[pub.sample_type] ?? pub.sample_type };
  if (withDetails) {
    out.analyses = list('sample_analyses', 'WHERE sample_id = ? ORDER BY started_at', [id]).map(publicAnalysis);
    out.events = list('sample_events', 'WHERE sample_id = ?', [id], 'ORDER BY id');
  }
  return out;
}
export function publicAnalysis(a: any) {
  const elapsed = a.status === 'RUNNING' ? Date.now() - Date.parse(a.started_at) : a.duration_ms; // elapsed statt Zeitstempel: Uhren von Spieler und Server können abweichen
  return { ...a, type_text: ANALYSIS_TYPES[a.type as AnalysisType] ?? a.type, elapsed_ms: Math.max(0, Math.min(elapsed, a.duration_ms)) };
}
export const listSamples = () => list('samples', '', [], 'ORDER BY ts DESC').map((s: any) => ({ ...publicSample(s.id, false), analysis_count: (db.prepare('SELECT COUNT(*) c FROM sample_analyses WHERE sample_id = ?').get(s.id) as any).c as number }));

/** Belegung des Probenlagers eines Fahrzeugs (Proben, die im Fahrzeug liegen). */
export const storedCount = (vehicleId: string) => (db.prepare("SELECT COUNT(*) c FROM samples WHERE vehicle_id = ? AND status IN ('STORED','ANALYSIS','COMPLETED')").get(vehicleId) as any).c as number;

/** Ordnet eine Weltposition dem nächsten angemeldeten/verbundenen CBRN-Fahrzeug zu. */
export function resolveVehicleId(x: number, y: number): string | null {
  const p = gameToLL(x, y); let best: { id: string; d: number } | null = null;
  for (const v of list('vehicles')) { if (v.link !== 'ONLINE') continue; const d = distM(p, { lat: v.lat, lon: v.lon }); if (d < 40 && (!best || d < best.d)) best = { id: v.id, d }; }
  if (best) return best.id;
  const crewed = list('vehicles').filter((v: any) => crewOf(v.id).length > 0);
  return crewed.length === 1 ? crewed[0].id : null;
}

export interface NewSample { source: string; type: string; description: string; by: string; license: string; pos: { x: number; y: number; z: number }; vehicleId: string; model: string | null; offset: { x: number; y: number; z: number } | null; vehicleNetId?: number | null }
export function createSample(n: NewSample) {
  if (!SAMPLE_TYPES[n.type]) throw err('Ungültige Probenart');
  const source = String(n.source ?? '').trim(); if (source.length < 2 || source.length > 120) throw err('Bitte die Herkunft der Probe angeben (2–120 Zeichen)');
  const description = String(n.description ?? '').trim().slice(0, 300);
  const id = `P-${new Date().getFullYear()}-${String(nextSeq('sample_seq')).padStart(6, '0')}`;
  const ll = gameToLL(n.pos.x, n.pos.y); const inc = activeIncident(); const truth = sampleTruth(ll.lat, ll.lon);
  insert('samples', { id, ts: now(), lat: ll.lat, lon: ll.lon, kind: SAMPLE_TYPES[n.type].toUpperCase(), sample_type: n.type, description, source_description: source, label: null, info: null,
    collected_by: n.by, collected_license: n.license, taken_by: n.by, collection_pos: n.pos, collection_offset: n.offset, collection_model: n.model, vehicle_id: n.vehicleId, incident_id: inc?.id ?? null,
    status: 'COLLECTED', transport_status: 'ENTNOMMEN', lab_status: 'AUSSTEHEND', container: SC.containerType, truth_ref: truth ? { type: truth.type, id: truth.id, category: truth.category } : null, truth_ratio: truth?.ratio ?? 0, updated_at: now() });
  logEvent(id, 'ENTNOMMEN', `${SAMPLE_TYPES[n.type]} · Fahrzeug ${n.vehicleId}${inc ? ' · Einsatz ' + inc.id : ' · ohne Einsatz'}`, n.by);
  logEvent(id, 'HERKUNFT EINGETRAGEN', source, n.by);
  audit(n.by, 'create', 'sample', id, { vehicle: n.vehicleId, incident: inc?.id ?? null });
  emit('sample.created', publicSample(id)); return publicSample(id)!;
}

export function labelSample(id: string, label: string, info: string, by: string) {
  const s = get('samples', id); if (!s) throw err('Probe nicht gefunden', 404);
  if (!['COLLECTED', 'TRANSPORT'].includes(s.status)) throw err('Die Probe kann nicht mehr beschriftet werden');
  label = String(label ?? '').trim(); if (label.length < 1 || label.length > 60) throw err('Bitte eine Bezeichnung angeben (max. 60 Zeichen)');
  info = String(info ?? '').trim().slice(0, 120); // Proben-ID bleibt unveränderlich
  update('samples', id, { label, info, status: 'TRANSPORT', transport_status: 'TRANSPORT', updated_at: now() });
  logEvent(id, 'BESCHRIFTET', `${label}${info ? ' – ' + info : ''}`, by); audit(by, 'label', 'sample', id);
  emit('sample.updated', publicSample(id)); return publicSample(id)!;
}

/** Einlagerung im Fahrzeug-Probenlager (nur beschriftete Proben, Kapazität beachten). */
export function storeSample(id: string, by: string) {
  const s = get('samples', id); if (!s) throw err('Probe nicht gefunden', 404);
  if (s.status !== 'TRANSPORT') throw err(s.status === 'COLLECTED' ? 'Die Probe muss zuerst beschriftet werden' : 'Die Probe ist bereits eingelagert');
  if (storedCount(s.vehicle_id) >= SC.maxSamples) throw err('PROBENLAGER VOLL – Es können keine weiteren Proben eingelagert werden.', 409);
  update('samples', id, { status: 'STORED', transport_status: 'EINGELAGERT', stored_at: now(), updated_at: now() });
  logEvent(id, 'EINGELAGERT', `Probenlager ${s.vehicle_id}`, by); audit(by, 'store', 'sample', id);
  const pub = publicSample(id)!; emit('sample.updated', pub); emit('sample.stored', pub); return pub;
}

export function archiveSample(id: string, by: string) {
  const s = get('samples', id); if (!s) throw err('Probe nicht gefunden', 404);
  if (s.status !== 'COMPLETED') throw err('Nur abgeschlossene Proben können archiviert werden');
  update('samples', id, { status: 'ARCHIVED', updated_at: now() }); logEvent(id, 'ARCHIVIERT', null, by); audit(by, 'archive', 'sample', id);
  emit('sample.updated', publicSample(id)); return publicSample(id)!;
}

// ---- Analysen
export function startAnalysis(id: string, type: string, by: string, comment?: string) {
  const s = get('samples', id); if (!s) throw err('Probe nicht gefunden', 404);
  if (!ANALYSIS_TYPES[type as AnalysisType]) throw err('Ungültige Analyseart');
  if (!['STORED', 'COMPLETED'].includes(s.status)) throw err(s.status === 'ANALYSIS' ? 'Für diese Probe läuft bereits eine Analyse' : 'Nur eingelagerte Proben können analysiert werden');
  const aid = `A-${String(nextSeq('analysis_seq')).padStart(5, '0')}`; const dur = SC.analysisDurations[type] ?? 60000;
  insert('sample_analyses', { id: aid, sample_id: id, type, status: 'RUNNING', started_at: now(), duration_ms: dur, by_user: by, comment: String(comment ?? '').trim().slice(0, 200) || null, result: null });
  update('samples', id, { status: 'ANALYSIS', lab_status: 'ANALYSE', updated_at: now() });
  logEvent(id, 'ANALYSE GESTARTET', `${aid} · ${ANALYSIS_TYPES[type as AnalysisType]}`, by); audit(by, 'analysis_start', 'sample', id, { analysis: aid, type });
  emit('sample.updated', publicSample(id)); return publicSample(id)!;
}

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const catOf = (t: string | undefined) => (t === 'substance' ? 'CHEMISCH' : t === 'radionuclide' ? 'RADIOLOGISCH' : t === 'biological' ? 'BIOLOGISCH' : null);
const typeCat: Record<string, string | null> = { CHEMICAL: 'CHEMISCH', RADIOLOGICAL: 'RADIOLOGISCH', BIOLOGICAL: 'BIOLOGISCH', GENERAL: null };
const refName = (t: string, id: string) => (t === 'substance' ? get('substances', id)?.name : t === 'radionuclide' ? get('radionuclides', id)?.name : get('biological_agents', id)?.name) ?? id;

/** Mehrstufiges, SIMULIERTES Analyseergebnis aus dem verdeckten Wahrheitsprofil der Entnahmestelle. */
export function analysisResult(sample: any, type: AnalysisType) {
  const base = { simulated: true, outcome: 'NO_FINDING', outcome_text: 'KEIN BEFUND', category: null as string | null, group: null as string | null, ref_type: null as string | null, substance_id: null as string | null, candidates: [] as any[], confidence: null as number | null, description: 'Es wurde keine Auffälligkeit festgestellt.' };
  const truth = sample.truth_ref as { type: string; id: string } | null; const ratio = (sample.truth_ratio ?? 0) + (Math.random() - 0.5) * 0.06;
  if (!truth) return base;
  const cat = catOf(truth.type)!; const need = typeCat[type];
  if (need && need !== cat) return base; // Untersuchungsart passt nicht zum vorhandenen Gefahrstoff -> kein Befund (kein Hinweis auf andere Art)
  const row = truth.type === 'substance' ? get('substances', truth.id) : truth.type === 'radionuclide' ? get('radionuclides', truth.id) : get('biological_agents', truth.id);
  const group = truth.type === 'substance' ? row?.substance_group : truth.type === 'radionuclide' ? 'Radionuklid (Gammastrahler)' : row?.kind ?? 'Biologischer Gefahrstoff';
  const lead = cat === 'CHEMISCH' ? 'Chemische' : cat === 'RADIOLOGISCH' ? 'Radiologische' : 'Biologische';
  const res = { ...base, category: cat, group, ref_type: truth.type };
  const general = type === 'GENERAL';
  if (ratio < (general ? 0.1 : 0.06)) return { ...res, outcome: 'UNKNOWN', outcome_text: 'UNBEKANNT', description: `${lead} Auffälligkeit nicht ausgeschlossen, aber nicht näher bestimmbar. Weitere Untersuchung empfohlen.`, group: null };
  if (general || ratio < 0.2) return { ...res, outcome: 'GROUP', outcome_text: 'STOFFGRUPPE ERKANNT', description: `${lead} Auffälligkeit festgestellt.\nStoffgruppe: ${group}\nEine eindeutige Identifikation ist nicht möglich.` };
  if (ratio < 0.5) {
    const others = truth.type === 'substance' ? list('substances', 'WHERE id != ? AND substance_group = ?', [truth.id, row?.substance_group]) : truth.type === 'radionuclide' ? list('radionuclides', 'WHERE id != ?', [truth.id]) : list('biological_agents', 'WHERE id != ?', [truth.id]);
    const alt = others.length ? pick(others) : null; const cands = [{ id: truth.id, name: refName(truth.type, truth.id) }, ...(alt ? [{ id: alt.id, name: alt.name }] : [])];
    if (Math.random() < 0.5) cands.reverse();
    return { ...res, outcome: 'SUSPECT', outcome_text: 'VERDACHT AUF BESTIMMTEN STOFF', candidates: cands, substance_id: cands[0].id, confidence: Math.round(35 + ratio * 60), description: `Verdacht auf ${cands.map((c) => c.name).join(' oder ')} (${group}). Bestätigung durch weitere Untersuchung erforderlich.` };
  }
  return { ...res, outcome: 'IDENTIFIED', outcome_text: 'SIMULIERTE IDENTIFIKATION', substance_id: truth.id, candidates: [{ id: truth.id, name: refName(truth.type, truth.id) }], confidence: Math.min(95, Math.round(70 + ratio * 25)), description: `Möglicher Stoff: ${refName(truth.type, truth.id)} (${group}).` };
}

function completeAnalysis(a: any) {
  const s = get('samples', a.sample_id); if (!s) return;
  const result = analysisResult(s, a.type);
  update('sample_analyses', a.id, { status: 'COMPLETED', completed_at: now(), result });
  update('samples', s.id, { status: 'COMPLETED', lab_status: 'BEFUND EINGEGANGEN', lab_result: { text: `${result.outcome_text}${result.substance_id ? ' – ' + refName(result.ref_type!, result.substance_id) : ''}`, substance_id: result.ref_type === 'substance' ? result.substance_id : null }, updated_at: now() });
  logEvent(s.id, 'ANALYSE ABGESCHLOSSEN', `${a.id} · ${result.outcome_text}`, a.by_user); audit(a.by_user, 'analysis_done', 'sample', s.id, { analysis: a.id, outcome: result.outcome });
  emit('sample.updated', publicSample(s.id)); emit('analysis.completed', { sample_id: s.id, analysis_id: a.id, outcome_text: result.outcome_text });
}
/** Wird regelmäßig aufgerufen: schließt fällige Analysen ab (läuft serverseitig weiter, auch wenn der Computer geschlossen ist). */
export function tickAnalyses() {
  for (const a of list('sample_analyses', "WHERE status = 'RUNNING'")) if (Date.now() - Date.parse(a.started_at) >= a.duration_ms) completeAnalysis(a);
}
