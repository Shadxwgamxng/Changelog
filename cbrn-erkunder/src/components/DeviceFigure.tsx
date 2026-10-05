// Eigene, vektorgrafische Illustrationen der Messgeräte (keine Fotos, keine Nachzeichnung von Herstellerbildern).
// Die Geräte sind als typische Bauformen dargestellt; Live-Werte erscheinen direkt im Display bzw. an den Beschriftungen.
import { useMemo, useState, type ReactNode } from 'react';
import { useLive } from '../store';
import { useApi } from '../store';
import { fmtPos, num, time } from '../lib/format';
import { doseStatus, pidStatus, useSession } from './Readouts';
import { IMG } from './deviceImages';

export interface Spot { n: number; x: number; y: number; side: 'l' | 'r'; ly: number; title: string; v: string; sub?: string; color?: string; lines: [string, string][] }
const COL = { body: '#2a2a2a', body2: '#1a1a1a', edge: '#4a4a4a', screen: '#0b1a14', ok: '#3fb950', warn: '#d29922', bad: '#e5534b', acc: '#58a6ff', dim: '#817d78', txt: '#ebe9e6', yellow: '#d29922' };
const stCol = (s: string) => (/ALARM|HOCH/.test(s) ? COL.bad : /ERHÖHT|VERDACHT|HINWEIS/.test(s) ? COL.warn : COL.ok);

function Defs() {
  return (
    <defs>
      <linearGradient id="gBody" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#202020" /><stop offset=".5" stopColor="#333333" /><stop offset="1" stopColor="#1a1a1a" /></linearGradient>
      <linearGradient id="gMetal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#5a5a5a" /><stop offset=".5" stopColor="#9a9a9a" /><stop offset="1" stopColor="#4d5b6c" /></linearGradient>
      <linearGradient id="gGlass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0f2a20" /><stop offset="1" stopColor="#07140f" /></linearGradient>
      <radialGradient id="gUV" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#d9b3ff" /><stop offset=".5" stopColor="#8a4fd6" /><stop offset="1" stopColor="#8a4fd600" /></radialGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000" floodOpacity=".55" /></filter>
    </defs>
  );
}
const Screen = ({ x, y, w, h, children }: { x: number; y: number; w: number; h: number; children?: ReactNode }) => (<g><rect x={x - 3} y={y - 3} width={w + 6} height={h + 6} rx={5} fill="#0a0a0a" stroke={COL.edge} /><rect x={x} y={y} width={w} height={h} rx={3} fill="url(#gGlass)" />{children}</g>);
const T = ({ x, y, s = 12, c = '#7be0a4', w = 'normal', a = 'start', children }: { x: number; y: number; s?: number; c?: string; w?: string; a?: 'start' | 'middle' | 'end'; children: ReactNode }) => (<text x={x} y={y} fontSize={s} fill={c} fontWeight={w} textAnchor={a} fontFamily="'Geist Mono Variable', 'Geist Mono', ui-monospace, monospace">{children}</text>);
const Key = ({ x, y, r = 9, c = '#3a3a3a' }: { x: number; y: number; r?: number; c?: string }) => (<g><circle cx={x} cy={y + 2} r={r} fill="#0e0e0e" /><circle cx={x} cy={y} r={r} fill={c} stroke="#5a5a5a" /></g>);
const Led = ({ x, y, c }: { x: number; y: number; c: string }) => (<g><circle cx={x} cy={y} r={7} fill={c} opacity=".25" /><circle cx={x} cy={y} r={4} fill={c} /></g>);

