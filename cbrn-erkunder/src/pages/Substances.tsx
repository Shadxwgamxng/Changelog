import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Page, Panel, Field, CatBadge, Badge, QualityBadge, Na, Empty, Select } from '../components/ui';
import { useApi } from '../store';
import { GHS_PICT, H_TEXT, P_TEXT } from '../lib/ghs';
import { NA, orNA } from '../lib/format';

export const Ghs = ({ list }: { list: string[] }) => (
  <div className="flex gap-2 flex-wrap">{list.length ? list.map((g) => (
    <div key={g} title={GHS_PICT[g]?.name} className="w-12 h-12 flex flex-col items-center justify-center" >
      <div className="w-9 h-9 rotate-45 border-[3px] border-[#d0503f] bg-white flex items-center justify-center"><span className="-rotate-45 text-black text-[16px] leading-none">{GHS_PICT[g]?.sym ?? g}</span></div>
      <span className="text-[9px] text-dim mt-1">{g}</span></div>)) : <span className="text-dim">{NA}</span>}</div>
);

export function SourceBlock({ rec }: { rec: any }) {
  const s = rec.source;
  return (
    <Panel title="Quelle / Datenqualität">
      <div className="grid grid-cols-4 gap-3">
        <Field label="Status"><QualityBadge q={rec.quality} /></Field>
        <Field label="Quelle" mono={false}>{s?.name ?? 'QUELLE ERFORDERLICH'}</Field>
        <Field label="Datenstand">{s?.data_stand ?? 'NICHT DOKUMENTIERT'}</Field>
        <Field label="Abruf">{s?.retrieved_at ?? 'NICHT DOKUMENTIERT'}</Field>
        <Field label="Letzte Prüfung">{rec.last_checked ?? 'NICHT GEPRÜFT'}</Field>
        <div className="col-span-3"><div className="lbl">URL</div><div className="font-mono break-all">{rec.gestis_zvg ? <a className="text-accent" href={`https://gestis.dguv.de/data?name=${rec.gestis_zvg}&lang=de`} target="_blank" rel="noreferrer">GESTIS-Eintrag (ZVG {rec.gestis_zvg}) öffnen →</a> : s?.url ? <a className="text-accent" href={s.url} target="_blank" rel="noreferrer">{s.url}</a> : NA}</div></div>
      </div>
      <div className="text-[11px] text-dim mt-2">{rec.quality === 'identity' ? 'CAS-Nummer und Stoffname wurden gegen den GESTIS-Stoffindex abgeglichen; die Stoffeigenschaften (Einstufung, physikalische Daten) sind noch nicht gegen den GESTIS-Eintrag geprüft – bitte über den Link nachprüfen. ' : 'Der Datensatz wurde noch nicht gegen die Primärquelle geprüft. '}Vor fachlicher Nutzung gegen Quelle verifizieren (Prio: BBK → BAuA/GESTIS → ECHA → BfR → IAEA → WHO → NIST).</div>
    </Panel>
  );
}

