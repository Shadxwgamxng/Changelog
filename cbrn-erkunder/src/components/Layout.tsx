import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Activity, Biohazard, ClipboardList, CloudSun, FileText, FlaskConical, Gauge, History, LayoutDashboard, Map as MapIcon, MapPin, LogOut, PanelLeft, Radiation, RadioTower, Search as SearchIcon, Settings, TestTube2, Truck, Users } from 'lucide-react';
import { Logo } from './Logo';
import { useLive } from '../store';
import { api } from '../api';
import { Badge, CatBadge } from './ui';
import { STATUS_COLOR, time } from '../lib/format';

const I = 17;
export const NAV: { group: string; items: [string, string, ReactNode][] }[] = [
  { group: 'Einsatz', items: [['/', 'Dashboard', <LayoutDashboard size={I} />], ['/karte', 'Einsatzkarte', <MapIcon size={I} />], ['/live', 'Live-Messung', <Activity size={I} />], ['/auftraege', 'Messaufträge', <ClipboardList size={I} />], ['/messpunkte', 'Messpunkte', <MapPin size={I} />], ['/proben', 'Probenahme', <TestTube2 size={I} />], ['/wetter', 'Wetter', <CloudSun size={I} />]] },
  { group: 'Technik', items: [['/geraete', 'Messgeräte', <Gauge size={I} />], ['/fahrzeug', 'Fahrzeug', <Truck size={I} />], ['/besatzung', 'Besatzung', <Users size={I} />], ['/messleitung', 'CBRN-Messleitung', <RadioTower size={I} />]] },
  { group: 'Wissen', items: [['/stoffe', 'Stoffdatenbank', <FlaskConical size={I} />], ['/radionuklide', 'Radionuklid-Datenbank', <Radiation size={I} />], ['/bio', 'Biologische Datenbank', <Biohazard size={I} />]] },
  { group: 'Auswertung', items: [['/berichte', 'Einsatzberichte', <FileText size={I} />], ['/historie', 'Historie', <History size={I} />], ['/system', 'System', <Settings size={I} />]] },
];

function Search() {
  const [q, setQ] = useState(''); const [res, setRes] = useState<any[]>([]); const [open, setOpen] = useState(false); const nav = useNavigate(); const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!q.trim()) { setRes([]); return; } const t = setTimeout(() => api('/search?q=' + encodeURIComponent(q)).then(setRes).catch(() => {}), 150); return () => clearTimeout(t); }, [q]);
  useEffect(() => { const f = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false); document.addEventListener('mousedown', f); return () => document.removeEventListener('mousedown', f); }, []);
  const go = (r: any) => { setOpen(false); setQ(''); nav(r.type === 'substance' ? `/stoffe/${r.id}` : r.type === 'radionuclide' ? `/radionuklide/${r.id}` : `/bio/${r.id}`); };
  return (
    <div className="relative w-[340px] no-print" ref={ref}>
      <SearchIcon size={14} className="absolute left-2.5 top-[9px] text-dim" />
      <input className="inp w-full !pl-8" placeholder="Stoffe suchen: Name, CAS, UN, Formel …" value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} />
      {open && res.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 panel z-40 max-h-96 overflow-auto shadow-2xl">
          {res.map((r) => (
            <button key={r.type + r.id} onClick={() => go(r)} className="w-full text-left px-3 py-2 hover:bg-white/[.06] border-b border-line/60 block">
              <div className="flex items-center justify-between gap-2"><b className="font-medium">{r.title}</b><CatBadge c={r.category} /></div>
              <div className="text-[11.5px] text-dim font-mono">{r.cas ? `CAS ${r.cas}` : ''} {r.un ? ` · UN ${r.un}` : ''} {r.state ? ` · ${r.state}` : ''} {r.formula ? ` · ${r.formula}` : ''} {r.type !== 'substance' ? r.sub : ''}</div>
            </button>))}
        </div>)}
    </div>
  );
}

