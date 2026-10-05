import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapView, DEFAULT_LAYERS, LAYER_LABELS } from '../components/MapView';
import { Panel, Field, Badge, StatusBadge, LevelBadge, DataBadge, Page } from '../components/ui';
import { useApi, useLive } from '../store';
import { fmtPos, dt } from '../lib/format';
import { RunCard } from '../components/RunCard';
import { WeatherCopy } from '../components/WeatherCopy';

export default function MapPage() {
  const [layers, setLayers] = useState(DEFAULT_LAYERS); const [sel, setSel] = useState<{ type: string; id: string } | null>(null); const [follow, setFollow] = useState(true);
  const { weather, meta } = useLive();
  return (
    <div className="h-full flex">
      <div className="flex-1 min-w-0 relative">
        <MapView layers={layers} onSelect={setSel} follow={follow} />
      </div>
      <aside className="w-72 shrink-0 border-l border-line bg-panel overflow-auto p-3 space-y-3">
        <RunCard compact />
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
  return (<div className="space-y-2"><div className="lbl">Probe</div><div className="text-[15px] font-mono">{s.id}</div><Field label="Art">{s.kind}</Field><Field label="Zeit">{dt(s.ts)}</Field><Field label="Labor"><Badge>{s.lab_status}</Badge></Field><Link to="/proben" className="block text-accent">Zur Probenahme →</Link></div>);
}
export { Page, Panel };