/* ------------------------------------------------------------------ Zeichnungen */
function PidArt({ r }: { r: any }) {
  const v = r?.pid.value ?? 0; const st = pidStatus(v);
  return (<g filter="url(#shadow)">
    <rect x={362} y={10} width={36} height={52} rx={6} fill="url(#gMetal)" stroke={COL.edge} /><rect x={372} y={4} width={16} height={14} rx={3} fill="#8a8a8a" /><circle cx={380} cy={36} r={5} fill="#222" />
    <rect x={318} y={56} width={124} height={344} rx={26} fill="url(#gBody)" stroke={COL.edge} strokeWidth={2} />
    <rect x={318} y={332} width={124} height={68} rx={26} fill="#d29922" opacity=".9" /><rect x={318} y={332} width={124} height={20} fill="#d29922" opacity=".9" />
    <Screen x={336} y={84} w={88} h={118}>
      <T x={346} y={104} s={10} c="#5aa981">PID · VOC</T><T x={346} y={146} s={30} c={stCol(st)} w="bold">{num(v, 1)}</T><T x={346} y={166} s={12}>ppm</T><T x={346} y={190} s={11} c={stCol(st)}>{st}</T>
    </Screen>
    <Key x={350} y={238} /><Key x={380} y={238} r={11} c="#58a6ff" /><Key x={410} y={238} />
    <Led x={338} y={72} c={COL.ok} />
    <circle cx={380} cy={290} r={20} fill="#16101d" stroke={COL.edge} /><circle cx={380} cy={290} r={18} fill="url(#gUV)" />
    <rect x={352} y={346} width={56} height={14} rx={3} fill="#0e0e0e" /><rect x={355} y={349} width={44} height={8} rx={2} fill={COL.ok} />
    <path d="M452 96 q12 -14 24 0 M458 104 q6 -8 12 0" stroke={COL.acc} strokeWidth={2} fill="none" /><circle cx={464} cy={112} r={3} fill={COL.acc} />
  </g>);
}
function ImsArt({ r }: { r: any }) {
  const i = r?.ims; const lv = i?.level; const c = lv ? (lv === 'moegliche_identifikation' ? COL.bad : COL.warn) : COL.ok;
  return (<g filter="url(#shadow)">
    <rect x={226} y={100} width={308} height={250} rx={18} fill="url(#gBody)" stroke={COL.edge} strokeWidth={2} />
    <rect x={226} y={100} width={308} height={14} rx={7} fill="#1f5fa8" />
    <rect x={262} y={58} width={22} height={46} rx={4} fill="url(#gMetal)" stroke={COL.edge} /><rect x={256} y={48} width={34} height={14} rx={4} fill="#8a8a8a" stroke={COL.edge} />
    <Screen x={244} y={128} w={156} h={96}>
      <T x={252} y={146} s={9} c="#5aa981">IMS · {i?.mode ?? '–'}</T><T x={252} y={174} s={13} c={c} w="bold">{lv ? (lv === 'moegliche_identifikation' ? 'MÖGL. STOFF' : lv.toUpperCase()) : 'KEIN TREFFER'}</T>
      <T x={252} y={196} s={10}>{i?.confidence != null ? `Konfidenz ${i.confidence} %` : 'Konfidenz –'}</T><T x={252} y={214} s={10} c="#5aa981">{time(r?.ts)}</T>
    </Screen>
    <rect x={414} y={130} width={102} height={94} rx={6} fill="#0e0e0e" stroke={COL.edge} />
    <rect x={244} y={252} width={272} height={44} rx={22} fill="#0e0e0e" stroke={COL.edge} strokeWidth={2} />
    <rect x={258} y={264} width={22} height={20} fill="#8a4fd6" opacity=".7" /><rect x={316} y={258} width={4} height={32} fill="#ebe9e6" opacity=".6" /><rect x={396} y={258} width={4} height={32} fill="#ebe9e6" opacity=".2" /><rect x={482} y={258} width={20} height={32} fill="#58a6ff" opacity=".7" />
    {[0, 1, 2, 3, 4].map((k) => <circle key={k} cx={332 + k * 30} cy={274 + (k % 2) * 6} r={3.5} fill={k % 2 ? '#58a6ff' : '#d29922'} opacity=".85" />)}
    <T x={244} y={316} s={9} c={COL.dim}>Ionenquelle → Gate → Driftregion → Kollektor</T>
    <Led x={430} y={146} c={COL.ok} /><T x={442} y={150} s={9} c={COL.dim}>ONLINE</T><Led x={430} y={170} c={lv ? c : '#272727'} /><T x={442} y={174} s={9} c={COL.dim}>ALARM</T><Key x={436} y={206} r={8} /><Key x={466} y={206} r={8} /><Key x={496} y={206} r={8} c="#58a6ff" />
  </g>);
}
function MgmgArt({ r, channels }: { r: any; channels: string[] }) {
  const ch = r?.mgmg.channels ?? {}; const U: Record<string, [string, string]> = { O2: ['O₂', '% vol'], CO: ['CO', 'ppm'], H2S: ['H₂S', 'ppm'], LEL: ['EX', '%LEL'], CH4: ['CH₄', 'ppm'] };
  const warn = (k: string, v: number) => (k === 'O2' ? v < 19.5 : k === 'CO' ? v > 30 : k === 'H2S' ? v > 5 : k === 'LEL' ? v > 10 : false);
  const bad = Object.entries(ch).some(([k, v]) => v != null && warn(k, v as number));
  return (<g filter="url(#shadow)">
    <rect x={296} y={34} width={168} height={374} rx={28} fill="url(#gBody)" stroke={COL.edge} strokeWidth={2} /><rect x={296} y={356} width={168} height={52} rx={26} fill="#d29922" opacity=".9" /><rect x={296} y={356} width={168} height={14} fill="#d29922" opacity=".9" />
    {[0, 1, 2, 3, 4].map((k) => <g key={k}><circle cx={324 + k * 28} cy={60} r={8} fill="#0e0e0e" stroke={COL.edge} /><circle cx={324 + k * 28} cy={60} r={4} fill="#5a5a5a" /></g>)}
    <Led x={316} y={92} c={bad ? COL.bad : COL.ok} />
    <Screen x={314} y={108} w={132} h={190}>
      {channels.slice(0, 5).map((k, idx) => { const v = ch[k]; const w = v != null && warn(k, v as number); return (<g key={k}><T x={324} y={134 + idx * 36} s={12} c="#5aa981">{U[k]?.[0] ?? k}</T><T x={440} y={134 + idx * 36} s={20} c={w ? COL.bad : '#7be0a4'} w="bold" a="end">{v == null ? '–' : num(v as number, k === 'O2' || k === 'LEL' || k === 'H2S' ? 1 : 0)}</T><T x={440} y={146 + idx * 36} s={9} c={COL.dim} a="end">{U[k]?.[1]}</T></g>); })}
    </Screen>
    <Key x={338} y={330} /><Key x={380} y={330} r={12} c="#58a6ff" /><Key x={422} y={330} />
    <rect x={338} y={378} width={84} height={8} rx={3} fill="#0e0e0e" />
  </g>);
}
function DlmArt({ r }: { r: any }) {
  const v = r?.dose.value ?? 0; const st = doseStatus(v); const frac = Math.min(1, Math.log10(Math.max(v, 0.01) / 0.01) / 4);
  return (<g filter="url(#shadow)">
    <rect x={250} y={70} width={260} height={260} rx={22} fill="url(#gBody)" stroke={COL.edge} strokeWidth={2} /><rect x={250} y={70} width={260} height={16} rx={8} fill="#d29922" />
    <Screen x={274} y={104} w={212} h={104}>
      <T x={286} y={124} s={10} c="#5aa981">DOSISLEISTUNG</T><T x={286} y={170} s={36} c={stCol(st)} w="bold">{num(v, 3)}</T><T x={480} y={170} s={12} a="end">µSv/h</T>
      <rect x={286} y={184} width={188} height={10} rx={3} fill="#10261c" /><rect x={286} y={184} width={188 * frac} height={10} rx={3} fill={stCol(st)} />
    </Screen>
    <Key x={310} y={256} /><Key x={380} y={256} r={13} c="#58a6ff" /><Key x={450} y={256} /><Led x={280} y={304} c={st === 'NORMAL' ? COL.ok : stCol(st)} />
    <path d="M380 330 C 380 345, 380 345, 380 356" stroke="#222" strokeWidth={7} fill="none" /><rect x={326} y={354} width={108} height={44} rx={8} fill="url(#gMetal)" stroke={COL.edge} /><rect x={334} y={362} width={92} height={6} fill="#222" opacity=".4" />
  </g>);
}
function ComoArt({ r }: { r: any }) {
  const v = r?.como.value ?? 0;
  return (<g filter="url(#shadow)">
    <rect x={280} y={50} width={200} height={230} rx={20} fill="url(#gBody)" stroke={COL.edge} strokeWidth={2} /><rect x={280} y={50} width={200} height={14} rx={7} fill="#f0500a" />
    <Screen x={300} y={84} w={160} h={90}><T x={310} y={104} s={10} c="#5aa981">KONTAMINATION</T><T x={310} y={146} s={30} c="#7be0a4" w="bold">{num(v, 1)}</T><T x={452} y={146} s={12} a="end">cps</T></Screen>
    <Key x={320} y={214} /><Key x={380} y={214} r={12} c="#58a6ff" /><Key x={440} y={214} /><Led x={300} y={262} c={COL.ok} />
    <path d="M380 280 C 380 340, 520 330, 560 372" stroke="#222" strokeWidth={7} fill="none" />
    <rect x={520} y={348} width={170} height={56} rx={10} fill="url(#gMetal)" stroke={COL.edge} /><rect x={532} y={358} width={146} height={36} rx={5} fill="#1a1a1a" stroke="#5a5a5a" /><T x={605} y={381} s={10} c={COL.dim} a="middle">Flächensonde</T>
  </g>);
}
function FmgArt({ r, drive }: { r: any; drive: boolean }) {
  return (<g filter="url(#shadow)">
    <rect x={110} y={250} width={540} height={26} fill="#0e0e0e" opacity=".8" />
    <path d="M130 250 V170 q0 -24 24 -24 H270 L318 100 H520 q36 0 52 30 L640 188 V250 Z" fill="url(#gBody)" stroke={COL.edge} strokeWidth={2} />
    <path d="M330 112 H506 q20 0 30 18 L560 170 H318 Z" fill="#0f1c26" stroke={COL.edge} />
    <rect x={150} y={176} width={110} height={40} rx={4} fill="#d29922" opacity=".85" />
    <circle cx={218} cy={260} r={34} fill="#0e0e0e" stroke={COL.edge} strokeWidth={3} /><circle cx={218} cy={260} r={16} fill="#5a5a5a" /><circle cx={556} cy={260} r={34} fill="#0e0e0e" stroke={COL.edge} strokeWidth={3} /><circle cx={556} cy={260} r={16} fill="#5a5a5a" />
    {/* Dach: Gamma-Detektor + GPS + DFÜ */}
    <rect x={380} y={70} width={110} height={30} rx={6} fill="url(#gMetal)" stroke={COL.edge} /><rect x={392} y={78} width={86} height={14} rx={3} fill="#1a1a1a" />
    <circle cx={540} cy={96} r={9} fill="#58a6ff" stroke="#fff" strokeWidth={1.5} /><path d="M522 82 q18 -22 36 0" stroke={COL.acc} strokeWidth={2} fill="none" />
    <line x1={332} y1={100} x2={332} y2={52} stroke="#9a9a9a" strokeWidth={3} /><circle cx={332} cy={50} r={4} fill="#9a9a9a" />
    <Screen x={352} y={126} w={92} h={34}><T x={358} y={141} s={9} c="#5aa981">FMG</T><T x={358} y={154} s={10} c="#7be0a4" w="bold">{num(r?.dose.value ?? 0, 3)} µSv/h</T></Screen>
    <path d="M30 330 q60 -20 140 0 M470 330 q80 -20 160 0" stroke="#272727" strokeWidth={2} fill="none" opacity={drive ? 1 : .3} />
  </g>);
}
function TubesArt({ tube }: { tube: any }) {
  return (<g filter="url(#shadow)">
    {/* Balgpumpe */}
    <rect x={220} y={186} width={190} height={112} rx={34} fill="url(#gBody)" stroke={COL.edge} strokeWidth={2} />
    {[0, 1, 2, 3, 4, 5].map((k) => <line key={k} x1={246 + k * 26} y1={190} x2={246 + k * 26} y2={294} stroke="#4a4a4a" strokeWidth={3} opacity=".7" />)}
    <rect x={410} y={214} width={60} height={56} rx={8} fill="url(#gMetal)" stroke={COL.edge} /><rect x={412} y={236} width={56} height={12} fill="#d29922" opacity=".9" />
    <circle cx={440} cy={192} r={12} fill="#d29922" stroke={COL.edge} />
    {/* Röhrchen mit Anzeigezone */}
    <rect x={470} y={233} width={176} height={18} rx={9} fill="#ebe9e6" opacity=".12" stroke="#ebe9e6" />
    <rect x={486} y={237} width={78} height={10} fill="#e9d36a" opacity=".85" /><rect x={564} y={237} width={34} height={10} fill="#a9772a" opacity=".9" /><rect x={598} y={237} width={42} height={10} fill="#ebe9e6" opacity=".35" />
    {[0, 1, 2, 3, 4, 5, 6].map((k) => <line key={k} x1={500 + k * 20} y1={225} x2={500 + k * 20} y2={k % 2 ? 231 : 229} stroke={COL.dim} />)}
    <T x={558} y={216} s={9} c={COL.dim} a="middle">Skala</T>
    <T x={315} y={248} s={11} c={COL.txt} a="middle">{tube?.product ?? '–'}</T>
  </g>);
}

