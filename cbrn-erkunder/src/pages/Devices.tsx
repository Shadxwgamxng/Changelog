import { Link, useParams } from 'react-router-dom';
import { Page, Panel, Field, StatusBadge, Badge, LevelBadge, SimNote, Empty } from '../components/ui';
import { FmgPanel, ImsPanel, MgmgPanel, PidPanel, RadPanel, doseStatus, pidStatus, useSession } from '../components/Readouts';
import { SpectrumChart, TimeChart } from '../components/Charts';
import { useApi, useLive } from '../store';
import { num, time, dt } from '../lib/format';
import { DeviceFigure, DeviceThumb } from '../components/DeviceFigure';
import { AllPower, PowerButton, stateText, useNow } from '../components/DevicePower';
import { devCalc } from '../lib/devices';

const CUR = (id: string, r: any): [string, string, string] => {
  if (!r) return ['–', '', 'OFFLINE'];
  switch (id) {
    case 'pid': return [num(r.pid.value, 1), 'ppm', pidStatus(r.pid.value)];
    case 'ims': return [r.ims.level ? 'TREFFER' : 'KEIN TREFFER', '', r.ims.level ? 'ERHÖHT' : 'NORMAL'];
    case 'mgmg': return [`O₂ ${num(r.mgmg.channels.O2 ?? 20.9, 1)}`, '% vol', 'NORMAL'];
    case 'dlm': case 'fmg': return [num(r.dose.value, 3), 'µSv/h', doseStatus(r.dose.value)];
    case 'como': return [num(r.como.value, 1), 'cps', 'NORMAL'];
    default: return ['–', '', 'BEREIT'];
  }
};
export const dev_id = (d: any) => (d.id === 'como' ? 'como' : d.id);

export default function Devices() {
  const devs = useApi<any[]>('/devices'); const { live, own } = useLive(); const r = live[own]; const now = useNow(500);
  return (
    <Page title="Messgeräte" sub="Ausstattung gemäß öffentlich dokumentierter Beschreibung der neuen ErkW-Generation (BBK)" right={<AllPower />}>
      <div className="grid grid-cols-3 gap-3">
        {(devs.data ?? []).map((d) => { const dc = devCalc(r?.devices, d.id, now); const [v0, u0, st0] = CUR(d.id, r); const hasPwr = d.id !== 'tubes'; const ready = !hasPwr || dc.state === 'ready'; const v = ready ? v0 : dc.state === 'off' ? 'AUS' : `${Math.round(dc.progress * 100)} %`; const u = ready ? u0 : ''; const st = ready ? st0 : dc.state === 'off' ? 'AUS' : 'STARTET'; return (
          <Link key={d.id} to={`/geraete/${d.id}`} className="panel p-3 hover:border-accent block">
            <DeviceThumb id={d.id} />
            <div className="flex justify-between"><b className="text-[14px]">{d.short}</b><StatusBadge s={d.id === 'tubes' ? 'VERFÜGBAR' : stateText(dc)} /></div>
            <div className="text-dim text-[12px] mb-2">{d.name}</div>
            <div className="flex items-end gap-2"><span className="font-mono text-[22px]">{v}</span><span className="text-dim">{u}</span><span className="ml-auto"><StatusBadge s={st} /></span></div>
            <div className="text-[11px] text-dim mt-2">{d.description}</div>
            {hasPwr && <div className="mt-3"><PowerButton k={d.id} /></div>}
          </Link>); })}
      </div>
    </Page>
  );
}

