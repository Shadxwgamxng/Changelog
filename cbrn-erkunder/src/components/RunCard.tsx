import { useEffect, useState } from 'react';
import { Panel, Btn, Badge, Field, Modal } from './ui';
import { MapPicker, type Pos } from './MapPicker';
import { api } from '../api';
import { useLive } from '../store';
import { num } from '../lib/format';

const hms = (ms: number) => { const d = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(d / 3600)).padStart(2, '0')}:${String(Math.floor(d / 60) % 60).padStart(2, '0')}:${String(d % 60).padStart(2, '0')}`; };
export function RunCard({ compact }: { compact?: boolean }) {
  const { live, status, can, own, ownVehicle, incident } = useLive(); const [pick, setPick] = useState(false); const [pos, setPos] = useState<Pos | null>(null); const [warn, setWarn] = useState(''); const run = live[own]?.run ?? null; const [, setT] = useState(0); const [err, setErr] = useState('');
  useEffect(() => { const t = setInterval(() => setT((x) => x + 1), 1000); return () => clearInterval(t); }, []);
  const fivem = status?.fivem === 'CONNECTED';
  const fv = fivem && ownVehicle?.gps_fix ? { lat: ownVehicle.lat, lon: ownVehicle.lon } : null;
  const go = async (what: 'start' | 'stop') => {
    try { setErr(''); setWarn(''); const r = await api(`/runs/${what}`, { method: 'POST', body: what === 'start' ? { lat: pos?.lat, lon: pos?.lon } : {} });
      if (what === 'start') { setPick(false); if (r.deviation_m > 150) setWarn(`Hinweis: Die markierte Position weicht ${r.deviation_m} m von der FiveM-Position ab. Die Messwerte folgen der FiveM-Position.`); } }
    catch (e: any) { setErr(e.message); }
  };
  const body = (
    <>
      <div className="flex items-center gap-3 flex-wrap">
        {run ? <Badge color="#e5534b" solid>● MESSFAHRT LÄUFT</Badge> : <Badge>KEINE MESSFAHRT</Badge>}
        <Badge color={fivem ? '#3fb950' : '#d29922'}>{fivem ? 'POSITION AUS GTA' : 'WARTET AUF FIVEM'}</Badge>
        {!run ? <Btn kind="primary" onClick={() => { setPos(null); setPick(true); }} disabled={!incident}>▶ Messfahrt starten</Btn> : <Btn kind="danger" onClick={() => go('stop')}>■ Messfahrt beenden</Btn>}
        {err && <span className="text-bad">{err}</span>}{warn && <span className="text-warn text-[12px]">{warn}</span>}
      </div>
      {run && (
        <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-5'} gap-3 mt-3`}>
          <Field label="Bezeichnung">{run.name}</Field><Field label="Dauer">{hms(Date.now() - Date.parse(run.started_at))}</Field><Field label="Strecke">{num(run.distance_m / 1000, 2)} km</Field>
          <Field label="Messpunkte">{run.points}</Field><Field label="Max. Dosisleistung">{num(run.max_dose, 3)} µSv/h</Field>
        </div>)}
      <div className="text-[11px] text-dim mt-2">{fivem ? 'Position, Geschwindigkeit und Kurs kommen laufend aus GTA; Messwerte bleiben simuliert.' : 'Keine FiveM-Verbindung: Das Fahrzeug bleibt an der markierten Position stehen, bis Position aus GTA eintrifft.'} Während einer Messfahrt werden georeferenzierte Messpunkte aufgezeichnet.</div>
    </>
  );
  return (<>
    <Panel title="Messfahrt" className={compact ? '' : 'mb-3'}>{body}</Panel>
    {pick && <Modal title="Messfahrt starten – eigenen Standort markieren" wide onClose={() => setPick(false)}>
      <div className="text-[12.5px] text-dim mb-2">Markiere auf der Karte, wo sich das Fahrzeug jetzt befindet. {fivem ? 'Alles Weitere (Position, Geschwindigkeit, Kurs, Wetter) wird danach laufend aus FiveM übernommen.' : 'Ohne FiveM-Verbindung gilt der markierte Punkt als Fahrzeugposition.'}</div>
      <MapPicker value={pos} onChange={setPos} hint={fv} hintLabel="Aktuelle FiveM-Position" color="#f0500a" height={340} />
      <div className="mt-3 flex items-center gap-3"><Btn kind="primary" onClick={() => go('start')} disabled={!pos}>Messfahrt starten</Btn>{fv && <button className="text-accent text-[12px]" onClick={() => setPos(fv)}>FiveM-Position übernehmen</button>}{err && <span className="text-bad">{err}</span>}</div>
    </Modal>}
  </>);
}
