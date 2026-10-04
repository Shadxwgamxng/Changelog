import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Page, Panel, Field, StatusBadge, LevelBadge, DataBadge, Btn, Select, Modal } from '../components/ui';
import { api } from '../api';
import { useApi, useLive } from '../store';
import { coord, dt, time } from '../lib/format';

function Detail({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: m, reload } = useApi<any>(`/measurements/${id}`, ['measurement.updated'], [id]); const [remark, setRemark] = useState<string | null>(null); const [status, setStatus] = useState<string | null>(null); const [err, setErr] = useState('');
  if (!m) return null;
  const save = async () => { try { await api(`/measurements/${id}`, { method: 'PATCH', body: { ...(remark != null ? { remark } : {}), ...(status ? { status } : {}) } }); setRemark(null); setStatus(null); reload(); } catch (e: any) { setErr(e.message); } };
  return (
    <Modal wide title={`MESSPUNKT ${m.id}`} onClose={onClose}>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Zeit">{dt(m.ts)}</Field><Field label="GPS">{coord(m.lat)} / {coord(m.lon)}</Field><Field label="Fahrzeug">{m.vehicle_id}</Field>
        <Field label="Auftrag">{m.mission_id ? `#${m.mission_id}` : '–'}</Field><Field label="Gerät">{m.device}</Field><Field label="Messwert">{m.value ?? '–'} {m.unit ?? ''}</Field>
        <Field label="Status"><StatusBadge s={m.status} /></Field><Field label="Einstufung"><LevelBadge l={m.level} /></Field><Field label="Datenherkunft"><DataBadge s={m.data_source === 'MANUAL' ? 'MANUAL' : 'SIMULATED'} /></Field>
        <div className="col-span-3"><Field label="Ergebnis" mono={false}>{m.headline}</Field></div>
        {m.channels && <div className="col-span-3"><Field label="Kanäle">{Object.entries(m.channels).map(([k, v]) => `${k}: ${v}`).join(' · ')}</Field></div>}
        {m.candidates?.length > 0 && <div className="col-span-3"><Field label="Mögliche Zuordnung" mono={false}>{m.candidates.map((c: string) => <Link key={c} to={`/stoffe/${c}`} className="text-accent mr-3">{c}</Link>)}</Field></div>}
        {m.substance && <div className="col-span-3"><Link to={`/stoffe/${m.substance.id}`} className="btn btn-primary inline-block">Stoffdatenbank öffnen: {m.substance.name}</Link></div>}
        <div className="col-span-3"><div className="lbl">Bemerkung (Korrektur wird protokolliert)</div><textarea className="inp w-full h-16" value={remark ?? m.remark ?? ''} onChange={(e) => setRemark(e.target.value)} /></div>
        <div><div className="lbl">Status ändern</div><Select value={status ?? m.status} onChange={setStatus} options={['NORMAL', 'ERHÖHT', 'AUSWERTUNG ERFORDERLICH', 'ALARM', 'AUSGEWERTET'].map((x) => [x, x] as [string, string])} /></div>
        <div className="col-span-2 flex items-end gap-2"><Btn kind="primary" onClick={save} disabled={remark == null && !status}>Korrektur speichern</Btn><span className="text-bad">{err}</span></div>
      </div>
      <div className="mt-4"><div className="lbl mb-1">Audit-Log</div>
        <table className="t"><tbody>{m.audit.map((a: any) => <tr key={a.id}><td className="font-mono">{time(a.ts)}</td><td>{a.action}</td><td className="font-mono text-[11px]">{a.user_id}</td><td className="font-mono text-[11px] text-dim">{a.detail}</td></tr>)}
          {!m.audit.length && <tr><td className="text-dim">Keine Änderungen protokolliert (Messpunkt vom System erzeugt).</td></tr>}</tbody></table></div>
    </Modal>
  );
}

