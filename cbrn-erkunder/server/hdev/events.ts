// FiveM-Server-Events der Handmessgeräte. Serverautoritativ: Der Client fordert nur an (Entnehmen, Zurücklegen, Tasten) – Zustand, Messwerte,
// Speichern und Alarme entstehen ausschließlich im Service (service.ts). Position/Spieler kommen aus den Server-Natives, nicht vom Client.
import { checkPoint, getCfg, posOf, licenseOfPlayer } from '../sampleEvents.js';
import { resolveVehicleId } from '../samples.js';
import { list, get } from '../db.js';
import { DEVICES } from './defs.js';
import { HCFG, action, defsFor, giveBack, heldBy, inventory, providers, publicInventory, publicState, releaseAll, setForceError, startService, take, allInst, type Player } from './service.js';
import { addSource, clearSources, sourceDefaults, countSources, envAt } from './env.js';
import { truthOf } from './engine.js';

const cfx = (): any => (globalThis as any).exports;
const isAdmin = (src: number) => { try { return !!cfx()[GetCurrentResourceName()].isAdmin(src); } catch { return false; } };
const player = (src: number): Player => ({ src, license: licenseOfPlayer(src), name: GetPlayerName(src) ?? `Spieler ${src}` });
const res = (src: number, ev: string, ok: boolean, extra: Record<string, unknown> = {}) => emitNet('cbrn:dev:res', src, { ev, ok, ...extra });
const fail = (src: number, ev: string, msg: string) => res(src, ev, false, { msg });
const alive = (src: number) => { try { const ped = GetPlayerPed(src); return !!ped && DoesEntityExist(ped) && GetEntityHealth(ped) > 100; } catch { return false; } };
const vkey = (netId: number) => `net:${netId}`;

