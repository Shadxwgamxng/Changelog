export interface DevInfo { on: boolean; elapsed_ms: number; warm_ms: number }
export type DevCalc = { state: 'off' | 'warmup' | 'ready'; progress: number; remain: number; on: boolean };
/** Zustand eines Geräts aus den Serverdaten. `at` = Empfangszeit der Daten (Uhrabweichung zwischen Spieler und Server spielt so keine Rolle). */
export function devCalc(devices: any, key: string, now = Date.now()): DevCalc {
  const d: DevInfo | undefined = devices?.[key]; if (!d?.on) return { state: 'off', progress: 0, remain: 0, on: false };
  const el = d.elapsed_ms + (now - (devices._at ?? now)); const p = Math.min(1, el / d.warm_ms);
  return p >= 1 ? { state: 'ready', progress: 1, remain: 0, on: true } : { state: 'warmup', progress: p, remain: Math.ceil((d.warm_ms - el) / 1000), on: true };
}
export const DEVICE_KEYS = ['pid', 'ims', 'mgmg', 'dlm', 'como', 'fmg'];
