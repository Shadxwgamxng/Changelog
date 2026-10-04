import { Link } from 'react-router-dom';
import { Page, Panel, Stat, StatusBadge, Badge, CatBadge } from '../components/ui';
import { MapView, DEFAULT_LAYERS } from '../components/MapView';
import { TimeChart } from '../components/Charts';
import { useApi, useLive } from '../store';
import { num, time, CAT, STATUS_COLOR, fmtPos } from '../lib/format';

export default function Dashboard() {
  const { status, vehicles, live, mpCount, hist, weather, meta } = useLive();
  const v = vehicles.find((x) => x.id === 'CBRN-01'); const r = live['CBRN-01'];
  const missions = useApi<any[]>('/missions', ['mission.created', 'mission.updated']);
  const samples = useApi<any[]>('/samples', ['sample.created', 'sample.updated']);
  const alarms = useApi<any[]>('/alarms', ['alarm.created']);
  const lage = useApi<any>('/situation', ['alarm.created']);
  const devices = useApi<any[]>('/devices');
  const activeM = (missions.data ?? []).filter((m) => ['ÜBERMITTELT', 'ANGENOMMEN', 'IN BEARBEITUNG'].includes(m.status));
  const open = (alarms.data ?? []).filter((a) => a.status === 'OFFEN');
  const L = lage.data ?? {};
  return (
    <Page title="Dashboard" sub="Einsatzübersicht – Fahrzeug CBRN-01 (Messwerte simuliert)">
      <div className="grid grid-cols-8 gap-2 mb-3">
        <Stat label="Fahrzeug" value={v?.name ?? '–'} sub={<StatusBadge s={v?.status} />} />
        <Stat label="GPS" value={<span style={{ color: STATUS_COLOR(v?.gps_fix ? 'FIX' : 'KEIN') }}>{v?.gps_fix ? 'FIX' : 'KEIN FIX'}</span>} sub={r ? fmtPos(meta?.map?.mode, r.lat, r.lon) : ''} />
        <Stat label="DFÜ" value={<span style={{ color: STATUS_COLOR(v?.link) }}>{v?.link ?? '–'}</span>} />
        <Stat label="Messgeräte" value={`${devices.data?.length ?? 7} / ${devices.data?.length ?? 7}`} sub="alle betriebsbereit (Demo)" />
        <Stat label="Aktive Aufträge" value={activeM.length} />
        <Stat label="Messpunkte" value={mpCount.toLocaleString('de-DE')} />
        <Stat label="Proben" value={samples.data?.length ?? 0} />
        <Stat label="Warnungen" value={open.length} color={open.length ? '#d9a21b' : undefined} />
      </div>
      <div className="grid grid-cols-12 gap-3">
        <Panel title="Einsatzkarte" className="col-span-8 h-[420px]" right={<Link to="/karte" className="text-accent">Vollbild →</Link>} body="!p-0">
          <MapView layers={{ ...DEFAULT_LAYERS, weather: true }} />
        </Panel>
        <div className="col-span-4 flex flex-col gap-3">
          <Panel title="CBRN-Lage">
            {[['C', 'CHEMISCH', L.CHEMISCH], ['R', 'RADIOLOGISCH', L.RADIOLOGISCH], ['B', 'BIOLOGISCH', L.BIOLOGISCH], ['N', 'NUKLEAR', L.NUKLEAR], ['U', 'UNBEKANNT', L.UNBEKANNT]].map(([k, l, n]) => (
              <div key={k as string} className="flex items-center justify-between py-1 border-b border-line/50 last:border-0">
                <span className="flex items-center gap-2"><i className="w-3 h-3 rounded-full inline-block" style={{ background: n ? CAT[k as string].color : '#2a3541' }} />{l}</span>
                <span className="font-mono">{n ? `${n} Auffälligkeit${n > 1 ? 'en' : ''}` : '0'}</span>
              </div>))}
          </Panel>
          <Panel title="Wetter">
            {weather && <div className="grid grid-cols-2 gap-2 font-mono"><span>{num(weather.temperature, 1)} °C</span><span>{num(weather.humidity, 0)} % rF</span><span>{num(weather.pressure, 0)} hPa</span><span>{num(weather.wind_speed, 1)} m/s</span><span className="col-span-2">Wind kommt aus {weather.wind_from_text} ({num(weather.wind_from, 0)}°)</span></div>}
          </Panel>
        </div>
        <Panel title="PID – VOC" right={<Badge color="#d9a21b">SCREENING</Badge>} className="col-span-4">
          <TimeChart data={hist} series={[{ key: 'pid', color: '#d9a21b', name: 'PID' }]} unit="ppm" height={150} />
        </Panel>
        <Panel title="Dosisleistung" className="col-span-4"><TimeChart data={hist} series={[{ key: 'dose', color: '#d6742a', name: 'Dosisleistung' }]} unit="µSv/h" height={150} /></Panel>
        <Panel title="Letzte Warnungen / Alarme" className="col-span-4" right={<Link to="/historie" className="text-accent">alle →</Link>}>
          <table className="t"><tbody>
            {(alarms.data ?? []).slice(0, 6).map((a) => <tr key={a.id}><td className="font-mono">{time(a.ts)}</td><td><Badge color={CAT[a.category[0]]?.color ?? '#8896a6'}>{a.category}</Badge></td><td>{a.description}</td></tr>)}
          </tbody></table>
        </Panel>
        <Panel title="Aktive Aufträge" className="col-span-12" right={<Link to="/auftraege" className="text-accent">Aufträge →</Link>}>
          <table className="t"><thead><tr><th>Auftrag</th><th>Fahrzeug</th><th>Priorität</th><th>Gebiet</th><th>Messprofil</th><th>Status</th></tr></thead><tbody>
            {activeM.map((m) => <tr key={m.id}><td className="font-mono">#{m.id}</td><td>{m.vehicle_id}</td><td><Badge color={m.priority === 'HOCH' ? '#d0503f' : '#8896a6'}>{m.priority}</Badge></td><td>{m.sector_name}</td><td>{m.profile}</td><td><StatusBadge s={m.status} /></td></tr>)}
            {!activeM.length && <tr><td colSpan={6} className="text-dim">Keine aktiven Aufträge</td></tr>}
          </tbody></table>
        </Panel>
      </div>
    </Page>
  );
}
