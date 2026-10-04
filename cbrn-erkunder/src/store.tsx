import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, cfg, setUserId, userId } from './api';
import { ROLE_LVL } from './lib/format';

export interface HistPoint { t: number; pid: number; dose: number; speed: number }
interface Ctx {
  meta: any; status: any; vehicles: any[]; live: Record<string, any>; weather: any; trackKm: number; mpCount: number; drive: boolean;
  wsUp: boolean; rev: Record<string, number>; hist: HistPoint[]; user: any; switchUser: (id: string) => void; can: (lvl: number) => boolean; toasts: any[]; dismissToast: (i: number) => void;
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
  const [weather, setWeather] = useState<any>(null); const [trackKm, setTrackKm] = useState(0); const [mpCount, setMp] = useState(0); const [drive, setDrive] = useState(true);
  const [wsUp, setWsUp] = useState(false); const [rev, setRev] = useState<Record<string, number>>({}); const [hist, setHist] = useState<HistPoint[]>([]);
  const [uid, setUid] = useState(userId()); const [toasts, setToasts] = useState<any[]>([]);

  const applyLive = useCallback((d: any) => {
    setLive((p) => ({ ...p, ...d.vehicles })); setTrackKm(d.track_km); setMp(d.mp_count); setWeather(d.weather); setStatus((s: any) => ({ ...s, ...d.status })); setDrive(d.drive);
  }, []);
  useEffect(() => {
    api('/meta').then(setMeta).catch(() => {}); api('/system/status').then(setStatus).catch(() => {}); api('/vehicles').then(setVehicles).catch(() => {});
    api('/live').then(applyLive).catch(() => {});
  }, [applyLive]);

  const wsRef = useRef<WebSocket | null>(null);
  useEffect(() => {
    let stop = false; let retry: any;
    const open = () => {
      const c = cfg(); const base = c.wsUrl || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
      let ws: WebSocket; try { ws = new WebSocket(base); } catch { retry = setTimeout(open, 3000); return; }
      wsRef.current = ws;
      ws.onopen = () => setWsUp(true);
      ws.onclose = () => { setWsUp(false); if (!stop) retry = setTimeout(open, 3000); };
      ws.onerror = () => ws.close();
      ws.onmessage = (m) => {
        const e = JSON.parse(m.data);
        switch (e.type) {
          case 'hello': case 'system.status': setStatus((s: any) => ({ ...s, ...e.payload })); break;
          case 'reading.live': {
            const p = e.payload; setLive((l) => ({ ...l, [p.vehicle_id]: p })); setTrackKm(p.track_km); setMp(p.mp_count);
            setHist((h) => [...h.slice(-179), { t: Date.parse(e.ts), pid: p.pid.value, dose: p.dose.value, speed: p.speed_kmh }]); break;
          }
          case 'vehicle.position': case 'vehicle.status': setVehicles((vs) => vs.map((v) => (v.id === e.payload.id ? e.payload : v))); break;
          case 'weather.updated': setWeather(e.payload); break;
          case 'alarm.created': setToasts((t) => [...t.slice(-3), e.payload]); setTimeout(() => setToasts((t) => t.slice(1)), 9000); setRev((r) => ({ ...r, [e.type]: (r[e.type] ?? 0) + 1 })); break;
          default: setRev((r) => ({ ...r, [e.type]: (r[e.type] ?? 0) + 1 }));
        }
      };
    };
    open();
    return () => { stop = true; clearTimeout(retry); wsRef.current?.close(); };
  }, []);
  // Fallback ohne WebSocket (z. B. NUI ohne WS-Zugriff): Polling
  useEffect(() => {
    if (wsUp) return; const t = setInterval(() => { api('/live').then(applyLive).catch(() => {}); api('/vehicles').then(setVehicles).catch(() => {}); setRev((r) => ({ ...r, poll: (r.poll ?? 0) + 1, 'measurement.created': (r['measurement.created'] ?? 0) + 1 })); }, 3000);
    return () => clearInterval(t);
  }, [wsUp, applyLive]);

  const user = useMemo(() => meta?.users?.find((u: any) => u.id === uid) ?? { id: uid, name: '…', role: 'erkunder' }, [meta, uid]);
  const value: Ctx = {
    meta, status: status && { ...status, websocket: wsUp ? 'ONLINE' : 'OFFLINE' }, vehicles, live, weather, trackKm, mpCount, drive, wsUp, rev, hist, user,
    switchUser: (id) => { setUserId(id); setUid(id); }, can: (l) => (ROLE_LVL[user.role] ?? 0) >= l, toasts, dismissToast: (i) => setToasts((t) => t.filter((_, k) => k !== i)),
  };
  return <C.Provider value={value}>{children}</C.Provider>;
}
