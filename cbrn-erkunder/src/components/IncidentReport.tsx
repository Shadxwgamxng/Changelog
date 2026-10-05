import { useState } from 'react';
import { Badge, Btn, Field, Modal } from './ui';
import { api } from '../api';
import { copyText } from '../lib/clipboard';
import { useLive } from '../store';
import { dt, time, num, NA } from '../lib/format';

const dur = (min: number) => `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;

export function incidentReportText(r: any) {
  const L = [`EINSATZBERICHT ${r.number}`, `Stichwort: ${r.incident.name}`, `Gefahrenart: ${r.incident.category_text} · Menge: ${r.incident.amount}`, '',
    `WO: ${r.where}`, `WAS: ${r.what}`, '',
    `WER: ${r.crew_count} Personen (Besatzung) · Kräfte gesamt: ${r.forces_count}${r.other_forces ? ' · weitere Kräfte: ' + r.other_forces : ''}`,
    ...r.crew.map((c: any) => `  - ${c.name}, ${c.funktion} (${c.vehicle})`), `Fahrzeuge: ${r.vehicles.join(', ') || NA}`, '',
    `WIE LANGE: ${dt(r.start)} bis ${dt(r.end)} (${dur(r.duration_min)})`, '',
    `MASSNAHMEN: ${r.measures}`, `ERGEBNIS: ${r.result}`,
    `Messfahrten: ${r.stats.runs} (${num(r.stats.run_distance_m / 1000, 2)} km) · Messpunkte: ${r.stats.measurements} (auffällig: ${r.stats.anomalies}) · Proben: ${r.stats.samples} · Warnungen: ${r.stats.alarms}`,
    `Max. Dosisleistung: ${num(r.stats.max_dose, 3)} µSv/h · Max. PID: ${num(r.stats.max_pid, 1)} ppm`,
    ...(r.device_findings?.length ? [`Geräteergebnis (IMS): ${r.device_findings.join(', ')}`] : []),
    ...(r.weather ? [`Wetter: ${r.weather.temperature} °C, ${r.weather.humidity} %, Wind aus ${r.weather.wind_from_text} ${r.weather.wind_speed} m/s`] : []),
    `Verletzte/Betroffene: ${r.injured ?? NA} · Evakuierte: ${r.evacuated ?? NA}`,
    ...(r.handover ? [`Übergabe / weitere Maßnahmen: ${r.handover}`] : []), ...(r.remarks ? [`Bemerkungen: ${r.remarks}`] : []),
    '', `Tatsächlicher Stoff: ${r.truth.name ?? NA}${r.truth.cas ? ' (CAS ' + r.truth.cas + ')' : ''}`, `Verfasser: ${r.author}`];
  return L.join('\n');
}

export function IncidentReportView({ r }: { r: any }) {
  const [msg, setMsg] = useState('');
  const copy = async () => { setMsg((await copyText(incidentReportText(r))) ? 'Kopiert ✓' : 'Kopieren nicht möglich'); setTimeout(() => setMsg(''), 2500); };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><span className="flex-1" /><Btn onClick={copy}>Als Text kopieren</Btn>{msg && <span className="text-ok text-[12px]">{msg}</span>}</div>
      <div className="grid grid-cols-4 gap-3"><Field label="Bericht">{r.number}</Field><Field label="Stichwort">{r.incident.name}</Field><Field label="Gefahrenart">{r.incident.category_text}</Field><Field label="Menge">{r.incident.amount}</Field></div>
      <div className="grid grid-cols-2 gap-3"><div><div className="lbl">Wo</div><div>{r.where}</div></div><div><div className="lbl">Was</div><div className="whitespace-pre-wrap">{r.what}</div></div></div>
      <div className="grid grid-cols-4 gap-3"><Field label="Beginn">{dt(r.start)}</Field><Field label="Ende">{dt(r.end)}</Field><Field label="Dauer">{dur(r.duration_min)}</Field><Field label="Kräfte gesamt">{r.forces_count}</Field></div>
      <div><div className="lbl mb-1">Wer – Besatzung ({r.crew_count})</div><table className="t"><tbody>{r.crew.map((c: any, i: number) => <tr key={i}><td>{c.name}</td><td>{c.funktion}</td><td className="text-dim">{c.vehicle}</td></tr>)}</tbody></table>
        {r.other_forces && <div className="mt-1 text-[12.5px]"><span className="lbl">Weitere Kräfte: </span>{r.other_forces}</div>}</div>
      <div className="grid grid-cols-2 gap-3"><div><div className="lbl">Durchgeführte Maßnahmen</div><div className="whitespace-pre-wrap">{r.measures}</div></div><div><div className="lbl">Ergebnis / Feststellungen</div><div className="whitespace-pre-wrap">{r.result}</div></div></div>
      <div className="grid grid-cols-6 gap-3"><Field label="Messfahrten">{r.stats.runs}</Field><Field label="Strecke">{num(r.stats.run_distance_m / 1000, 2)} km</Field><Field label="Messpunkte">{r.stats.measurements}</Field><Field label="Auffällig">{r.stats.anomalies}</Field><Field label="Proben">{r.stats.samples}</Field><Field label="Warnungen">{r.stats.alarms}</Field></div>
      <div className="grid grid-cols-4 gap-3"><Field label="Max. Dosisleistung">{num(r.stats.max_dose, 3)} µSv/h</Field><Field label="Max. PID">{num(r.stats.max_pid, 1)} ppm</Field><Field label="Verletzte/Betroffene">{r.injured ?? NA}</Field><Field label="Evakuierte">{r.evacuated ?? NA}</Field></div>
      {r.device_findings?.length > 0 && <div><div className="lbl">Geräteergebnis (IMS)</div>{r.device_findings.join(', ')}</div>}
      {r.samples.length > 0 && <div><div className="lbl mb-1">Proben</div>{r.samples.map((s: any) => <div key={s.id} className="font-mono text-[12px]">{s.id} · {s.kind} · {s.lab_status}{s.lab_text ? ` · ${s.lab_text}` : ''}</div>)}</div>}
      {r.alarms.length > 0 && <div><div className="lbl mb-1">Warnungen</div>{r.alarms.map((a: any) => <div key={a.id} className="text-[12.5px]">{time(a.ts)} · {a.category} · {a.description}</div>)}</div>}
      {r.weather && <div><div className="lbl">Wetter bei Einsatzende (Wind kommt aus)</div><span className="font-mono">{r.weather.temperature} °C · {r.weather.humidity} % · {r.weather.pressure} hPa · {r.weather.wind_speed} m/s aus {r.weather.wind_from_text}</span></div>}
      {(r.handover || r.remarks) && <div className="grid grid-cols-2 gap-3">{r.handover && <div><div className="lbl">Übergabe / weitere Maßnahmen</div>{r.handover}</div>}{r.remarks && <div><div className="lbl">Bemerkungen</div>{r.remarks}</div>}</div>}
      <div className="panel p-3 border-accent/40"><div className="lbl">Auflösung</div>Tatsächlicher Stoff: <b>{r.truth.name ?? NA}</b>{r.truth.cas ? ` · CAS ${r.truth.cas}` : ''}</div>
      <div className="text-dim text-[12px]">Verfasser: {r.author}</div>
    </div>
  );
}

/** Einsatz beenden: Der Einsatzbericht (Wo, Was, Wer, Wie lange, Kräfte …) ist Pflicht. */
export function EndIncidentModal({ onClose }: { onClose: () => void }) {
  const { incident, session } = useLive();
  const crew = useCrewPreview();
  const [f, setF] = useState({ where: incident?.location_text ?? '', what: [incident?.name, incident?.report].filter(Boolean).join(' – '), measures: '', result: '', injured: '', evacuated: '', forces_count: '', other_forces: '', handover: '', remarks: '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF({ ...f, [k]: v });
  const ok = f.where.trim() && f.what.trim() && f.measures.trim() && f.result.trim();
  const submit = async () => { setBusy(true); setErr(''); try { await api(`/incidents/${incident.id}/end`, { method: 'POST', body: f }); onClose(); } catch (e: any) { setErr(e.message); setBusy(false); } };
  const T = (k: keyof typeof f, label: string, req = false, rows = 2) => (<div><div className="lbl">{label}{req && ' *'}</div><textarea className="inp w-full" rows={rows} value={f[k]} onChange={(e) => set(k, e.target.value)} /></div>);
  const N = (k: keyof typeof f, label: string, ph = '') => (<div><div className="lbl">{label}</div><input className="inp w-full" inputMode="numeric" placeholder={ph} value={f[k]} onChange={(e) => set(k, e.target.value.replace(/[^0-9]/g, ''))} /></div>);
  return (
    <Modal title={`Einsatz beenden – Einsatzbericht ${incident?.id}`} wide onClose={onClose}>
      <div className="text-[12.5px] text-dim mb-3">Der Einsatz kann nur mit einem Einsatzbericht beendet werden. Dauer, Besatzung und Messstatistik werden automatisch ergänzt. Laufende Messfahrten werden beendet.</div>
      <div className="grid grid-cols-2 gap-3">
        {T('where', 'Wo – Einsatzort', true)}{T('what', 'Was – Lage / Einsatzgeschehen', true)}
        <div className="col-span-2 text-[12.5px]"><span className="lbl">Wer – bisher beteiligt ({crew.length}): </span>{crew.map((c) => `${c.name} (${c.funktion})`).join(', ') || session?.name}</div>
        {N('forces_count', 'Anzahl Kräfte gesamt (leer = Besatzungsstärke)', String(crew.length || 1))}{T('other_forces', 'Weitere Kräfte / Einheiten (z. B. Feuerwehr, RD, Polizei)')}
        {T('measures', 'Durchgeführte Maßnahmen', true, 3)}{T('result', 'Ergebnis / Feststellungen (z. B. festgestellter Stoff, Gefahrenbereich)', true, 3)}
        {N('injured', 'Verletzte / Betroffene')}{N('evacuated', 'Evakuierte Personen')}
        {T('handover', 'Übergabe / weitere Maßnahmen')}{T('remarks', 'Bemerkungen')}
      </div>
      <div className="mt-4 flex items-center gap-3"><Btn kind="danger" onClick={submit} disabled={!ok || busy}>Einsatzbericht speichern & Einsatz beenden</Btn><Btn onClick={onClose}>Abbrechen</Btn>{err && <span className="text-bad">{err}</span>}</div>
    </Modal>
  );
}
import { useApi } from '../store';
function useCrewPreview() { const c = useApi<any[]>('/crew', ['crew.changed']); const seen = new Set<string>(); return (c.data ?? []).map((x) => ({ name: x.name, funktion: x.role })).filter((x) => (seen.has(x.name) ? false : (seen.add(x.name), true))); }