/* ------------------------------------------------------------------ Gerätebilder (vom Nutzer gelieferte Grafiken) */
const BOX_H = 396, BOX_Y = 22;
const imgUrl = (id: string) => `${import.meta.env.BASE_URL}devices/${id}.png`;
const box = (id: string) => { const g = IMG[id]; const w = BOX_H * g.aspect; return { x: 380 - w / 2, y: BOX_Y, w, h: BOX_H, g }; };
const pt = (id: string, name: string): [number, number] => { const b = box(id); const [u, v] = b.g.pts[name]; return [b.x + u * b.w, b.y + v * b.h]; };
const lcd = (id: string) => { const b = box(id); const [u0, v0, u1, v1] = b.g.lcd; return { x: b.x + u0 * b.w, y: b.y + v0 * b.h, w: (u1 - u0) * b.w, h: (v1 - v0) * b.h }; };
const LCD_BG: Record<string, string> = { como: '#d7dc2e', mgmg: '#a9c79b', pid: '#b9d3a8', dlm: '#8d9b8c', ims: '#8f9c90' };
const INK = '#16221a'; const MONO = "'Geist Mono Variable', monospace";

function ImgArt({ id, r, channels }: { id: string; r: any; channels: string[] }) {
  const b = box(id); const L = lcd(id);
  const dose = r?.dose.value ?? 0, st = doseStatus(dose);
  let content: ReactNode = null;
  if (id === 'pid') { const v = r?.pid.value ?? 0; content = (<><text x={L.x + L.w / 2} y={L.y + L.h * 0.62} fontSize={L.h * 0.38} fontWeight="bold" textAnchor="middle" fill={INK} fontFamily={MONO}>{num(v, 1)}</text><text x={L.x + L.w / 2} y={L.y + L.h * 0.9} fontSize={L.h * 0.15} textAnchor="middle" fill={INK} fontFamily={MONO}>ppm · {pidStatus(v)}</text></>); }
  if (id === 'dlm') content = (<><text x={L.x + 6} y={L.y + L.h * 0.22} fontSize={L.h * 0.13} fill={INK} fontFamily={MONO}>DOSISLEISTUNG</text><text x={L.x + L.w / 2} y={L.y + L.h * 0.6} fontSize={L.h * 0.3} fontWeight="bold" textAnchor="middle" fill={INK} fontFamily={MONO}>{num(dose, 3)}</text><text x={L.x + L.w / 2} y={L.y + L.h * 0.8} fontSize={L.h * 0.15} textAnchor="middle" fill={INK} fontFamily={MONO}>µSv/h · {st}</text><rect x={L.x + 6} y={L.y + L.h * 0.86} width={L.w - 12} height={4} fill="#00000030" /><rect x={L.x + 6} y={L.y + L.h * 0.86} width={(L.w - 12) * Math.min(1, Math.log10(Math.max(dose, 0.01) / 0.01) / 4)} height={4} fill={INK} /></>);
  if (id === 'como') { const v = r?.como.value ?? 0; content = (<><text x={L.x + 6} y={L.y + L.h * 0.2} fontSize={L.h * 0.14} fill={INK} fontFamily={MONO}>KONTAMINATION</text><text x={L.x + L.w / 2} y={L.y + L.h * 0.7} fontSize={L.h * 0.42} fontWeight="bold" textAnchor="middle" fill={INK} fontFamily={MONO}>{num(v, 1)}</text><text x={L.x + L.w - 6} y={L.y + L.h * 0.92} fontSize={L.h * 0.16} textAnchor="end" fill={INK} fontFamily={MONO}>cps</text></>); }
  if (id === 'ims') { const i = r?.ims; const lv = i?.level; content = (<><text x={L.x + 4} y={L.y + L.h * 0.42} fontSize={L.h * 0.36} fontWeight="bold" fill={INK} fontFamily={MONO}>{lv ? (lv === 'moegliche_identifikation' ? 'MÖGL. STOFF' : lv.toUpperCase()) : 'KEIN TREFFER'}</text><text x={L.x + 4} y={L.y + L.h * 0.85} fontSize={L.h * 0.3} fill={INK} fontFamily={MONO}>{i?.confidence != null ? `Konfidenz ${i.confidence} %` : 'Konfidenz –'}</text></>); }
  if (id === 'mgmg') {
    const ch = r?.mgmg.channels ?? {}; const NM: Record<string, string> = { O2: 'O₂', CO: 'CO', H2S: 'H₂S', LEL: 'EX', CH4: 'CH₄' }; const U: Record<string, string> = { O2: '%', CO: 'ppm', H2S: 'ppm', LEL: '%UEG', CH4: 'ppm' };
    const rowH = (L.h * 0.84) / Math.max(1, channels.slice(0, 5).length);
    content = (<>{channels.slice(0, 5).map((k, idx) => (<g key={k}><line x1={L.x} x2={L.x + L.w} y1={L.y + (idx + 1) * rowH} y2={L.y + (idx + 1) * rowH} stroke="#00000030" /><text x={L.x + 3} y={L.y + idx * rowH + rowH * 0.72} fontSize={rowH * 0.62} fill={INK}>{NM[k] ?? k}</text><text x={L.x + L.w - 3} y={L.y + idx * rowH + rowH * 0.72} fontSize={rowH * 0.58} fontWeight="bold" textAnchor="end" fill={INK} fontFamily={MONO}>{ch[k] == null ? '–' : num(ch[k], k === 'O2' || k === 'LEL' || k === 'H2S' ? 1 : 0)} {U[k]}</text></g>))}</>);
  }
  const lv = r?.ims?.level; const lit = lv === 'moegliche_identifikation' ? 9 : lv === 'verdacht' ? 6 : lv === 'hinweis' ? 3 : 0;
  return (<g filter="url(#shadow)">
    <image href={imgUrl(id)} x={b.x} y={b.y} width={b.w} height={b.h} preserveAspectRatio="xMidYMid meet" />
    <rect x={L.x} y={L.y} width={L.w} height={L.h} rx={2} fill={LCD_BG[id]} />
    {content}
    {id === 'ims' && Array.from({ length: 9 }, (_, k) => { const [lx, ly] = pt('ims', 'leds'); return <circle key={k} cx={lx - 40 + k * 10} cy={ly} r={3} fill={k < lit ? '#ff3b30' : '#444'} />; })}
  </g>);
}