const SEC: [string, string][] = [['gefahren', 'Gefahren'], ['absperrung', 'Absperrung / Gefahrenbereich'], ['schutz', 'Schutzausrüstung / Eigenschutz'], ['brand', 'Brandbekämpfung'], ['freisetzung', 'Freisetzung / Ausbreitung'], ['dekon', 'Dekontamination'], ['rettung', 'Menschenrettung / Erste Hilfe'], ['messen', 'Messtechnik'], ['hinweise', 'Hinweise']];
export function ResponsePanel({ r, id = 'handlung' }: { r: any; id?: string }) {
  if (!r) return null;
  return (
    <Panel title="Handlungsempfehlungen (Einsatz-Wiki)" right={<Badge color="#d9a21b">RICHTWERTE – QUELLE ERFORDERLICH</Badge>} className="col-span-12">
      <div id={id} className="grid grid-cols-2 gap-x-8 gap-y-4">
        {SEC.filter(([k]) => r[k]?.length).map(([k, t]) => (
          <div key={k} className={k === 'hinweise' ? 'col-span-2' : ''}><div className="lbl mb-1" style={{ color: k === 'gefahren' ? '#d0503f' : undefined }}>{t}</div><ul className="list-disc ml-5 space-y-0.5">{r[k].map((x: string, i: number) => <li key={i}>{x}</li>)}</ul></div>))}
      </div>
    </Panel>
  );
}
export const TraitChips = ({ t }: { t: any }) => !t ? null : (
  <div className="flex gap-1.5 flex-wrap">
    {t.flammable && <Badge color="#d0503f">brennbar</Badge>}{t.toxic && <Badge color="#d9a21b">giftig</Badge>}{t.corrosive && <Badge color="#d6742a">ätzend</Badge>}{t.oxidizer && <Badge color="#d6742a">brandfördernd</Badge>}
    {t.water_reactive && <Badge color="#4a8fd6">wasserreaktiv</Badge>}{t.asphyxiant && <Badge>erstickend</Badge>}{t.cmr && <Badge color="#d0503f">CMR</Badge>}{t.aquatic && <Badge color="#4fa86b">wassergefährdend</Badge>}
    {t.gas && t.vapor_heavier === true && <Badge>schwerer als Luft</Badge>}{t.gas && t.vapor_heavier === false && <Badge>leichter als Luft</Badge>}
    {t.floats === true && !t.gas && <Badge>schwimmt auf Wasser</Badge>}{t.floats === false && !t.gas && <Badge>sinkt in Wasser</Badge>}
    {t.ph && t.ph !== 'neutral' && <Badge>pH {t.ph}</Badge>}
  </div>
);

