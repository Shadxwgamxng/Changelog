import { Page, Panel, Field, StatusBadge, Btn, Stat } from '../components/ui';
import { api } from '../api';
import { useApi, useLive } from '../store';
import { num } from '../lib/format';
import { RunCard } from '../components/RunCard';

export default function Vehicle() {
  const { live, status, meta, own, ownVehicle } = useLive(); const gta = meta?.map?.mode === 'gta5'; const v = ownVehicle; const r = live[own]; const crew = useApi<any[]>(`/crew?vehicle=${own}`, ['crew.changed', 'poll'], [own]);
  if (!v) return null; const fivem = status?.fivem === 'CONNECTED';
  return (
    <Page title={`Fahrzeug ${v.name}`} sub="CBRN-Erkundungswagen (neue Generation – konzeptionelle Grundlage)">
      <RunCard />
      <div className="grid grid-cols-6 gap-2 mb-3">
        <Stat label="Status" value={<StatusBadge s={v.status} />} /><Stat label="GPS" value={<StatusBadge s={v.gps_fix ? 'OK' : 'KEIN FIX'} />} /><Stat label="DFÜ" value={<StatusBadge s={v.link === 'ONLINE' ? 'OK' : 'OFFLINE'} />} />
        <Stat label="Messgeräte" value={<StatusBadge s="OK" />} /><Stat label="Probenahme" value={<StatusBadge s="VERFÜGBAR" />} /><Stat label="Akku / Strom" value={<StatusBadge s={v.power} />} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Panel title="Position / Bewegung">
          <div className="grid grid-cols-3 gap-3">{gta ? <><Field label="X (Spielkoord.)">{num(v.lon * 111320, 0)}</Field><Field label="Y (Spielkoord.)">{num(v.lat * 111320, 0)}</Field></> : <><Field label="Breite">{num(v.lat, 5)}</Field><Field label="Länge">{num(v.lon, 5)}</Field></>}<Field label="Kurs">{num(v.heading, 0)}°</Field><Field label="Geschwindigkeit">{num(v.speed, 0)} km/h</Field><Field label="Datenquelle">{fivem ? 'FiveM (Telemetrie)' : 'keine (FiveM getrennt)'}</Field>{fivem && <Field label="Spieler">{status?.fivem_info?.player ?? '–'}</Field>}</div>
        </Panel>
        <Panel title="Besatzung"><table className="t"><tbody>{(crew.data ?? []).map((c) => <tr key={c.id}><td className="text-dim uppercase text-[11px]">{c.role}</td><td>{c.name}</td></tr>)}</tbody></table></Panel>
        <Panel title="Aktuelle Anzeigen" className="col-span-2">
          {r && <div className="grid grid-cols-6 gap-3"><Field label="PID">{num(r.pid.value, 1)} ppm</Field><Field label="IMS">{r.ims.level ? r.ims.result : 'KEIN TREFFER'}</Field><Field label="Dosisleistung">{num(r.dose.value, 3)} µSv/h</Field><Field label="CoMo">{num(r.como.value, 1)} cps</Field><Field label="O₂">{r.mgmg.channels.O2 ?? '–'} %</Field><Field label="CO">{r.mgmg.channels.CO ?? '–'} ppm</Field></div>}
        </Panel>
      </div>
    </Page>
  );
}

export function Crew() {
  const { vehicles } = useLive(); const crew = useApi<any[]>('/crew');
  return (
    <Page title="Besatzung" sub="Aktuell am Fahrzeug angemeldete Personen (Anmeldung beim Öffnen der Seite).">
      <div className="grid grid-cols-2 gap-3">
        {vehicles.map((v) => (
          <Panel key={v.id} title={v.id} right={<StatusBadge s={v.status} />}>
            <table className="t"><tbody>{(crew.data ?? []).filter((c) => c.vehicle_id === v.id).map((c) => <tr key={c.id}><td className="text-dim uppercase text-[11px] w-40">{c.role}</td><td>{c.name}</td></tr>)}
              {!(crew.data ?? []).some((c) => c.vehicle_id === v.id) && <tr><td className="text-dim">Keine Besatzung hinterlegt</td></tr>}</tbody></table>
          </Panel>))}
      </div>
    </Page>
  );
}
