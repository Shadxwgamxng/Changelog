import { Link } from 'react-router-dom';
import { DeviceOff, useDev } from './DevicePower';
import { Field, Badge, StatusBadge, LevelBadge, CatBadge, SimNote, Panel, Na } from './ui';
import { useApi, useLive } from '../store';
import { num, time, NA } from '../lib/format';

export const pidStatus = (v: number) => (v >= 50 ? 'HOCH' : v >= 2 ? 'ERHÖHT' : 'NORMAL');
export const doseStatus = (v: number) => (v >= 1 ? 'ALARM' : v >= 0.3 ? 'ERHÖHT' : 'NORMAL');

export function useSession() { const { hist } = useLive(); const s = hist[0]?.t ?? Date.now(); const d = Math.max(0, Math.round((Date.now() - s) / 1000)); return `${String(Math.floor(d / 3600)).padStart(2, '0')}:${String(Math.floor(d / 60) % 60).padStart(2, '0')}:${String(d % 60).padStart(2, '0')}`; }

function ImsInner({ r, link = true }: { r: any; link?: boolean }) {
  const sub = useApi<any>(r?.ims?.substance_id ? `/substances/${r.ims.substance_id}` : null, [], [r?.ims?.substance_id]);
  if (!r) return <Panel title="IMS – Ionenmobilitätsspektrometer">Keine Daten</Panel>;
  const i = r.ims;
  return (
    <Panel title="IMS" right={link && <Link className="text-accent" to="/geraete/ims">Gerätepage →</Link>} className="h-full">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Status"><StatusBadge s={i.state} /></Field><Field label="Messmodus">{i.mode}</Field>
        <Field label="Ergebnis">{i.level ? i.result.split(' – ')[0] === 'MÖGLICHER STOFF' ? 'MÖGLICHER STOFF' : i.result : <span className="text-dim">KEIN TREFFER</span>}</Field>
        <Field label="Konfidenz">{i.confidence != null ? `${i.confidence} %` : '–'}</Field>
        <Field label="Bibliothek">Stoffdatenbank (lokal)</Field><Field label="Zeit">{time(r.ts)}</Field>
      </div>
      <div className="mt-3"><LevelBadge l={i.level} /></div>
      {i.level === 'moegliche_identifikation' && sub.data && (
        <div className="mt-3 border border-line2 p-2 bg-bg">
          <div className="lbl">Mögliche Identifikation</div>
          <div className="text-[18px] font-semibold">{sub.data.name}</div>
          <div className="grid grid-cols-2 gap-2 mt-1"><Field label="CAS">{sub.data.cas}</Field><Field label="Kategorie"><CatBadge c={sub.data.cbrn_category} /></Field></div>
          <Link to={`/stoffe/${sub.data.id}`} className="btn btn-primary mt-2 inline-block">[ STOFFDATEN ÖFFNEN ]</Link>
        </div>)}
      {i.level === 'verdacht' && <div className="mt-2 text-[12px]">Mögliche Stoffgruppe: <b>{i.group}</b></div>}
      {i.level === 'hinweis' && <div className="mt-2 text-[12px]">Stoffklasse (Hinweis): <b>{i.group}</b></div>}
    </Panel>
  );
}

function PidInner({ r, link = true }: { r: any; link?: boolean }) {
  const dur = useSession(); if (!r) return null; const v = r.pid.value; const st = pidStatus(v);
  return (
    <Panel title="PID" right={link && <Link className="text-accent" to="/geraete/pid">Gerätepage →</Link>} className="h-full">
      <div className="flex items-end gap-2"><span className="text-[34px] font-mono leading-none" style={{ color: st === 'NORMAL' ? undefined : st === 'HOCH' ? '#e5534b' : '#d29922' }}>{num(v, 1)}</span><span className="text-dim mb-1">ppm (VOC)</span><span className="ml-auto"><StatusBadge s={st} /></span></div>
      <div className="grid grid-cols-3 gap-3 mt-3"><Field label="Messdauer">{dur}</Field><Field label="GPS"><StatusBadge s="FIX" /></Field><Field label="Lampe">10,6 eV</Field></div>
      <div className="mt-3"><div className="lbl">Mögliche Stoffgruppen</div>{r.pid.groups.length ? <ul className="list-disc ml-5">{r.pid.groups.map((g: string) => <li key={g}>{g}</li>)}</ul> : <div className="text-dim">– (kein erhöhter Wert)</div>}</div>
      <div className="mt-3"><Badge color="#d29922">SCREENING / HINWEIS</Badge></div>
    </Panel>
  );
}

