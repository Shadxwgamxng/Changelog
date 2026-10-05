// ---------------------------------------------------------------------------------------------
// Geräte-Service (serverautoritativ): Fahrzeugbestand, Entnehmen/Zurücklegen, Gerätezustand, Batterie, Messung, Speichern.
// Unabhängig von FiveM-Natives und UI: Positionen/Spieler kommen über Provider bzw. Parameter (events.ts / dev.ts).
// ---------------------------------------------------------------------------------------------
import { get, list, now, audit } from '../db.js';
import { activeIncident, createAlarm, state as simState, storeMeasurement } from '../sim.js';
import { gameToLL } from '../geo.js';
import { DEVICES, publicDef, type DevDef, type Alert } from './defs.js';
import { envAt, type Pos } from './env.js';
import { alertOf, decimalsFor, follow, roundTo, sample, truthOf } from './engine.js';

export const HCFG = { maxEquipped: 1, batteryScale: 1, series: 900, saveMinMs: 2500 };
export type Phase = 'OFF' | 'BOOTING' | 'SELF_TEST' | 'READY' | 'MEASURING' | 'ERROR';
export interface Player { src: number; license: string; name: string }
interface Result { value: number; unit: string; channels?: Record<string, number>; aux?: any; stats: { min: number; max: number; avg: number; n: number }; series: [number, number][]; duration_s: number; mode: string; precision: string; stable: boolean; alert: Alert; channel: string | null; pos: Pos; startedAt: string; over: boolean }
export interface Inst {
  id: string; type: string; key: string; vehicleId: string | null; netId: number | null; holder: Player | null;
  phase: Phase; mode: string; precision: 'quick' | 'normal' | 'precise'; battery: number; muted: boolean; err: string | null; tests: string[]; phaseAt: number; testResults: boolean[];
  shown: number; shownCh: Record<string, number>; over: boolean; alert: Alert; channel: string | null; startedAt: number; ring: number[]; stat: { min: number; max: number; sum: number; n: number }; series: [number, number][]; lastSerie: number; dose: number;
  zero: { until: number; start: number } | null; drift: number; result: Result | null; flash: { text: string; until: number } | null; pos: Pos | null; forceError: boolean; lastJson: string;
}
const inst = new Map<string, Inst>(); // id -> Instanz (eine Wahrheit je Gerät: keine Duplikate)
const keyId = (key: string, type: string) => `${key}::${type}`;
const CLEAN: Record<string, number> = { iBut: 0, CO2: 0.042, CH4: 0, O2: 20.9, H2S: 0, CO: 0.4, SO2: 0 };

export const providers = { pos: (_src: number): Pos | null => null as Pos | null, vehicleAt: (_p: Pos): string | null => null as string | null, alive: (_src: number): boolean => true, notify: (_src: number, _s: any): void => {} };

function make(key: string, type: string, vehicleId: string | null, netId: number | null): Inst {
  const d = DEVICES[type];
  return { id: keyId(key, type), type, key, vehicleId, netId, holder: null, phase: 'OFF', mode: d.defaultMode, precision: 'normal', battery: d.battery.start, muted: false, err: null, tests: d.selfTest.items, phaseAt: 0, testResults: [],
    shown: 0, shownCh: {}, over: false, alert: 'NORMAL', channel: null, startedAt: 0, ring: [], stat: { min: 0, max: 0, sum: 0, n: 0 }, series: [], lastSerie: 0, dose: 0, zero: null, drift: 0, result: null, flash: null, pos: null, forceError: false, lastJson: '' };
}
/** Fahrzeugbestand: je Fahrzeug und Gerätetyp ein Gerät (wird beim ersten Zugriff angelegt). */
export function inventory(key: string, vehicleId: string | null, netId: number | null) {
  return Object.keys(DEVICES).map((t) => { const id = keyId(key, t); let i = inst.get(id); if (!i) { i = make(key, t, vehicleId, netId); inst.set(id, i); } if (vehicleId) i.vehicleId = vehicleId; if (netId) i.netId = netId; return i; });
}
export const heldBy = (src: number) => [...inst.values()].filter((i) => i.holder?.src === src);
export const allInst = () => [...inst.values()];
export const getInst = (id: string) => inst.get(id);
const err = (m: string) => Object.assign(new Error(m), { statusCode: 409 });

export function publicInventory(key: string, vehicleId: string | null, netId: number | null, me?: number) {
  return inventory(key, vehicleId, netId).map((i) => ({ type: i.type, label: DEVICES[i.type].label, short: DEVICES[i.type].short, category: DEVICES[i.type].category, battery: Math.round(i.battery), status: i.holder ? (i.holder.src === me ? 'IN DEINER HAND' : 'IN VERWENDUNG') : i.battery <= 1 ? 'AKKU LEER' : 'VERFÜGBAR', holder: i.holder?.name ?? null }));
}

