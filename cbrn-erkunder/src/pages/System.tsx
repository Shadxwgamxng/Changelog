import { useState } from 'react';
import { Page, Panel, Tabs, StatusBadge, Badge, Btn, Select, Field, QualityBadge } from '../components/ui';
import { api } from '../api';
import { useApi, useLive } from '../store';
import { NA } from '../lib/format';

function Status() {
  const { status, wsUp } = useLive(); const fm = useApi<any>('/adapter/fivem/status', ['system.status']);
  const rows: [string, string][] = [['WEB APP', status?.web], ['DATABASE', status?.database], ['API', status?.api], ['WEBSOCKET', wsUp ? 'ONLINE' : 'OFFLINE'], ['FIVEM', status?.fivem], ['DATA SOURCE', status?.data_source]];
  return (<div className="grid grid-cols-3 gap-3">
    {rows.map(([k, v]) => <div key={k} className="panel p-3"><div className="lbl">{k}</div><div className="mt-1"><StatusBadge s={v} /></div></div>)}
    <Panel title="Betriebsmodus" className="col-span-3">
      <div className="grid grid-cols-3 gap-3"><Field label="Modus">{status?.fivem === 'CONNECTED' ? 'FiveM verbunden (Position/Geschwindigkeit/Kurs/Wetter aus GTA, Messwerte simuliert)' : 'FiveM getrennt – Fahrzeug wartet am Einsatzzentrum'}</Field><Field label="Aktives Szenario">{status?.scenario}</Field><Field label="Laufzeit">{status?.uptime_s ?? '–'} s</Field>
        <Field label="Letzte FiveM-Telemetrie">{fm.data?.last ? new Date(fm.data.last).toLocaleTimeString('de-DE') : 'keine'}</Field><Field label="Spieler">{fm.data?.info?.player ?? '–'}</Field><Field label="Einsatz (FiveM)">{fm.data?.info?.mission ?? '–'}</Field></div>
      <div className="text-[12px] text-dim mt-3">Auch bei FiveM-Verbindung stellen alle Messwerte, Identifikationen und Laborergebnisse <b>Simulation</b> dar – die Anwendung gibt FiveM-Daten niemals als echte CBRN-Messung aus.</div>
    </Panel></div>);
}

function Sources() {
  const s = useApi<any[]>('/sources');
  return (<Panel title="Datenquellen (Quellenpriorität: BBK → BAuA/GESTIS → ECHA → BfR → IAEA → WHO → NIST → andere)" body="!p-0"><table className="t"><thead><tr><th>Prio</th><th>Quelle</th><th>Dokument</th><th>URL</th><th>Datenstand</th><th>Abruf</th><th>Datensätze</th></tr></thead><tbody>
    {(s.data ?? []).map((x) => <tr key={x.id}><td>{x.publisher_priority}</td><td><b>{x.name}</b></td><td>{x.document}</td><td className="font-mono text-[11px]"><a className="text-accent" href={x.url} target="_blank" rel="noreferrer">{x.url}</a></td><td className="text-dim">{x.data_stand ?? 'NICHT DOKUMENTIERT'}</td><td className="text-dim">{x.retrieved_at ?? 'NICHT DOKUMENTIERT'}</td><td className="font-mono">{x.records}</td></tr>)}</tbody></table>
    <div className="p-2 text-[11px] text-dim">Abrufdatum und Datenstand sind leer, weil die Datensätze noch nicht gegen die Quellen geprüft wurden – bewusst keine erfundenen Angaben. Nach Prüfung Quelle (Administration → sources) und Datensatz-Status pflegen.</div></Panel>);
}

