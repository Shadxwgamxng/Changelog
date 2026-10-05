import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, cfg, getToken, setToken } from './api';

export interface HistPoint { t: number; pid: number; dose: number; speed: number }
export interface Session { vehicle_id: string; vehicle_name: string; name: string; funktion: string }
interface Ctx {
  meta: any; status: any; vehicles: any[]; live: Record<string, any>; weather: any; trackKm: number; mpCount: number;
  wsUp: boolean; rev: Record<string, number>; hist: HistPoint[]; session: Session | null; own: string; ownVehicle: any;
  incident: any | null; incidentLoaded: boolean; login: (vehicle_id: string, name: string, funktion: string) => Promise<void>; logout: () => Promise<void>;
  /** Nach der Anmeldung voller Zugriff. */ can: (lvl?: number) => boolean; toasts: any[]; dismissToast: (i: number) => void; ready: boolean;
}
const C = createContext<Ctx>(null as any);
export const useLive = () => useContext(C);

export function useApi<T = any>(path: string | null, on: string[] = [], extra: unknown[] = []) {
  const { rev } = useLive();
  const [data, setData] = useState<T | null>(null); const [error, setError] = useState<string | null>(null);
  const tick = on.reduce((a, k) => a + (rev[k] ?? 0), 0);
  const [manual, setManual] = useState(0);
  useEffect(() => {
    if (!path) return; let dead = false;
    api<T>(path).then((d) => { if (!dead) { setData(d); setError(null); } }).catch((e) => !dead && setError(e.message));
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, tick, manual, ...extra]);
  return { data, error, reload: () => setManual((m) => m + 1) };
}

