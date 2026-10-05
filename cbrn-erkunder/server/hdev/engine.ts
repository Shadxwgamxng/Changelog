// ---------------------------------------------------------------------------------------------
// Mess-Engine: macht aus dem wahren Umgebungszustand (env.ts) den ANGEZEIGTEN Messwert eines Geräts:
// Ansprechverhalten (Zeitkonstante), Messrauschen (sinkt mit Messdauer), Messbereich/Überlauf, Auflösung, Stabilitätskriterium, Schwellenstatus.
// Reine Rechenlogik ohne FiveM/Datenbank/UI – austauschbar je Gerät (registerEngine).
// ---------------------------------------------------------------------------------------------
import { DEVICES, ENGINES, registerEngine, type DevDef, type Alert, type Thr } from './defs.js';
import type { Env } from './env.js';

const gauss = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 0.58;
export interface Truth { value: number; unit: string; channels?: Record<string, number>; aux?: Record<string, any> }

// Ziel-Messgröße (wahrer Wert) je Engine und Modus
registerEngine('dose', ({ env }: { env: Env }) => ({ value: env.dose, unit: 'µSv/h' }));
registerEngine('contam', ({ env, mode }: { env: Env; mode: string }) => ({ value: mode === 'ALPHA' ? env.alphaCps : env.cps, unit: 'cps' }));
registerEngine('voc', ({ env }: { env: Env }) => ({ value: env.voc, unit: 'ppm' }));
registerEngine('ims', ({ env }: { env: Env }) => { const m = Math.max(env.ims.G, env.ims.H, env.ims.T); return { value: m, unit: 'Balken', channels: { G: env.ims.G, H: env.ims.H, T: env.ims.T }, aux: { code: env.ims.code, substance_id: env.ims.substance_id, group: env.ims.group } }; });
registerEngine('gas', ({ env }: { env: Env }) => ({ value: 0, unit: '', channels: { iBut: env.gases.iBut, CO2: env.gases.CO2, CH4: env.gases.CH4, O2: env.gases.O2, H2S: env.gases.H2S, CO: env.gases.CO, SO2: env.gases.SO2 } }));

export const truthOf = (def: DevDef, mode: string, env: Env): Truth => ENGINES[def.engine]({ env, mode, def });

/** Messrauschen (Standardabweichung) abhängig von Wert und bereits verstrichener Messzeit – längere Messung = ruhigerer Wert. */
export function noiseSigma(def: DevDef, value: number, tInt: number) {
  const n = def.noise; const t = Math.max(1, tInt);
  // Zählende Detektoren: Poisson-Statistik (σ ~ √(Wert/Zeit)); sonst relatives Rauschen ~ 1/√Zeit
  if (n.counting) return Math.sqrt(Math.max(value, 0) * n.rel / t) + n.abs / Math.sqrt(t);
  return n.abs / Math.sqrt(t) + Math.abs(value) * n.rel / Math.sqrt(t);
}
/** Ein Rechenschritt des Ansprechverhaltens: Wert folgt dem Ziel mit Zeitkonstante tau (1. Ordnung). */
export const follow = (cur: number, target: number, dt: number, tau: number) => cur + (target - cur) * (1 - Math.exp(-dt / Math.max(0.05, tau)));
export const sample = (def: DevDef, value: number, tInt: number) => Math.max(0, value + gauss() * noiseSigma(def, value, tInt));

export const decimalsFor = (def: DevDef, v: number) => { for (const [lim, dec] of def.resolution.decimals) if (Math.abs(v) < lim) return dec; return 0; };
export const roundTo = (def: DevDef, v: number) => { const d = decimalsFor(def, v); return +v.toFixed(d); };

export function judge(v: number, t: Thr | undefined): Alert {
  if (!t) return 'NORMAL';
  if ((t.alarm != null && v >= t.alarm) || (t.lowAlarm != null && v <= t.lowAlarm)) return 'ALARM';
  if ((t.warning != null && v >= t.warning) || (t.lowWarning != null && v <= t.lowWarning)) return 'WARNUNG';
  if (t.attention != null && v >= t.attention) return 'AUFFÄLLIG';
  return 'NORMAL';
}
const RANK: Record<Alert, number> = { NORMAL: 0, 'AUFFÄLLIG': 1, WARNUNG: 2, ALARM: 3 };
export const worst = (a: Alert, b: Alert) => (RANK[b] > RANK[a] ? b : a);

/** Status des gesamten Geräts (Modus-Schwelle oder schlechtester Kanal). */
export function alertOf(def: DevDef, mode: string, value: number, channels?: Record<string, number>): { alert: Alert; channel: string | null } {
  if (def.channels && channels) { let a: Alert = 'NORMAL', ch: string | null = null; for (const c of def.channels) { const j = judge(channels[c.id] ?? 0, c.thr); if (RANK[j] > RANK[a]) { a = j; ch = c.id; } } return { alert: a, channel: ch }; }
  return { alert: judge(value, def.thresholds[mode]), channel: null };
}
export const getDef = (id: string) => DEVICES[id];