const TRAIT_FILTERS: [string, string][] = [['', 'Merkmal: alle'], ['flammable', 'brennbar'], ['toxic', 'giftig'], ['corrosive', 'ätzend'], ['oxidizer', 'brandfördernd'], ['water_reactive', 'wasserreaktiv'], ['asphyxiant', 'erstickend'], ['cmr', 'CMR'], ['aquatic', 'wassergefährdend']];
export default function Substances() {
  const nav = useNavigate();
  const [f, setF] = useState({ q: '', cat: '', sub: '', state: '', group: '', hazard: '', method: '', device: '', cas: '', un: '', trait: '', origin: '' });
  const qs = Object.entries(f).filter(([k, v]) => v && k !== 'trait' && k !== 'origin').map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const all = useApi<any[]>('/substances?' + qs, [], [qs]); const opts = useApi<any>('/analysis/options').data;
  const data = all.data?.filter((x) => (!f.trait || x.traits?.[f.trait]) && (!f.origin || x.traits?.origins?.includes(f.origin)));
  const set = (k: string) => (v: string) => setF({ ...f, [k]: v });
  const P = (k: string, ph: string) => <input className="inp w-32" placeholder={ph} value={(f as any)[k]} onChange={(e) => set(k)(e.target.value)} />;
  return (
    <Page title="Stoffdatenbank" sub="Informativ/identifikatorisch – keine Herstellungs-, Einsatz- oder Verteilungshinweise">
      <div className="panel p-2 mb-3 flex flex-wrap gap-2 items-center">
        <input className="inp w-56" placeholder="Name, Synonym, Formel …" value={f.q} onChange={(e) => set('q')(e.target.value)} />
        <Select value={f.cat} onChange={set('cat')} options={[['', 'Kategorie: alle'], ['C', 'C – Chemisch'], ['B', 'B – Biologisch'], ['R', 'R – Radiologisch'], ['N', 'N – Nuklear'], ['UNKNOWN', 'Unbekannt']]} />
        <Select value={f.sub} onChange={set('sub')} options={[['', 'Typ: alle'], ['TIC', 'Gefahrstoffe / Industriechemikalien'], ['CWA', 'Chemische Kampfstoffe']]} />
        <Select value={f.state} onChange={set('state')} options={[['', 'Aggregatzustand: alle'], ['Gas', 'Gas'], ['Flüssigkeit', 'Flüssigkeit'], ['Feststoff', 'Feststoff']]} />
        {P('group', 'Stoffgruppe')}
        <Select value={f.hazard} onChange={set('hazard')} options={[['', 'Gefahr: alle'], ...Object.entries(GHS_PICT).map(([k, v]) => [k, `${k} ${v.name}`] as [string, string])]} />
        <Select value={f.method} onChange={set('method')} options={[['', 'Messverfahren: alle'], ['IMS', 'IMS'], ['PID', 'PID'], ['Prüfröhrchen', 'Prüfröhrchen'], ['Elektrochemisch', 'Elektrochemischer Sensor'], ['pH', 'pH-Messung'], ['Labor', 'Laboranalytik']]} />
        <Select value={f.device} onChange={set('device')} options={[['', 'Gerät: alle'], ['IMS', 'IMS'], ['PID', 'PID'], ['MGMG', 'MGMG'], ['Prüfröhrchen', 'Prüfröhrchen']]} />
        {P('cas', 'CAS')}{P('un', 'UN-Nr.')}
        <Select value={f.trait} onChange={set('trait')} options={TRAIT_FILTERS} />
        <Select value={f.origin} onChange={set('origin')} options={[['', 'Herkunft: alle'], ...(opts?.origins ?? []).map((o: any) => [o.key, o.label] as [string, string])]} />
        <button className="btn" onClick={() => setF({ q: '', cat: '', sub: '', state: '', group: '', hazard: '', method: '', device: '', cas: '', un: '', trait: '', origin: '' })}>Zurücksetzen</button>
        <span className="text-dim ml-auto">{data?.length ?? 0} Treffer</span>
      </div>
      <Panel title="Stoffe" body="!p-0">
        <table className="t"><thead><tr><th>Stoff</th><th>CAS</th><th>UN</th><th>Formel</th><th>Kategorie</th><th>Zustand</th><th>Stoffgruppe</th><th>Merkmale</th><th>Daten</th></tr></thead><tbody>
          {(data ?? []).map((s) => (
            <tr key={s.id} className="cursor-pointer" onClick={() => nav(`/stoffe/${s.id}`)}>
              <td><b>{s.name}</b>{s.subcategory === 'CWA' && <span className="ml-2"><Badge color="#d0503f">Kampfstoff</Badge></span>}</td><td className="font-mono">{s.cas}</td><td className="font-mono">{orNA(s.un_number)}</td><td className="font-mono">{s.formula}</td>
              <td><CatBadge c={s.cbrn_category} /></td><td>{s.state}</td><td>{s.substance_group}</td><td><TraitChips t={s.traits} /></td><td><QualityBadge q={s.quality} /></td></tr>))}
        </tbody></table>
        {data && !data.length && <Empty>Keine Treffer</Empty>}
      </Panel>
    </Page>
  );
}

