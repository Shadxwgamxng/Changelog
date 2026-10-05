import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Page, Panel, Field, StatusBadge, Badge, Btn, Modal, Tabs } from '../components/ui';
import { ProgressBar, useNow } from '../components/DevicePower';
import { AnalysisModal } from '../components/AnalysisModal';
import { api } from '../api';
import { useApi, useLive } from '../store';
import { fmtPos, dt, time, NA } from '../lib/format';

const TABS: [string, string][] = [['alle', 'Alle Proben'], ['neu', 'Neue Proben'], ['analyse', 'In Analyse'], ['fertig', 'Abgeschlossen'], ['archiv', 'Archiv'], ['roehrchen', 'Prüfröhrchen']];
const FILTER: Record<string, (s: any) => boolean> = {
  alle: () => true, neu: (s) => s.status === 'STORED' && !s.analysis_count, analyse: (s) => s.status === 'ANALYSIS', fertig: (s) => s.status === 'COMPLETED', archiv: (s) => s.status === 'ARCHIVED',
};
const ANALYSES: [string, string, string][] = [
  ['CHEMICAL', 'Chemisch', 'Chemische Gefahrstoffe, Stoffgruppen und Einzelstoffe'], ['RADIOLOGICAL', 'Radiologisch', 'Radionuklide und Strahlung'],
  ['BIOLOGICAL', 'Biologisch', 'Biologische Gefahrstoffe (dauert am längsten)'], ['GENERAL', 'Allgemeine Untersuchung', 'Schnelle Übersicht – höchstens Stoffgruppe'],
];
const LINK: Record<string, string> = { substance: '/stoffe/', radionuclide: '/radionuklide/', biological: '/bio/' };

/** Fortschritt einer laufenden Analyse. elapsed_ms kommt vom Server; die Uhr des Spielers wird nicht benötigt. */
function useProgress(a: any, stamp: number) {
  const now = useNow(500);
  if (a.status !== 'RUNNING') return 1;
  return Math.min(1, (a.elapsed_ms + (now - stamp)) / a.duration_ms);
}

function AnalysisCard({ a, stamp }: { a: any; stamp: number }) {
  const p = useProgress(a, stamp); const r = a.result;
  const steps = [['GESTARTET', a.started_at], [`${a.type_text.toUpperCase()}E ANALYSE`.replace('ALLGEMEINE UNTERSUCHUNGE', 'ALLGEMEINE UNTERSUCHUNG'), a.started_at], ['ERGEBNIS ERMITTELT', a.completed_at]].filter(([, t]) => t);
  return (
    <div className="border border-line2 rounded-md p-3">
      <div className="flex items-center gap-2"><b>Analyse #{a.id}</b><Badge>{a.type_text}</Badge><span className="flex-1" /><StatusBadge s={a.status === 'RUNNING' ? 'IN ANALYSE' : 'ANALYSE ABGESCHLOSSEN'} /></div>
      {a.status === 'RUNNING' ? (
        <div className="mt-3"><div className="lbl">ANALYSE LÄUFT</div><div className="my-2"><ProgressBar p={p} /></div><div className="font-mono">{Math.round(p * 100)} %</div></div>
      ) : r && (
        <div className="mt-3 space-y-2">
          <div className="lbl">Ergebnis</div>
          <div className="text-[16px] font-semibold">{r.outcome_text}</div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Kategorie" mono={false}>{r.category ?? NA}</Field><Field label="Stoffgruppe" mono={false}>{r.group ?? NA}</Field>
            <Field label="Konfidenz" mono={false}>{r.confidence != null ? `${r.confidence} % · SIMULATION` : 'SIMULATION'}</Field>
          </div>
          {r.candidates?.length > 0 && <div><div className="lbl">{r.outcome === 'SUSPECT' ? 'Verdacht' : 'Möglicher Stoff'}</div>{r.candidates.map((c: any) => <div key={c.id}>{c.name}</div>)}</div>}
          <div className="whitespace-pre-line text-[13px]">{r.description}</div>
          {r.substance_id && LINK[r.ref_type] && <Link className="btn btn-primary inline-block" to={`${LINK[r.ref_type]}${r.substance_id}`}>Stoffdaten öffnen</Link>}
        </div>)}
      <div className="mt-3 border-t border-line pt-2">{steps.map(([t, ts]) => <div key={t + ts} className="flex gap-3 text-[12px] py-0.5"><span className="font-mono w-14 text-dim">{time(ts).slice(0, 5)}</span><span>{t}</span></div>)}</div>
      {a.comment && <div className="text-dim text-[12px] mt-1">Kommentar: {a.comment}</div>}
      <div className="text-dim text-[11px] mt-1">Bearbeiter: {a.by_user}</div>
    </div>
  );
}

