// Schlanke SVG-Diagramme ohne Fremdbibliothek (serverseitig renderbar, barrierearm durch Tabellenalternative).
import type { ReactNode } from "react";

export function BarChart({ data, unit = "h", height = 180, format }: { data: { label: string; value: number }[]; unit?: string; height?: number; format?: (v: number) => string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const fmt = format ?? ((v: number) => v.toLocaleString("de-DE", { maximumFractionDigits: 1 }));
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <figure>
      <svg viewBox={`0 0 ${data.length * 40} ${height}`} className="w-full" role="img" aria-label={`Balkendiagramm, Summe ${fmt(total)} ${unit}`}>
        {[0.25, 0.5, 0.75, 1].map((f) => <line key={f} x1="0" x2={data.length * 40} y1={height - 24 - (height - 44) * f} y2={height - 24 - (height - 44) * f} stroke="rgb(var(--border))" strokeWidth="1" />)}
        {data.map((d, i) => {
          const h = ((height - 44) * d.value) / max;
          return (
            <g key={d.label}>
              <title>{`${d.label}: ${fmt(d.value)} ${unit}`}</title>
              <rect x={i * 40 + 8} y={height - 24 - h} width="24" height={Math.max(h, d.value > 0 ? 2 : 0)} rx="4" fill="rgb(var(--info))" opacity={d.value ? 1 : 0.25} />
              {d.value > 0 && <text x={i * 40 + 20} y={height - 28 - h} textAnchor="middle" fontSize="9" fill="rgb(var(--text-2))">{fmt(d.value)}</text>}
              <text x={i * 40 + 20} y={height - 8} textAnchor="middle" fontSize="9.5" fill="rgb(var(--text-3))">{d.label}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="sr-only">{data.map((d) => `${d.label}: ${fmt(d.value)} ${unit}`).join("; ")}</figcaption>
    </figure>
  );
}

const PALETTE = ["#1e62be", "#168a4c", "#b06900", "#c40510", "#7a4fc8", "#0e8a9a", "#8a6d3b", "#6b7788"];

export function Donut({ data, center, size = 150 }: { data: { label: string; value: number; color?: string }[]; center?: ReactNode; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 52, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 140 140" width={size} height={size} role="img" aria-label={`Kreisdiagramm: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}>
          <circle cx="70" cy="70" r={r} fill="none" stroke="rgb(var(--surface-2))" strokeWidth="18" />
          {total > 0 && data.map((d, i) => {
            const len = (d.value / total) * c;
            const el = <circle key={d.label} cx="70" cy="70" r={r} fill="none" stroke={d.color ?? PALETTE[i % PALETTE.length]} strokeWidth="18" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} transform="rotate(-90 70 70)"><title>{`${d.label}: ${d.value}`}</title></circle>;
            offset += len;
            return el;
          })}
        </svg>
        {center && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>}
      </div>
      <ul className="space-y-1.5 text-sm">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm" style={{ background: d.color ?? PALETTE[i % PALETTE.length] }} aria-hidden />{d.label}<span className="ml-1 tabular-nums text-fg-muted">{d.value}</span></li>
        ))}
      </ul>
    </div>
  );
}

export function HBars({ data, format }: { data: { label: string; value: number; sub?: string }[]; format?: (v: number) => string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const fmt = format ?? ((v: number) => String(v));
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm"><span className="truncate">{d.label}</span><span className="tabular-nums text-fg-muted">{fmt(d.value)}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2 ring-1 ring-inset ring-line"><div className="h-full rounded-full bg-info" style={{ width: `${(d.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}
