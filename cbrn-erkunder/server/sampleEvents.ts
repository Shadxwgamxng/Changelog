// FiveM-Server-Events der Probenentnahme (serverautoritativ): Spieler -> Fahrzeug/Punkt -> Entnahme -> Probe -> Beschriftung -> Einlagerung.
// Die eigentliche Probenlogik liegt im Sample Service (samples.ts); hier werden nur Spieler, Entfernungen und Inventar geprüft.
import { activeIncident } from './sim.js';
import { createSample, labelSample, storeSample, applySampleConfig, resolveVehicleId, publicSample, SAMPLE_TYPES } from './samples.js';
import { list } from './db.js';
import { randomBytes } from 'node:crypto';

type Pt = { x: number; y: number; z: number };
interface Cfg { requireJob?: boolean; points: Map<number, { sample: Pt; storage: Pt }>; interactDistance: number; returnDistance: number; collectionDuration: number; maxSamples: number; allowWithoutIncident: boolean; useInventory: boolean; kitItem: string; containerItem: string; containerType: string; analysisDurations: Record<string, number> }
interface P { kit: boolean; license: string; active?: { token: string; start: number; net: number; dur: number; noIncident: boolean; by: string } }

const DEFAULT: Cfg & { requireJob?: boolean } = { points: new Map(), interactDistance: 2.0, returnDistance: 1.5, collectionDuration: 5000, maxSamples: 20, allowWithoutIncident: true, useInventory: true, kitItem: 'sample_collection_kit', containerItem: 'sample_container', containerType: 'UNIVERSAL SAMPLE CONTAINER', analysisDurations: {} };
let cfg: Cfg | null = null;
const cfx = (): any => { try { if (typeof exports !== 'undefined') return exports; } catch { /* kein freier Name */ } return (globalThis as any).exports; };
const self = () => GetCurrentResourceName();

function setCfg(c: any): Cfg {
  const points = new Map<number, { sample: Pt; storage: Pt }>(); for (const p of c.points ?? []) points.set(p.model >>> 0, { sample: p.sample, storage: p.storage });
  const n: Cfg = { ...DEFAULT, ...c, points }; cfg = n; applySampleConfig({ maxSamples: n.maxSamples, containerType: n.containerType, analysisDurations: n.analysisDurations });
  return n;
}
/** Konfiguration aus der Lua-Seite (sample_config.lua): kommt per lokalem Event von bridge.lua; Export-Aufruf nur als Reserve. */
export function getCfg(force = false): Cfg {
  if (cfg && !force) return cfg;
  try { const c = cfx()[self()].getSampleConfig(); if (c) return setCfg(c); } catch { /* Event liefert die Konfiguration */ }
  return cfg ?? DEFAULT;
}

const players = new Map<number, P>();
const licenseOf = (src: number) => { const n = GetNumPlayerIdentifiers(src); for (let i = 0; i < n; i++) { const id = GetPlayerIdentifier(src, i); if (id.startsWith('license:')) return id; } return `src:${src}`; };
const pl = (src: number) => { let p = players.get(src); if (!p) { p = { kit: false, license: licenseOf(src) }; players.set(src, p); } return p; };
const res = (src: number, ev: string, ok: boolean, extra: Record<string, unknown> = {}) => emitNet('cbrn:sample:res', src, { ev, ok, ...extra });
const fail = (src: number, ev: string, msg: string) => res(src, ev, false, { msg });
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const posOf = (src: number): Pt => { const [x, y, z] = GetEntityCoords(GetPlayerPed(src)); return { x, y, z }; };

/** Lokaler Offset -> Welt. X = rechts, Y = vorne, Z = oben (GTA: Heading 0 = Norden, gegen den Uhrzeigersinn). Pitch/Roll werden vernachlässigt (Toleranz deckt das ab). */
export function worldPoint(ent: number, off: Pt): Pt {
  const [ex, ey, ez] = GetEntityCoords(ent); const h = (GetEntityHeading(ent) * Math.PI) / 180;
  return { x: ex + Math.cos(h) * off.x - Math.sin(h) * off.y, y: ey + Math.sin(h) * off.x + Math.cos(h) * off.y, z: ez + off.z };
}

// ---- Berechtigung / Inventar
const jobOk = (src: number) => { if (!getCfg().requireJob) return true; try { return !!cfx()[self()].jobAllowed(src); } catch { return false; } };
const inv = () => getCfg().useInventory && GetResourceState('ox_inventory') === 'started';
const ox = () => cfx().ox_inventory;
const hasKit = (src: number, p: P) => (inv() ? Number(ox().Search(src, 'count', getCfg().kitItem)) > 0 : p.kit);

