import { useState, type ReactNode } from 'react';
import { CAT, DATA_SRC, LEVELS, NA, STATUS_COLOR } from '../lib/format';

export const Panel = ({ title, right, children, className = '', body = '' }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; body?: string }) => (
  <section className={`panel flex flex-col min-h-0 ${className}`}>
    {title && <div className="panel-h"><span>{title}</span><span className="flex gap-2 items-center normal-case tracking-normal">{right}</span></div>}
    <div className={`p-3 min-h-0 flex-1 ${body}`}>{children}</div>
  </section>
);
export const Field = ({ label, children, mono = true }: { label: string; children: ReactNode; mono?: boolean }) => (
  <div className="min-w-0"><div className="lbl">{label}</div><div className={`${mono ? 'val' : ''} break-words`}>{children ?? NA}</div></div>
);
export const Na = ({ v }: { v: unknown }) => (v == null || v === '' ? <span className="text-dim">{NA}</span> : <>{String(v)}</>);
export const Badge = ({ children, color = '#8896a6', solid }: { children: ReactNode; color?: string; solid?: boolean }) => (
  <span className="inline-block px-1.5 py-[1px] text-[10px] font-semibold tracking-wider uppercase border rounded-sm whitespace-nowrap" style={{ borderColor: color, color: solid ? '#0f1318' : color, background: solid ? color : color + '18' }}>{children}</span>
);
export const StatusBadge = ({ s }: { s?: string | null }) => <Badge color={STATUS_COLOR(s)}>{s ?? NA}</Badge>;
export const CatBadge = ({ c }: { c?: string | null }) => { const k = CAT[c ?? 'U'] ?? CAT.U; return <Badge color={k.color}>{k.short} · {k.label}</Badge>; };
export const LevelBadge = ({ l }: { l?: string | null }) => (l ? <Badge color={l === 'hinweis' ? '#8896a6' : l === 'verdacht' ? '#d9a21b' : l === 'moegliche_identifikation' ? '#d6742a' : '#4fa86b'}>{LEVELS[l]}</Badge> : <span className="text-dim">–</span>);
export const DataBadge = ({ s = 'SIMULATED' }: { s?: string }) => <Badge color={s === 'REAL' ? '#4fa86b' : s === 'MANUAL' ? '#4a8fd6' : s === 'DATABASE' ? '#8896a6' : '#d6742a'}>{DATA_SRC[s] ?? s}</Badge>;
export const QualityBadge = ({ q }: { q?: string }) => <Badge color={q === 'verified' ? '#4fa86b' : q === 'outdated' ? '#d0503f' : '#d9a21b'}>{q === 'verified' ? 'VERIFIZIERT' : q === 'outdated' ? 'VERALTET' : 'UNGEPRÜFT'}</Badge>;
export const Btn = ({ children, onClick, kind = '', disabled, title }: { children: ReactNode; onClick?: () => void; kind?: 'primary' | 'danger' | ''; disabled?: boolean; title?: string }) => (
  <button className={`btn ${kind === 'primary' ? 'btn-primary' : kind === 'danger' ? 'btn-danger' : ''}`} onClick={onClick} disabled={disabled} title={title}>{children}</button>
);
export const Tabs = ({ tabs, value, onChange }: { tabs: [string, string][]; value: string; onChange: (v: string) => void }) => (
  <div className="flex border-b border-line mb-3">{tabs.map(([k, l]) => (
    <button key={k} onClick={() => onChange(k)} className={`px-3 py-1.5 text-[12px] uppercase tracking-wider border-b-2 ${value === k ? 'border-accent text-txt' : 'border-transparent text-dim hover:text-txt'}`}>{l}</button>))}</div>
);
export const Modal = ({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) => (
  <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 no-print" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className={`panel w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] flex flex-col`}>
      <div className="panel-h"><span>{title}</span><button className="text-txt" onClick={onClose}>✕</button></div>
      <div className="p-3 overflow-auto">{children}</div>
    </div>
  </div>
);
export const Page = ({ title, sub, right, children }: { title: string; sub?: ReactNode; right?: ReactNode; children: ReactNode }) => (
  <div className="h-full flex flex-col min-h-0">
    <div className="flex items-end justify-between gap-3 px-4 pt-3 pb-2 no-print"><div><h1 className="text-[17px] font-semibold tracking-wide uppercase">{title}</h1>{sub && <div className="text-dim text-[12px]">{sub}</div>}</div><div className="flex gap-2 items-center">{right}</div></div>
    <div className="flex-1 min-h-0 overflow-auto px-4 pb-4">{children}</div>
  </div>
);
export const Stat = ({ label, value, sub, color }: { label: string; value: ReactNode; sub?: ReactNode; color?: string }) => (
  <div className="panel px-3 py-2"><div className="lbl">{label}</div><div className="text-[20px] font-mono leading-tight" style={{ color }}>{value}</div>{sub && <div className="text-[11px] text-dim">{sub}</div>}</div>
);
export const Empty = ({ children = 'Keine Daten' }: { children?: ReactNode }) => <div className="text-dim py-6 text-center">{children}</div>;
export const SimNote = ({ children = 'SIMULIERTE AUSWERTUNG – keine echte Messung' }: { children?: ReactNode }) => <div className="text-[11px] text-[#d6742a] border border-[#d6742a]/50 bg-[#d6742a]/10 px-2 py-1 rounded-sm">{children}</div>;
export function useToggle(init = false): [boolean, () => void] { const [v, s] = useState(init); return [v, () => s((x) => !x)]; }
export const Select = ({ value, onChange, options, className = '' }: { value: string; onChange: (v: string) => void; options: [string, string][]; className?: string }) => (
  <select className={`inp ${className}`} value={value} onChange={(e) => onChange(e.target.value)}>{options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
);