export function SubstanceDetail() {
  const { id } = useParams(); const loc = useLocation(); const { data: s, error } = useApi<any>(`/substances/${id}`, [], [id]);
  useEffect(() => { if (loc.hash === '#handlung') setTimeout(() => document.getElementById('handlung')?.scrollIntoView({ behavior: 'smooth' }), 150); }, [loc.hash, s?.id]);
  if (error) return <Page title="Stoff"><Empty>{error}</Empty></Page>; if (!s) return null;
  const cwa = s.subcategory === 'CWA';
  return (
    <Page title={s.name} sub={<span className="font-mono">{s.formula} · CAS {s.cas}</span>} right={<Link className="btn" to="/stoffe">← Stoffliste</Link>}>
      <div className="flex gap-2 mb-3 items-center"><CatBadge c={s.cbrn_category} /><Badge>{s.state?.toUpperCase()}</Badge><Badge>{s.substance_group}</Badge>{cwa && <Badge color="#d0503f">Chemischer Kampfstoff (Identifikationsdaten)</Badge>}<QualityBadge q={s.quality} /></div>
      <div className="mb-3 flex items-center gap-3 flex-wrap"><TraitChips t={s.traits} />{s.traits?.origins?.length > 0 && <span className="text-dim text-[12px]">Typische Herkunft: {s.traits.origins.join(', ')}</span>}</div>
      <div className="grid grid-cols-12 gap-3">
        <Panel title="Gefahr" className="col-span-7">
          <div className="flex gap-6 mb-3"><div><div className="lbl mb-1">GHS</div><Ghs list={s.ghs} /></div><Field label="Signalwort">{s.signal_word ? s.signal_word.toUpperCase() : NA}</Field><Field label="UN-Nummer">{orNA(s.un_number)}</Field><Field label="CAS">{s.cas}</Field></div>
          <div className="lbl mb-1">Gefahrenhinweise (H)</div>
          {s.h.length ? <ul className="mb-3">{s.h.map((h: string) => <li key={h}><span className="font-mono text-warn">{h}</span> {H_TEXT[h] ?? ''}</li>)}</ul> : <div className="text-dim mb-3">{cwa ? 'Keine harmonisierte CLP-Einstufung hinterlegt – NICHT VERFÜGBAR' : NA}</div>}
          <div className="lbl mb-1">Sicherheitshinweise (P) – Auswahl, GHS-Standardtexte</div>
          {s.p?.length ? <ul>{s.p.map((p: string) => <li key={p}><span className="font-mono text-dim">{p}</span> {P_TEXT[p] ?? ''}</li>)}</ul> : <div className="text-dim">{NA}</div>}
          {s.notes && <div className="mt-3 text-[12px] border-l-2 border-accent pl-2">{s.notes}</div>}
        </Panel>
        <Panel title="Physikalische Daten" className="col-span-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Aggregatzustand">{s.state}</Field><Field label="Farbe">{orNA(s.color)}</Field><Field label="Geruch">{orNA(s.odor)}</Field><Field label="Molare Masse">{s.molar_mass ? `${s.molar_mass.toString().replace('.', ',')} g/mol` : NA}</Field>
            <Field label="Siedepunkt">{orNA(s.boiling_point)}</Field><Field label="Schmelzpunkt">{orNA(s.melting_point)}</Field><Field label="Dampfdruck">{orNA(s.vapor_pressure)}</Field><Field label="Dichte">{orNA(s.density)}</Field>
            <Field label="Wasserlöslichkeit">{orNA(s.water_solubility)}</Field><Field label="Zünd-/Brandinformation">{orNA(s.fire_info)}</Field>
            <Field label="Ionisierungsenergie">{s.ie_ev ? `${String(s.ie_ev).replace('.', ',')} eV` : NA}</Field>
            <Field label="PID (10,6 eV)">{s.ie_ev == null ? NA : s.ie_ev < 10.6 ? 'Ansprechen zu erwarten (Screening)' : 'Kein Ansprechen zu erwarten'}</Field>
          </div>
          {s.synonyms?.length > 0 && <div className="mt-3"><div className="lbl">Synonyme</div>{s.synonyms.join(', ')}</div>}
        </Panel>
        <Panel title="Nachweis / Messtechnik" className="col-span-12">
          <div className="grid grid-cols-2 gap-6">
            <div><div className="lbl mb-1">Relevante Messgeräte</div><div className="flex gap-2 flex-wrap">{s.devices.length ? s.devices.map((d: string) => <Link key={d} to={`/geraete/${d === 'Prüfröhrchen' ? 'tubes' : d.toLowerCase()}`}><Badge color="#4a8fd6">{d}</Badge></Link>) : <span className="text-dim">{NA}</span>}</div></div>
            <div><div className="lbl mb-1">Relevante Messverfahren</div><ul className="list-disc ml-5">{s.methods.map((m: string) => <li key={m}>{m}</li>)}</ul></div>
          </div>
          <div className="text-[11px] text-dim mt-2">Hinweis: Screeninggeräte liefern Hinweis/Verdacht; eine bestätigte Identifikation erfordert weitere Messung/Probe und Laborbefund. Die IMS-Zuordnung in der Simulation ist eine Szenarioannahme ({s.ims_sim ? 'Treffer simulierbar' : 'kein IMS-Treffer simuliert'}).</div>
        </Panel>
        <ResponsePanel r={s.response} />
        <div className="col-span-12"><SourceBlock rec={s} /></div>
      </div>
    </Page>
  );
}
export { Na };