/* ------------------------------------------------------------------ Spots (Beschriftungen mit Live-Werten) */
function useSpots(id: string, ctx: any): Spot[] {
  const { r, dur, pos, mission, run, weather, trackKm, mpCount, tube, hist, channels } = ctx; const L: Spot[] = []; let n = 0;
  const P = (x: number, y: number, side: 'l' | 'r', ly: number, title: string, v: string, sub: string | undefined, color: string | undefined, lines: [string, string][]) => L.push({ n: ++n, x, y, side, ly, title, v, sub, color, lines });
  const common = (x: number, y: number, ly: number, side: 'l' | 'r' = 'r') => P(x, y, side, ly, 'Auftrag / GPS', mission ? `#${mission.id}` : run ? run.id : '–', pos, undefined, [['Auftrag', mission ? `#${mission.id} · ${mission.sector_name}` : '–'], ['Messfahrt', run ? `${run.name} (${run.id})` : '–'], ['GPS', 'FIX'], ['Position', pos], ['Messdauer', dur]]);
  const A = (n: string): [number, number] => pt(id, n); const C = (): [number, number] => { const g = lcd(id); return [g.x + g.w - 2, g.y + 2]; };
  if (id === 'pid') { const v = r?.pid.value ?? 0; const st = pidStatus(v);
    P(...C(), 'l', 40, 'Display · Messwert', `${num(v, 1)} ppm`, st, stCol(st), [['Messwert', `${num(v, 1)}`], ['Einheit', 'ppm (VOC)'], ['Status', st], ['Einordnung', 'SCREENING / HINWEIS – keine sichere Stoffidentifikation']]);
    P(...A('antenna'), 'r', 20, 'Probeneinlass (Sonde)', 'Gasprobe', 'Staubfilter', undefined, [['Funktion', 'Ansaugen der Luftprobe zum Detektor'], ['Hinweis', 'Messung im Gasraum, nicht in Flüssigkeiten']]);
    P(...A('inlet'), 'r', 110, 'UV-Lampe (Photoionisation)', '10,6 eV', 'Ansprechen: IE < 10,6 eV', '#b784f0', [['Lampe', '10,6 eV'], ['Prinzip', 'Photoionisation flüchtiger Verbindungen'], ['Kein Ansprechen', 'z. B. Chlor (IE 11,48 eV), CO, CO₂, Acetonitril']]);
    P(...A('leds'), 'l', 150, 'Alarm-LEDs · Status', 'ONLINE', `Messdauer ${dur}`, COL.ok, [['Status', 'ONLINE'], ['Messdauer', dur], ['Alarmanzeige', 'LED/Signalton bei Überschreitung (Simulation)']]);
    P(...A('keys'), 'r', 200, 'Tasten', 'Bedienung', 'Start/Stopp, Nullabgleich, Quittieren', undefined, [['Bedienung', 'Start/Stopp, Nullabgleich, Quittieren (Simulation)']]);
    P(...A('battery'), 'l', 260, 'Mögliche Stoffgruppen', r?.pid.groups.length ? r.pid.groups[0] : '–', r?.pid.groups.slice(1, 3).join(' · '), undefined, [['Stoffgruppen', r?.pid.groups.length ? r.pid.groups.join(', ') : '– (kein erhöhter Wert)']]);
    common(...A('conn'), 300);
  }
  if (id === 'ims') { const i = r?.ims; const lv = i?.level; const g = lcd(id);
    P(...C(), 'l', 40, 'Display · Ergebnis', lv ? i.result.split(' – ')[0] : 'KEIN TREFFER', lv && i.group ? i.group : undefined, lv ? COL.warn : COL.ok, [['Status', i?.state ?? '–'], ['Ergebnis', i?.result ?? '–'], ['Einstufung', lv ? lv.replace('_', ' ') : '–'], ['Zeit', time(r?.ts)]]);
    P(...A('inlet'), 'l', 130, 'Probeneinlass', 'Gasprobe', 'Ansaugen der Probe', undefined, [['Funktion', 'Ansaugen der Probe in die Driftröhre']]);
    P(...A('cap'), 'r', 20, 'Detektor (Ionenmobilität)', 'Messprinzip', 'Ionen trennen nach Beweglichkeit', COL.acc, [['Prinzip', 'Ionenmobilitätsspektrometrie'], ['Ablauf', 'Ionisation → Gate → Driftregion → Kollektor']]);
    P(...A('brand'), 'r', 105, 'Status / Messmodus', i?.state ?? '–', `Modus ${i?.mode ?? '–'}`, COL.ok, [['Status', i?.state ?? '–'], ['Messmodus', i?.mode ?? '–']]);
    P(g.x + g.w, g.y + g.h / 2, 'r', 190, 'Konfidenz / Bibliothek', i?.confidence != null ? `${i.confidence} %` : '–', 'Bibliothek: Stoffdatenbank (lokal)', undefined, [['Konfidenz (simuliert)', i?.confidence != null ? `${i.confidence} %` : '–'], ['Bibliothek', 'Stoffdatenbank (lokal)'], ['Mögliche Stoffgruppe', i?.group ?? '–']]);
    P(...A('leds'), 'l', 230, 'Alarm-LED-Balken', lv ? 'AKTIV' : 'AUS', lv ? lv.replace('_', ' ') : undefined, lv ? COL.warn : COL.ok, [['Alarm', lv ? 'Hinweis/Verdacht aktiv' : 'kein Treffer']]);
    common(...A('conn'), 290);
  }
  if (id === 'mgmg') { const ch = r?.mgmg.channels ?? {}; const U: Record<string, string> = { O2: '% vol', CO: 'ppm', H2S: 'ppm', LEL: '%LEL', CH4: 'ppm' }; const NM: Record<string, string> = { O2: 'O₂', CO: 'CO', H2S: 'H₂S', LEL: 'EX', CH4: 'CH₄' };
    const TH: Record<string, string> = { O2: 'Schwelle < 19,5 %', CO: 'Schwelle > 30 ppm', H2S: 'Schwelle > 5 ppm', LEL: 'Schwelle > 10 %UEG', CH4: 'keine Schwelle hinterlegt' };
    const g = lcd(id); const nCh = Math.max(1, channels.slice(0, 5).length); const rowH = (g.h * 0.84) / nCh;
    channels.slice(0, 5).forEach((k: string, idx: number) => { const v = ch[k]; P(g.x + g.w + 13, g.y + idx * rowH + rowH * 0.5, idx < 3 ? 'r' : 'l', idx < 3 ? 20 + idx * 78 : 140 + (idx - 3) * 80, `Kanal ${NM[k] ?? k}`, v == null ? '–' : `${num(v, k === 'O2' || k === 'LEL' || k === 'H2S' ? 1 : 0)} ${U[k]}`, TH[k], undefined, [['Messwert', v == null ? '–' : `${v} ${U[k]}`], ['Schwelle', TH[k]]]); });
    P(...A('sensor'), 'l', 20, 'Sensorik (Kanäle konfigurierbar)', `${channels.length} Kanäle`, channels.map((k: string) => NM[k]).join(' · '), COL.acc, [['Aktive Kanäle', channels.map((k: string) => NM[k]).join(', ')], ['Konfiguration', 'System → Konfiguration']]);
    P(...A('led'), 'r', 250, 'Statusleuchte', ch.O2 != null && ch.O2 < 19.5 ? 'ALARM' : 'OK', undefined, COL.ok, [['Status', 'OK, solange keine Schwelle überschritten ist']]);
    common(...A('keys'), 300, 'l');
  }
  if (id === 'dlm') { const v = r?.dose.value ?? 0; const st = doseStatus(v); const g = lcd(id); const t = hist.length > 5 ? (hist.at(-1).dose > hist.at(-6).dose * 1.05 ? '▲ steigend' : hist.at(-1).dose < hist.at(-6).dose * 0.95 ? '▼ fallend' : '► stabil') : '–';
    P(...C(), 'l', 40, 'Anzeige · Dosisleistung', `${num(v, 3)} µSv/h`, st, stCol(st), [['Messwert', num(v, 3)], ['Einheit', 'µSv/h'], ['Status', st], ['Alarm (Simulation)', '≥ 1 µSv/h'], ['Hinweis (Simulation)', '≥ 0,3 µSv/h']]);
    P(g.x + g.w - 6, g.y + g.h - 6, 'r', 20, 'Balkenanzeige (log.)', t, 'Trend', undefined, [['Trend', t]]);
    P(...A('conn'), 'r', 160, 'Sondenanschluss (Detektor)', 'Gamma', 'externe Sonde möglich', COL.acc, [['Messgröße', 'Ortsdosisleistung'], ['Detektor', 'NICHT VERFÜGBAR (Gerätedaten: QUELLE ERFORDERLICH)']]);
    P(...A('led'), 'l', 140, 'Status-LED', st === 'NORMAL' ? 'OK' : st, undefined, stCol(st), [['Status', st]]);
    P(...A('keys'), 'r', 250, 'Tasten', 'Menü · Info · Mute', undefined, undefined, [['Bedienung', 'Menü, Info, Alarm stumm, Display (Simulation)']]);
    common(...A('brand'), 240, 'l');
  }
  if (id === 'como') { const v = r?.como.value ?? 0;
    P(...C(), 'l', 40, 'Anzeige · Zählrate', `${num(v, 1)} cps`, 'Kontaminationsnachweis', undefined, [['Messwert', num(v, 1)], ['Einheit', 'cps (Zählrate)'], ['Hinweis', 'Umrechnung in Bq/cm² benötigt Kalibrierdaten – NICHT VERFÜGBAR']]);
    P(...A('plate'), 'r', 150, 'Messfläche (Sonde)', 'Kontamination', 'Abstand zur Oberfläche beachten', COL.acc, [['Funktion', 'Nachweis von Oberflächenkontamination'], ['Gerät', 'CoMo 170 ZS-2 (Bezeichnung nach BBK)']]);
    P(...A('keypad'), 'l', 150, 'Tasten · Status', 'ONLINE', undefined, COL.ok, [['Status', 'ONLINE'], ['Bedienung', 'Nullpunkt, Lautstärke, Messbereich (Simulation)']]);
    P(...A('speaker'), 'r', 40, 'Akustik (Zählrate)', 'Lautsprecher', undefined, undefined, [['Funktion', 'Hörbare Zählrate / Alarmton']]);
    common(...A('handle'), 260, 'l');
  }
  if (id === 'fmg') { const st = doseStatus(r?.dose.value ?? 0);
    P(435, 85, 'l', 40, 'Gamma-Detektor (Dach)', `${num(r?.dose.value ?? 0, 3)} µSv/h`, st, stCol(st), [['Messwert', `${num(r?.dose.value ?? 0, 3)} µSv/h`], ['Messstatus', st], ['Prinzip', 'Fahrzeuggesteuerte, kontinuierliche Gamma-Messung']]);
    P(540, 96, 'r', 30, 'GPS-Antenne', 'FIX', pos, COL.acc, [['GPS', 'FIX'], ['Position', pos], ['Georeferenzierung', 'jeder Messpunkt mit Ortsinformation']]);
    P(440, 156, 'l', 150, 'Auswerteeinheit (Kabine)', `${r?.speed_kmh ?? 0} km/h`, `Messpunkte ${mpCount.toLocaleString('de-DE')} · Track ${num(trackKm, 1)} km`, undefined, [['Status', 'AKTIV'], ['Fahrgeschwindigkeit', `${r?.speed_kmh ?? 0} km/h`], ['Messpunkte', mpCount.toLocaleString('de-DE')], ['Track', `${num(trackKm, 1)} km`]]);
    P(332, 52, 'r', 130, 'Funkantenne (DFÜ)', 'ONLINE', 'Datenverbindung zur MLK', COL.ok, [['DFÜ', 'ONLINE']]);
    P(220, 200, 'l', 260, 'Fahrzeug', 'CBRN-01', run ? `Messfahrt ${run.id}` : 'keine Messfahrt', undefined, [['Fahrzeug', 'CBRN-01'], ['Messfahrt', run ? `${run.name} (${run.id})` : '–']]);
    common(520, 215, 230);
  }
  if (id === 'tubes') { const t = tube;
    P(262, 200, 'l', 40, 'Handpumpe (Balg)', 'Probenahme', 'definierte Hubzahl je Röhrchen', undefined, [['Funktion', 'Ansaugen eines definierten Luftvolumens']]);
    P(630, 242, 'r', 20, 'Prüfröhrchen', t?.product ?? '–', t?.analyte ?? '', COL.yellow, [['Produkt', t?.product ?? '–'], ['Hersteller', t?.manufacturer ?? '–'], ['Typ', t?.tube_type ?? '–'], ['Messstoff', `${t?.analyte ?? '–'} (CAS ${t?.cas ?? '–'})`]]);
    P(520, 226, 'r', 120, 'Skala / Messbereich', 'QUELLE ERFORDERL.', t ? `Einheit ${t.unit}` : '', COL.warn, [['Messbereich', 'QUELLE ERFORDERLICH (Herstellerdatenblatt)'], ['Einheit', t?.unit ?? '–'], ['Anwendung', t?.application ?? '–']]);
    P(440, 242, 'r', 220, 'Lagerstatus / Charge', t?.storage_status ?? '–', t ? `Charge ${t.lot} · Verfall ${t.expiry}` : '', t?.storage_status === 'Verfügbar' ? COL.ok : COL.warn, [['Lagerstatus', t?.storage_status ?? '–'], ['Charge (simuliert)', t?.lot ?? '–'], ['Verfall (simuliert)', t?.expiry ?? '–']]);
    common(330, 290, 320);
  }
  return L;
}