export function take(p: Player, key: string, vehicleId: string | null, netId: number | null, type: string) {
  if (!DEVICES[type]) throw err('Unbekanntes Messgerät.');
  if (heldBy(p.src).length >= HCFG.maxEquipped) throw err('Du hast bereits ein Messgerät in Benutzung.');
  const i = inventory(key, vehicleId, netId).find((x) => x.type === type)!;
  if (i.holder) throw err(`Dieses Messgerät ist bereits in Verwendung (${i.holder.name}).`);
  i.holder = p; resetRuntime(i); audit(p.name, 'take', 'device', i.id, { battery: Math.round(i.battery) }); return i;
}
function resetRuntime(i: Inst) { i.phase = 'OFF'; i.err = null; i.result = null; i.zero = null; i.flash = null; i.alert = 'NORMAL'; i.startedAt = 0; i.testResults = []; i.over = false; i.lastJson = ''; }
/** Zurücklegen / Freigeben (auch bei Tod, Trennung): Zustand bleibt gespeichert (Batterie, Modus), Gerät ist ausgeschaltet und wieder verfügbar. */
export function release(i: Inst, why = 'return') { if (!i.holder) return; audit(i.holder.name, why, 'device', i.id, { battery: Math.round(i.battery) }); const h = i.holder; i.holder = null; resetRuntime(i); providers.notify(h.src, { id: i.id, released: true }); }
export function giveBack(p: Player, key: string, netId: number | null) { const i = heldBy(p.src).find((x) => x.key === key || (netId != null && x.netId === netId)); if (!i) throw err('Du hast kein Messgerät dieses Fahrzeugs.'); release(i, 'return'); return i; }
export const releaseAll = (src: number, why: string) => heldBy(src).forEach((i) => release(i, why));

// ---- Bedienung ------------------------------------------------------------------------------------------------
const flash = (i: Inst, text: string, ms = 3500) => { i.flash = { text, until: Date.now() + ms }; };
export function action(src: number, act: string, a: any = {}) {
  const i = heldBy(src)[0]; if (!i) throw err('Du hast kein Messgerät.'); const d = DEVICES[i.type]; const t = Date.now();
  switch (act) {
    case 'power': {
      if (a.on === false) { if (i.phase === 'MEASURING' && i.result == null) snapshot(i); i.phase = 'OFF'; i.zero = null; i.flash = null; break; }
      if (i.phase !== 'OFF') break; if (i.battery <= 0.5) { flash(i, 'BATTERIE LEER'); throw err('Batterie leer.'); }
      i.phase = 'BOOTING'; i.phaseAt = t; i.err = null; i.testResults = []; break; }
    case 'mode': { if (!['READY', 'MEASURING'].includes(i.phase)) throw err('Gerät nicht bereit.'); if (!d.modes.some((m) => m.id === a.mode)) throw err('Modus ungültig.'); if (i.phase === 'MEASURING') throw err('Messung läuft – erst stoppen.'); i.mode = a.mode; i.result = null; break; }
    case 'precision': { if (!(a.precision in d.durations)) throw err('Messdauer ungültig.'); if (i.phase === 'MEASURING') throw err('Messung läuft.'); i.precision = a.precision; break; }
    case 'mute': i.muted = !i.muted; break;
    case 'start': { if (i.phase !== 'READY') throw err('Gerät nicht bereit.'); if (i.zero) throw err('Nullung läuft.'); startMeasure(i, d); break; }
    case 'stop': { if (i.phase !== 'MEASURING') break; snapshot(i); i.phase = 'READY'; break; }
    case 'zero': { if (!d.zero) throw err('Dieses Gerät hat keine Nullung.'); if (i.phase !== 'READY') throw err('Nullung nur im Zustand BEREIT.'); i.zero = { start: t, until: t + d.zero.ms }; i.result = null; break; }
    case 'save': return save(i, a);
    case 'discard': i.result = null; break;
    default: throw err('Unbekannte Aktion.');
  }
  return null;
}
function startMeasure(i: Inst, d: DevDef) {
  i.phase = 'MEASURING'; i.startedAt = Date.now(); i.ring = []; i.series = []; i.lastSerie = 0; i.result = null; i.alert = 'NORMAL'; i.channel = null; i.over = false;
  i.shown = d.engine === 'dose' ? 0.085 : d.engine === 'contam' ? 1.1 : d.engine === 'voc' ? 0.06 : 0; // Ausgangsanzeige = Reinluft/Hintergrund, die Anzeige läuft dann zum wahren Wert
  i.shownCh = d.channels ? Object.fromEntries(d.channels.map((c) => [c.id, CLEAN[c.id] ?? 0])) : {};
  i.stat = { min: Infinity, max: -Infinity, sum: 0, n: 0 }; i.dose = 0;
}
function snapshot(i: Inst) {
  const d = DEVICES[i.type]; const el = (Date.now() - i.startedAt) / 1000; if (i.stat.n === 0) return;
  const mean = i.stat.sum / i.stat.n; const stable = isStable(i, d);
  const rv = d.channels ? mean : (d.modes.find((m) => m.id === i.mode)?.integrates ? i.dose : i.shown);
  i.result = { value: roundTo(d, d.channels ? 0 : rv), unit: d.modes.find((m) => m.id === i.mode)?.unit ?? '', channels: d.channels ? { ...i.shownCh } : i.type === 'ims' ? { ...i.shownCh } : undefined, aux: (i as any).aux,
    stats: { min: i.stat.min, max: i.stat.max, avg: mean, n: i.stat.n }, series: i.series.slice(-HCFG.series), duration_s: Math.round(el), mode: i.mode, precision: i.precision, stable, alert: i.alert, channel: i.channel, pos: i.pos ?? { x: 0, y: 0, z: 0 }, startedAt: new Date(i.startedAt).toISOString(), over: i.over };
}
function isStable(i: Inst, d: DevDef) {
  const el = Date.now() - i.startedAt; if (el < d.durations[i.precision] || i.ring.length < 6) return false;
  const arr = i.ring.slice(-8); const mx = Math.max(...arr), mn = Math.min(...arr), avg = arr.reduce((a, b) => a + b, 0) / arr.length;
  return mx - mn <= Math.max(d.stability.abs, d.stability.rel * Math.abs(avg));
}