export default function Layout() {
  const { status, meta, session, logout, ownVehicle, toasts, dismissToast, wsUp, live, own, incident } = useLive();
  const nav = useNavigate(); const [clock, setClock] = useState(new Date()); const v = ownVehicle;
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('cbrn.collapsed') === '1'; } catch { return false; } });
  useEffect(() => { document.documentElement.classList.toggle('is-collapsed', collapsed); try { localStorage.setItem('cbrn.collapsed', collapsed ? '1' : '0'); } catch { /* ignore */ } }, [collapsed]);
  useEffect(() => { const t = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(t); }, []);
  const fivem = status?.fivem === 'CONNECTED'; const run = live[own]?.run; const gt = status?.fivem_info?.game_time;
  return (
    <div className="shell">
      <header className="topbar no-print">
        <button className="icon-btn" onClick={() => setCollapsed((c) => !c)} title="Navigation ein-/ausklappen"><PanelLeft size={18} /></button>
        <button className="flex items-center gap-2.5" onClick={() => nav('/')}><Logo size={26} /><span className="font-semibold text-[14px] tracking-tight whitespace-nowrap">CBRN Erkunder</span></button>
        <div className="flex items-center gap-1.5 ml-2">
          <Badge color="#58a6ff">{session?.vehicle_name ?? v?.name}</Badge>
          <Badge color={fivem ? '#3fb950' : '#e5534b'}>{fivem ? 'FIVEM VERBUNDEN' : 'FIVEM GETRENNT'}</Badge>
          <Badge color="#f0500a">SIMULATION</Badge>
          {incident && <button title="Einsatz beenden" onClick={async () => { if (confirm(`Einsatz ${incident.id} „${incident.name}“ beenden? Laufende Messfahrten werden beendet.`)) await api(`/incidents/${incident.id}/end`, { method: 'POST', body: {} }); }}><span className="inline-block max-w-[220px] truncate align-middle"><Badge color="#d29922">{incident.id} · {incident.name} ✕</Badge></span></button>}
          {run && <Badge color="#e5534b" solid>● MESSFAHRT</Badge>}
          {fivem && gt && <Badge color="#58a6ff">SPIELZEIT {gt}</Badge>}
        </div>
        <div className="flex-1" />
        <Search />
        <div className="flex items-center gap-2 pl-3 border-l border-line">
          <div className="text-right leading-tight whitespace-nowrap"><div className="text-[12.5px] font-medium">{session?.name}</div><div className="text-[11px] text-dim">{session?.funktion}</div></div>
          <button className="icon-btn" title="Abmelden / Fahrzeug wechseln" onClick={() => logout()}><LogOut size={16} /></button>
        </div>
        <div className="font-mono text-[12.5px] text-dim w-[66px] text-right">{clock.toLocaleTimeString('de-DE')}</div>
      </header>
      <nav className="sidebar no-print">
        {NAV.map((g) => (
          <div key={g.group}>
            <div className="nav-group">{g.group}</div>
            {g.items.map(([to, label, icon]) => (
              <NavLink key={to} to={to} end={to === '/'} title={label} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>{icon}<span>{label}</span></NavLink>))}
          </div>))}
      </nav>
      <main className="min-w-0 min-h-0 relative overflow-hidden"><Outlet /></main>
      <footer className="col-span-2 h-7 flex items-center gap-4 px-4 border-t border-line bg-bg2 text-[11.5px] text-dim no-print" style={{ gridColumn: '1 / -1' }}>
        {[['Web-App', status?.web], ['Datenbank', status?.database], ['API', status?.api], ['WebSocket', wsUp ? 'ONLINE' : 'OFFLINE']].map(([k, s]) => (
          <span key={k as string} className="flex items-center gap-1.5"><i className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: STATUS_COLOR(s as string) }} />{k}</span>))}
        <span className="flex items-center gap-1.5"><i className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: fivem ? '#3fb950' : '#817d78' }} />FiveM {fivem ? 'verbunden' : 'nicht verbunden'}</span>
        <span>Datenquelle: {status?.data_source ?? '–'}</span>
        <span className="flex-1" />
        <span title={meta?.disclaimer}>Fachdaten ungeprüft · Messwerte simuliert · Kein offizielles Produkt einer Behörde</span>
      </footer>
      <div className="fixed right-4 bottom-12 z-50 space-y-2 w-80 no-print">
        {toasts.map((a, i) => (
          <div key={a.id + i} className="panel !border-bad/60 p-3 cursor-pointer shadow-2xl" onClick={() => { dismissToast(i); nav('/historie'); }}>
            <div className="flex justify-between items-center"><Badge color="#e5534b">ALARM {a.category}</Badge><span className="text-dim font-mono text-[11.5px]">{time(a.ts)}</span></div>
            <div className="mt-1.5 font-medium">{a.description}</div><div className="text-[11.5px] text-dim">{a.vehicle_id} · {a.source} · simuliert</div>
          </div>))}
      </div>
    </div>
  );
}
