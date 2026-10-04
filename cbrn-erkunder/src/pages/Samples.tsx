import { useState } from 'react';
import { Page, Panel, Field, StatusBadge, Badge, Btn, Modal, Tabs, Select, QualityBadge } from '../components/ui';
import { api } from '../api';
import { AnalysisModal } from '../components/AnalysisModal';
import { useApi, useLive } from '../store';
import { fmtPos, dt, time, NA } from '../lib/format';

const FLOW = ['ENTNOMMEN', 'VERPACKT', 'ÜBERGEBEN', 'LABOR EINGEGANGEN', 'ANALYSE', 'BEFUND EINGEGANGEN'];
const KINDS = ['FEST', 'FLÜSSIG', 'LUFT', 'BIOLOGISCH', 'RADIOLOGISCH', 'CHEMISCH'];

function Chain({ s }: { s: any }) {
  return (
    <div>{FLOW.map((st) => { const e = s.events.find((x: any) => x.status === st); return (
      <div key={st} className={`flex gap-3 py-1 border-l-2 pl-3 ${e ? 'border-accent' : 'border-line text-dim'}`}><span className="font-mono w-16">{e ? time(e.ts).slice(0, 5) : '–'}</span><span className={e ? '' : ''}>{st}</span>{e?.note && <span className="text-dim">({e.note})</span>}</div>); })}
      <div className="mt-2">STATUS: <b>{s.lab_status === 'AUSSTEHEND' ? s.transport_status : s.lab_status}</b></div></div>
  );
}

export function SampleReport({ id }: { id: string }) {
  const mode = useLive().meta?.map?.mode;
  const s = useApi<any>(`/samples/${id}`, ['sample.updated'], [id]).data; if (!s) return null; const w = s.weather;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Field label="Probennummer">{s.id}</Field><Field label="Entnahmezeit">{dt(s.ts)}</Field><Field label="GPS">{fmtPos(mode, s.lat, s.lon)}</Field>
        <Field label="Probenart">{s.kind}</Field><Field label="Auftrag">{s.mission_id ? `#${s.mission_id}` : NA}</Field><Field label="Entnehmer">{s.taken_by}</Field>
        <Field label="Entnahmeort" mono={false}>{s.location ?? NA}</Field><Field label="Farbe" mono={false}>{s.color ?? NA}</Field><Field label="Konsistenz" mono={false}>{s.consistency ?? NA}</Field>
        <Field label="Geruch" mono={false}>{s.odor ?? NA}</Field><Field label="Trübung" mono={false}>{s.turbidity ?? NA}</Field><Field label="Einschätzung vor Ort">{s.onsite_assessment}</Field>
        <div className="col-span-3"><Field label="Beschreibung" mono={false}>{s.description || NA}</Field></div>
      </div>
      <div><div className="lbl mb-1">Vor-Ort-Messwerte (simuliert)</div><div className="grid grid-cols-4 gap-2">{Object.entries(s.readings ?? {}).map(([k, v]) => <Field key={k} label={k}>{String(v)}</Field>)}</div></div>
      {s.analysis?.result?.candidates?.[0] && (<div><div className="lbl mb-1">Analyse (Entscheidungshilfe, vor Ort)</div><div>{s.onsite_assessment} · Alternativen: {s.analysis.result.candidates.slice(1, 4).map((c: any) => c.name).join(', ') || '–'}</div></div>)}
      {w && <div><div className="lbl mb-1">Wetter (Wind kommt aus)</div><div className="font-mono">{w.temperature} °C · {w.humidity} % · {w.pressure} hPa · {w.wind_speed} m/s aus {w.wind_from_text} ({w.wind_from}°) · {w.cloud_okta}/8 · {w.precipitation} mm/h</div></div>}
      <div className="grid grid-cols-2 gap-3">
        <div><div className="lbl mb-1">Chain of Custody</div><Chain s={s} /></div>
        <div><div className="lbl mb-1">Laborergebnis</div>{s.lab_result ? (
          <div className="border border-line2 p-2"><div className="text-[11px] text-dim">Vor-Ort: {s.onsite_assessment}</div><div className="font-semibold mt-1">{s.lab_result.text}</div>
            {s.lab_result.substance_id && <a className="text-accent" href={`#/stoffe/${s.lab_result.substance_id}`}>Stoffdaten öffnen →</a>}
            <div className="mt-1"><StatusBadge s="BEFUND EINGEGANGEN" /> <Badge color="#d6742a">SIMULIERTES LABORERGEBNIS</Badge></div></div>) : <div className="text-dim">Noch kein Befund – Status: {s.lab_status}</div>}</div>
      </div>
    </div>
  );
}

