import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { useLive } from '../store';
import { api } from '../api';
import { Badge, CatBadge } from './ui';
import { ROLE_LABEL, STATUS_COLOR, time } from '../lib/format';

export const NAV: [string, string, number][] = [
  ['/', 'Dashboard', 1], ['/karte', 'Einsatzkarte', 1], ['/live', 'Live-Messung', 1], ['/auftraege', 'Messaufträge', 1], ['/geraete', 'Messgeräte', 1], ['/stoffe', 'Stoffdatenbank', 1],
  ['/radionuklide', 'Radionuklid-Datenbank', 1], ['/bio', 'Biologische Datenbank', 1], ['/proben', 'Probenahme', 1], ['/wetter', 'Wetter', 1], ['/messpunkte', 'Messpunkte', 1],
  ['/fahrzeug', 'Fahrzeug', 1], ['/besatzung', 'Besatzung', 1], ['/messleitung', 'CBRN-Messleitung', 1], ['/berichte', 'Einsatzberichte', 1], ['/historie', 'Historie', 1], ['/system', 'System', 1],
];

function Search() {
  const [q, setQ] = useState(''); const [res, setRes] = useState<any[]>([]); const [open, setOpen] = useState(false); const nav = useNavigate(); const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!q.trim()) { setRes([]); return; } const t = setTimeout(() => api('/search?q=' + encodeURIComponent(q)).then(setRes).catch(() => {}), 150); return () => clearTimeout(t); }, [q]);
  useEffect(() => { const f = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false); document.addEventListener('mousedown', f); return () => document.removeEventListener('mousedown', f); }, []);
  const go = (r: any) => { setOpen(false); setQ(''); nav(r.type === 'substance' ? `/stoffe/${r.id}` : r.type === 'radionuclide' ? `/radionuklide/${r.id}` : `/bio/${r.id}`); };
  return (
    <div className="relative w-72 no-print" ref={ref}>
      <input className="inp w-full" placeholder="Suche: Name, CAS, UN, Formel, Synonym, Gruppe …" value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} />
      {open && res.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 panel z-40 max-h-96 overflow-auto shadow-xl">
          {res.map((r) => (
            <button key={r.type + r.id} onClick={() => go(r)} className="w-full text-left px-2 py-1.5 hover:bg-panel2 border-b border-line/50 block">
              <div className="flex items-center justify-between gap-2"><b>{r.title}</b><CatBadge c={r.category} /></div>
              <div className="text-[11px] text-dim font-mono">{r.cas ? `CAS ${r.cas}` : ''} {r.un ? ` · UN ${r.un}` : ''} {r.state ? ` · ${r.state}` : ''} {r.formula ? ` · ${r.formula}` : ''} {r.type !== 'substance' ? r.sub : ''}</div>
            </button>))}
        </div>)}
    </div>
  );
}

export default function Layout() {
  const { status, meta, user, switchUser, vehicles, toasts, dismissToast, wsUp } = useLive();
  const nav = useNavigate(); const [clock, setClock] = useState(new Date()); const v = vehicles.find((x) => x.id === 'CBRN-01');
  useEffect(() => { const t = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(t); }, []);
  const fivem = status?.fivem === 'CONNECTED';
  return (
    <div className="h-full flex flex-col">
      <header className="h-11 shrink-0 flex items-center gap-4 px-3 border-b border-line bg-panel no-print">
        <button className="flex items-center gap-2" onClick={() => nav('/')}><Logo /><span className="font-semibold tracking-wider text-[13px]">CBRN ERKUNDER SOFTWARE</span></button>
        <Badge color="#4a8fd6">{v?.name ?? 'CBRN-01'}</Badge>
        <Badge color={fivem ? '#4fa86b' : '#d6742a'}>{fivem ? 'FIVEM CONNECTED' : 'DEMO MODE'}</Badge>
        <Badge color="#d6742a">SIMULATION</Badge>
        <div className="flex-1" />
        <Search />
        <select className="inp" value={user.id} onChange={(e) => switchUser(e.target.value)} title="Benutzer / Rolle (Demo-Umschaltung)">
          {(meta?.users ?? []).map((u: any) => <option key={u.id} value={u.id}>{u.name} – {ROLE_LABEL[u.role]}</option>)}
        </select>
        <div className="font-mono text-[12px] text-dim w-[70px] text-right">{clock.toLocaleTimeString('de-DE')}</div>
      </header>
      <div className="flex-1 min-h-0 flex">
        <nav className="w-[188px] shrink-0 border-r border-line bg-panel overflow-auto py-1 no-print">
          {NAV.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `block px-4 py-[7px] text-[12px] uppercase tracking-wider border-l-[3px] ${isActive ? 'border-accent bg-panel2 text-txt' : 'border-transparent text-dim hover:text-txt hover:bg-panel2'}`}>{label}</NavLink>))}
        </nav>
        <main className="flex-1 min-w-0 min-h-0 relative"><Outlet /></main>
      </div>
      <footer className="h-6 shrink-0 flex items-center gap-4 px-3 border-t border-line bg-panel text-[11px] text-dim no-print">
        {[['WEB APP', status?.web], ['DATABASE', status?.database], ['API', status?.api], ['WEBSOCKET', wsUp ? 'ONLINE' : 'OFFLINE']].map(([k, s]) => (
          <span key={k as string} className="flex items-center gap-1"><i className="w-2 h-2 rounded-full inline-block" style={{ background: STATUS_COLOR(s as string) }} />{k}</span>))}
        <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full inline-block" style={{ background: fivem ? '#4fa86b' : '#8896a6' }} />FIVEM {status?.fivem ?? '–'}</span>
        <span>DATA SOURCE: {status?.data_source ?? '–'}</span>
        <span className="flex-1" />
        <span title={meta?.disclaimer}>Fachdaten ungeprüft · Messwerte simuliert · Kein offizielles Produkt einer Behörde</span>
      </footer>
      <div className="fixed right-3 bottom-9 z-50 space-y-2 w-80 no-print">
        {toasts.map((a, i) => (
          <div key={a.id + i} className="panel border-bad/80 p-2 cursor-pointer" onClick={() => { dismissToast(i); nav('/historie'); }}>
            <div className="flex justify-between"><Badge color="#d0503f">ALARM {a.category}</Badge><span className="text-dim font-mono">{time(a.ts)}</span></div>
            <div className="mt-1">{a.description}</div><div className="text-[11px] text-dim">{a.vehicle_id} · {a.source} · SIMULIERT</div>
          </div>))}
      </div>
    </div>
  );
}
