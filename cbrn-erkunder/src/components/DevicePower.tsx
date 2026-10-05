import { useEffect, useState } from 'react';
import { Power } from 'lucide-react';
import { api } from '../api';
import { useLive } from '../store';
import { devCalc, DEVICE_KEYS, type DevCalc } from '../lib/devices';

export function useNow(ms = 500) { const [n, setN] = useState(Date.now()); useEffect(() => { const t = setInterval(() => setN(Date.now()), ms); return () => clearInterval(t); }, [ms]); return n; }

/** Zustand + Schalter eines Geräts (bezogen auf das eigene Fahrzeug). */
export function useDev(key: string) {
  const { live, own } = useLive(); const now = useNow(); const c = devCalc(live[own]?.devices, key, now);
  const toggle = () => api(`/devices/${key}/power`, { method: 'POST', body: { on: !c.on } }).catch(() => {});
  return { ...c, ready: c.state === 'ready', toggle };
}
export const stateText = (c: DevCalc) => (c.state === 'off' ? 'AUS' : c.state === 'warmup' ? `STARTET ${Math.round(c.progress * 100)} %` : 'BETRIEBSBEREIT');

export function ProgressBar({ p }: { p: number }) {
  return (<div className="h-2 rounded-full bg-[#1d1d1d] overflow-hidden border border-line"><div className="h-full bg-accent transition-[width] duration-500" style={{ width: `${Math.round(p * 100)}%` }} /></div>);
}
export function PowerButton({ k, className = '' }: { k: string; className?: string }) {
  const d = useDev(k);
  return (<button className={`btn ${d.on ? '' : 'btn-primary'} ${className}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); d.toggle(); }}><Power size={13} className="inline mr-1 -mt-0.5" />{d.on ? 'Ausschalten' : 'Einschalten'}</button>);
}
/** Anzeige in Panels, solange das Gerät nicht messbereit ist. */
export function DeviceOff({ k }: { k: string }) {
  const d = useDev(k);
  return (
    <div className="py-6 text-center">
      {d.state === 'off' ? (<><div className="text-dim mb-3">Gerät ausgeschaltet</div><PowerButton k={k} /></>)
        : (<><div className="mb-2">Gerät startet – Selbsttest läuft … <span className="font-mono">{d.remain} s</span></div><div className="max-w-xs mx-auto"><ProgressBar p={d.progress} /></div><div className="mt-3"><PowerButton k={k} /></div></>)}
    </div>);
}
/** Alle Geräte auf einmal. */
export function AllPower() {
  const { live, own } = useLive(); const any = DEVICE_KEYS.some((k) => live[own]?.devices?.[k]?.on);
  const go = async (on: boolean) => { for (const k of DEVICE_KEYS) await api(`/devices/${k}/power`, { method: 'POST', body: { on } }).catch(() => {}); };
  return (<span className="flex gap-2"><button className="btn btn-primary" onClick={() => go(true)}>Alle einschalten</button>{any && <button className="btn" onClick={() => go(false)}>Alle ausschalten</button>}</span>);
}
