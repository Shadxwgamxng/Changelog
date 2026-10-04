import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal, Btn, Badge, Select, LevelBadge, CatBadge, SimNote } from './ui';
import { api } from '../api';
import { useApi, useLive } from '../store';

const OPT = (a: [string, string][]) => a;
const ODOR = OPT([['unbekannt', 'nicht beurteilt'], ['geruchlos', 'geruchlos'], ['stechend', 'stechend / beißend'], ['chlor', 'chlorartig (Schwimmbad)'], ['ammoniak', 'ammoniakartig'], ['faule_eier', 'faule Eier'], ['suesslich', 'süßlich / fruchtig / ätherisch'], ['alkohol', 'alkoholisch'], ['benzin', 'benzin- / lösemittelartig'], ['aromatisch', 'aromatisch'], ['bittermandel', 'bittermandelartig'], ['knoblauch', 'knoblauch- / senfartig'], ['essig', 'essigartig'], ['oelig', 'ölig / petroleumartig'], ['teer', 'teerig / phenolartig']]);
const COLOR = OPT([['unbekannt', 'nicht beurteilt'], ['farblos', 'farblos / klar'], ['gelb', 'gelb(lich)'], ['grün', 'grün(lich)'], ['braun', 'braun'], ['rot', 'rot(braun)'], ['blau', 'blau'], ['violett', 'violett'], ['weiß', 'weiß'], ['grau', 'grau'], ['silber', 'silbrig / metallisch']]);
const SYMP: [string, string][] = [['augen', 'Augenreizung'], ['atemwege', 'Husten / Atemwegsreizung'], ['atemnot', 'Atemnot'], ['haut', 'Haut gerötet / verätzt'], ['schwindel', 'Kopfschmerz / Schwindel'], ['uebelkeit', 'Übelkeit / Erbrechen'], ['bewusstlos', 'Plötzlich bewusstlos'], ['pupillen', 'Enge Pupillen / Speichelfluss / Krämpfe'], ['blasen', 'Verzögerte Hautblasen'], ['blau', 'Blaue Lippen / Haut']];
const lbl = 'lbl mb-0.5';

