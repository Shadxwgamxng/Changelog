import { useEffect, useState } from 'react';
import { Page, Panel, StatusBadge, Badge, Btn, Select, Field } from '../components/ui';
import { MapView, DEFAULT_LAYERS } from '../components/MapView';
import { MissionForm, MissionTable } from './Missions';
import { api } from '../api';
import { useApi, useLive } from '../store';
import { CAT, STATUS_COLOR, time, num } from '../lib/format';

export default function Mlk() {
  const { vehicles, can, status } = useLive(); const [live, setLive] = useState<Record<string, any>>({});
  useEffect(() => { const f = () => api('/live').then((d) => setLive(d.vehicles)).catch(() => {}); f(); const t = setInterval(f, 3000); return () => clearInterval(t); }, []);
  const missions = useApi<any[]>('/missions', ['mission.created', 'mission.updated']); const alarms = useApi<any[]>('/alarms', ['alarm.created']); const lage = useApi<any>('/situation', ['alarm.created']);
  const samples = useApi<any[]>('/samples', ['sample.created', 'sample.updated']); const mp = useApi<any[]>('/measurements?anomalies=1&limit=10', ['measurement.created']);
  const scen = useApi<any[]>('/scenarios'); const active = useApi<any>('/scenario/active', ['system.status'], [status?.scenario]);
  const act = (missions.data ?? []).filter((m) => ['ÜBERMITTELT', 'ANGENOMMEN', 'IN BEARBEITUNG'].includes(m.status)); const L = lage.data ?? {};
  const dis = (st: string) => (st === 'OFFLINE' ? 'OFFLINE' : st);
  return (
    <Page title="CBRN-Messleitung" sub="Virtuelle CBRN-Messleitkomponente (MLK) – zugewiesene Erkundungswagen, Aufträge und Lagebild">
      <div className="grid grid-cols-12 gap-3">
        <Panel title="Fahrzeuge" className="col-span-3">
          {vehicles.map((v) => { const busy = (missions.data ?? []).some((m) => m.vehicle_id === v.id && m.status === 'IN BEARBEITUNG'); const st = !v.online ? 'OFFLINE' : busy ? 'MESSUNG' : 'ONLINE'; const r = live[v.id];
            return (<div key={v.id} className="py-1.5 border-b border-line/60 last:border-0"><div className="flex justify-between"><b>{v.id}</b><span style={{ color: st === 'MESSUNG' ? '#58a6ff' : STATUS_COLOR(st) }} className="font-mono text-[12px]">● {dis(st)}</span></div>
              {r && v.online && <div className="text-[11px] text-dim font-mono">{num(r.speed_kmh, 0)} km/h · PID {num(r.pid.value, 1)} ppm · {num(r.dose.value, 2)} µSv/h</div>}</div>); })}
          <div className="mt-3 lbl">Datenverbindung</div>{vehicles.map((v) => <div key={v.id} className="flex justify-between text-[12px]"><span>{v.id}</span><StatusBadge s={v.link} /></div>)}
        </Panel>
        <Panel title="Live-Einsatzlage" className="col-span-6 h-[420px]" body="!p-0"><MapView layers={{ ...DEFAULT_LAYERS, weather: true }} follow={false} /></Panel>
        <div className="col-span-3 space-y-3">
          <Panel title="CBRN-Lage">
            {[['C', 'CHEMISCH', L.CHEMISCH], ['R', 'RADIOLOGISCH', L.RADIOLOGISCH], ['B', 'BIOLOGISCH', L.BIOLOGISCH], ['N', 'NUKLEAR', L.NUKLEAR], ['U', 'UNBEKANNT', L.UNBEKANNT]].map(([k, l, n]) => (
              <div key={k as string} className="flex items-center justify-between py-0.5"><span className="flex items-center gap-2"><i className="w-3 h-3 rounded-full inline-block" style={{ background: n ? CAT[k as string].color : '#272727' }} />{l}</span><span className="font-mono">{n ?? 0}</span></div>))}
          </Panel>
          <Panel title="Szenario (Simulation)">
            <div className="text-[12px] mb-1">Aktiv: <b>{active.data?.name}</b> <Badge color="#f0500a">SIMULIERT</Badge></div>
            <Select className="w-full" value={status?.scenario ?? ''} onChange={(id) => api('/system/scenario', { method: 'POST', body: { id } })} options={(scen.data ?? []).map((s) => [s.id, `${s.name} (${s.category})`] as [string, string])} />
            {!can(3) && <div className="text-dim text-[11px] mt-1">Umschalten: Messleitung/Administrator</div>}
          </Panel>
        </div>
        <Panel title="Aktive Aufträge" className="col-span-8" body="!p-0"><MissionTable missions={act} reload={missions.reload} /></Panel>
        <div className="col-span-4"><MissionForm onDone={missions.reload} /></div>
        <Panel title="Warnungen" className="col-span-4" body="!p-0"><table className="t"><tbody>{(alarms.data ?? []).filter((a) => a.status === 'OFFEN').slice(0, 8).map((a) => <tr key={a.id}><td className="font-mono">{time(a.ts)}</td><td><Badge color={CAT[a.category[0]]?.color}>{a.category}</Badge></td><td>{a.description}</td></tr>)}</tbody></table></Panel>
        <Panel title="Letzte Messpunkte (Auffälligkeiten)" className="col-span-4" body="!p-0"><table className="t"><tbody>{(mp.data ?? []).map((m) => <tr key={m.id}><td className="font-mono">{m.id}</td><td>{m.vehicle_id}</td><td>{m.device}</td><td><StatusBadge s={m.status} /></td></tr>)}</tbody></table></Panel>
        <Panel title="Proben" className="col-span-4" body="!p-0"><table className="t"><tbody>{(samples.data ?? []).slice(0, 8).map((s) => <tr key={s.id}><td className="font-mono">{s.id}</td><td>{s.kind}</td><td><StatusBadge s={s.lab_status} /></td></tr>)}</tbody></table></Panel>
      </div>
    </Page>
  );
}
export { Btn, Field };