function save(i: Inst, a: any) {
  const d = DEVICES[i.type]; if (i.phase === 'MEASURING') snapshot(i);
  const r = i.result; if (!r) throw err('Keine Messung zum Speichern.');
  if (r.duration_s * 1000 < HCFG.saveMinMs) throw err('Messung zu kurz – bitte den Wert erst ansprechen lassen.');
  const label = String(a.label ?? '').trim().slice(0, 40) || null, note = String(a.note ?? '').trim().slice(0, 500) || null;
  let sample_id: string | null = a.sample_id ? String(a.sample_id) : null; if (sample_id && !get('samples', sample_id)) sample_id = null;
  const ll = gameToLL(r.pos.x, r.pos.y); const vid = i.vehicleId ?? providers.vehicleAt(r.pos); const inc = activeIncident();
  const mission = vid ? list('missions', "WHERE vehicle_id = ? AND status IN ('IN BEARBEITUNG','ANGENOMMEN') ORDER BY created_at DESC LIMIT 1", [vid])[0] : null;
  const run = vid ? simState.runs[vid] : null; const mdef = d.modes.find((m) => m.id === r.mode);
  const pr = r.channels ? (d.channels ?? []).map((c) => `${c.label} ${(r.channels as any)[c.id]?.toFixed(c.decimals)} ${c.unit}`).join(' · ') : '';
  const primary = d.channels && r.channel ? (r.channels as any)[r.channel] : r.value; const punit = d.channels && r.channel ? d.channels.find((c) => c.id === r.channel)!.unit : r.unit;
  const status: Alert = r.alert;
  const row = storeMeasurement({ ts: now(), lat: ll.lat, lon: ll.lon, vehicle_id: vid, mission_id: mission?.id ?? null, incident_id: inc?.id ?? null, run_id: run?.id ?? null, device: d.devKey, value: primary ?? null, unit: punit,
    channels: r.channels ?? null, substance_id: (i.type === 'ims' ? ((r.aux as any)?.substance_id ?? null) : null), status, level: null, headline: `${d.label} · ${mdef?.label ?? r.mode}${r.over ? ' · ÜBERBEREICH' : ''}${pr ? ' · ' + pr : ''}${r.stable ? '' : ' · nicht stabilisiert'}`.slice(0, 300), remark: null,
    hdevice_id: i.id, mode: r.mode, player: i.holder?.name ?? null, duration_s: r.duration_s, stats: r.stats, series: thin(r.series, 300), label, note, sample_id, source: 'HANDHELD', pos: r.pos });
  audit(i.holder?.name ?? '?', 'save', 'measurement', row.id, { device: i.type, value: row.value, status });
  i.result = null; flash(i, `GESPEICHERT ${row.id}`, 4500);
  return row;
}
const thin = (s: [number, number][], n: number) => (s.length <= n ? s : s.filter((_, k) => k % Math.ceil(s.length / n) === 0));