export function AnalysisModal({ sample, onClose, onSaved }: { sample?: any; onClose: () => void; onSaved?: () => void }) {
  const { live } = useLive(); const opts = useApi<any>('/analysis/options').data;
  const prev = sample?.analysis?.observations ?? {};
  const [f, setF] = useState<any>({ origin: 'unbekannt', state: 'unbekannt', flammable: 'unbekannt', ph: 'unbekannt', water: 'unbekannt', odor: 'unbekannt', color: 'unbekannt', symptoms: [], fumes: false, ...prev });
  const [res, setRes] = useState<any>(sample?.analysis?.result ?? null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [saved, setSaved] = useState(false);
  const set = (k: string, v: any) => setF((o: any) => ({ ...o, [k]: v }));
  const numIn = (k: string, ph: string, w = 'w-24') => <input className={`inp ${w}`} placeholder={ph} value={f[k] ?? ''} onChange={(e) => set(k, e.target.value)} inputMode="decimal" />;
  const takeLive = () => { const r = live['CBRN-01']; if (!r) return; const c = r.mgmg.channels; setF((o: any) => ({ ...o, pid: r.pid.value, dose: r.dose.value, lel: c.LEL ?? o.lel, co: c.CO ?? o.co, h2s: c.H2S ?? o.h2s, o2: c.O2 ?? o.o2, ims: r.ims.level ? r.ims.result : o.ims })); };
  const toNum = (v: any) => (v === '' || v == null ? null : Number(String(v).replace(',', '.')));
  const body = () => ({ ...f, pid: toNum(f.pid), lel: toNum(f.lel), co: toNum(f.co), h2s: toNum(f.h2s), o2: toNum(f.o2), dose: toNum(f.dose), gamma_kev: String(f.gamma ?? '').split(/[;, ]+/).map(Number).filter((x) => x > 0), state: f.state === 'unbekannt' ? undefined : f.state });
  const run = async () => {
    setBusy(true); setErr('');
    try { const r = sample ? await api(`/samples/${sample.id}/analysis`, { method: 'POST', body: body() }) : await api('/analysis', { method: 'POST', body: body() }); setRes(r); if (sample) { setSaved(true); onSaved?.(); } } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const tog = (k: string) => set('symptoms', f.symptoms.includes(k) ? f.symptoms.filter((x: string) => x !== k) : [...f.symptoms, k]);
  return (
    <Modal wide title={sample ? `Probe analysieren – ${sample.id}` : 'Schnellanalyse (ohne Probe)'} onClose={onClose}>
      {!res ? null : (
        <div className="border border-line2 bg-bg p-3 mb-3">
          <div className="flex items-center gap-3 flex-wrap"><b className="text-[15px]">{res.label ?? res.summary}</b>{res.candidates[0] && <LevelBadge l={res.candidates[0].score >= 3 ? res.candidates[0].level : 'hinweis'} />}{saved && <Badge color="#4fa86b">IN PROBE ÜBERNOMMEN</Badge>}</div>
          {res.hint && <div className="text-warn text-[12px] mt-1">{res.hint}</div>}
          <div className="mt-2 space-y-2">
            {res.candidates.filter((c: any) => c.score > 0).slice(0, 5).map((c: any, i: number) => (
              <div key={c.id} className={`border p-2 ${i === 0 ? 'border-accent' : 'border-line'}`}>
                <div className="flex items-center gap-2 flex-wrap"><span className="text-dim font-mono">{i + 1}.</span><Link to={`/stoffe/${c.id}`} onClick={onClose} className="font-semibold text-accent">{c.name}</Link><span className="font-mono text-dim text-[11px]">CAS {c.cas}</span>
                  <CatBadge c={c.category} />{c.subcategory === 'CWA' && <Badge color="#d0503f">Kampfstoff</Badge>}<LevelBadge l={c.level} /><span className="ml-auto font-mono text-[12px]">Übereinstimmung ≈ {c.confidence} %</span></div>
                <div className="h-1.5 bg-line mt-1"><div className="h-full bg-accent" style={{ width: `${Math.min(100, c.confidence)}%` }} /></div>
                <ul className="mt-1 text-[12px] columns-2 gap-4">{c.reasons.filter((r: any) => r.ok !== null).slice(0, 8).map((r: any, k: number) => <li key={k} className={r.ok ? 'text-ok' : 'text-bad'}>{r.ok ? '✓' : '✗'} <span className="text-txt">{r.text}</span></li>)}</ul>
                {i === 0 && <div className="text-[12px] mt-1"><span className="lbl">Nächste Schritte:</span> {c.next.join(' · ')}</div>}
                <Link to={`/stoffe/${c.id}#handlung`} onClick={onClose} className="text-accent text-[12px]">Handlungsempfehlungen öffnen →</Link>
              </div>))}
          </div>
          {res.extras?.map((x: any) => (
            <div key={x.title} className="mt-2 border border-warn/60 p-2 text-[12px]"><b>{x.title}</b> – {x.text}{x.refs?.length > 0 && <div className="mt-1 flex gap-2 flex-wrap">{x.refs.map((r: any) => <Link key={r.id} onClick={onClose} to={x.type === 'radiologisch' ? `/radionuklide/${r.id}` : `/bio/${r.id}`}><Badge color="#d6742a">{r.name}{r.hint ? ` (${r.hint})` : ''}</Badge></Link>)}</div>}</div>))}
          <div className="mt-2"><SimNote>ENTSCHEIDUNGSHILFE – keine bestätigte Identifikation. Bestätigung nur durch weitere Messung und Laborbefund.</SimNote></div>
        </div>)}
      <div className="grid grid-cols-3 gap-3">
        <div><div className={lbl}>Woher stammt die Probe?</div><Select className="w-full" value={f.origin} onChange={(v) => set('origin', v)} options={[['unbekannt', 'unbekannt'], ...(opts?.origins ?? []).filter((o: any) => o.key !== 'unbekannt').map((o: any) => [o.key, o.label] as [string, string])]} /></div>
        <div><div className={lbl}>Aggregatzustand</div><Select className="w-full" value={f.state} onChange={(v) => set('state', v)} options={[['unbekannt', 'unbekannt'], ['Gas', 'Gas / Dampf'], ['Flüssigkeit', 'Flüssigkeit'], ['Feststoff', 'Feststoff / Pulver']]} /></div>
        <div><div className={lbl}>War es entflammbar / brennbar?</div><Select className="w-full" value={f.flammable} onChange={(v) => set('flammable', v)} options={[['unbekannt', 'unbekannt'], ['ja', 'ja (brennt / zündet)'], ['nein', 'nein']]} /></div>
        <div><div className={lbl}>Geruch</div><Select className="w-full" value={f.odor} onChange={(v) => set('odor', v)} options={ODOR} /></div>
        <div><div className={lbl}>Farbe</div><Select className="w-full" value={f.color} onChange={(v) => set('color', v)} options={COLOR} /></div>
        <div><div className={lbl}>pH-Verhalten (Indikator)</div><Select className="w-full" value={f.ph} onChange={(v) => set('ph', v)} options={[['unbekannt', 'nicht gemessen'], ['sauer', 'sauer (pH < 7)'], ['neutral', 'neutral'], ['basisch', 'basisch (pH > 7)']]} /></div>
        <div><div className={lbl}>Verhalten mit Wasser</div><Select className="w-full" value={f.water} onChange={(v) => set('water', v)} options={[['unbekannt', 'nicht geprüft'], ['mischbar', 'mischt sich / löst sich'], ['schwimmt', 'schwimmt oben'], ['sinkt', 'sinkt ab'], ['reagiert', 'reagiert (Zischen, Gas, Wärme)']]} /></div>
        <div><div className={lbl}>UN-Nummer / Kennzeichnung</div><input className="inp w-full" placeholder="z. B. 1017 oder Aufschrift" value={f.un ?? ''} onChange={(e) => set('un', e.target.value)} /></div>
        <div><div className={lbl}>Eigene Vermutung (Name)</div><input className="inp w-full" placeholder="z. B. Chlor, Benzin …" value={f.guess ?? ''} onChange={(e) => set('guess', e.target.value)} /></div>
      </div>
      <div className="flex items-center justify-between mt-4 mb-1"><div className="lbl">Messwerte</div><Btn onClick={takeLive} disabled={!live['CBRN-01']}>Live-Werte von CBRN-01 übernehmen</Btn></div>
      <div className="flex gap-3 flex-wrap items-end">
        <div><div className={lbl}>PID (ppm)</div>{numIn('pid', '0,0')}</div><div><div className={lbl}>EX (%UEG)</div>{numIn('lel', '0')}</div><div><div className={lbl}>CO (ppm)</div>{numIn('co', '0')}</div>
        <div><div className={lbl}>H₂S (ppm)</div>{numIn('h2s', '0')}</div><div><div className={lbl}>O₂ (%)</div>{numIn('o2', '20,9')}</div><div><div className={lbl}>Dosisleistung (µSv/h)</div>{numIn('dose', '0,09', 'w-32')}</div>
        <div><div className={lbl}>Gamma-Linien (keV)</div><input className="inp w-40" placeholder="z. B. 662" value={f.gamma ?? ''} onChange={(e) => set('gamma', e.target.value)} /></div>
        <div className="grow"><div className={lbl}>IMS-Anzeige</div><input className="inp w-full" placeholder="z. B. Verdacht Halogen" value={f.ims ?? ''} onChange={(e) => set('ims', e.target.value)} /></div>
        <div className="grow"><div className={lbl}>Prüfröhrchen-Anzeige</div><input className="inp w-full" placeholder="z. B. Chlor 3 ppm" value={f.tubes ?? ''} onChange={(e) => set('tubes', e.target.value)} /></div>
      </div>
      <div className="lbl mt-4 mb-1">Beobachtete Symptome bei Personen</div>
      <div className="flex gap-2 flex-wrap">{SYMP.map(([k, l]) => <button key={k} onClick={() => tog(k)} className={`px-2 py-1 border text-[12px] ${f.symptoms.includes(k) ? 'border-accent bg-accent/20' : 'border-line2 text-dim hover:text-txt'}`}>{l}</button>)}</div>
      <div className="mt-4 flex items-center gap-3 justify-end">{err && <span className="text-bad">{err}</span>}<Btn onClick={onClose}>Schließen</Btn><Btn kind="primary" onClick={run} disabled={busy}>{sample ? 'Analysieren & in Probe übernehmen' : 'Analysieren'}</Btn></div>
    </Modal>
  );
}
