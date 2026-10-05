import { useState, type ReactNode } from 'react';
import { CAT, DATA_SRC, LEVELS, NA, STATUS_COLOR } from '../lib/format';

export const Panel = ({ title, right, children, className = '', body = '' }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; body?: string }) => (
  <section className={`panel flex flex-col min-h-0 ${className}`}>
    {title && <div className="panel-h"><span>{title}</span><span className="flex gap-2 items-center normal-case tracking-normal">{right}</span></div>}
    <div className={`p-4 min-h-0 flex-1 ${body}`}>{children}</div>
  </section>
);
export const Field = ({ label, children, mono = true }: { label: string; children: ReactNode; mono?: boolean }) => (
  <div className="min-w-0"><div className="lbl">{label}</div><div className={`${mono ? 'val' : ''} break-words`}>{children ?? NA}</div></div>
);
export const Na = ({ v }: { v: unknown }) => (v == null || v === '' ? <span className="text-dim">{NA}</span> : <>{String(v)}</>);
export const Badge = ({ children, color = '#817d78', solid }: { children: ReactNode; color?: string; solid?: boolean }) => (
  <span className="inline-flex items-center px-2 h-[20px] text-[10.5px] font-semibold tracking-wide rounded-full whitespace-nowrap" style={{ color: solid ? '#fff7f2' : color, background: solid ? color : color + '24' }}>{children}</span>
);
export const StatusBadge = ({ s }: { s?: string | null }) => <Badge color={STATUS_COLOR(s)}>{s ?? NA}</Badge>;
export const CatBadge = ({ c }: { c?: string | null }) => { const k = CAT[c ?? 'U'] ?? CAT.U; return <Badge color={k.color}>{k.short} · {k.label}</Badge>; };
export const LevelBadge = ({ l }: { l?: string | null }) => (l ? <Badge color={l === 'hinweis' ? '#817d78' : l === 'verdacht' ? '#d29922' : l === 'moegliche_identifikation' ? '#f0500a' : '#3fb950'}>{LEVELS[l]}</Badge> : <span className="text-dim">–</span>);
export const DataBadge = ({ s = 'SIMULATED' }: { s?: string }) => <Badge color={s === 'REAL' ? '#3fb950' : s === 'MANUAL' ? '#58a6ff' : s === 'DATABASE' ? '#817d78' : '#f0500a'}>{DATA_SRC[s] ?? s}</Badge>;
export const QualityBadge = ({ q }: { q?: string }) => <Badge color={q === 'verified' ? '#3fb950' : q === 'identity' ? '#58a6ff' : q === 'outdated' ? '#e5534b' : '#d29922'}>{q === 'verified' ? 'VERIFIZIERT' : q === 'identity' ? 'CAS/NAME GEPRÜFT' : q === 'outdated' ? 'VERALTET' : 'UNGEPRÜFT'}</Badge>;
export const Btn = ({ children, onClick, kind = '', disabled, title }: { children: ReactNode; onClick?: () => void; kind?: 'primary' | 'danger' | ''; disabled?: boolean; title?: string }) => (
  <button className={`btn ${kind === 'primary' ? 'btn-primary' : kind === 'danger' ? 'btn-danger' : ''}`} onClick={onClick} disabled={disabled} title={title}>{children}</button>
);
export const Tabs = ({ tabs, value, onChange }: { tabs: [string, string][]; value: string; onChange: (v: string) => void }) => (
  <div className="flex gap-1 border-b border-line mb-4">{tabs.map(([k, l]) => (
    <button key={k} onClick={() => onChange(k)} className={`px-3 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors ${value === k ? 'border-accent text-txt' : 'border-transparent text-dim hover:text-txt'}`}>{l}</button>))}</div>
);
export const Modal = ({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) => (
  <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-4 no-print" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className={`panel w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] flex flex-col`}>
      <div className="panel-h"><span>{title}</span><button className="icon-btn !w-7 !h-7" onClick={onClose}>✕</button></div>
      <div className="p-4 overflow-auto">{children}</div>
    </div>
  </div>
);
export const Page = ({ title, sub, right, children }: { title: string; sub?: ReactNode; right?: ReactNode; children: ReactNode }) => (
  <div className="h-full flex flex-col min-h-0">
    <div className="flex items-end justify-between gap-3 px-6 pt-5 pb-3 no-print"><div><h1 className="text-[22px] leading-tight font-semibold tracking-tight">{title}</h1>{sub && <div className="text-dim text-[13px] mt-0.5">{sub}</div>}</div><div className="flex gap-2 items-center">{right}</div></div>
    <div className="flex-1 min-h-0 overflow-auto px-6 pb-6">{children}</div>
  </div>
);
export const Stat = ({ label, value, sub, color }: { label: string; value: ReactNode; sub?: ReactNode; color?: string }) => (
  <div className="panel px-4 py-3"><div className="lbl">{label}</div><div className="text-[22px] font-mono leading-tight mt-0.5" style={{ color }}>{value}</div>{sub && <div className="text-[11.5px] text-dim mt-0.5">{sub}</div>}</div>
);
export const Empty = ({ children = 'Keine Daten' }: { children?: ReactNode }) => <div className="text-dim py-6 text-center">{children}</div>;
export const SimNote = (_p: { children?: ReactNode }) => null;
export function useToggle(init = false): [boolean, () => void] { const [v, s] = useState(init); return [v, () => s((x) => !x)]; }
export const Select = ({ value, onChange, options, className = '' }: { value: string; onChange: (v: string) => void; options: [string, string][]; className?: string }) => (
  <select className={`inp ${className}`} value={value} onChange={(e) => onChange(e.target.value)}>{options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
);