export function DevicePage() {
  const { id = 'pid' } = useParams(); const dev = useApi<any[]>('/devices').data?.find((d) => d.id === id);
  const { live, hist, own } = useLive(); const r = live[own]; const dur = useSession(); const now = useNow(500);
  const missions = useApi<any[]>('/missions', ['mission.updated']); const mission = missions.data?.find((m) => m.vehicle_id === own && m.status === 'IN BEARBEITUNG');
  const key = id === 'ims' ? 'IMS' : id === 'pid' ? 'PID' : id === 'mgmg' ? 'MGMG' : id === 'dlm' ? 'DLM' : id === 'fmg' ? 'FMG' : id;
  const mh = useApi<any[]>(`/measurements?vehicle_id=${own}&device=${key}&limit=40`, ['measurement.created', 'poll'], [key]);
  const spec = useApi<any>(id === 'dlm' || id === 'como' ? `/live/spectrum?vehicle=${own}` : null, ['poll'], [r?.ts]);
  const tubes = useApi<any[]>(id === 'tubes' ? '/test-tubes' : null);
  if (!dev) return <Page title="Gerät"><Empty>Gerät nicht gefunden</Empty></Page>;
  const [v, u, st] = CUR(id, r); const dc = devCalc(r?.devices, id, now); const hasPwr = id !== 'tubes';
  return (
    <Page title={dev.short} sub={dev.name} right={<>{hasPwr && <PowerButton k={id} />}<Link className="btn" to="/geraete">← Geräte</Link></>}>
      <div className="panel p-3 mb-3 grid grid-cols-6 gap-4">
        <Field label="Status"><span className="flex items-center gap-2"><StatusBadge s={hasPwr ? stateText(dc) : 'VERFÜGBAR'} /></span></Field><Field label="Aktueller Messwert">{!hasPwr || dc.state === 'ready' ? v : '–'}</Field><Field label="Einheit">{u || '–'}</Field>
        <Field label="Messdauer">{dur}</Field><Field label="GPS"><StatusBadge s="FIX" /></Field><Field label="Auftrag">{mission ? `#${mission.id}` : '–'}</Field>
      </div>
      <DeviceFigure id={id} />
      <div className="grid grid-cols-2 gap-3 mb-3">
        {id === 'ims' && <ImsPanel r={r} link={false} />}{id === 'pid' && <PidPanel r={r} link={false} />}{id === 'mgmg' && <MgmgPanel r={r} link={false} />}
        {(id === 'dlm' || id === 'como') && <RadPanel r={r} link={false} />}{id === 'fmg' && <FmgPanel r={r} link={false} />}
        <Panel title="Beschreibung"><div>{dev.description}</div></Panel>
      </div>
      {(id === 'pid' || id === 'dlm' || id === 'fmg') && (
        <Panel title="Verlauf (Live)" className="mb-3"><TimeChart data={hist} series={[id === 'pid' ? { key: 'pid', color: '#d29922', name: 'PID' } : { key: 'dose', color: '#f0500a', name: 'Dosisleistung' }]} unit={id === 'pid' ? 'ppm' : 'µSv/h'} height={190} /></Panel>)}
      {(id === 'dlm' || id === 'como') && spec.data && (
        <Panel title="Gamma-Spektrum" className="mb-3">
          <SpectrumChart counts={spec.data.counts} kev={spec.data.kev_per_channel} />
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div><div className="lbl mb-1">Mögliche Identifikationen (Linienzuordnung)</div>
              {spec.data.candidates.length ? spec.data.candidates.map((c: any) => (
                <div key={c.id} className="flex justify-between border-b border-line/50 py-1"><span>{c.natural ? <><b>{c.name}</b> <Badge>natürlicher Untergrund</Badge></> : <Link className="text-accent" to={`/radionuklide/${c.id}`}><b>{c.name}</b></Link>}</span><span className="font-mono text-dim">{c.gamma_kev.map((e: number) => String(e).replace('.', ',')).join(' / ')} keV</span></div>)) : <div className="text-dim">Keine signifikanten Linien</div>}</div>
          </div>
        </Panel>)}
      {id === 'tubes' && (
        <Panel title="Prüfröhrchen-Inventar" className="mb-3">
          <table className="t"><thead><tr><th>Hersteller</th><th>Produkt</th><th>Typ</th><th>Messstoff</th><th>Messbereich</th><th>Lager</th><th>Charge</th><th>Verfall</th></tr></thead><tbody>
            {(tubes.data ?? []).map((t) => <tr key={t.id}><td>{t.manufacturer}</td><td>{t.product}</td><td>{t.tube_type}</td><td>{t.analyte}</td><td className="text-dim">QUELLE ERFORDERLICH</td><td><StatusBadge s={t.storage_status} /></td><td className="font-mono">{t.lot}</td><td className="font-mono">{t.expiry}</td></tr>)}
          </tbody></table></Panel>)}
      <Panel title="Messhistorie (gespeicherte Messpunkte)">
        <table className="t"><thead><tr><th>ID</th><th>Zeit</th><th>Wert</th><th>Ergebnis</th><th>Einstufung</th><th>Status</th></tr></thead><tbody>
          {(mh.data ?? []).map((m) => <tr key={m.id}><td className="font-mono">{m.id}</td><td>{time(m.ts)}</td><td className="font-mono">{m.value ?? '–'} {m.unit ?? ''}</td><td>{m.headline}</td><td><LevelBadge l={m.level} /></td><td><StatusBadge s={m.status} /></td></tr>)}
          {!(mh.data ?? []).length && <tr><td colSpan={6} className="text-dim">Noch keine gespeicherten Messpunkte für dieses Gerät.</td></tr>}
        </tbody></table>
      </Panel>
    </Page>
  );
}
export { dt };
