import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapView, DEFAULT_LAYERS, LAYER_LABELS } from '../components/MapView';
import { Panel, Field, Badge, StatusBadge, LevelBadge, DataBadge, Page } from '../components/ui';
import { useApi, useLive } from '../store';
import { fmtPos, dt } from '../lib/format';
import { RunCard } from '../components/RunCard';
import { api } from '../api';
import { Btn, Select } from '../components/ui';
import { WeatherCopy } from '../components/WeatherCopy';

export default function MapPage() {
  const [layers, setLayers] = useState(DEFAULT_LAYERS); const [sel, setSel] = useState<{ type: string; id: string } | null>(null); const [follow, setFollow] = useState(true);
  const { weather, meta, incident } = useLive(); const fires = useApi<any[]>('/fires', ['fires.changed', 'incident.changed']);
  const [draw, setDraw] = useState(false); const [fsize, setFsize] = useState('mittel'); const [ftype, setFtype] = useState('GEBAEUDE'); const [ferr, setFerr] = useState('');
  const [cal, setCal] = useState(false); const [calMsg, setCalMsg] = useState(''); const { status, ownVehicle } = useLive();
  const gta = meta?.map?.mode === 'gta5'; const fivemOn = status?.fivem === 'CONNECTED' && !!ownVehicle?.gps_fix;
  const doCal = async (p: { lat: number; lon: number }) => { try { setCalMsg(''); const r = await api('/system/calibrate-point', { method: 'POST', body: { x: p.lon * 111320, y: p.lat * 111320 } }); setCalMsg(`Abgleich ${r.points} Punkt${r.points === 1 ? '' : 'e'} · größte Restabweichung ${r.max_error_m} m${r.points < 2 ? ' – für den Maßstab bitte an einer zweiten, weit entfernten Stelle wiederholen' : ''}`); setCal(false); } catch (e: any) { setCalMsg(e.message); } };
  const place = async (p: { lat: number; lon: number }) => { try { setFerr(''); await api('/fires', { method: 'POST', body: { ...p, size: fsize, type: ftype } }); setDraw(false); } catch (e: any) { setFerr(e.message); } };
  return (
    <div className="h-full flex">
      <div className="flex-1 min-w-0 relative">
        <MapView layers={layers} onSelect={setSel} follow={follow} onMapClick={draw ? place : cal ? doCal : undefined} />
      </div>
      <aside className="w-72 shrink-0 border-l border-line bg-panel overflow-auto p-3 space-y-3">
        <RunCard compact />
        {incident && <div><div className="lbl mb-1">Brandstellen</div>
          <div className="space-y-1">
            <Select className="w-full" value={ftype} onChange={setFtype} options={[['GEBAEUDE', 'Gebäudebrand'], ['FAHRZEUG', 'Fahrzeugbrand'], ['INDUSTRIE', 'Industrie-/Lagerbrand'], ['VEGETATION', 'Vegetations-/Flächenbrand']]} />
            <Select className="w-full" value={fsize} onChange={setFsize} options={[['klein', 'Klein'], ['mittel', 'Mittel'], ['groß', 'Groß']]} />
            <Btn kind={draw ? 'danger' : 'primary'} onClick={() => { setDraw(!draw); setCal(false); }}>{draw ? 'Abbrechen – Karte anklicken …' : '🔥 Brandstelle einzeichnen'}</Btn>
            {ferr && <div className="text-bad text-[12px]">{ferr}</div>}
            {(fires.data ?? []).map((f) => <div key={f.id} className="flex items-center gap-2 text-[12px]"><span className="flex-1">{f.id} · {f.type_text} · {f.size}</span><button className="text-bad" title="Gelöscht / abgelöscht" onClick={() => api('/fires/' + f.id, { method: 'DELETE' })}>✕</button></div>)}
          </div></div>}
        {gta && <div><div className="lbl mb-1">Kartenabgleich</div>
          <div className="text-[12px] text-dim mb-1">Stimmt der Fahrzeugpfeil nicht mit deiner echten Position überein: Klicke „Hier stehe ich“ und dann auf die Karte an die Stelle, an der du wirklich bist. Mit einem zweiten Punkt an einem anderen Ort wird auch der Maßstab korrigiert.</div>
          <div className="flex gap-2 flex-wrap"><Btn kind={cal ? 'danger' : 'primary'} onClick={() => { setCal(!cal); setDraw(false); setCalMsg(''); }} disabled={!fivemOn}>{cal ? 'Abbrechen – Karte anklicken …' : 'Hier stehe ich'}</Btn>
            <Btn onClick={async () => { await api('/system/calibrate', { method: 'POST', body: { reset: true } }); setCalMsg('Abgleich zurückgesetzt'); }}>Zurücksetzen</Btn></div>
          {!fivemOn && <div className="text-warn text-[12px] mt-1">Nur mit FiveM-Verbindung (im Fahrzeug, Computer angemeldet).</div>}
          {calMsg && <div className="text-[12px] mt-1">{calMsg}</div>}</div>}
        <div><div className="lbl mb-1">Layer</div>
          {LAYER_LABELS.map(([k, l]) => <label key={k} className="flex items-center gap-2 py-[3px] cursor-pointer"><input type="checkbox" checked={!!layers[k]} onChange={(e) => setLayers({ ...layers, [k]: e.target.checked })} />{l}</label>)}
          <label className="flex items-center gap-2 py-[3px] cursor-pointer"><input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} />Fahrzeug folgen</label>
        </div>
        {weather && <div><div className="lbl">Wind kommt aus</div><div className="val">{weather.wind_from_text} ({weather.wind_from}°) · {weather.wind_speed} m/s</div><div className="mt-1"><WeatherCopy compact /></div></div>}
        {sel?.type === 'points' && <MeasInfo id={sel.id} mode={meta?.map?.mode} />}
        {sel?.type === 'samples' && <SampleInfo id={sel.id} />}
        {sel?.type === 'others' && <div><div className="lbl">Fahrzeug</div><div className="val">{sel.id}</div></div>}
        {!sel && <div className="text-dim text-[12px]">Messpunkt, Probe oder Fahrzeug auf der Karte anklicken.</div>}
      </aside>
    </div>
  );
}
function MeasInfo({ id, mode }: { id: string; mode?: string }) {
  const m = useApi<any>(`/measurements/${id}`, ['measurement.updated'], [id]).data; if (!m) return null;
  return (
    <div className="space-y-2">
      <div className="lbl">Messpunkt</div><div className="text-[15px] font-mono">{m.id}</div>
      <Field label="Zeit">{dt(m.ts)}</Field><Field label="GPS">{fmtPos(mode, m.lat, m.lon)}</Field><Field label="Gerät">{m.device} · {m.vehicle_id}</Field>
      <Field label="Ergebnis">{m.value ?? '–'} {m.unit ?? ''} <StatusBadge s={m.status} /></Field><Field label="Einstufung"><LevelBadge l={m.level} /></Field><Field label="Datenherkunft"><DataBadge s={m.data_source === 'MANUAL' ? 'MANUAL' : 'SIMULATED'} /></Field>
      <div className="text-[12px]">{m.headline}</div>
      {m.substance && <Link to={`/stoffe/${m.substance.id}`} className="btn btn-primary inline-block">Stoffdatenbank öffnen: {m.substance.name}</Link>}
      <Link to="/messpunkte" className="block text-accent">Zu den Messpunkten →</Link>
    </div>
  );
}
function SampleInfo({ id }: { id: string }) {
  const s = useApi<any>(`/samples/${id}`, ['sample.updated'], [id]).data; if (!s) return null;
  return (<div className="space-y-2"><div className="lbl">Probe</div><div className="text-[15px] font-mono">{s.id}</div><Field label="Bezeichnung" mono={false}>{s.label ?? 'unbeschriftet'}</Field><Field label="Art" mono={false}>{s.type_text}</Field><Field label="Zeit">{dt(s.ts)}</Field><Field label="Status"><Badge>{s.status_text}</Badge></Field><Link to={`/proben/${s.id}`} className="btn btn-primary inline-block">Details</Link></div>);
}
export { Page, Panel };
