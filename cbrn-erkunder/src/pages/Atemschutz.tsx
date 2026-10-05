import { useEffect, useRef, useState } from 'react';
import { Page, Btn } from '../components/ui';
import { api } from '../api';
import { useApi, useLive } from '../store';

const FULL = 300, WARN = 100, WHISTLE = 55;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const COL: Record<string, string> = { BEREIT: '#58a6ff', ANGELEGT: '#3fb950', WARNUNG: '#d29922', PFEIFE: '#e5534b', LEER: '#e5534b' };

/** Druckanzeige: Gerätebild (public/devices/agt.png, 603×1024) mit eigener Displayfläche (Bogen, bar, Zeit bis Pfeife). */
function Gauge({ d, nowMs, base }: { d: any; nowMs: number; base: number }) {
  const el = d.worn ? (nowMs - base) / 1000 : 0; const bar = Math.max(0, d.bar - d.rate_bar_s * el);
  const whistle = d.worn && d.rate_bar_s > 0 ? Math.max(0, (bar - WHISTLE) / d.rate_bar_s) : d.whistle_s;
  const status = bar <= 0 ? 'LEER' : bar <= WHISTLE ? 'PFEIFE' : bar <= WARN ? 'WARNUNG' : d.worn ? 'ANGELEGT' : 'BEREIT'; const c = COL[status];
  const alarm = status === 'PFEIFE' || status === 'LEER'; const blink = alarm && Math.floor(nowMs / 500) % 2 === 0;
  const frac = Math.min(1, bar / FULL); const N = 24; const cx = 303, cy = 262, R = 118, R2 = 104; // Bogen aus Strichen
  const ticks = Array.from({ length: N }, (_, i) => { const t = i / (N - 1), a = Math.PI * (0.72 - 0.44 * t); const on = t <= frac + 1e-6;
    return <line key={i} x1={cx + R2 * Math.cos(a)} y1={cy - R2 * Math.sin(a)} x2={cx + R * Math.cos(a)} y2={cy - R * Math.sin(a)} stroke={on ? c : '#2b3036'} strokeWidth={i % 6 === 0 ? 7 : 5} strokeLinecap="round" />; });
  return (
    <div className="panel p-3" style={{ borderColor: alarm ? '#e5534b' : undefined, background: blink ? '#e5534b14' : undefined }}>
      <div className="flex items-center justify-between mb-1"><div className="lbl">{d.label}</div><span className="text-[11px] font-semibold" style={{ color: c }}>● {status}</span></div>
      <svg viewBox="0 0 603 1024" className="w-full max-h-[400px] block mx-auto" style={{ aspectRatio: '603 / 1024' }}>
        <image href="./devices/agt.png" x="0" y="0" width="603" height="1024" />
        <rect x="208" y="120" width="192" height="238" rx="14" fill="#000" />
        <g opacity={d.worn || d.bar < FULL ? 1 : 0.9}>{ticks}
          <text x="303" y="255" textAnchor="middle" fontSize="80" fontWeight="700" fill="#fff" fontFamily="Arial,Helvetica,sans-serif">{Math.round(bar)}</text>
          <text x="303" y="282" textAnchor="middle" fontSize="22" fontWeight="600" fill="#fff" fontFamily="Arial,Helvetica,sans-serif">bar</text>
          <text x="285" y="324" textAnchor="middle" fontSize="44" fontWeight="700" fill={alarm || status === 'WARNUNG' ? c : '#fff'} fontFamily="Arial,Helvetica,sans-serif">{mmss(whistle)}</text>
          <text x="360" y="324" textAnchor="middle" fontSize="20" fontWeight="600" fill="#fff" fontFamily="Arial,Helvetica,sans-serif">bar</text>
          <text x="303" y="347" textAnchor="middle" fontSize="18" fontWeight="600" fill="#fff" fontFamily="Arial,Helvetica,sans-serif">time to whistle</text></g>
        <rect x="205" y="682" width="196" height="38" rx="19" fill={d.worn ? (alarm ? (blink ? '#e5534b' : '#5a1f1b') : status === 'WARNUNG' ? '#d29922' : '#58b6ff') : '#1c2530'} opacity={d.worn ? 0.9 : 0.8} />
      </svg>
      <div className="text-center text-[12.5px] mt-1 h-5">{d.wearer ? <>Träger: <b>{d.wearer}</b> · seit {new Date(d.since).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</> : <span className="text-dim">nicht angelegt</span>}</div>
    </div>
  );
}

export default function Atemschutz() {
  const { session, rev } = useLive(); const ags = useApi<any[]>('/ags', ['ags.changed']); const [err, setErr] = useState(''); const [nowMs, setNow] = useState(Date.now());
  const base = useRef(Date.now()); useEffect(() => { base.current = Date.now(); }, [ags.data]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t); }, []);
  const list = ags.data ?? []; const mine = list.find((d) => d.wearer === session?.name);
  const act = async (slot: number, what: 'don' | 'doff' | 'refill') => { try { setErr(''); await api(`/ags/${slot}/${what}`, { method: 'POST', body: {} }); } catch (e: any) { setErr(e.message); } };
  void rev;
  return (
    <Page title="Atemschutzüberwachung" sub="4 Atemschutzgeräte der Besatzung – Anlegen/Ablegen am Computer. Fülldruck 300 bar, Vorrat je nach Belastung 10–15 min (Simulation).">
      {err && <div className="text-bad mb-2">{err}</div>}
      <div className="grid grid-cols-4 gap-3">
        {list.map((d) => (
          <div key={d.slot} className="space-y-2">
            <Gauge d={d} nowMs={nowMs} base={base.current} />
            <div className="flex gap-2 justify-center">
              {!d.worn && <Btn kind="primary" onClick={() => act(d.slot, 'don')} disabled={!!mine || d.bar <= 0}>Anlegen / aktivieren</Btn>}
              {d.worn && <Btn kind="danger" onClick={() => act(d.slot, 'doff')}>Ablegen</Btn>}
              {!d.worn && <Btn onClick={() => act(d.slot, 'refill')} disabled={d.bar >= FULL}>Flasche wechseln</Btn>}
            </div>
          </div>))}
      </div>
      <div className="text-dim text-[12px] mt-3">Warnung unter {WARN} bar, Pfeife bei {WHISTLE} bar (Rückzug). Warnungen erscheinen zusätzlich als Alarm. {mine ? `Du trägst: ${mine.label}.` : 'Du trägst aktuell kein Gerät.'}</div>
    </Page>
  );
}