function MgmgInner({ r, link = true }: { r: any; link?: boolean }) {
  const { meta } = useLive(); if (!r) return null; const ch = r.mgmg.channels as Record<string, number | null>;
  const U: Record<string, [string, string]> = { O2: ['O₂', '% vol'], CO: ['CO', 'ppm'], H2S: ['H₂S', 'ppm'], LEL: ['EX', '%LEL'], CH4: ['CH₄', 'ppm'], CO2: ['CO₂', 'ppm'], HCN: ['HCN', 'ppm'], NO2: ['NO₂', 'ppm'], HCl: ['HCl', 'ppm'], SO2: ['SO₂', 'ppm'] };
  const warn = (k: string, v: number) => (k === 'O2' ? v < 19.5 : k === 'CO' ? v > 30 : k === 'H2S' ? v > 5 : k === 'LEL' ? v > 10 : k === 'CO2' ? v > 5000 : k === 'HCN' ? v > 2 : k === 'NO2' ? v > 0.5 : k === 'HCl' ? v > 2 : k === 'SO2' ? v > 0.5 : false);
  return (
    <Panel title="MGMG – Mehrgasmessgerät" right={link && <Link className="text-accent" to="/geraete/mgmg">Gerätepage →</Link>} className="h-full">
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(ch).map(([k, v]) => (
          <div key={k} className={`border p-2 ${v != null && warn(k, v) ? 'border-bad' : 'border-line'}`}>
            <div className="lbl">{U[k]?.[0] ?? k}</div><div className="font-mono text-[22px]">{num(v, k === 'O2' || k === 'LEL' || k === 'H2S' ? 1 : 0)}</div><div className="text-dim text-[11px]">{U[k]?.[1]}</div>
          </div>))}
      </div>
    </Panel>
  );
}

function RadInner({ r, link = true }: { r: any; link?: boolean }) {
  const { hist } = useLive(); if (!r) return null; const st = doseStatus(r.dose.value);
  return (
    <Panel title="Radiologische Messung" right={link && <Link className="text-accent" to="/geraete/dlm">Gerätepage →</Link>} className="h-full">
      <div className="flex items-end gap-2"><span className="text-[34px] font-mono leading-none" style={{ color: st === 'NORMAL' ? undefined : st === 'ALARM' ? '#e5534b' : '#d29922' }}>{num(r.dose.value, 3)}</span><span className="text-dim mb-1">µSv/h</span><span className="ml-auto"><StatusBadge s={st} /></span></div>
      <div className="grid grid-cols-3 gap-3 mt-3"><Field label="Kontaminationsmonitor">{num(r.como.value, 1)} cps</Field><Field label="GPS"><StatusBadge s="FIX" /></Field><Field label="Trend">{hist.length > 5 ? (hist.at(-1)!.dose > hist.at(-6)!.dose * 1.05 ? '▲ steigend' : hist.at(-1)!.dose < hist.at(-6)!.dose * 0.95 ? '▼ fallend' : '► stabil') : '–'}</Field></div>
    </Panel>
  );
}

function FmgInner({ r, link = true }: { r: any; link?: boolean }) {
  const { trackKm, mpCount } = useLive(); if (!r) return null; const st = doseStatus(r.dose.value);
  return (
    <Panel title="FMG – Fahrzeuggesteuertes Messsystem Gamma" right={link && <Link className="text-accent" to="/geraete/fmg">Gerätepage →</Link>} className="h-full">
      <div className="grid grid-cols-3 gap-3">
        <Field label="Status"><StatusBadge s="AKTIV" /></Field><Field label="Fahrgeschwindigkeit">{r.speed_kmh} km/h</Field><Field label="GPS"><StatusBadge s="FIX" /></Field>
        <Field label="Messpunkte">{mpCount.toLocaleString('de-DE')}</Field><Field label="Track">{num(trackKm, 1)} km</Field><Field label="Aktueller Messstatus"><StatusBadge s={st} /></Field>
      </div>
    </Panel>
  );
}

function Gate({ k, title, to, link, children }: { k: string; title: string; to: string; link?: boolean; children: React.ReactNode }) {
  const d = useDev(k);
  if (d.ready) return <>{children}</>;
  return (<Panel title={title} right={link !== false && <Link className="text-accent" to={`/geraete/${to}`}>Gerätepage →</Link>} className="h-full"><DeviceOff k={k} /></Panel>);
}
type P = { r: any; link?: boolean };
export const ImsPanel = (p: P) => <Gate k="ims" title="IMS" to="ims" link={p.link}><ImsInner {...p} /></Gate>;
export const PidPanel = (p: P) => <Gate k="pid" title="PID" to="pid" link={p.link}><PidInner {...p} /></Gate>;
export const MgmgPanel = (p: P) => <Gate k="mgmg" title="MGMG" to="mgmg" link={p.link}><MgmgInner {...p} /></Gate>;
export const RadPanel = (p: P) => <Gate k="dlm" title="Radiologische Messung" to="dlm" link={p.link}><RadInner {...p} /></Gate>;
export const FmgPanel = (p: P) => <Gate k="fmg" title="FMG – Fahrzeuggesteuertes Messsystem Gamma" to="fmg" link={p.link}><FmgInner {...p} /></Gate>;
export { Na, NA };