// ---- Takt: nur Geräte in Spielerhand, die nicht AUS sind (Messberechnung nur bei aktiver Messung) ---------------------
let lastTick = Date.now(), tickN = 0;
export function tick() {
  const t = Date.now(), dt = Math.min(2, (t - lastTick) / 1000); lastTick = t; tickN++;
  for (const i of inst.values()) {
    const d = DEVICES[i.type];
    if (!i.holder) { if (tickN % 10 === 0 && i.battery < 100) i.battery = Math.min(100, i.battery + (d.battery.chargePerMin * dt * 10) / 60); continue; } // im Fahrzeug: laden
    if (!providers.alive(i.holder.src)) { release(i, 'dead'); continue; }
    if (i.phase === 'OFF') { out(i); continue; }
    i.pos = providers.pos(i.holder.src) ?? i.pos;
    // Batterie
    const drain = (d.battery.drainPerMin + (i.phase === 'MEASURING' ? d.battery.measureExtra : 0) + (i.alert === 'ALARM' ? d.battery.alarmExtra : 0)) * HCFG.batteryScale; i.battery = Math.max(0, i.battery - (drain * dt) / 60);
    if (i.battery <= 0) { i.phase = 'OFF'; flash(i, 'BATTERIE LEER', 6000); out(i); continue; }
    if (i.flash && i.flash.until < t) i.flash = null;
    if (i.phase === 'BOOTING' && t - i.phaseAt >= d.selfTest.bootMs) { i.phase = 'SELF_TEST'; i.phaseAt = t; }
    else if (i.phase === 'SELF_TEST') {
      const frac = (t - i.phaseAt) / d.selfTest.testMs; i.testResults = d.selfTest.items.map((_, k) => frac > (k + 1) / (d.selfTest.items.length + 0.5));
      if (frac >= 1) { const fail = i.forceError || Math.random() < d.selfTest.failChance || i.battery < 3; if (fail) { i.phase = 'ERROR'; i.err = i.battery < 3 ? 'BATTERIE SCHWACH' : 'SENSORFEHLER – Messung nicht möglich'; i.forceError = false; } else i.phase = 'READY'; }
    }
    if (i.zero) { if (t >= i.zero.until) { i.zero = null; i.drift = 0; flash(i, d.id === 'ims' ? 'REINIGUNG ABGESCHLOSSEN' : 'NULLUNG ABGESCHLOSSEN'); } }
    if (i.phase === 'MEASURING' && i.pos) measure(i, d, dt, t);
    out(i);
  }
}
function measure(i: Inst, d: DevDef, dt: number, t: number) {
  const env = envAt(i.pos!); const tr = truthOf(d, i.mode, env); const el = (t - i.startedAt) / 1000; const mdef = d.modes.find((m) => m.id === i.mode);
  i.drift += (Math.random() - 0.5) * d.noise.abs * 0.02 * dt; // langsame Nullpunktdrift (wird durch Nullung zurückgesetzt)
  (i as any).aux = tr.aux;
  if (d.channels) {
    for (const c of d.channels) { const tg = sample(d, tr.channels![c.id] ?? 0, el); i.shownCh[c.id] = Math.min(c.range, follow(i.shownCh[c.id], tg, dt, d.tau_s)); }
    const a = alertOf(d, i.mode, 0, i.shownCh); i.alert = a.alert; i.channel = a.channel; i.shown = a.channel ? i.shownCh[a.channel] : 0; i.over = d.channels.some((c) => i.shownCh[c.id] >= c.range);
    i.stat = { min: 0, max: 0, sum: 0, n: i.stat.n + 1 };
  } else {
    let target = d.engine === 'dose' || d.engine === 'contam' || d.engine === 'voc' ? sample(d, tr.value, el) + i.drift : tr.value;
    if (d.engine === 'ims') { const tau = target < i.shown ? 14 : d.tau_s; i.shown = follow(i.shown, target, dt, tau); i.shownCh = Object.fromEntries(Object.entries(tr.channels ?? {}).map(([k, v]) => [k, Math.round(follow(i.shownCh[k] ?? 0, v, dt, v < (i.shownCh[k] ?? 0) ? 14 : d.tau_s))])); }
    else i.shown = follow(i.shown, target, dt, d.tau_s);
    if (mdef?.integrates) i.dose += env.dose * dt / 3600; // Dosis = ∫ Dosisleistung dt (µSv)
    i.shown = Math.max(0, i.shown); i.over = i.shown > d.range.max; if (i.over) i.shown = d.range.max;
    const shownV = mdef?.integrates ? i.dose : d.engine === 'ims' ? Math.round(i.shown) : i.shown;
    const a = alertOf(d, i.mode, shownV); i.alert = a.alert; i.channel = null;
    i.ring.push(shownV); if (i.ring.length > 12) i.ring.shift();
    i.stat.min = Math.min(i.stat.min, shownV); i.stat.max = Math.max(i.stat.max, shownV); i.stat.sum += shownV; i.stat.n++;
    if (t - i.lastSerie >= 1000) { i.lastSerie = t; i.series.push([+el.toFixed(0), +shownV.toFixed(4)]); if (i.series.length > HCFG.series) i.series.shift(); }
  }
  if ((i.alert === 'ALARM') && i.pos && el > 2) { const vid = i.vehicleId; const ll = gameToLL(i.pos.x, i.pos.y); try { createAlarm({ source: d.short, category: d.category === 'RADIOLOGISCH' ? 'RADIOLOGISCH' : 'CHEMISCH', description: `${d.short} (Handgerät, ${i.holder?.name ?? '?'}): Alarmschwelle erreicht`, lat: ll.lat, lon: ll.lon, vehicle_id: vid ?? '' }, `hdev-${i.id}`); } catch { /* kein Fahrzeug */ } }
}

