export const num = (n: number | null | undefined, d = 1) => (n == null || Number.isNaN(n) ? '–' : n.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d }));
export const time = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString('de-DE') : '–');
export const dt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'medium' }) : '–');
export const coord = (n?: number | null) => (n == null ? '–' : n.toFixed(5));
export const NA = 'NICHT VERFÜGBAR';
export const orNA = (v: unknown) => (v == null || v === '' ? NA : String(v));
export const CAT: Record<string, { label: string; short: string; color: string }> = {
  C: { label: 'CHEMISCH', short: 'C', color: '#d9a21b' }, B: { label: 'BIOLOGISCH', short: 'B', color: '#4fa86b' },
  R: { label: 'RADIOLOGISCH', short: 'R', color: '#d6742a' }, N: { label: 'NUKLEAR', short: 'N', color: '#c9503f' },
  U: { label: 'UNBEKANNT', short: '?', color: '#8896a6' }, UNKNOWN: { label: 'UNBEKANNT', short: '?', color: '#8896a6' },
};
export const LEVELS: Record<string, string> = { hinweis: 'HINWEIS', verdacht: 'VERDACHT', moegliche_identifikation: 'MÖGLICHE IDENTIFIKATION', bestaetigt: 'BESTÄTIGTE IDENTIFIKATION' };
export const DATA_SRC: Record<string, string> = { REAL: 'REAL DATA', SIMULATED: 'SIMULATED DATA', MANUAL: 'MANUAL ENTRY', DATABASE: 'DATABASE REFERENCE' };
export const STATUS_COLOR = (s?: string | null) => {
  const t = (s ?? '').toUpperCase();
  if (/ALARM|HOCH|OFFLINE|OFFEN|ABGEBROCHEN/.test(t)) return '#d0503f';
  if (/ERHÖHT|AUSWERTUNG|VERDACHT|ÜBERMITTELT|NACHBESTELLEN|HINWEIS/.test(t)) return '#d9a21b';
  if (/ONLINE|OK|NORMAL|AKTIV|VERFÜGBAR|EINSATZBEREIT|ABGESCHLOSSEN|FIX|VERIFIZIERT|BEFUND|CONNECTED/.test(t) && !/NOT/.test(t)) return '#4fa86b';
  return '#8896a6';
};
export const ROLE_LABEL: Record<string, string> = { erkunder: 'Erkunder', truppfuehrer: 'Truppführer', messleitung: 'Messleitung', admin: 'Administrator' };
export const ROLE_LVL: Record<string, number> = { erkunder: 1, truppfuehrer: 2, messleitung: 3, admin: 4 };

// Positionsanzeige: GTA-5-Modus zeigt Spielkoordinaten (X/Y in Metern), sonst Breite/Länge.
export const fmtPos = (mode: string | undefined, lat?: number | null, lon?: number | null) =>
  lat == null || lon == null ? '–' : mode === 'gta5' ? `X ${Math.round(lon * 111320)} / Y ${Math.round(lat * 111320)}` : `${lat.toFixed(5)} / ${lon.toFixed(5)}`;
