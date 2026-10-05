import { useEffect, useRef, useState } from 'react';
import { Page, Btn } from '../components/ui';
import { api } from '../api';
import { useApi, useLive } from '../store';

const FULL = 300, WARN = 100, WHISTLE = 55;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const COL: Record<string, string> = { BEREIT: '#58a6ff', ANGELEGT: '#3fb950', WARNUNG: '#d29922', PFEIFE: '#e5534b', LEER: '#e5534b' };

/** Anzeige im Stil eines Atemschutz-Überwachungsgeräts: Bogen, Druck in bar, Zeit bis zur Pfeife. */
function Gauge({ d, nowMs, base }: { d: any; nowMs: number; base: number }) {
  const el = d.worn ? (nowMs - base) / 1000 : 0; const bar = Math.max(0, d.bar - d.rate_bar_s * el);
  const whistle = d.worn && d.rate_bar_s > 0 ? Math.max(0, (bar - WHISTLE) / d.rate_bar_s) : d.whistle_s;
  const status = bar <= 0 ? 'LEER' : bar <= WHISTLE ? 'PFEIFE' : bar <= WARN ? 'WARNUNG' : d.worn ? 'ANGELEGT' : 'BEREIT'; const c = COL[status];
  const R = 70, C = Math.PI * R, frac = Math.min(1, bar / FULL); const blink = (status === 'PFEIFE' || status === 'LEER') && Math.floor(nowMs / 500) % 2 === 0;
  return (
    <div className="panel p-3" style={{ borderColor: status === 'PFEIFE' || status === 'LEER' ? '#e5534b' : undefined, background: blink ? '#e5534b14' : undefined }}>
      <div className="flex items-center justify-between mb-1"><div className="lbl">{d.label}</div><span className="text-[11px] font-semibold" style={{ color: c }}>● {status}</span></div>
      <svg viewBox="0 0 180 104" className="w-full max-w-[260px] mx-auto block">
        <path d="M20 90 A70 70 0 0 1 160 90" fill="none" stroke="#2a2a2a" strokeWidth="9" strokeLinecap="round" />
        <path d="M20 90 A70 70 0 0 1 160 90" fill="none" stroke={c} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${C * frac} ${C}`} />
        <text x="90" y="72" textAnchor="middle" fontSize="34" fontWeight="700" fill="currentColor" fontFamily="ui-monospace,monospace">{Math.round(bar)}</text>
        <text x="90" y="86" textAnchor="middle" fontSize="10" fill="#817d78">bar</text>
        <text x="90" y="101" textAnchor="middle" fontSize="13" fontWeight="600" fill="currentColor" fontFamily="ui-monospace,monospace">{mmss(whistle)} <tspan fontSize="9" fill="#817d78">bis Pfeife</tspan></text>
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