export function registerDeviceEvents() {
  providers.pos = (src) => { try { return posOf(src); } catch { return null; } };
  providers.vehicleAt = (p) => resolveVehicleId(p.x, p.y);
  providers.alive = alive;
  providers.notify = (src, s) => emitNet('cbrn:dev:state', src, s);
  const apply = (c: any) => { const d = c?.devices; if (!d) return; HCFG.maxEquipped = Math.max(1, d.maxEquipped | 0 || 1); HCFG.batteryScale = Number(d.batteryScale) || 1; };
  on('cbrn:sampleConfig', apply); apply(getCfg());
  startService();

  /** Fahrzeug + Messgerätefach prüfen; liefert Inventarschlüssel. */
  const dock = (src: number, netId: unknown) => {
    if (GetVehiclePedIsIn(GetPlayerPed(src), false) !== 0) return 'Steige zuerst aus dem Fahrzeug aus.';
    const chk = checkPoint(src, netId, 'device', getCfg().interactDistance); if (typeof chk === 'string') return chk;
    const ent = chk.ent; const [x, y] = GetEntityCoords(ent);
    return { key: vkey(Number(netId)), vehicleId: resolveVehicleId(x, y), netId: Number(netId) };
  };

  onNet('cbrn:dev:inventory', (netId: number) => {
    const src = source; const d = dock(src, netId); if (typeof d === 'string') return fail(src, 'inventory', d);
    emitNet('cbrn:dev:inv', src, { devices: publicInventory(d.key, d.vehicleId, d.netId, src), held: heldBy(src).length, max: HCFG.maxEquipped });
  });
  onNet('cbrn:dev:take', (netId: number, type: string) => {
    const src = source; const d = dock(src, netId); if (typeof d === 'string') return fail(src, 'take', d);
    if (!alive(src)) return fail(src, 'take', 'Nicht möglich.');
    try { const i = take(player(src), d.key, d.vehicleId, d.netId, String(type)); res(src, 'take', true, { def: defsFor(i.type), state: publicState(i), msg: `${DEVICES[i.type].label} entnommen.` }); }
    catch (e: any) { fail(src, 'take', e.message); }
  });
  onNet('cbrn:dev:return', (netId: number) => {
    const src = source; const d = dock(src, netId); if (typeof d === 'string') return fail(src, 'return', 'Das Messgerät kann nur am Messgerätefach zurückgelegt werden.');
    try { const i = giveBack(player(src), d.key, d.netId); res(src, 'return', true, { msg: `${DEVICES[i.type].label} zurückgelegt.` }); } catch (e: any) { fail(src, 'return', e.message); }
  });
  /** Tasten/Menüaktionen der Geräte-UI – nur erlaubte Aktionen, alles wird im Service geprüft. */
  onNet('cbrn:dev:action', (act: string, payload: any) => {
    const src = source; if (typeof act !== 'string') return;
    try { const r = action(src, act, payload && typeof payload === 'object' ? payload : {}); if (act === 'save') res(src, 'save', true, { id: (r as any)?.id, msg: `Messung gespeichert (${(r as any)?.id}).` }); }
    catch (e: any) { res(src, 'action', false, { msg: e.message, act }); }
  });
  onNet('cbrn:dev:sync', () => { const src = source; const i = heldBy(src)[0]; if (i) res(src, 'take', true, { def: defsFor(i.type), state: publicState(i), resume: true }); });
  onNet('cbrn:dev:samples', () => { const src = source; const lic = licenseOfPlayer(src); emitNet('cbrn:dev:sampleList', src, list('samples', 'WHERE collected_license = ? ORDER BY ts DESC LIMIT 8', [lic]).map((s: any) => ({ id: s.id, label: s.label ?? 'unbeschriftet' }))); });
  onNet('cbrn:dev:forceReturn', () => { const src = source; if (!alive(src)) releaseAll(src, 'dead'); else if (getCfg() && (globalThis as any).__cbrnForceVeh !== false && GetVehiclePedIsIn(GetPlayerPed(src), false) !== 0) releaseAll(src, 'vehicle'); });
  on('playerDropped', () => releaseAll(source, 'disconnect'));

  // ---- Admin / Entwickler ------------------------------------------------------------------------------
  onNet('cbrn:source:options', () => { const src = source; if (!isAdmin(src)) return; emitNet('cbrn:source:options', src, { defaults: sourceDefaults, substances: list('substances', "WHERE cbrn_category = 'C' ORDER BY name").map((s: any) => ({ id: s.id, name: s.name })), nuclides: list('radionuclides', 'ORDER BY name').map((s: any) => ({ id: s.id, name: s.name })), count: countSources() }); });
  onNet('cbrn:source:create', (b: any) => {
    const src = source; if (!isAdmin(src)) return res(src, 'source', false, { msg: 'Keine Berechtigung.' });
    try { const p = posOf(src); const r = addSource(GetPlayerName(src) ?? 'admin', { type: b?.type, x: p.x, y: p.y, z: p.z - 1.0, intensity: b?.intensity, radius: b?.radius, substance_id: b?.substance_id, note: b?.note }); res(src, 'source', true, { msg: `${r.id} (${r.type}) erstellt – Intensität ${r.intensity}, Radius ${r.radius} m.` }); }
    catch (e: any) { res(src, 'source', false, { msg: e.message }); }
  });
  onNet('cbrn:source:clear', () => { const src = source; if (!isAdmin(src)) return; res(src, 'source', true, { msg: `${clearSources(GetPlayerName(src) ?? 'admin')} Messquelle(n) entfernt.` }); });
  onNet('cbrn:dev:debug', (what: string) => {
    const src = source; if (!isAdmin(src)) return res(src, 'debug', false, { msg: 'Keine Berechtigung.' });
    if (what === 'error') return res(src, 'debug', setForceError(src), { msg: 'Nächster Selbsttest schlägt fehl.' });
    const i = heldBy(src)[0]; const p = posOf(src);
    const lines = what === 'measurement' ? list('measurements', "WHERE source = 'HANDHELD' ORDER BY seq DESC LIMIT 5").map((m: any) => `${m.id} ${m.device} ${m.value} ${m.unit} ${m.status} (${m.player ?? '?'})`)
      : i ? (() => { const d = DEVICES[i.type]; const e = envAt(p); const t = truthOf(d, i.mode, e); return [`DEVICE: ${i.type}`, `STATE: ${publicState(i).state}`, `VALUE: ${i.shown.toFixed(4)} (wahr ${t.value.toFixed(4)})`, `UNIT: ${t.unit}`, `SOURCE: ${e.nearest?.id ?? '-'}`, `DISTANCE: ${e.nearest ? e.nearest.d.toFixed(2) + ' m' : '-'}`, `BATTERY: ${i.battery.toFixed(1)}`]; })() : ['Kein Gerät in der Hand.', `Quellen aktiv: ${countSources()}`, `Geräte gesamt: ${allInst().length}`];
    console.log(`^3[cbrn:debug ${what}]^7 ${lines.join(' | ')}`); res(src, 'debug', true, { lines });
  });
  void inventory; void get;
}