function Importer() {
  const [table, setTable] = useState('substances'); const [fmt, setFmt] = useState<'json' | 'csv'>('json'); const [content, setContent] = useState(''); const [res, setRes] = useState<any>(null); const [err, setErr] = useState('');
  const run = async (commit: boolean) => { try { setErr(''); setRes(await api('/import/' + table, { method: 'POST', body: { format: fmt, content, commit } })); } catch (e: any) { setErr(e.message); } };
  const file = (f?: File) => { if (!f) return; setFmt(f.name.endsWith('.csv') ? 'csv' : 'json'); f.text().then(setContent); };
  return (<Panel title="Import (Quelle → Import → Validierung → lokale Datenbank)">
    <div className="flex gap-2 items-center mb-2"><Select value={table} onChange={setTable} options={[['substances', 'Stoffdaten'], ['radionuclides', 'Radionuklide'], ['biological_agents', 'Biologische Agenzien'], ['test_tubes', 'Prüfröhrchen']]} /><Select value={fmt} onChange={(v) => setFmt(v as any)} options={[['json', 'JSON'], ['csv', 'CSV']]} />
      <label className="btn cursor-pointer">[ DATEI HOCHLADEN ]<input type="file" className="hidden" accept=".json,.csv" onChange={(e) => file(e.target.files?.[0])} /></label></div>
    <textarea className="inp w-full h-40 font-mono" placeholder='[{"name":"Beispielstoff","cas":"67-64-1","cbrn_category":"C","source_id":"gestis"}]' value={content} onChange={(e) => setContent(e.target.value)} />
    <div className="flex gap-2 mt-2"><Btn onClick={() => run(false)} disabled={!content}>Prüfen</Btn><Btn kind="primary" onClick={() => run(true)} disabled={!res || res.committed}>[ IMPORTIEREN ]</Btn><span className="text-bad">{err}</span></div>
    {res && <div className="mt-3"><div>{res.total} Datensätze erkannt</div><div className="text-ok">{res.valid} gültig</div><div className="text-warn">{res.review.length} benötigen Prüfung{res.review.length ? ':' : ''}</div>
      {res.review.map((r: any) => <div key={r.id} className="text-[12px] text-dim">· {r.name}: {r.reasons.join('; ')}</div>)}{res.invalid.map((r: any, i: number) => <div key={i} className="text-[12px] text-bad">· Zeile {r.row ?? '–'}: {r.reason}</div>)}
      {res.committed && <div className="mt-1 text-ok">Importiert (Status „ungeprüft“).</div>}</div>}
    <div className="text-[11px] text-dim mt-3">CAS-Nummern werden inkl. Prüfziffer validiert; Datensätze ohne bekannte Quelle werden zur Prüfung markiert. Importierte Datensätze erhalten den Status „unverified“.</div>
  </Panel>);
}

const TABLES: [string, string][] = [['substances', 'Stoffe'], ['radionuclides', 'Radionuklide'], ['biological_agents', 'Biologische Agenzien'], ['measurement_devices', 'Messgeräte'], ['measurement_methods', 'Messverfahren'], ['sources', 'Quellen'], ['scenarios', 'Szenarien'], ['test_tubes', 'Prüfröhrchen'], ['vehicles', 'Fahrzeuge'], ['crew', 'Besatzung'], ['users', 'Benutzer']];
function Admin() {
  const { can } = useLive(); const [t, setT] = useState('substances'); const rows = useApi<any[]>(can(4) ? '/admin/' + t : null, [], [t]); const [sel, setSel] = useState<string>(''); const [txt, setTxt] = useState(''); const [msg, setMsg] = useState('');
  if (!can(4)) return <Panel title="Administration"><div className="text-dim">Nur Administrator. (Rolle oben rechts umschalten.)</div></Panel>;
  const pick = (id: string) => { setSel(id); setTxt(JSON.stringify(rows.data?.find((r) => r.id === id), null, 2)); setMsg(''); };
  const save = async () => { try { const o = JSON.parse(txt); await api(`/admin/${t}/${o.id}`, { method: 'PUT', body: o }); setMsg('Gespeichert (im Audit-Log protokolliert)'); rows.reload(); setSel(o.id); } catch (e: any) { setMsg(e.message); } };
  const del = async () => { if (!sel || !confirm(`${sel} löschen?`)) return; await api(`/admin/${t}/${sel}`, { method: 'DELETE' }); setSel(''); setTxt(''); rows.reload(); };
  return (<Panel title="Administration – Datensätze bearbeiten / hinzufügen (JSON)">
    <div className="flex gap-2 mb-2"><Select value={t} onChange={(v) => { setT(v); setSel(''); setTxt(''); }} options={TABLES} /><Btn onClick={() => { setSel(''); setTxt(rows.data?.[0] ? JSON.stringify(Object.fromEntries(Object.keys(rows.data[0]).map((k) => [k, k === 'id' ? 'neu-id' : null])), null, 2) : '{ "id": "neu-id" }'); }}>+ Neu (Vorlage)</Btn></div>
    <div className="grid grid-cols-12 gap-3"><div className="col-span-3 max-h-[420px] overflow-auto border border-line">{(rows.data ?? []).map((r) => <div key={r.id} onClick={() => pick(r.id)} className={`px-2 py-1 cursor-pointer border-b border-line/50 ${sel === r.id ? 'bg-panel2' : 'hover:bg-panel2'}`}>{r.name ?? r.product ?? r.short ?? r.id}</div>)}</div>
      <div className="col-span-9"><textarea className="inp w-full h-[380px] font-mono text-[11px]" value={txt} onChange={(e) => setTxt(e.target.value)} spellCheck={false} /><div className="flex gap-2 mt-2 items-center"><Btn kind="primary" onClick={save} disabled={!txt}>Speichern</Btn><Btn kind="danger" onClick={del} disabled={!sel}>Löschen</Btn><span className="text-dim">{msg}</span></div></div></div></Panel>);
}

