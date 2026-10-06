// ---------------------------------------------------------------------------------------------
// Atemschutzüberwachung: 4 Atemschutzgeräte je Fahrzeug (Fahrer, Beifahrer, 2× hinten). Anlegen/Ablegen am Computer.
// Werte: 300 bar Fülldruck, Vorrat reicht bei Belastung je Flasche 10–15 min.
// ---------------------------------------------------------------------------------------------
import { get, audit } from './db.js';
import { emit, createAlarm } from './sim.js';

export const AGS_SLOTS = ['Fahrer', 'Beifahrer', 'Hinten links', 'Hinten rechts'];
export const AGS_FULL = 300, AGS_WARN = 100, AGS_WHISTLE = 55;
interface Dev { bar: number; wearer: string | null; since: string | null; total_s: number; warned: number }
const devs: Record<string, Dev[]> = {};
const newTotal = () => 600 + Math.round(Math.random() * 300);
const mk = (): Dev => ({ bar: AGS_FULL, wearer: null, since: null, total_s: newTotal(), warned: 0 });
const of = (vid: string) => (devs[vid] ??= AGS_SLOTS.map(mk));
const err = (m: string, code = 409) => Object.assign(new Error(m), { statusCode: code });

export function agsList(vid: string) {
  return of(vid).map((d, i) => {
    const rate = AGS_FULL / d.total_s, worn = !!d.wearer;
    const status = d.bar <= 0 ? 'LEER' : d.bar <= AGS_WHISTLE ? 'PFEIFE' : d.bar <= AGS_WARN ? 'WARNUNG' : worn ? 'ANGELEGT' : 'BEREIT';
    return { slot: i + 1, label: AGS_SLOTS[i], bar: Math.max(0, +d.bar.toFixed(1)), wearer: d.wearer, worn, since: d.since, status,
      rate_bar_s: worn ? +rate.toFixed(4) : 0, whistle_s: Math.max(0, Math.round((d.bar - AGS_WHISTLE) / rate)), empty_s: Math.max(0, Math.round(d.bar / rate)) };
  });
}
const push = (vid: string) => emit('ags.changed', { vehicle_id: vid, devices: agsList(vid) });
const dev = (vid: string, slot: number) => { const d = of(vid)[slot - 1]; if (!d) throw err('Atemschutzgerät unbekannt', 404); return d; };

export function agsDon(vid: string, slot: number, by: string) {
  const d = dev(vid, slot); if (d.wearer) throw err(`Gerät ist bereits von ${d.wearer} angelegt`);
  if (of(vid).some((x) => x.wearer === by)) throw err('Du trägst bereits ein Atemschutzgerät – bitte erst ablegen');
  if (d.bar <= 0) throw err('Flasche ist leer – bitte Flasche wechseln');
  d.wearer = by; d.since = new Date().toISOString(); audit(by, 'don', 'ags', `${vid}#${slot}`, { bar: d.bar }); push(vid); return agsList(vid);
}
export function agsDoff(vid: string, slot: number, by: string) {
  const d = dev(vid, slot); if (!d.wearer) throw err('Gerät ist nicht angelegt');
  audit(by, 'doff', 'ags', `${vid}#${slot}`, { bar: +d.bar.toFixed(0), wearer: d.wearer }); d.wearer = null; d.since = null; push(vid); return agsList(vid);
}
export function agsRefill(vid: string, slot: number, by: string) {
  const d = dev(vid, slot); if (d.wearer) throw err('Gerät ist angelegt – erst ablegen');
  Object.assign(d, mk()); audit(by, 'refill', 'ags', `${vid}#${slot}`); push(vid); return agsList(vid);
}
export function resetAgs() { for (const k of Object.keys(devs)) delete devs[k]; }

/** Druckabbau der getragenen Geräte (alle 2 s aus dem Systemtakt); Warnungen bei 100 bar, Pfeife (55 bar), leer. */
export function tickAgs(dt: number, n: number) {
  for (const [vid, list] of Object.entries(devs)) {
    let any = false;
    list.forEach((d, i) => {
      if (!d.wearer || d.bar <= 0) return; any = true;
      d.bar = Math.max(0, d.bar - (AGS_FULL / d.total_s) * dt);
      const lvl = d.bar <= 0 ? 3 : d.bar <= AGS_WHISTLE ? 2 : d.bar <= AGS_WARN ? 1 : 0;
      if (lvl > d.warned) {
        d.warned = lvl; const v = get('vehicles', vid);
        const txt = lvl === 1 ? `Atemschutz ${AGS_SLOTS[i]} (${d.wearer}): Restdruck unter ${AGS_WARN} bar` : lvl === 2 ? `Atemschutz ${AGS_SLOTS[i]} (${d.wearer}): Pfeife – Restdruck ${AGS_WHISTLE} bar, sofort Rückzug!` : `Atemschutz ${AGS_SLOTS[i]} (${d.wearer}): Flasche leer`;
        if (v) createAlarm({ source: 'AGS', category: 'ATEMSCHUTZ', description: txt, lat: v.lat, lon: v.lon, vehicle_id: vid }, `${vid}-ags-${i}-${lvl}`);
        push(vid);
      }
    });
    if (any && n % 5 === 0) push(vid); // gelegentliche Synchronisation; dazwischen rechnet die Anzeige selbst weiter
  }
}
