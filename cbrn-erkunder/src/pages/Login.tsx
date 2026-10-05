import { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';
import { Logo } from '../components/Logo';
import { Badge, Btn } from '../components/ui';
import { api } from '../api';
import { useLive } from '../store';

const mem = (k: string, v?: string) => { try { if (v !== undefined) localStorage.setItem(k, v); return localStorage.getItem(k) ?? ''; } catch { return ''; } };

export default function Login() {
  const { login } = useLive();
  const [data, setData] = useState<{ vehicles: any[]; funktionen: string[] } | null>(null);
  const [vid, setVid] = useState(mem('cbrn.lastVehicle')); const [name, setName] = useState(mem('cbrn.lastName')); const [funktion, setFunktion] = useState(mem('cbrn.lastFunktion'));
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { const f = () => api('/auth/vehicles').then(setData).catch((e) => setErr(e.message)); f(); const t = setInterval(f, 5000); return () => clearInterval(t); }, []);
  const submit = async () => {
    setBusy(true); setErr('');
    try { await login(vid, name.trim(), funktion.trim()); mem('cbrn.lastVehicle', vid); mem('cbrn.lastName', name.trim()); mem('cbrn.lastFunktion', funktion.trim()); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const ok = vid && name.trim().length >= 2 && funktion.trim();
  return (
    <div className="h-full overflow-auto flex items-center justify-center p-6">
      <div className="w-full max-w-[760px]">
        <div className="flex items-center gap-3 mb-6"><Logo size={44} /><div><div className="eyebrow">Messwesen · Simulation</div><h1 className="text-[26px] font-semibold tracking-tight leading-tight">Am Fahrzeug anmelden</h1></div></div>
        <div className="panel p-5">
          <div className="lbl mb-2">1 · Fahrzeug wählen</div>
          <div className="grid grid-cols-2 gap-3">
            {(data?.vehicles ?? []).map((v) => (
              <button key={v.id} onClick={() => setVid(v.id)} className={`text-left p-4 rounded-lg border transition-colors ${vid === v.id ? 'border-accent bg-accent/10' : 'border-line2 bg-panel2 hover:bg-white/[.06]'}`}>
                <div className="flex items-center gap-2 mb-1"><Truck size={18} className={vid === v.id ? 'text-accent' : 'text-dim'} /><span className="font-semibold text-[15px]">{v.name}</span></div>
                <div className="flex items-center gap-2 mb-2"><Badge color={v.connected ? '#3fb950' : '#817d78'}>{v.connected ? 'FIVEM VERBUNDEN' : 'FIVEM GETRENNT'}</Badge></div>
                <div className="text-[12px] text-dim">{v.crew.length ? <>Angemeldet: {v.crew.map((c: any) => `${c.name} (${c.funktion})`).join(', ')}</> : 'Niemand angemeldet'}</div>
              </button>))}
            {!data && !err && <div className="text-dim col-span-2 py-6 text-center">Lade Fahrzeuge …</div>}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-5">
            <div><div className="lbl mb-1">2 · Name</div><input className="inp w-full" placeholder="z. B. Max Mustermann" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ok && submit()} autoFocus /></div>
            <div><div className="lbl mb-1">3 · Funktion</div><input className="inp w-full" list="funktionen" placeholder="z. B. Truppführer" value={funktion} onChange={(e) => setFunktion(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ok && submit()} />
              <datalist id="funktionen">{(data?.funktionen ?? []).map((f) => <option key={f} value={f} />)}</datalist></div>
          </div>
          <div className="flex items-center gap-3 mt-5"><Btn kind="primary" onClick={submit} disabled={!ok || busy}>Anmelden</Btn><span className="text-bad text-[12.5px]">{err}</span></div>
        </div>
        <div className="text-[11.5px] text-dim mt-3">Nach der Anmeldung steht der gesamte Funktionsumfang zur Verfügung. Messwerte, Identifikationen und Laborergebnisse sind Simulation; Fachdaten sind ungeprüft.</div>
      </div>
    </div>
  );
}