export function LiveProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<any>(null); const [status, setStatus] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]); const [live, setLive] = useState<Record<string, any>>({});
  const [weather, setWeather] = useState<any>(null);
  const [wsUp, setWsUp] = useState(false); const [rev, setRev] = useState<Record<string, number>>({}); const [hist, setHist] = useState<HistPoint[]>([]);
  const [incident, setIncident] = useState<any | null>(null); const [incidentLoaded, setIncidentLoaded] = useState(false); const [session, setSession] = useState<Session | null>(null); const [ready, setReady] = useState(false); const [toasts, setToasts] = useState<any[]>([]);
  const own = session?.vehicle_id ?? '';
  const ownRef = useRef(own); ownRef.current = own;

  // Öffentliche Metadaten + vorhandene Anmeldung prüfen
  useEffect(() => {
    api('/meta').then(setMeta).catch(() => {});
    const tok = getToken();
    if (!tok) { setReady(true); return; }
    api('/auth/me').then((s) => setSession({ vehicle_id: s.vehicle_id, vehicle_name: s.vehicle_name, name: s.name, funktion: s.funktion })).catch(() => setToken(null)).finally(() => setReady(true));
  }, []);
  useEffect(() => { const f = () => { setToken(null); setSession(null); }; window.addEventListener('cbrn-auth-lost', f); return () => window.removeEventListener('cbrn-auth-lost', f); }, []);

  const applyLive = useCallback((d: any) => { setLive((p) => ({ ...p, ...d.vehicles })); setWeather(d.weather); setStatus((s: any) => ({ ...s, ...d.status })); }, []);
  const loadAll = useCallback(() => { api('/system/status').then(setStatus).catch(() => {}); api('/vehicles').then(setVehicles).catch(() => {}); api('/live').then(applyLive).catch(() => {}); api('/incident').then((i) => { setIncident(i ?? null); setIncidentLoaded(true); }).catch(() => setIncidentLoaded(true)); }, [applyLive]);
  useEffect(() => { if (session) { setHist([]); loadAll(); } }, [session, loadAll]);

  // Heartbeat: hält die Besatzungsliste aktuell
  useEffect(() => { if (!session) return; const t = setInterval(() => { api('/auth/me').catch(() => {}); }, 30000); return () => clearInterval(t); }, [session]);

  // In FiveM-NUI eingebettet: dem Spiel mitteilen, welches Fahrzeug übernommen werden soll
  useEffect(() => { if (window.parent !== window) window.parent.postMessage({ type: 'cbrn-vehicle', vehicle: session?.vehicle_id ?? null }, '*'); }, [session]);

  const wsRef = useRef<WebSocket | null>(null);
  useEffect(() => {
    if (!session) return;
    let stop = false; let retry: any;
    const open = () => {
      const c = cfg(); const base = c.wsUrl || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
      let ws: WebSocket; try { ws = new WebSocket(`${base}?token=${encodeURIComponent(getToken() ?? '')}`); } catch { retry = setTimeout(open, 3000); return; }
      wsRef.current = ws;
      ws.onopen = () => setWsUp(true);
      ws.onclose = () => { setWsUp(false); if (!stop) retry = setTimeout(open, 3000); };
      ws.onerror = () => ws.close();
      ws.onmessage = (m) => {
        const e = JSON.parse(m.data);
        switch (e.type) {
          case 'hello': case 'system.status': setStatus((s: any) => ({ ...s, ...e.payload })); break;
          case 'reading.live': {
            const p = e.payload; setLive((l) => ({ ...l, [p.vehicle_id]: p }));
            if (p.vehicle_id === ownRef.current) setHist((h) => [...h.slice(-179), { t: Date.parse(e.ts), pid: p.pid.value, dose: p.dose.value, speed: p.speed_kmh }]);
            break;
          }
          case 'vehicle.position': case 'vehicle.status': setVehicles((vs) => vs.map((v) => (v.id === e.payload.id ? e.payload : v))); break;
          case 'incident.changed': setIncident(e.payload ?? null); setRev((r) => ({ ...r, [e.type]: (r[e.type] ?? 0) + 1 })); break;
          case 'weather.updated': setWeather(e.payload); break;
          case 'alarm.created': setToasts((t) => [...t.slice(-3), e.payload]); setTimeout(() => setToasts((t) => t.slice(1)), 9000); setRev((r) => ({ ...r, [e.type]: (r[e.type] ?? 0) + 1 })); break;
          default: setRev((r) => ({ ...r, [e.type]: (r[e.type] ?? 0) + 1 }));
        }
      };
    };
    open();
    return () => { stop = true; clearTimeout(retry); wsRef.current?.close(); };
  }, [session]);
  // Fallback ohne WebSocket (z. B. NUI ohne WS-Zugriff): Polling
  useEffect(() => {
    if (wsUp || !session) return; const t = setInterval(() => { api('/live').then(applyLive).catch(() => {}); api('/vehicles').then(setVehicles).catch(() => {}); api('/incident').then((i) => { setIncident(i ?? null); setIncidentLoaded(true); }).catch(() => setIncidentLoaded(true)); setRev((r) => ({ ...r, poll: (r.poll ?? 0) + 1, 'measurement.created': (r['measurement.created'] ?? 0) + 1 })); }, 3000);
    return () => clearInterval(t);
  }, [wsUp, session, applyLive]);

  const login = useCallback(async (vehicle_id: string, name: string, funktion: string) => {
    const r = await api('/auth/login', { method: 'POST', body: { vehicle_id, name, funktion } });
    setToken(r.token); setSession(r.session);
  }, []);
  const logout = useCallback(async () => { try { await api('/auth/logout', { method: 'POST' }); } catch { /* ignore */ } setToken(null); setSession(null); setLive({}); setHist([]); setIncident(null); setIncidentLoaded(false); }, []);

  const ownLive = live[own];
  const ownVehicle = vehicles.find((v) => v.id === own);
  const ownConnected = !!status?.vehicles?.[own]?.connected;
  const value: Ctx = {
    meta, vehicles, live, weather, incident, incidentLoaded, wsUp, rev, hist, session, own, ownVehicle, login, logout, ready,
    status: status && { ...status, websocket: wsUp ? 'ONLINE' : 'OFFLINE', fivem: ownConnected ? 'CONNECTED' : 'NOT CONNECTED', fivem_info: status.vehicles?.[own]?.info ?? null, fivem_any: status.fivem },
    trackKm: ownLive?.track_km ?? 0, mpCount: ownLive?.mp_count ?? 0, can: () => true, toasts, dismissToast: (i) => setToasts((t) => t.filter((_, k) => k !== i)),
  } as Ctx;
  return <C.Provider value={value}>{children}</C.Provider>;
}
