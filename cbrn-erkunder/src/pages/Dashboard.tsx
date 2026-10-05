import { Link } from 'react-router-dom';
import { Page, Panel, Stat, StatusBadge, Badge, CatBadge } from '../components/ui';
import { MapView, DEFAULT_LAYERS } from '../components/MapView';
import { useApi, useLive } from '../store';
import { EndIncidentModal } from '../components/IncidentReport';
import { Btn } from '../components/ui';
import { useState } from 'react';
import { devCalc, DEVICE_KEYS } from '../lib/devices';
import { RunCard } from '../components/RunCard';
import { WeatherCopy } from '../components/WeatherCopy';
import { num, STATUS_COLOR, fmtPos } from '../lib/format';

export default function Dashboard() {
  const { live, mpCount, weather, meta, own, ownVehicle, incident } = useLive();
  const v = ownVehicle; const r = live[own]; const [endOpen, setEndOpen] = useState(false);
  const missions = useApi<any[]>('/missions', ['mission.created', 'mission.updated']);
  const samples = useApi<any[]>('/samples', ['sample.created', 'sample.updated']);
  const alarms = useApi<any[]>('/alarms', ['alarm.created']);
  const devices = useApi<any[]>('/devices');
  const readyN = DEVICE_KEYS.filter((k) => devCalc(r?.devices, k).state === 'ready').length;
  const activeM = (missions.data ?? []).filter((m) => ['ÜBERMITTELT', 'ANGENOMMEN', 'IN BEARBEITUNG'].includes(m.status));
  const open = (alarms.data ?? []).filter((a) => a.status === 'OFFEN');
  return (
    <Page title="Dashboard" sub={`Einsatzübersicht – ${v?.name ?? ""}`}>
    <div className="h-full flex flex-col gap-3">
      <div className="grid grid-cols-8 gap-2">
        <Stat label="Fahrzeug" value={<span className="text-[15px]">{v?.name ?? '–'}</span>} sub={<StatusBadge s={v?.status} />} />
        <Stat label="GPS" value={<span style={{ color: STATUS_COLOR(v?.gps_fix ? 'FIX' : 'KEIN') }}>{v?.gps_fix ? 'FIX' : 'KEIN FIX'}</span>} sub={r ? fmtPos(meta?.map?.mode, r.lat, r.lon) : ''} />
        <Stat label="DFÜ" value={<span style={{ color: STATUS_COLOR(v?.link) }}>{v?.link ?? '–'}</span>} />
        <Stat label="Messgeräte" value={`${readyN} / ${DEVICE_KEYS.length}`} sub="betriebsbereit" />
        <Stat label="Aktive Aufträge" value={activeM.length} />
        <Stat label="Messpunkte" value={mpCount.toLocaleString('de-DE')} />
        <Stat label="Proben" value={samples.data?.length ?? 0} />
        <Stat label="Warnungen" value={open.length} color={open.length ? '#d29922' : undefined} />
      </div>
      <RunCard />
      <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
        <Panel title="Einsatzkarte" className="col-span-8 min-h-0" right={<Link to="/karte" className="text-accent">Vollbild →</Link>} body="!p-0">
          <MapView layers={{ ...DEFAULT_LAYERS, weather: true }} />
        </Panel>
        <div className="col-span-4 flex flex-col gap-3 min-h-0">
          <Panel title="Einsatz" right={incident && <Badge color="#3fb950">AKTIV</Badge>}>
            {incident ? (<><div className="text-[14px] font-semibold">{incident.id} · {incident.name}</div>
              <div className="text-[12px] text-dim">{incident.location_text ?? 'Ort nicht angegeben'} · {incident.category_text} · Menge {incident.amount}</div>
              {incident.report && <div className="text-[12.5px] mt-2">{incident.report}</div>}
              <div className="text-[12px] mt-2">Stoff: {incident.ref_hidden ? <Badge>UNBEKANNT / VERDECKT</Badge> : <b>{incident.ref_name}</b>}</div>
              <div className="mt-3"><Btn kind="danger" onClick={() => setEndOpen(true)}>Einsatz beenden …</Btn></div>{endOpen && <EndIncidentModal onClose={() => setEndOpen(false)} />}</>) : <div className="text-dim">Kein aktiver Einsatz</div>}
          </Panel>
          <Panel title="Wetterdaten">
            {weather && <div className="grid grid-cols-2 gap-2 font-mono mb-3"><span>{num(weather.temperature, 1)} °C</span><span>{num(weather.humidity, 0)} % rF</span><span>{num(weather.pressure, 0)} hPa</span><span>{num(weather.wind_speed, 1)} m/s</span>
              <span className="col-span-2">Wind kommt aus {weather.wind_from_text} ({num(weather.wind_from, 0)}°)</span></div>}
            <WeatherCopy />
          </Panel>
        </div>
      </div>
    </div>
    </Page>
  );
}
