import { useEffect, useState } from 'react';
import { Panel, Btn, Badge, Field } from './ui';
import { api } from '../api';
import { useLive } from '../store';
import { num } from '../lib/format';

const hms = (ms: number) => { const d = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(d / 3600)).padStart(2, '0')}:${String(Math.floor(d / 60) % 60).padStart(2, '0')}:${String(d % 60).padStart(2, '0')}`; };
export function RunCard({ compact }: { compact?: boolean }) {
  const { live, status, can, own } = useLive(); const run = live[own]?.run ?? null; const [, setT] = useState(0); const [err, setErr] = useState('');
  useEffect(() => { const t = setInterval(() => setT((x) => x + 1), 1000); return () => clearInterval(t); }, []);
  const go = async (what: 'start' | 'stop') => { try { setErr(''); await api(`/runs/${what}`, { method: 'POST', body: {} }); } catch (e: any) { setErr(e.message); } };
  const fivem = status?.fivem === 'CONNECTED';
  const body = (
    <>
      <div className="flex items-center gap-3 flex-wrap">
        {run ? <Badge color="#e5534b" solid>● MESSFAHRT LÄUFT</Badge> : <Badge>KEINE MESSFAHRT</Badge>}
        <Badge color={fivem ? '#3fb950' : '#d29922'}>{fivem ? 'POSITION AUS GTA' : 'WARTET AUF FIVEM'}</Badge>
        {!run ? <Btn kind="primary" onClick={() => go('start')} disabled={!can(1)}>▶ Messfahrt starten</Btn> : <Btn kind="danger" onClick={() => go('stop')}>■ Messfahrt beenden</Btn>}
        {err && <span className="text-bad">{err}</span>}
      </div>
      {run && (
        <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-5'} gap-3 mt-3`}>
          <Field label="Bezeichnung">{run.name}</Field><Field label="Dauer">{hms(Date.now() - Date.parse(run.started_at))}</Field><Field label="Strecke">{num(run.distance_m / 1000, 2)} km</Field>
          <Field label="Messpunkte">{run.points}</Field><Field label="Max. Dosisleistung">{num(run.max_dose, 3)} µSv/h</Field>
        </div>)}
      <div className="text-[11px] text-dim mt-2">{fivem ? 'Position, Geschwindigkeit und Kurs kommen laufend aus GTA; Messwerte bleiben simuliert.' : 'Keine FiveM-Verbindung: Das Fahrzeug bleibt am Einsatzzentrum stehen, bis Position aus GTA eintrifft.'} Während einer Messfahrt werden georeferenzierte Messpunkte aufgezeichnet.</div>
    </>
  );
  return <Panel title="Messfahrt" className={compact ? '' : 'mb-3'}>{body}</Panel>;
}