function SampleDetail({ id }: { id: string }) {
  const { meta } = useLive(); const nav = useNavigate();
  const q = useApi<any>(`/samples/${id}`, ['sample.updated', 'analysis.completed'], [id]); const s = q.data; const stamp = useRef(Date.now());
  useEffect(() => { stamp.current = Date.now(); }, [s]);
  const [pick, setPick] = useState(false); const [type, setType] = useState('CHEMICAL'); const [comment, setComment] = useState(''); const [err, setErr] = useState('');
  if (!s) return <Panel><div className="text-dim py-8 text-center">Lade Probe …</div></Panel>;
  const canAnalyse = s.status === 'STORED' || s.status === 'COMPLETED';
  const start = async () => { try { setErr(''); await api(`/samples/${id}/analyses`, { method: 'POST', body: { type, comment } }); setPick(false); setComment(''); q.reload(); } catch (e: any) { setErr(e.message); } };
  const archive = async () => { try { await api(`/samples/${id}/archive`, { method: 'POST' }); q.reload(); } catch (e: any) { setErr(e.message); } };
  return (
    <Panel title={`PROBE ${s.id}`} right={<span className="flex gap-2"><StatusBadge s={s.status_text} />{canAnalyse && <Btn kind="primary" onClick={() => setPick(true)}>ANALYSE STARTEN</Btn>}{s.status === 'COMPLETED' && <Btn onClick={archive}>Archivieren</Btn>}<Btn onClick={() => nav('/proben')}>Schließen</Btn></span>}>
      {err && <div className="text-bad mb-2">{err}</div>}
      {s.status === 'STORED' && !s.analyses.length && <div className="border border-accent/50 bg-accent/10 rounded-md px-3 py-2 mb-3 text-[13px]"><b>NEUE PROBE</b> · {s.label ?? s.id} · eingelagert – bereit zur Analyse.</div>}
      <div className="grid grid-cols-3 gap-4">
        <Field label="Bezeichnung" mono={false}>{s.label ?? 'noch nicht beschriftet'}</Field><Field label="Probenart" mono={false}>{s.type_text}</Field><Field label="Status">{s.status_text}</Field>
        <Field label="Herkunft" mono={false}>{s.source_description ?? NA}</Field><Field label="Entnahme">{dt(s.ts)}</Field><Field label="GPS">{fmtPos(meta?.map?.mode, s.lat, s.lon)}</Field>
        <Field label="Entnehmer" mono={false}>{s.collected_by ?? NA}</Field><Field label="Fahrzeug">{s.vehicle_id ?? NA}</Field><Field label="Einsatz">{s.incident_id ?? 'ohne Einsatz'}</Field>
        <Field label="Beschreibung" mono={false}>{s.description || NA}</Field><Field label="Zusatzinformation" mono={false}>{s.info || NA}</Field><Field label="Behälter" mono={false}>{s.container ? `${s.container} · ${s.id}` : NA}</Field>
      </div>
      <div className="mt-5"><div className="lbl mb-2">Analysen</div>
        {s.analyses.length ? <div className="space-y-3">{[...s.analyses].reverse().map((a: any) => <AnalysisCard key={a.id} a={a} stamp={stamp.current} />)}</div> : <div className="text-dim">Noch keine Analyse.</div>}</div>
      <div className="mt-5"><div className="lbl mb-2">Probenhistorie</div>
        {s.events.map((e: any) => <div key={e.id} className="flex gap-3 py-1 border-l-2 border-accent pl-3"><span className="font-mono w-14 text-dim">{time(e.ts).slice(0, 5)}</span><span className="font-medium">{e.status}</span>{e.note && <span className="text-dim">{e.note}</span>}</div>)}</div>
      {pick && (
        <Modal title={`ANALYSE – ${s.id}`} onClose={() => setPick(false)}>
          <div className="mb-2">Welche Untersuchung soll durchgeführt werden?</div>
          <div className="space-y-2">{ANALYSES.map(([k, l, d]) => (
            <label key={k} className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer ${type === k ? 'border-accent bg-accent/10' : 'border-line2 bg-panel2'}`}>
              <input type="radio" className="mt-1" checked={type === k} onChange={() => setType(k)} /><span><b>{l}</b><div className="text-dim text-[12px]">{d}</div></span></label>))}</div>
          <div className="mt-3"><div className="lbl">Kommentar (optional)</div><input className="inp w-full" value={comment} onChange={(e) => setComment(e.target.value)} /></div>
          <div className="mt-3 flex gap-2 justify-end"><Btn onClick={() => setPick(false)}>Abbrechen</Btn><Btn kind="primary" onClick={start}>Analyse starten</Btn></div>
        </Modal>)}
    </Panel>
  );
}

export default function Samples() {
  const { id } = useParams(); const nav = useNavigate(); const { own } = useLive();
  const [tab, setTab] = useState('alle'); const { data } = useApi<any[]>('/samples', ['sample.created', 'sample.updated', 'analysis.completed']);
  const cap = useApi<any>(`/samples/capacity?vehicle=${own}`, ['sample.updated', 'sample.created'], [own]).data; const tubes = useApi<any[]>('/test-tubes'); const [quick, setQuick] = useState(false);
  const rows = (data ?? []).filter(FILTER[tab] ?? (() => true));
  return (
    <Page title="Proben" sub={cap ? `Probenlager: ${cap.stored} / ${cap.max} belegt` : 'Probenlager'} right={<Btn onClick={() => setQuick(true)}>Entscheidungshilfe</Btn>}>
      <Tabs tabs={TABS} value={tab} onChange={(t) => { setTab(t); if (id) nav('/proben'); }} />
      {tab !== 'roehrchen' && (
        <div className="grid grid-cols-12 gap-3">
          <Panel title={TABS.find((t) => t[0] === tab)?.[1]} className={id ? 'col-span-5' : 'col-span-12'} body="!p-0">
            <table className="t"><thead><tr><th>Proben-ID</th><th>Bezeichnung</th>{!id && <th>Art</th>}<th>Entnahme</th>{!id && <th>Entnehmer</th>}<th>Status</th></tr></thead><tbody>
              {rows.map((s) => <tr key={s.id} className={`cursor-pointer ${id === s.id ? 'bg-panel2' : ''}`} onClick={() => nav(`/proben/${s.id}`)}><td className="font-mono">{s.id}</td><td>{s.label ?? <span className="text-dim">unbeschriftet</span>}</td>{!id && <td>{s.type_text}</td>}<td>{time(s.ts)}</td>{!id && <td>{s.collected_by}</td>}<td><StatusBadge s={s.status_text} /></td></tr>)}
              {!rows.length && <tr><td colSpan={6} className="text-dim">Keine Proben in dieser Rubrik. Proben werden im Spiel am Fahrzeug entnommen.</td></tr>}
            </tbody></table>
          </Panel>
          {id && <div className="col-span-7"><SampleDetail id={id} /></div>}
        </div>)}
      {tab === 'roehrchen' && (
        <Panel title="Kurzzeit-Prüfröhrchen – Inventar" body="!p-0">
          <table className="t"><thead><tr><th>Hersteller</th><th>Produkt</th><th>Röhrchentyp</th><th>Messstoff</th><th>CAS</th><th>Messbereich</th><th>Einheit</th><th>Anwendungsbereich</th><th>Lagerstatus</th><th>Charge</th><th>Verfall</th></tr></thead><tbody>
            {(tubes.data ?? []).map((t) => <tr key={t.id}><td>{t.manufacturer}</td><td>{t.product}</td><td>{t.tube_type}</td><td>{t.analyte}</td><td className="font-mono">{t.cas}</td><td className="text-dim">QUELLE ERFORDERLICH</td><td>{t.unit}</td><td>{t.application}</td><td><StatusBadge s={t.storage_status} /></td><td className="font-mono">{t.lot}</td><td className="font-mono">{t.expiry}</td></tr>)}
          </tbody></table>
        </Panel>)}
      {quick && <AnalysisModal onClose={() => setQuick(false)} />}
    </Page>
  );
}