/** Prüft Fahrzeug (Netzwerk-ID), konfigurierten Punkt und Abstand des Spielers. */
function checkPoint(src: number, netId: unknown, which: 'sample' | 'storage', maxDist: number): { ent: number; world: Pt; off: Pt; model: number } | string {
  const ent = NetworkGetEntityFromNetworkId(Number(netId)); if (!ent || !DoesEntityExist(ent)) return 'Fahrzeug nicht gefunden.';
  const model = GetEntityModel(ent) >>> 0; const pts = getCfg().points.get(model);
  if (!pts) return 'Kein Probenentnahmepunkt für dieses Fahrzeug konfiguriert.';
  const off = pts[which]; const world = worldPoint(ent, off);
  if (dist(posOf(src), world) > maxDist + 1.0) return which === 'storage' ? 'Du befindest dich nicht am vorgesehenen Probenablagepunkt.' : 'Du befindest dich nicht am Probenentnahmepunkt.';
  return { ent, world, off, model };
}
const carryingOf = (p: P) => list('samples', "WHERE collected_license = ? AND status IN ('COLLECTED','TRANSPORT') ORDER BY ts DESC LIMIT 1", [p.license])[0] ?? null;
const safeName = (src: number, given?: unknown) => { const g = String(given ?? '').trim().slice(0, 60); return g.length >= 2 ? g : (GetPlayerName(src) ?? `Spieler ${src}`); };

