import { useState } from 'react';
import { Page, Panel, StatusBadge, Badge, Btn, Select, Field } from '../components/ui';
import { api } from '../api';
import { useApi, useLive } from '../store';
import { dt } from '../lib/format';

export function MissionForm({ onDone }: { onDone?: () => void }) {
  const { meta, vehicles, can, own } = useLive();
  const [f, setF] = useState({ vehicle_id: own, sector: 'NORD', priority: 'HOCH', profile: 'CHEMISCH + RADIOLOGISCH', notes: '' }); const [msg, setMsg] = useState('');
  const send = async () => { try { const m = await api('/missions', { method: 'POST', body: f }); setMsg(`Auftrag #${m.id} übermittelt`); onDone?.(); } catch (e: any) { setMsg(e.message); } };
  return (
    <Panel title="Messauftrag erstellen (CBRN-Messleitkomponente)">
      <div className="grid grid-cols-2 gap-3">
        <div><div className="lbl">Fahrzeug</div><Select className="w-full" value={f.vehicle_id} onChange={(v) => setF({ ...f, vehicle_id: v })} options={vehicles.map((v) => [v.id, `${v.name} (${v.link === 'ONLINE' ? 'FiveM verbunden' : 'FiveM getrennt'})`] as [string, string])} /></div>
        <div><div className="lbl">Gebiet</div><Select className="w-full" value={f.sector} onChange={(v) => setF({ ...f, sector: v })} options={(meta?.sectors ?? []).map((s: any) => [s.key, s.name] as [string, string])} /></div>
        <div><div className="lbl">Priorität</div><Select className="w-full" value={f.priority} onChange={(v) => setF({ ...f, priority: v })} options={[['NIEDRIG', 'NIEDRIG'], ['NORMAL', 'NORMAL'], ['HOCH', 'HOCH'], ['DRINGEND', 'DRINGEND']]} /></div>
        <div><div className="lbl">Messprofil</div><Select className="w-full" value={f.profile} onChange={(v) => setF({ ...f, profile: v })} options={['CHEMISCH', 'RADIOLOGISCH', 'CHEMISCH + RADIOLOGISCH', 'PROBENAHME', 'BIOLOGISCH (PROBENAHME)'].map((x) => [x, x] as [string, string])} /></div>
        <div className="col-span-2"><div className="lbl">Bemerkung</div><input className="inp w-full" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
      </div>
      <div className="mt-3 flex items-center gap-3"><Btn kind="primary" onClick={send} disabled={!can(3)} title={!can(3) ? 'Nur Messleitung/Administrator' : ''}>Auftrag senden</Btn><span className="text-dim">{!can(3) ? 'Rolle „Messleitung“ erforderlich' : msg}</span></div>
    </Panel>
  );
}

export function MissionTable({ missions, reload }: { missions: any[]; reload?: () => void }) {
  const { can } = useLive(); const [err, setErr] = useState('');
  const act = async (id: string, status: string) => { try { await api(`/missions/${id}`, { method: 'PATCH', body: { status } }); setErr(''); reload?.(); } catch (e: any) { setErr(e.message); } };
  return (<>
    {err && <div className="text-bad mb-2">{err}</div>}
    <table className="t"><thead><tr><th>Auftrag</th><th>Fahrzeug</th><th>Priorität</th><th>Gebiet</th><th>Messprofil</th><th>Status</th><th>Erstellt</th><th></th></tr></thead><tbody>
      {missions.map((m) => (
        <tr key={m.id}><td className="font-mono">#{m.id}</td><td>{m.vehicle_id}</td><td><Badge color={m.priority === 'HOCH' || m.priority === 'DRINGEND' ? '#e5534b' : '#817d78'}>{m.priority}</Badge></td><td>{m.sector_name}</td><td>{m.profile}</td><td><StatusBadge s={m.status} /></td><td>{dt(m.created_at)}</td>
          <td className="whitespace-nowrap space-x-1">
            {m.status === 'ÜBERMITTELT' && <Btn onClick={() => act(m.id, 'ANGENOMMEN')}>Annehmen</Btn>}
            {['ÜBERMITTELT', 'ANGENOMMEN'].includes(m.status) && <Btn onClick={() => act(m.id, 'IN BEARBEITUNG')}>Starten</Btn>}
            {['ANGENOMMEN', 'IN BEARBEITUNG'].includes(m.status) && <Btn kind="primary" disabled={!can(2)} title={!can(2) ? 'Truppführer erforderlich' : ''} onClick={() => act(m.id, 'ABGESCHLOSSEN')}>Abschließen</Btn>}
            {['ÜBERMITTELT', 'ANGENOMMEN', 'IN BEARBEITUNG'].includes(m.status) && can(3) && <Btn kind="danger" onClick={() => act(m.id, 'ABGEBROCHEN')}>Abbrechen</Btn>}
          </td></tr>))}
    </tbody></table></>);
}

export default function Missions() {
  const { data, reload } = useApi<any[]>('/missions', ['mission.created', 'mission.updated']);
  return (
    <Page title="Messaufträge" sub="Aufträge der CBRN-Messleitkomponente an zugewiesene Erkundungswagen">
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-8"><Panel title="Aufträge" body="!p-0"><MissionTable missions={data ?? []} reload={reload} /></Panel></div>
        <div className="col-span-4"><MissionForm onDone={reload} /></div>
      </div>
    </Page>
  );
}
export { Field };
