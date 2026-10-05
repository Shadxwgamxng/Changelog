import { Link } from 'react-router-dom';
import { Page, Panel, Stat, StatusBadge, Badge, CatBadge } from '../components/ui';
import { MapView, DEFAULT_LAYERS } from '../components/MapView';
import { TimeChart } from '../components/Charts';
import { useApi, useLive } from '../store';
import { RunCard } from '../components/RunCard';
import { WeatherCopy } from '../components/WeatherCopy';
import { num, time, CAT, STATUS_COLOR, fmtPos } from '../lib/format';

export default function Dashboard() {
  const { status, live, mpCount, hist, weather, meta, own, ownVehicle, incident } = useLive();
  const v = ownVehicle; const r = live[own];
  const missions = useApi<any[]>('/missions', ['mission.created', 'mission.updated']);
  const samples = useApi<any[]>('/samples', ['sample.created', 'sample.updated']);
  const alarms = useApi<any[]>('/alarms', ['alarm.created']);
  const lage = useApi<any>('/situation', ['alarm.created']);
  const devices = useApi<any[]>('/devices');
  const activeM = (missions.data ?? []).filter((m) => ['ÜBERMITTELT', 'ANGENOMMEN', 'IN BEARBEITUNG'].includes(m.status));
  const open = (alarms.data ?? []).filter((a) => a.status === 'OFFEN');
  const L = lage.data ?? {};
  return (
    <Page title="Dashboard" sub={`Einsatzübersicht – ${v?.name ?? ""} (Messwerte simuliert)`}>
      <div className="grid grid-cols-8 gap-2 mb-3">
        <Stat label="Fahrzeug" value={<span className="text-[15px]">{v?.name ?? '–'}</span>} sub={<StatusBadge s={v?.status} />} />
        <Stat label="GPS" value={<span style={{ color: STATUS_COLOR(v?.gps_fix ? 'FIX' : 'KEIN') }}>{v?.gps_fix ? 'FIX' : 'KEIN FIX'}</span>} sub={r ? fmtPos(meta?.map?.mode, r.lat, r.lon) : ''} />
        <Stat label="DFÜ" value={<span style={{ color: STATUS_COLOR(v?.link) }}>{v?.link ?? '–'}</span>} />
        <Stat label="Messgeräte" value={`${devices.data?.length ?? 7} / ${devices.data?.length ?? 7}`} sub="alle betriebsbereit" />
        <Stat label="Aktive Aufträge" value={activeM.length} />
        <Stat label="Messpunkte" value={mpCount.toLocaleString('de-DE')} />
        <Stat label="Proben" value={samples.data?.length ?? 0} />
        <Stat label="Warnungen" value={open.length} color={open.length ? '#d29922' : undefined} />
      </div>
      <RunCard />
      <div className="grid grid-cols-12 gap-3">
        <Panel title="Einsatzkarte" className="col-span-8 h-[420px]" right={<Link to="/karte" className="text-accent">Vollbild →</Link>} body="!p-0">
          <MapView layers={{ ...DEFAULT_LAYERS, weather: true }} />
        </Panel>
        <div className="col-span-4 flex flex-col gap-3">
          <Panel title="Einsatz" right={incident && <Badge color="#3fb950">AKTIV</Badge>}>
            {incident ? (<><div className="text-[14px] font-semibold">{incident.id} · {incident.name}</div>
              <div className="text-[12px] text-dim">{incident.location_text ?? 'Ort nicht angegeben'} · {incident.category_text} · Menge {incident.amount}</div>
              {incident.report && <div className="text-[12.5px] mt-2">{incident.report}</div>}
              <div className="text-[12px] mt-2">Stoff: {incident.ref_hidden ? <Badge>UNBEKANNT / VERDECKT</Badge> : <b>{incident.ref_name}</b>}</div></>) : <div className="text-dim">Kein aktiver Einsatz</div>}
          </Panel>
          <Panel title="CBRN-Lage">
            {[['C', 'CHEMISCH', L.CHEMISCH], ['R', 'RADIOLOGISCH', L.RADIOLOGISCH], ['B', 'BIOLOGISCH', L.BIOLOGISCH], ['N', 'NUKLEAR', L.NUKLEAR], ['U', 'UNBEKANNT', L.UNBEKANNT]].map(([k, l, n]) => (
              <div key={k as string} className="flex items-center justify-between py-1 border-b border-line/50 last:border-0">
                <span className="flex items-center gap-2"><i className="w-3 h-3 rounded-full inline-block" style={{ background: n ? CAT[k as string].color : '#272727' }} />{l}</span>
                <span className="font-mono">{n ? `${n} Auffälligkeit${n > 1 ? 'en' : ''}` : '0'}</span>
              </div>))}
          </Panel>
          <Panel title="Wetter" right={<WeatherCopy compact />}>
            {weather && <div className="grid grid-cols-2 gap-2 font-mono"><span>{num(weather.temperature, 1)} °C</span><span>{num(weather.humidity, 0)} % rF</span><span>{num(weather.pressure, 0)} hPa</span><span>{num(weather.wind_speed, 1)} m/s</span><span className="col-span-2">Wind kommt aus {weather.wind_from_text} ({num(weather.wind_from, 0)}°)</span></div>}
          </Panel>
        </div>
        <Panel title="PID – VOC" right={<Badge color="#d29922">SCREENING</Badge>} className="col-span-4">
          <TimeChart data={hist} series={[{ key: 'pid', color: '#d29922', name: 'PID' }]} unit="ppm" height={150} />
        </Panel>
        <Panel title="Dosisleistung" className="col-span-4"><TimeChart data={hist} series={[{ key: 'dose', color: '#f0500a', name: 'Dosisleistung' }]} unit="µSv/h" height={150} /></Panel>
        <Panel title="Letzte Warnungen / Alarme" className="col-span-4" right={<Link to="/historie" className="text-accent">alle →</Link>}>
          <table className="t"><tbody>
            {(alarms.data ?? []).slice(0, 6).map((a) => <tr key={a.id}><td className="font-mono">{time(a.ts)}</td><td><Badge color={CAT[a.category[0]]?.color ?? '#817d78'}>{a.category}</Badge></td><td>{a.description}</td></tr>)}
          </tbody></table>
        </Panel>
        <Panel title="Aktive Aufträge" className="col-span-12" right={<Link to="/auftraege" className="text-accent">Aufträge →</Link>}>
          <table className="t"><thead><tr><th>Auftrag</th><th>Fahrzeug</th><th>Priorität</th><th>Gebiet</th><th>Messprofil</th><th>Status</th></tr></thead><tbody>
            {activeM.map((m) => <tr key={m.id}><td className="font-mono">#{m.id}</td><td>{m.vehicle_id}</td><td><Badge color={m.priority === 'HOCH' ? '#e5534b' : '#817d78'}>{m.priority}</Badge></td><td>{m.sector_name}</td><td>{m.profile}</td><td><StatusBadge s={m.status} /></td></tr>)}
            {!activeM.length && <tr><td colSpan={6} className="text-dim">Keine aktiven Aufträge</td></tr>}
          </tbody></table>
        </Panel>
      </div>
    </Page>
  );
}