export function publicState(i: Inst) {
  const d = DEVICES[i.type]; const t = Date.now(); const meas = i.phase === 'MEASURING'; const mdef = d.modes.find((m) => m.id === i.mode);
  const v = mdef?.integrates ? i.dose : d.engine === 'ims' ? Math.round(i.shown) : i.shown; const el = meas ? (t - i.startedAt) / 1000 : i.result?.duration_s ?? 0;
  const state = i.phase === 'MEASURING' ? (i.alert === 'ALARM' ? 'ALARM' : i.alert === 'WARNUNG' ? 'WARNING' : 'MEASURING') : i.phase;
  const stable = meas ? isStable(i, d) : !!i.result?.stable;
  return { id: i.id, type: i.type, phase: i.phase, state, alert: meas ? i.alert : i.result?.alert ?? 'NORMAL', channel: i.channel, mode: i.mode, precision: i.precision, battery: Math.round(i.battery), batteryLow: i.battery <= d.battery.low, muted: i.muted, err: i.err,
    boot: i.phase === 'BOOTING' ? Math.min(1, (t - i.phaseAt) / d.selfTest.bootMs) : i.phase === 'OFF' ? 0 : 1, test: i.phase === 'SELF_TEST' ? { items: i.tests, ok: i.testResults, p: Math.min(1, (t - i.phaseAt) / d.selfTest.testMs) } : null,
    zero: i.zero ? { label: d.zero?.label, p: Math.min(1, (t - i.zero.start) / (i.zero.until - i.zero.start)) } : null,
    value: meas || i.result ? (d.channels ? null : mdef?.integrates ? +i.dose.toFixed(4) : +v.toFixed(6)) : null, dec: decimalsFor(d, v), unit: mdef?.unit ?? '', over: i.over, channels: (d.channels || d.engine === 'ims') && (meas || i.result) ? (i.phase === 'MEASURING' ? i.shownCh : i.result?.channels ?? null) : null, aux: meas ? (i as any).aux ?? null : null,
    elapsed: Math.round(el), duration: d.durations[i.precision] / 1000, stable, stats: meas ? (i.stat.n ? { min: i.stat.min, max: i.stat.max, avg: i.stat.sum / i.stat.n } : null) : i.result ? i.result.stats : null,
    hasResult: !!i.result || (meas && i.stat.n > 3), canSave: (meas ? el * 1000 : (i.result?.duration_s ?? 0) * 1000) >= HCFG.saveMinMs && (meas || !!i.result), flash: i.flash && i.flash.until > t ? i.flash.text : null };
}
function out(i: Inst) { if (!i.holder) return; const s = publicState(i); const j = JSON.stringify(s); if (j !== i.lastJson) { i.lastJson = j; providers.notify(i.holder.src, s); } }
export const defsFor = (type: string) => publicDef(DEVICES[type]);
export const setForceError = (src: number) => { const i = heldBy(src)[0]; if (i) i.forceError = true; return !!i; };
export function startService() { setInterval(() => { try { tick(); } catch (e) { console.error('[cbrn] Geräte-Tick', e); } }, 500); }