function Incidents() {
  const inc = useApi<any[]>('/incidents', ['incident.changed']);
  return (<Panel title="Einsätze" body="!p-0"><table className="t"><thead><tr><th>ID</th><th>Stichwort</th><th>Ort</th><th>Art</th><th>Menge</th><th>Stoff (Simulation)</th><th>Status</th><th>Angelegt von</th></tr></thead><tbody>
    {(inc.data ?? []).map((e) => <tr key={e.id}><td className="font-mono">{e.id}</td><td><b>{e.name}</b></td><td>{e.location_text ?? NA}</td><td>{e.category_text}</td><td>{e.amount}</td><td>{e.ref_hidden ? <Badge>VERDECKT</Badge> : e.ref_name}</td><td><Badge color={e.status === 'AKTIV' ? '#3fb950' : '#817d78'}>{e.status}</Badge></td><td className="text-dim">{e.created_by}</td></tr>)}</tbody></table>
    <div className="p-2 text-[11px] text-dim">Der Wahrheitsstoff eines laufenden Einsatzes bleibt verdeckt (außer die Lage meldet ihn als bekannt) und wird nach Einsatzende angezeigt. Neuer Einsatz: Kopfzeile → Einsatz beenden.</div></Panel>);
}

function Users() {
  const c = useApi<any[]>('/crew', ['poll']);
  return (<Panel title="Aktive Anmeldungen" body="!p-0"><table className="t"><thead><tr><th>Name</th><th>Funktion</th><th>Fahrzeug</th></tr></thead><tbody>
    {(c.data ?? []).map((u: any, i: number) => <tr key={i}><td>{u.name}</td><td>{u.role}</td><td>{u.vehicle_id}</td></tr>)}</tbody></table>
    <div className="p-2 text-[11px] text-dim">Anmeldung am Fahrzeug mit Name und Funktion; alle angemeldeten Personen haben vollen Zugriff.</div></Panel>);
}

function Config() {
  const { meta, can, status } = useLive(); const [ch, setCh] = useState<string[]>(meta?.mgmg_channels ?? []); const [o, setO] = useState(JSON.stringify(status?.fivem_origin ?? { x: 0, y: 0, scale: 1 })); const [msg, setMsg] = useState('');
  const [off, setOff] = useState<{ dx: number; dy: number }>(status?.gta_offset ?? { dx: 0, dy: 0 });
  const ALL = ['O2', 'CO', 'H2S', 'LEL', 'CH4'];
  const save = async () => { try { await api('/system/config', { method: 'POST', body: { mgmg_channels: ch, fivem_origin: JSON.parse(o), gta_offset: { dx: off.dx, dy: off.dy } } }); setMsg('Gespeichert – Seite neu laden, um Änderungen zu übernehmen'); } catch (e: any) { setMsg(e.message); } };
  return (<Panel title="Konfiguration"><div className="lbl">MGMG-Kanäle (konfigurierbar)</div><div className="flex gap-4 my-1">{ALL.map((k) => <label key={k}><input type="checkbox" checked={ch.includes(k)} onChange={(e) => setCh(e.target.checked ? ALL.filter((x) => ch.includes(x) || x === k) : ch.filter((x) => x !== k))} /> {k}</label>)}</div>
    <div className="lbl mt-3">FiveM-Koordinatenursprung (nur Nicht-GTA-Karten; im GTA-Modus werden Spielkoordinaten direkt verwendet)</div><input className="inp w-96 font-mono" value={o} onChange={(e) => setO(e.target.value)} />
    <div className="lbl mt-3">Kartenversatz (Feinkalibrierung des GTA-Kartenbilds, Meter; + = Bild nach Osten/Norden verschieben)</div><div className="flex gap-2 items-center"><span className="text-dim">X</span><input className="inp w-24 font-mono" type="number" value={off.dx} onChange={(e) => setOff({ ...off, dx: +e.target.value })} /><span className="text-dim">Y</span><input className="inp w-24 font-mono" type="number" value={off.dy} onChange={(e) => setOff({ ...off, dy: +e.target.value })} /></div>
    <div className="mt-3 flex gap-2 items-center"><Btn kind="primary" onClick={save} disabled={!can(4)}>Speichern</Btn><span className="text-dim">{can(4) ? msg : 'Nur Administrator'}</span></div></Panel>);
}

export default function System() {
  const [tab, setTab] = useState('status');
  return (<Page title="System" sub="Status, Quellen, Import, Administration, Einsätze, Anmeldungen"><Tabs tabs={[['status', 'Status'], ['quellen', 'Quellen'], ['import', 'Import'], ['admin', 'Administration'], ['einsaetze', 'Einsätze'], ['benutzer', 'Benutzer'], ['config', 'Konfiguration']]} value={tab} onChange={setTab} />
    {tab === 'status' && <Status />}{tab === 'quellen' && <Sources />}{tab === 'import' && <Importer />}{tab === 'admin' && <Admin />}{tab === 'einsaetze' && <Incidents />}{tab === 'benutzer' && <Users />}{tab === 'config' && <Config />}</Page>);
}
export { NA, QualityBadge };
