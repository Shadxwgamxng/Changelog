import { useMemo, useState } from 'react';
import { Siren } from 'lucide-react';
import { Logo } from '../components/Logo';
import { MapPicker, type Pos } from '../components/MapPicker';
import { Btn, Modal, Select } from '../components/ui';
import { IncidentReportView } from '../components/IncidentReport';
import { api } from '../api';
import { useApi, useLive } from '../store';

const CATS: [string, string][] = [['C', 'Chemisch (C)'], ['R', 'Radiologisch (R)'], ['B', 'Biologisch (B)'], ['U', 'Unbekannt (U)']];
const AMOUNTS: [string, string][] = [['gering', 'Gering'], ['mittel', 'Mittel'], ['groß', 'Groß']];

/** Einsatz anlegen: Grunddaten, aus denen die Simulation eine realistische (verdeckte) Lage rechnet. Pflicht vor der ersten Messfahrt. */
export default function IncidentSetup({ embedded, onDone }: { embedded?: boolean; onDone?: () => void }) {
  const { ownVehicle, session, status, logout } = useLive();
  const subs = useApi<any[]>('/substances?cat=C'); const nucs = useApi<any[]>('/radionuclides'); const bios = useApi<any[]>('/biological-agents');
  const [f, setF] = useState({ name: '', location_text: '', report: '', category: 'C', amount: 'mittel', known: false, ref: '' });
  const [pos, setPos] = useState<Pos | null>(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<any>(null);
  const showLast = async () => { const l = await api<any[]>('/reports'); const id = l.find((r) => r.kind === 'EINSATZBERICHT_E')?.id; if (id) setLast(await api('/reports/' + id)); };
  const lastList = useApi<any[]>('/reports', ['incident.changed']); const hasLast = (lastList.data ?? []).some((r) => r.kind === 'EINSATZBERICHT_E');
  const fivem = status?.fivem === 'CONNECTED' && ownVehicle?.gps_fix ? { lat: ownVehicle.lat, lon: ownVehicle.lon } : null;

  const options = useMemo<[string, string][]>(() => {
    const sl = ((subs.data as any)?.items ?? subs.data ?? []) as any[];
    const s = sl.filter((x) => x.cbrn_category === 'C').map((x) => [`substance:${x.id}`, `${x.name}${x.cas ? ' · ' + x.cas : ''}`] as [string, string]);
    const n = (nucs.data ?? []).filter((x) => x.gamma_kev?.length).map((x) => [`radionuclide:${x.id}`, x.name] as [string, string]);
    const b = (bios.data ?? []).map((x) => [`biological:${x.id}`, x.name] as [string, string]);
    return f.category === 'C' ? s : f.category === 'R' ? n : f.category === 'B' ? b : [...s, ...n];
  }, [subs.data, nucs.data, bios.data, f.category]);

  const needRef = f.known && !f.ref;
  const ok = f.name.trim() && pos && !needRef;
  const submit = async () => {
    if (!pos) return; setBusy(true); setErr('');
    const [ref_type, ref_id] = f.ref ? f.ref.split(':') : [undefined, undefined];
    try { await api('/incidents', { method: 'POST', body: { name: f.name, location_text: f.location_text, report: f.report, category: f.category, amount: f.amount, known: f.known, ref_type, ref_id, lat: pos.lat, lon: pos.lon } }); onDone?.(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const body = (
    <div className="panel p-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><div className="lbl">Einsatzstichwort *</div><input className="inp w-full" placeholder="z. B. CBRN-Lage Hafen – Austritt unbekannter Gefahrstoff" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><div className="lbl">Einsatzort (Text)</div><input className="inp w-full" placeholder="z. B. Hafengelände, Lagerhalle 3" value={f.location_text} onChange={(e) => setF({ ...f, location_text: e.target.value })} /></div>
        <div><div className="lbl">Gefahrenart (Meldebild)</div><Select className="w-full" value={f.category} onChange={(v) => setF({ ...f, category: v, ref: '' })} options={CATS} /></div>
        <div className="col-span-2"><div className="lbl">Lagebeschreibung</div><textarea className="inp w-full h-16" placeholder="Was wurde gemeldet? Verletzte, Geruch, Behälter, Kennzeichnung …" value={f.report} onChange={(e) => setF({ ...f, report: e.target.value })} /></div>
        <div><div className="lbl">Freigesetzte Menge / Ausdehnung</div><Select className="w-full" value={f.amount} onChange={(v) => setF({ ...f, amount: v })} options={AMOUNTS} /></div>
        <div><div className="lbl">Stoff vorgeben (verdeckt)</div>
          <Select className="w-full" value={f.ref} onChange={(v) => setF({ ...f, ref: v })} options={[['', 'Zufällig passend zur Gefahrenart'], ...options]} /></div>
        <label className="col-span-2 flex items-start gap-2 text-[12.5px]"><input type="checkbox" className="mt-1" checked={f.known} onChange={(e) => setF({ ...f, known: e.target.checked })} />
          <span>Stoff ist der Lage <b>bekannt</b> (z. B. Gefahrgutkennzeichnung) – wird dann im Einsatz angezeigt. Sonst bleibt er verdeckt und muss mit Messgeräten, Proben und Analyse eingegrenzt werden.{needRef && <span className="text-warn"> Bitte oben einen Stoff wählen.</span>}</span></label>
        <div className="col-span-2"><div className="lbl mb-1">Einsatzstelle auf der Karte markieren *</div>
          <MapPicker value={pos} onChange={setPos} hint={fivem} hintLabel="Aktuelle FiveM-Position des Fahrzeugs" height={300} />
          {fivem && <button className="text-[12px] text-accent mt-1" onClick={() => setPos(fivem)}>Einsatzstelle = aktuelle Fahrzeugposition</button>}</div>
      </div>
      <div className="mt-4 flex items-center gap-3"><Btn kind="primary" onClick={submit} disabled={!ok || busy}>Einsatz anlegen</Btn>{err && <span className="text-bad">{err}</span>}
        </div>
    </div>
  );
  if (embedded) return body;
  return (
    <div className="h-full overflow-auto p-6">
      <div className="w-full max-w-[860px] mx-auto">
        <div className="flex items-center gap-3 mb-5"><Logo size={44} /><div className="flex-1"><div className="eyebrow">{session?.vehicle_name} · {session?.name} ({session?.funktion})</div><h1 className="text-[26px] font-semibold tracking-tight leading-tight flex items-center gap-2"><Siren size={22} className="text-accent" />Neuer Einsatz</h1></div>
          <button className="text-dim text-[12px] underline" onClick={() => logout()}>Abmelden</button></div>
        <div className="text-[12.5px] text-dim mb-3">Du bist die erste Person am Fahrzeug – nur du legst den Einsatz an. Alle weiteren Anmeldungen steigen automatisch in diesen Einsatz ein.</div>
        {hasLast && <div className="mb-3"><Btn onClick={showLast}>Letzten Einsatzbericht ansehen</Btn></div>}
        {body}
        {last && <Modal title="Letzter Einsatzbericht" wide onClose={() => setLast(null)}><IncidentReportView r={last} /></Modal>}
      </div>
    </div>
  );
}
