import { useState } from 'react';
import { Page, Panel, Tabs, StatusBadge, Badge, Btn } from '../components/ui';
import { api } from '../api';
import { useApi, useLive } from '../store';
import { CAT, dt, num } from '../lib/format';

export default function History() {
  const [tab, setTab] = useState('alarme'); const alarms = useApi<any[]>('/alarms', ['alarm.created']); const audit = useApi<any[]>('/audit', ['measurement.updated', 'mission.updated', 'sample.updated', 'measurement.created', 'sample.created']);
  const missions = useApi<any[]>('/missions', ['mission.updated']); const runs = useApi<any[]>('/runs', ['run.started', 'run.stopped']);
  const ack = async (id: string, status: string) => { await api('/alarms/' + id, { method: 'PATCH', body: { status } }); alarms.reload(); };
  const { meta } = useLive(); const un = (id: string) => meta?.users?.find((u: any) => u.id === id)?.name ?? id;
  return (
    <Page title="Historie" sub="Alarme, Audit-Log und abgeschlossene Aufträge">
      <Tabs tabs={[['alarme', 'Alarme'], ['fahrten', 'Messfahrten'], ['audit', 'Audit-Log'], ['auftraege', 'Aufträge']]} value={tab} onChange={setTab} />
      {tab === 'alarme' && <Panel body="!p-0"><table className="t"><thead><tr><th>ID</th><th>Zeit</th><th>Quelle</th><th>Position</th><th>Kategorie</th><th>Status</th><th>Beschreibung</th><th></th></tr></thead><tbody>
        {(alarms.data ?? []).map((a) => <tr key={a.id}><td className="font-mono">{a.id}</td><td>{dt(a.ts)}</td><td>{a.source} · {a.vehicle_id}</td><td className="font-mono text-[11px]">{a.lat?.toFixed(4)} / {a.lon?.toFixed(4)}</td><td><Badge color={CAT[a.category[0]]?.color ?? '#817d78'}>{a.category}</Badge></td><td><StatusBadge s={a.status} /></td><td>{a.description}</td>
          <td className="space-x-1">{a.status === 'OFFEN' && <Btn onClick={() => ack(a.id, 'QUITTIERT')}>Quittieren</Btn>}{a.status !== 'ERLEDIGT' && <Btn onClick={() => ack(a.id, 'ERLEDIGT')}>Erledigt</Btn>}</td></tr>)}</tbody></table></Panel>}
      {tab === 'fahrten' && <Panel body="!p-0"><table className="t"><thead><tr><th>ID</th><th>Name</th><th>Start</th><th>Ende</th><th>Strecke</th><th>Messpunkte</th><th>Max. Dosisleistung</th><th>Quelle</th></tr></thead><tbody>
        {(runs.data ?? []).map((r) => <tr key={r.id}><td className="font-mono">{r.id}</td><td>{r.name}{r.active && <span className="ml-2"><Badge color="#e5534b" solid>läuft</Badge></span>}</td><td>{dt(r.started_at)}</td><td>{r.ended_at ? dt(r.ended_at) : '–'}</td><td>{num((r.distance_m ?? 0) / 1000, 2)} km</td><td>{r.points}</td><td>{r.max_dose != null ? num(r.max_dose, 3) + ' µSv/h' : '–'}</td><td>{r.source}</td></tr>)}</tbody></table></Panel>}
      {tab === 'audit' && <Panel body="!p-0"><table className="t"><thead><tr><th>Zeit</th><th>Benutzer</th><th>Aktion</th><th>Objekt</th><th>Details</th></tr></thead><tbody>
        {(audit.data ?? []).map((a) => <tr key={a.id}><td className="font-mono">{dt(a.ts)}</td><td>{un(a.user_id)}</td><td>{a.action}</td><td className="font-mono">{a.entity} {a.entity_id}</td><td className="font-mono text-[11px] text-dim break-all">{a.detail}</td></tr>)}</tbody></table></Panel>}
      {tab === 'auftraege' && <Panel body="!p-0"><table className="t"><thead><tr><th>Auftrag</th><th>Fahrzeug</th><th>Gebiet</th><th>Status</th><th>Start</th><th>Ende</th></tr></thead><tbody>
        {(missions.data ?? []).filter((m) => ['ABGESCHLOSSEN', 'ABGEBROCHEN'].includes(m.status)).map((m) => <tr key={m.id}><td className="font-mono">#{m.id}</td><td>{m.vehicle_id}</td><td>{m.sector_name}</td><td><StatusBadge s={m.status} /></td><td>{dt(m.started_at)}</td><td>{dt(m.ended_at)}</td></tr>)}</tbody></table></Panel>}
    </Page>
  );
}
