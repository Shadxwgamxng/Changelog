import { Page } from '../components/ui';
import { FmgPanel, ImsPanel, MgmgPanel, PidPanel, RadPanel } from '../components/Readouts';
import { useLive } from '../store';
import { Panel, Badge, Empty } from '../components/ui';
import { useApi } from '../store';
import { Link } from 'react-router-dom';
import { LevelBadge, StatusBadge } from '../components/ui';
import { time } from '../lib/format';

const STEPS = ['Messwert', 'Gerätehinweis', 'Mögliche Stoffgruppe', 'Mögliche Stoffe', 'Weitere Messung / Probe', 'Laborbefund'];
export default function Live() {
  const { live, status } = useLive(); const r = live['CBRN-01'];
  const recent = useApi<any[]>('/measurements?vehicle_id=CBRN-01&anomalies=1&limit=12', ['measurement.created', 'poll']);
  const lvl = r?.ims?.level; const step = lvl === 'moegliche_identifikation' ? 3 : lvl === 'verdacht' ? 2 : lvl === 'hinweis' || r?.pid?.value >= 2 ? 1 : 0;
  if (!r) return <Page title="Live-Messung"><Empty>Warte auf Messdaten …</Empty></Page>;
  return (
    <Page title="Live-Messung" sub={<>Datenquelle: {status?.data_source} · <Badge color="#d6742a">SIMULATED DATA</Badge></>}>
      <Panel title="Arbeitsablauf" className="mb-3">
        <div className="flex items-center gap-2 flex-wrap">{STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2"><span className={`px-2 py-1 border text-[11px] uppercase tracking-wider ${i <= step ? 'border-accent text-txt bg-accent/10' : 'border-line text-dim'}`}>{s}</span>{i < STEPS.length - 1 && <span className="text-dim">→</span>}</div>))}</div>
        <div className="text-[11px] text-dim mt-2">Eine Identifikation wird erst nach weiterer Messung/Probe und Laborbefund bestätigt; Screeninggeräte liefern Hinweise bzw. Verdacht.</div>
      </Panel>
      <div className="grid grid-cols-3 gap-3 mb-3"><ImsPanel r={r} /><PidPanel r={r} /><MgmgPanel r={r} /></div>
      <div className="grid grid-cols-2 gap-3 mb-3"><RadPanel r={r} /><FmgPanel r={r} /></div>
      <Panel title="Letzte Auffälligkeiten" right={<Link to="/messpunkte" className="text-accent">Messpunkte →</Link>}>
        <table className="t"><thead><tr><th>ID</th><th>Zeit</th><th>Gerät</th><th>Ergebnis</th><th>Einstufung</th><th>Status</th></tr></thead><tbody>
          {(recent.data ?? []).map((m) => <tr key={m.id}><td className="font-mono">{m.id}</td><td>{time(m.ts)}</td><td>{m.device}</td><td>{m.headline}</td><td><LevelBadge l={m.level} /></td><td><StatusBadge s={m.status} /></td></tr>)}
        </tbody></table>
      </Panel>
    </Page>
  );
}
