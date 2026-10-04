import { useNavigate, useParams } from 'react-router-dom';
import { Page, Panel, Field, CatBadge, Badge, Empty } from '../components/ui';
import { useApi } from '../store';
import { SourceBlock, ResponsePanel } from './Substances';
import { NA, orNA } from '../lib/format';

function Master({ rows, cols, sel, base }: { rows: any[]; cols: [string, (r: any) => any][]; sel?: string; base: string }) {
  const nav = useNavigate();
  return (
    <table className="t"><thead><tr>{cols.map(([h]) => <th key={h}>{h}</th>)}</tr></thead><tbody>
      {rows.map((r) => <tr key={r.id} className={`cursor-pointer ${sel === r.id ? 'bg-panel2' : ''}`} onClick={() => nav(`${base}/${r.id}`)}>{cols.map(([h, f]) => <td key={h}>{f(r)}</td>)}</tr>)}
    </tbody></table>
  );
}

export function Radionuclides() {
  const { id } = useParams(); const list = useApi<any[]>('/radionuclides'); const d = useApi<any>(id ? `/radionuclides/${id}` : null, [], [id]).data;
  return (
    <Page title="Radionuklid-Datenbank" sub="Fachliche Anzeige und Simulation – keine Anleitung zum Umgang mit radioaktiven Quellen">
      <div className="grid grid-cols-12 gap-3">
        <Panel title="Nuklide" className="col-span-5" body="!p-0">
          <Master base="/radionuklide" sel={id} rows={list.data ?? []} cols={[['Isotop', (r) => <b>{r.name}</b>], ['Element', (r) => r.element], ['Z', (r) => r.z], ['A', (r) => r.a], ['T½', (r) => r.half_life], ['Zerfall', (r) => r.decay.split(' ')[0]], ['Kat.', (r) => <CatBadge c={r.cbrn_category} />]]} />
        </Panel>
        <div className="col-span-7 space-y-3">
          {!d ? <Panel><Empty>Isotop links auswählen</Empty></Panel> : (<>
            <Panel title={d.name} right={<CatBadge c={d.cbrn_category} />}>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Element">{d.element}</Field><Field label="Ordnungszahl Z">{d.z}</Field><Field label="Massenzahl A">{d.a}</Field>
                <Field label="Halbwertszeit">{d.half_life}</Field><Field label="Zerfallsart">{d.decay}</Field><Field label="Strahlungsarten">{d.radiation.join(', ')}</Field>
                <Field label="Gamma-Linien">{d.gamma_kev ? d.gamma_kev.map((e: number) => `${String(e).replace('.', ',')} keV`).join(' · ') : 'keine/NICHT VERFÜGBAR'}</Field>
                <div className="col-span-2"><Field label="Typische Anwendungen" mono={false}>{orNA(d.applications)}</Field></div>
                <div className="col-span-3"><Field label="Vorkommen" mono={false}>{orNA(d.occurrence)}</Field></div>
                <div className="col-span-3"><Field label="Messbarkeit" mono={false}>{orNA(d.measurability)}</Field></div>
              </div>
            </Panel>
            <ResponsePanel r={d.response} id="handlung" />
            <SourceBlock rec={d} /></>)}
        </div>
      </div>
    </Page>
  );
}

export function Bio() {
  const { id } = useParams(); const list = useApi<any[]>('/biological-agents'); const d = useApi<any>(id ? `/biological-agents/${id}` : null, [], [id]).data;
  return (
    <Page title="Biologische Datenbank" sub="Informationsdarstellung – keine Kultivierungs-, Vermehrungs- oder Herstellungsanweisungen">
      <div className="grid grid-cols-12 gap-3">
        <Panel title="Agenzien / Toxine" className="col-span-5" body="!p-0">
          <Master base="/bio" sel={id} rows={list.data ?? []} cols={[['Name', (r) => <b>{r.name}</b>], ['Kategorie', (r) => r.kind], ['Erkrankung', (r) => r.disease], ['Kat.', (r) => <CatBadge c="B" />]]} />
        </Panel>
        <div className="col-span-7 space-y-3">
          {!d ? <Panel><Empty>Eintrag links auswählen</Empty></Panel> : (<>
            <Panel title={d.name} right={<><Badge>{d.kind}</Badge><CatBadge c="B" /></>}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Erkrankung" mono={false}>{d.disease}</Field><Field label="Risikogruppe (BioStoffV/TRBA)">{d.risk_group ?? 'QUELLE ERFORDERLICH'}</Field>
                <div className="col-span-2"><Field label="Biologische Eigenschaften" mono={false}>{d.properties}</Field></div>
                <Field label="Übertragungsweg" mono={false}>{d.transmission}</Field><Field label="Umweltstabilität" mono={false}>{d.environmental_stability}</Field>
                <div className="col-span-2"><Field label="Nachweismöglichkeiten" mono={false}>{d.detection}</Field></div>
                <div className="col-span-2"><Field label="Labor-/Probenbezug" mono={false}>{d.lab_relevance}</Field></div>
                {d.notes && <div className="col-span-2 text-[12px] border-l-2 border-accent pl-2">{d.notes}</div>}
              </div>
              <div className="text-[11px] text-dim mt-3">Vor-Ort-Geräte der ErkW liefern bei biologischen Gefahren allenfalls Screening; Bestätigung ausschließlich im zuständigen Labor.</div>
            </Panel>
            <ResponsePanel r={d.response} id="handlung" />
            <SourceBlock rec={d} /></>)}
        </div>
      </div>
    </Page>
  );
}