export default function Measurements() {
  const { can } = useLive(); const [f, setF] = useState({ device: '', status: '', anomalies: false, vehicle_id: '' }); const [sel, setSel] = useState<string | null>(null); const [nw, setNw] = useState(false);
  const qs = `limit=300${f.device ? `&device=${f.device}` : ''}${f.status ? `&status=${encodeURIComponent(f.status)}` : ''}${f.vehicle_id ? `&vehicle_id=${f.vehicle_id}` : ''}${f.anomalies ? '&anomalies=1' : ''}`;
  const { data, reload } = useApi<any[]>('/measurements?' + qs, ['measurement.created', 'measurement.updated', 'poll'], [qs]);
  const [man, setMan] = useState({ device: 'MANUELL', value: '', unit: 'ppm', headline: '', remark: '' });
  const add = async () => { await api('/measurements', { method: 'POST', body: { ...man, value: man.value === '' ? null : +man.value.replace(',', '.') } }); setNw(false); reload(); };
  return (
    <Page title="Messpunkte" sub="Georeferenzierte Messwerte – Korrekturen werden im Audit-Log protokolliert" right={<Btn onClick={() => setNw(true)} disabled={!can(1)}>+ Manueller Eintrag</Btn>}>
      <div className="panel p-2 mb-3 flex gap-2 items-center">
        <Select value={f.device} onChange={(v) => setF({ ...f, device: v })} options={[['', 'Gerät: alle'], ['PID', 'PID'], ['IMS', 'IMS'], ['MGMG', 'MGMG'], ['DLM', 'Dosisleistung'], ['FMG', 'FMG'], ['MANUELL', 'Manuell']]} />
        <Select value={f.vehicle_id} onChange={(v) => setF({ ...f, vehicle_id: v })} options={[['', 'Fahrzeug: alle'], ['CBRN-01', 'CBRN-01'], ['CBRN-02', 'CBRN-02'], ['CBRN-03', 'CBRN-03']]} />
        <label className="flex items-center gap-1"><input type="checkbox" checked={f.anomalies} onChange={(e) => setF({ ...f, anomalies: e.target.checked })} />nur Auffälligkeiten</label>
        <span className="ml-auto text-dim">{data?.length ?? 0} Einträge</span>
      </div>
      <Panel body="!p-0"><table className="t"><thead><tr><th>ID</th><th>Zeit</th><th>Fzg.</th><th>Gerät</th><th>Wert</th><th>Ergebnis</th><th>Einstufung</th><th>Status</th><th>Herkunft</th></tr></thead><tbody>
        {(data ?? []).map((m) => <tr key={m.id} className="cursor-pointer" onClick={() => setSel(m.id)}><td className="font-mono">{m.id}</td><td>{time(m.ts)}</td><td>{m.vehicle_id}</td><td>{m.device}</td><td className="font-mono">{m.value ?? '–'} {m.unit ?? ''}</td><td>{m.headline}</td><td><LevelBadge l={m.level} /></td><td><StatusBadge s={m.status} /></td><td><DataBadge s={m.data_source === 'MANUAL' ? 'MANUAL' : 'SIMULATED'} /></td></tr>)}
      </tbody></table></Panel>
      {sel && <Detail id={sel} onClose={() => setSel(null)} />}
      {nw && <Modal title="Manueller Messpunkt (MANUAL ENTRY)" onClose={() => setNw(false)}>
        <div className="grid grid-cols-2 gap-3">
          <div><div className="lbl">Gerät / Quelle</div><input className="inp w-full" value={man.device} onChange={(e) => setMan({ ...man, device: e.target.value })} /></div>
          <div><div className="lbl">Messwert</div><input className="inp w-full" value={man.value} onChange={(e) => setMan({ ...man, value: e.target.value })} /></div>
          <div><div className="lbl">Einheit</div><Select className="w-full" value={man.unit} onChange={(v) => setMan({ ...man, unit: v })} options={['ppm', 'ppb', 'mg/m³', 'g/m³', '% vol', '%LEL', '°C', 'hPa', 'm/s', 'km/h', 'µSv/h', 'mSv/h', 'Bq', 'Bq/m³', 'cps'].map((u) => [u, u] as [string, string])} /></div>
          <div><div className="lbl">Ergebnis</div><input className="inp w-full" value={man.headline} onChange={(e) => setMan({ ...man, headline: e.target.value })} /></div>
          <div className="col-span-2"><div className="lbl">Bemerkung</div><input className="inp w-full" value={man.remark} onChange={(e) => setMan({ ...man, remark: e.target.value })} /></div></div>
        <div className="mt-3 flex justify-end"><Btn kind="primary" onClick={add}>Speichern</Btn></div></Modal>}
    </Page>
  );
}
