import { useState } from 'react';
import { Page, Panel, Field, Btn, Select, Badge, StatusBadge, LevelBadge } from '../components/ui';
import { api, url } from '../api';
import { useApi, useLive } from '../store';
import { dt, time, coord, NA } from '../lib/format';

function TrackSvg({ track }: { track: number[][] }) {
  if (track.length < 2) return <div className="text-dim">{NA}</div>;
  const xs = track.map((p) => p[0]), ys = track.map((p) => p[1]); const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const px = (x: number) => 8 + ((x - x0) / (x1 - x0 || 1)) * 584, py = (y: number) => 192 - ((y - y0) / (y1 - y0 || 1)) * 184;
  return <svg viewBox="0 0 600 200" className="w-full bg-bg border border-line"><polyline fill="none" stroke="#4a8fd6" strokeWidth="2" points={track.map((p) => `${px(p[0])},${py(p[1])}`).join(' ')} /></svg>;
}

export function ReportView({ r }: { r: any }) {
  return (
    <div className="space-y-3">
      <div className="text-[11px] text-[#d6742a] border border-[#d6742a]/50 px-2 py-1">{r.notice}</div>
      <div className="grid grid-cols-4 gap-3"><Field label="Einsatznummer">{r.number}</Field><Field label="Fahrzeug">{r.vehicle?.name}</Field><Field label="Start">{dt(r.start)}</Field><Field label="Ende">{r.end ? dt(r.end) : 'laufend'}</Field>
        <Field label="Auftrag">#{r.mission.id} · {r.mission.priority}</Field><Field label="Gebiet">{r.mission.sector_name}</Field><Field label="Messprofil">{r.mission.profile}</Field><Field label="Erstellt von">{r.author}</Field></div>
      <div><div className="lbl">Besatzung</div>{r.crew.map((c: any) => `${c.role}: ${c.name}`).join(' · ')}</div>
      <div className="grid grid-cols-3 gap-3"><Field label="Messgeräte">{r.devices.join(', ') || NA}</Field><Field label="Messpunkte">{r.measurement_count}</Field><Field label="Auffälligkeiten">{r.anomalies}</Field></div>
      <div><div className="lbl mb-1">Track</div><TrackSvg track={r.track} /></div>
      <div><div className="lbl mb-1">Auffälligkeiten</div><table className="t"><tbody>{r.measurements.filter((m: any) => m.status !== 'NORMAL').slice(0, 30).map((m: any) => <tr key={m.id}><td className="font-mono">{m.id}</td><td>{time(m.ts)}</td><td>{m.device}</td><td>{m.headline}</td><td><LevelBadge l={m.level} /></td><td><StatusBadge s={m.status} /></td></tr>)}</tbody></table></div>
      <div><div className="lbl mb-1">Stoffreferenzen</div>{r.substance_refs.length ? r.substance_refs.map((s: any) => <div key={s.id}>{s.name} · CAS {s.cas} · Datenstatus {s.quality} · Quelle {s.source}</div>) : <span className="text-dim">keine</span>}</div>
      <div><div className="lbl mb-1">Proben</div>{r.samples.length ? r.samples.map((s: any) => <div key={s.id} className="font-mono">{s.id} · {s.kind} · {s.lab_status}{s.lab_result ? ` · ${s.lab_result.text}` : ''}</div>) : <span className="text-dim">keine</span>}</div>
      <div><div className="lbl mb-1">Wetter (Wind kommt aus)</div>{r.weather.length ? (() => { const w = r.weather.at(-1); return <span className="font-mono">{w.temperature} °C · {w.humidity} % · {w.pressure} hPa · {w.wind_speed} m/s aus {w.wind_from_text} ({w.wind_from}°)</span>; })() : NA}</div>
      <div><div className="lbl mb-1">Alarme</div>{r.alarms.length ? r.alarms.map((a: any) => <div key={a.id}>{time(a.ts)} · {a.category} · {a.description}</div>) : <span className="text-dim">keine</span>}</div>
      <div><div className="lbl mb-1">Bemerkungen</div>{r.remarks || '–'}</div>
    </div>
  );
}

export default function Reports() {
  const { can } = useLive(); const missions = useApi<any[]>('/missions', ['mission.updated']); const reports = useApi<any[]>('/reports'); const [mid, setMid] = useState(''); const [cur, setCur] = useState<any>(null); const [err, setErr] = useState('');
  const create = async () => { try { const r = await api('/reports', { method: 'POST', body: { mission_id: mid || missions.data?.[0]?.id } }); setCur(r); reports.reload(); } catch (e: any) { setErr(e.message); } };
  const open = async (id: string) => setCur(await api('/reports/' + id));
  const dl = (id: string, ext: string) => window.open(url(`/api/reports/${id}/${ext}`), '_blank');
  return (
    <Page title="Einsatzberichte" sub="Export: PDF · CSV · JSON" right={<>
      <Select value={mid || missions.data?.[0]?.id || ''} onChange={setMid} options={(missions.data ?? []).map((m) => [m.id, `#${m.id} ${m.vehicle_id} – ${m.sector_name}`] as [string, string])} />
      <Btn kind="primary" onClick={create} disabled={!can(2)} title={!can(2) ? 'Truppführer erforderlich' : ''}>Bericht erstellen / aktualisieren</Btn></>}>
      {err && <div className="text-bad mb-2">{err}</div>}
      <div className="grid grid-cols-12 gap-3">
        <Panel title="Berichte" className="col-span-3" body="!p-0"><table className="t"><tbody>{(reports.data ?? []).map((r) => <tr key={r.id} className="cursor-pointer" onClick={() => open(r.id)}><td className="font-mono">{r.id}</td><td>{dt(r.created_at)}</td></tr>)}
          {!(reports.data ?? []).length && <tr><td className="text-dim">Noch keine Berichte</td></tr>}</tbody></table></Panel>
        <div className="col-span-9">{cur ? <Panel title={`Einsatzbericht ${cur.number}`} right={<span className="no-print flex gap-2"><Badge color="#d6742a">SIMULATION</Badge><Btn onClick={() => dl(cur.id, 'pdf')}>PDF</Btn><Btn onClick={() => dl(cur.id, 'csv')}>CSV</Btn><Btn onClick={() => { const b = new Blob([JSON.stringify(cur, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `${cur.id}.json`; a.click(); }}>JSON</Btn><Btn onClick={() => window.print()}>Drucken</Btn></span>}><ReportView r={cur} /></Panel>
          : <Panel><div className="text-dim py-8 text-center">Bericht auswählen oder erstellen</div></Panel>}</div>
      </div>
    </Page>
  );
}
export { coord };