/* ------------------------------------------------------------------ Komponente */
function Art({ id, ctx }: { id: string; ctx: any }) {
  const { r } = ctx;
  if (IMG[id]) return <ImgArt id={id} r={r} channels={ctx.channels} />;
  switch (id) {
    case 'pid': return <PidArt r={r} />; case 'ims': return <ImsArt r={r} />; case 'mgmg': return <MgmgArt r={r} channels={ctx.channels} />; case 'dlm': return <DlmArt r={r} />;
    case 'como': return <ComoArt r={r} />; case 'fmg': return <FmgArt r={r} drive={ctx.drive} />; case 'tubes': return <TubesArt tube={ctx.tube} />; default: return null;
  }
}
function useCtx(tubeId?: string) {
  const { live, vehicles, hist, trackKm, mpCount, drive, meta } = useLive(); const dur = useSession();
  const tubes = useApi<any[]>('/test-tubes').data ?? []; const missions = useApi<any[]>('/missions', ['mission.updated']).data ?? [];
  const r = live['CBRN-01']; const v = vehicles.find((x) => x.id === 'CBRN-01');
  return useMemo(() => ({
    r, dur, hist, trackKm, mpCount, drive, tubes, tube: tubes.find((t) => t.id === tubeId) ?? tubes[0], channels: (meta?.mgmg_channels ?? ['O2', 'CO', 'H2S', 'LEL', 'CH4']) as string[],
    pos: v ? fmtPos(meta?.map?.mode, v.lat, v.lon) : '–', mission: missions.find((m) => m.vehicle_id === 'CBRN-01' && m.status === 'IN BEARBEITUNG'), run: r?.run ?? null,
  }), [r, dur, hist, trackKm, mpCount, drive, tubes, tubeId, meta, v, missions]);
}