export function registerSampleEvents() {
  on('cbrn:sampleConfig', (c: any) => { try { setCfg(c); } catch (e) { console.error('[cbrn] Konfiguration ungültig', e); } });
  emit('cbrn:cfg:request'); // Konfiguration von bridge.lua anfordern
  setTimeout(() => emit('cbrn:cfg:request'), 3000);

  onNet('cbrn:sample:takeKit', (netId: number) => {
    const src = source, p = pl(src), c = getCfg();
    if (!jobOk(src)) return fail(src, 'kit', 'Du hast keine Berechtigung für die Probenentnahme.');
    if (GetVehiclePedIsIn(GetPlayerPed(src), false) !== 0) return fail(src, 'kit', 'Steige zuerst aus dem Fahrzeug aus.');
    const chk = checkPoint(src, netId, 'sample', c.interactDistance); if (typeof chk === 'string') return fail(src, 'kit', chk);
    if (hasKit(src, p)) return fail(src, 'kit', 'Du hast bereits ein Probenentnahmeset.');
    if (inv()) { if (!ox().AddItem(src, c.kitItem, 1)) return fail(src, 'kit', 'Dein Inventar ist voll.'); } else p.kit = true;
    res(src, 'kit', true, { kit: true, msg: 'Du hast ein Probenentnahmeset genommen.' });
  });

  onNet('cbrn:sample:returnKit', () => {
    const src = source, p = pl(src), c = getCfg();
    if (carryingOf(p) || p.active) return fail(src, 'kit', 'Lege zuerst die entnommene Probe ab.');
    if (inv()) ox().RemoveItem(src, c.kitItem, 1); p.kit = false;
    res(src, 'kit', true, { kit: false, msg: 'Probenentnahmeset zurückgegeben.' });
  });

  onNet('cbrn:sample:startCollection', (netId: number, confirmedNoIncident: boolean, byName?: string) => {
    const src = source, p = pl(src), c = getCfg();
    if (!jobOk(src)) return fail(src, 'start', 'Du hast keine Berechtigung für die Probenentnahme.');
    if (!hasKit(src, p)) return fail(src, 'start', 'Du hast kein Probenentnahmeset.');
    if (p.active) return fail(src, 'start', 'Es läuft bereits eine Probenentnahme.');
    if (carryingOf(p)) return fail(src, 'start', 'Du trägst bereits eine Probe – lege sie zuerst am Fahrzeug ab.');
    if (GetVehiclePedIsIn(GetPlayerPed(src), false) !== 0) return fail(src, 'start', 'Steige zuerst aus dem Fahrzeug aus.');
    const chk = checkPoint(src, netId, 'sample', c.interactDistance); if (typeof chk === 'string') return fail(src, 'start', chk);
    const noInc = !activeIncident();
    if (noInc && !c.allowWithoutIncident) return fail(src, 'start', 'Keine aktive Einsatznummer – bitte zuerst am Bordcomputer einen Einsatz anlegen.');
    if (noInc && !confirmedNoIncident) return res(src, 'start', true, { needConfirm: true });
    p.active = { token: randomBytes(12).toString('hex'), start: Date.now(), net: Number(netId), dur: c.collectionDuration, noIncident: noInc, by: safeName(src, byName) };
    res(src, 'start', true, { token: p.active.token, duration: c.collectionDuration });
  });

  onNet('cbrn:sample:cancelCollection', () => { const p = players.get(source); if (p) delete p.active; });

  onNet('cbrn:sample:create', (token: string, sourceText: string, type: string, description: string) => {
    const src = source, p = pl(src), c = getCfg(), a = p.active;
    if (!a || a.token !== token) return fail(src, 'create', 'Keine laufende Probenentnahme.');
    if (Date.now() - a.start < a.dur * 0.85) { delete p.active; return fail(src, 'create', 'Die Probenentnahme war noch nicht abgeschlossen.'); }
    if (Date.now() - a.start > 10 * 60 * 1000) { delete p.active; return fail(src, 'create', 'Die Probenentnahme ist abgelaufen.'); }
    const chk = checkPoint(src, a.net, 'sample', c.interactDistance + 1.0); if (typeof chk === 'string') { delete p.active; return fail(src, 'create', chk); }
    if (!SAMPLE_TYPES[type]) return fail(src, 'create', 'Ungültige Probenart.');
    const where = posOf(src); const vehicleId = resolveVehicleId(where.x, where.y);
    if (!vehicleId) { delete p.active; return fail(src, 'create', 'Kein angemeldetes CBRN-Fahrzeug in der Nähe – bitte am Bordcomputer anmelden.'); }
    let sample;
    try { sample = createSample({ source: sourceText, type, description, by: a.by, license: p.license, pos: where, vehicleId, model: String(chk.model), offset: chk.off, vehicleNetId: a.net }); }
    catch (e: any) { return fail(src, 'create', e.message); }
    delete p.active;
    if (inv()) { try { ox().AddItem(src, c.containerItem, 1, { sample_id: sample.id, type: c.containerType }); } catch { /* Container ist rein optional */ } }
    res(src, 'create', true, { sample: { id: sample.id } });
  });

  onNet('cbrn:sample:label', (id: string, label: string, info: string) => {
    const src = source, p = pl(src), cur = carryingOf(p);
    if (!cur || cur.id !== id) return fail(src, 'label', 'Diese Probe gehört dir nicht oder wurde bereits eingelagert.');
    try { const s = labelSample(id, label, info, cur.collected_by); res(src, 'label', true, { sample: { id: s.id, label: s.label } }); }
    catch (e: any) { fail(src, 'label', e.message); }
  });

  onNet('cbrn:sample:return', (netId: number) => {
    const src = source, p = pl(src), c = getCfg(), cur = carryingOf(p);
    if (!cur) return fail(src, 'return', 'Du trägst keine Probe.');
    if (cur.status !== 'TRANSPORT') return fail(src, 'return', 'Die Probe muss zuerst beschriftet werden.');
    const chk = checkPoint(src, netId, 'storage', c.returnDistance); if (typeof chk === 'string') return fail(src, 'return', chk);
    const w = posOf(src); const rv = resolveVehicleId(chk.world.x, chk.world.y);
    if (rv && rv !== cur.vehicle_id) return fail(src, 'return', 'Diese Probe gehört zu einem anderen CBRN-Fahrzeug.');
    try { const s = storeSample(cur.id, cur.collected_by); void w;
      if (inv()) { try { ox().RemoveItem(src, c.containerItem, 1, { sample_id: s.id }); } catch { /* optional */ } }
      res(src, 'return', true, { sample: { id: s.id } }); }
    catch (e: any) { fail(src, 'return', e.message); }
  });

  // Zustand nach Verbindungsaufbau / Reconnect: Set (Inventar oder intern) und noch getragene Probe wiederherstellen
  onNet('cbrn:sample:sync', () => {
    const src = source, p = pl(src), cur = carryingOf(p);
    res(src, 'sync', true, { kit: hasKit(src, p), carrying: cur ? { id: cur.id, label: cur.label, labeled: cur.status === 'TRANSPORT' } : null });
  });

  // Spec-Events zum Abfragen (Computer nutzt die API; diese liefern dasselbe für Skripte/Debug)
  onNet('cbrn:sample:get', (id: string) => { const s = publicSample(String(id), false); emitNet('cbrn:sample:data', source, s); });
  onNet('cbrn:sample:getAll', () => emitNet('cbrn:sample:data', source, list('samples', "WHERE collected_license = ? ORDER BY ts DESC LIMIT 50", [pl(source).license]).map((s: any) => publicSample(s.id, false))));
  onNet('cbrn:sample:debug', () => { const src = source; const p = pl(src); res(src, 'debug', true, { state: { kit: hasKit(src, p), active: p.active ? { net: p.active.net, dur: p.active.dur } : null, carrying: carryingOf(p)?.id ?? null, inventory: inv(), points: [...getCfg().points.keys()], requireJob: !!getCfg().requireJob } }); });

  on('playerDropped', () => { players.delete(source); }); // getragene Proben bleiben in der Datenbank (Status TRANSPORT) und kommen per sync zurück
}