export default function Samples() {
  const { can } = useLive(); const [tab, setTab] = useState('proben'); const { data, reload } = useApi<any[]>('/samples', ['sample.created', 'sample.updated']);
  const tubes = useApi<any[]>('/test-tubes'); const [sel, setSel] = useState<string | null>(null); const [nw, setNw] = useState(false); const [ana, setAna] = useState<any>(null); const [quick, setQuick] = useState(false);
  const [f, setF] = useState({ kind: 'FLÜSSIG', description: '', color: '', consistency: '', odor: 'NICHT BEURTEILT', turbidity: '', location: '' }); const [err, setErr] = useState('');
  const create = async () => { try { const s = await api('/samples', { method: 'POST', body: f }); setNw(false); setSel(s.id); reload(); setAna(s); } catch (e: any) { setErr(e.message); } };
  const step = async (id: string) => { try { await api(`/samples/${id}/events`, { method: 'POST', body: {} }); reload(); } catch (e: any) { setErr(e.message); } };
  const lab = async (id: string) => { try { await api(`/samples/${id}/lab`, { method: 'POST' }); reload(); } catch (e: any) { setErr(e.message); } };
  const nextOf = (s: any) => FLOW[FLOW.indexOf(s.lab_status === 'AUSSTEHEND' ? s.transport_status : s.lab_status) + 1];
  return (
    <Page title="Probenahme" sub="Dokumentation und Chain of Custody (nach öffentlich verfügbaren BBK-Unterlagen)" right={<><Btn onClick={() => setQuick(true)}>Schnellanalyse</Btn><Btn kind="primary" onClick={() => setNw(true)}>+ Neue Probe</Btn></>}>
      <Tabs tabs={[['proben', 'Proben'], ['roehrchen', 'Prüfröhrchen-Inventar']]} value={tab} onChange={setTab} />
      {err && <div className="text-bad mb-2">{err}</div>}
      {tab === 'proben' && (
        <div className="grid grid-cols-12 gap-3">
          <Panel title="Proben" className="col-span-5" body="!p-0"><table className="t"><thead><tr><th>Proben-ID</th><th>Zeit</th><th>Art</th><th>Transport</th><th>Labor</th></tr></thead><tbody>
            {(data ?? []).map((s) => <tr key={s.id} className={`cursor-pointer ${sel === s.id ? 'bg-panel2' : ''}`} onClick={() => setSel(s.id)}><td className="font-mono">{s.id}</td><td>{time(s.ts)}</td><td>{s.kind}</td><td>{s.transport_status}</td><td><StatusBadge s={s.lab_status} /></td></tr>)}</tbody></table></Panel>
          <div className="col-span-7">
            {sel ? <Panel title={`Probenbericht ${sel}`} right={<><Btn kind="primary" onClick={async () => setAna(await api('/samples/' + sel))}>Probe analysieren</Btn><Btn onClick={() => window.print()}>Drucken / PDF</Btn>{(() => { const s = data?.find((x) => x.id === sel); return s && nextOf(s) && nextOf(s) !== 'BEFUND EINGEGANGEN' ? <Btn onClick={() => step(sel)}>→ {nextOf(s)}</Btn> : null; })()}{can(3) && data?.find((x) => x.id === sel)?.lab_status !== 'BEFUND EINGEGANGEN' && <Btn onClick={() => lab(sel)}>Laborbefund simulieren</Btn>}</>}><SampleReport id={sel} /></Panel>
              : <Panel><div className="text-dim py-8 text-center">Probe auswählen</div></Panel>}
          </div>
        </div>)}
      {tab === 'roehrchen' && (
        <Panel title="Kurzzeit-Prüfröhrchen – Inventar / Informationsfunktion" body="!p-0">
          <table className="t"><thead><tr><th>Hersteller</th><th>Produkt</th><th>Röhrchentyp</th><th>Messstoff</th><th>CAS</th><th>Messbereich</th><th>Einheit</th><th>Anwendungsbereich</th><th>Lagerstatus</th><th>Charge</th><th>Verfall</th></tr></thead><tbody>
            {(tubes.data ?? []).map((t) => <tr key={t.id}><td>{t.manufacturer}</td><td>{t.product}</td><td>{t.tube_type}</td><td>{t.analyte}</td><td className="font-mono">{t.cas}</td><td className="text-dim">QUELLE ERFORDERLICH</td><td>{t.unit}</td><td>{t.application}</td><td><StatusBadge s={t.storage_status} /></td><td className="font-mono">{t.lot}</td><td className="font-mono">{t.expiry}</td></tr>)}</tbody></table>
          <div className="p-2 text-[11px] text-dim">Messbereiche nicht aus Herstellerdatenblättern übernommen (QUELLE ERFORDERLICH). Chargen/Verfall/Lagerstatus sind simulierte Demo-Inventardaten.</div>
        </Panel>)}
      {ana && <AnalysisModal sample={ana} onClose={() => setAna(null)} onSaved={reload} />}
      {quick && <AnalysisModal onClose={() => setQuick(false)} />}
      {nw && (
        <Modal title="Neue Probe (GPS, Wetter und Vor-Ort-Messwerte werden automatisch übernommen)" onClose={() => setNw(false)}>
          <div className="grid grid-cols-2 gap-3">
            <div><div className="lbl">Probenart</div><Select className="w-full" value={f.kind} onChange={(v) => setF({ ...f, kind: v })} options={KINDS.map((k) => [k, k] as [string, string])} /></div>
            <div><div className="lbl">Entnahmeort</div><input className="inp w-full" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></div>
            <div><div className="lbl">Farbe</div><input className="inp w-full" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} /></div>
            <div><div className="lbl">Konsistenz</div><input className="inp w-full" value={f.consistency} onChange={(e) => setF({ ...f, consistency: e.target.value })} /></div>
            <div><div className="lbl">Geruch</div><input className="inp w-full" value={f.odor} onChange={(e) => setF({ ...f, odor: e.target.value })} /></div>
            <div><div className="lbl">Trübung</div><input className="inp w-full" value={f.turbidity} onChange={(e) => setF({ ...f, turbidity: e.target.value })} /></div>
            <div className="col-span-2"><div className="lbl">Beschreibung</div><textarea className="inp w-full h-20" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          </div>
          <div className="mt-3 flex gap-2 justify-end"><Btn onClick={() => setNw(false)}>Abbrechen</Btn><Btn kind="primary" onClick={create}>Probe dokumentieren</Btn></div>
        </Modal>)}
    </Page>
  );
}
export { QualityBadge };