export function DeviceThumb({ id }: { id: string }) {
  const ctx = useCtx();
  return (<svg viewBox={IMG[id] ? `${380 - BOX_H * IMG[id].aspect / 2 - 10} ${BOX_Y - 6} ${BOX_H * IMG[id].aspect + 20} ${BOX_H + 12}` : '100 0 560 440'} className="w-full h-44"><Defs /><Art id={id} ctx={ctx} /></svg>);
}

export function DeviceFigure({ id }: { id: string }) {
  const [tubeId, setTubeId] = useState<string | undefined>(); const ctx = useCtx(tubeId); const spots = useSpots(id, ctx); const [sel, setSel] = useState<number>(1);
  const cur = spots.find((s) => s.n === sel) ?? spots[0];
  return (
    <div className="grid grid-cols-12 gap-3 mb-3">
      <div className="panel col-span-8 p-2 relative">
        {id === 'tubes' && <select className="inp absolute left-3 top-3 z-10" value={ctx.tube?.id ?? ''} onChange={(e) => setTubeId(e.target.value)}>{ctx.tubes.map((t: any) => <option key={t.id} value={t.id}>{t.product}</option>)}</select>}
        <svg viewBox="0 0 760 440" className="w-full" style={{ maxHeight: 560 }}>
          <Defs />
          <rect x={0} y={0} width={760} height={440} fill="#0b0b0b" /><g stroke="#1a1a1a">{Array.from({ length: 16 }, (_, k) => <line key={k} x1={k * 50} y1={0} x2={k * 50} y2={440} />)}{Array.from({ length: 9 }, (_, k) => <line key={k} x1={0} y1={k * 50} x2={760} y2={k * 50} />)}</g>
          <Art id={id} ctx={ctx} />
          {spots.map((s) => {
            const lx = s.side === 'l' ? 8 : 752; const ax = s.side === 'l' ? 196 : 564; const on = s.n === sel; const c = s.color ?? COL.txt;
            return (
              <g key={s.n} onClick={() => setSel(s.n)} style={{ cursor: 'pointer' }}>
                <polyline points={`${ax},${s.ly + 20} ${ax + (s.side === 'l' ? 10 : -10)},${s.ly + 20} ${s.x},${s.y}`} fill="none" stroke={on ? COL.acc : '#5a5a5a'} strokeWidth={on ? 1.6 : 1} strokeDasharray={on ? '' : '3 3'} />
                <circle cx={s.x} cy={s.y} r={on ? 11 : 9} fill={on ? COL.acc : '#0b0b0b'} stroke={on ? '#fff' : COL.acc} strokeWidth={1.5} />
                <text x={s.x} y={s.y + 4} fontSize={11} fontWeight="bold" fill={on ? '#fff' : COL.acc} textAnchor="middle">{s.n}</text>
                <text x={lx} y={s.ly + 8} fontSize={9.5} fill={COL.dim} textAnchor={s.side === 'l' ? 'start' : 'end'} style={{ textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.n}. {s.title}</text>
                <text x={lx} y={s.ly + 27} fontSize={15} fontWeight="bold" fill={c} textAnchor={s.side === 'l' ? 'start' : 'end'} fontFamily="'Geist Mono Variable', 'Geist Mono', ui-monospace, monospace">{s.v.length > 20 ? s.v.slice(0, 19) + '…' : s.v}</text>
                {s.sub && <text x={lx} y={s.ly + 42} fontSize={10} fill={COL.dim} textAnchor={s.side === 'l' ? 'start' : 'end'}>{s.sub.length > 34 ? s.sub.slice(0, 33) + '…' : s.sub}</text>}
              </g>);
          })}
        </svg>
        <div className="text-[11px] text-dim px-2 pb-1">{IMG[id] ? 'Grafik: vom Betreiber bereitgestellt (Display-Anzeige und Beschriftungen von der App ergänzt).' : 'Schematische Eigen-Illustration (keine Herstellerabbildung).'} Werte: SIMULIERT. Zahl anklicken für Details.</div>
      </div>
      <div className="panel col-span-4 p-0 overflow-auto" style={{ maxHeight: 600 }}>
        <div className="panel-h">Gerätedaten</div>
        {spots.map((s) => (
          <div key={s.n} onClick={() => setSel(s.n)} className={`px-3 py-2 border-b border-line/60 cursor-pointer ${s.n === sel ? 'bg-panel2 border-l-2 border-l-accent' : 'hover:bg-panel2'}`}>
            <div className="text-[12px] font-semibold"><span className="text-accent">{s.n}.</span> {s.title}</div>
            {(s.n === sel || spots.length < 5) && <table className="w-full mt-1"><tbody>{s.lines.map(([k, v]) => <tr key={k}><td className="text-dim text-[11px] pr-2 align-top w-[38%]">{k}</td><td className="font-mono text-[12px] break-words">{v}</td></tr>)}</tbody></table>}
          </div>))}
        {cur && null}
      </div>
    </div>
  );
}
