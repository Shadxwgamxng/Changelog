import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, Bar, BarChart, Area, AreaChart } from 'recharts';

const ax = { stroke: '#817d78', fontSize: 10 };
const tip = { contentStyle: { background: '#151515', border: '1px solid #363636', fontSize: 11 }, labelStyle: { color: '#817d78' } };
const fmtT = (t: number) => new Date(t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export function TimeChart({ data, series, unit, height = 160, ref: refLine, xKey = 't', yDomain }: { data: any[]; series: { key: string; color: string; name: string; yAxisId?: string }[]; unit?: string; height?: number; ref?: number; xKey?: string; yDomain?: [any, any] }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid stroke="#272727" strokeDasharray="2 3" />
          <XAxis dataKey={xKey} tickFormatter={fmtT} {...ax} minTickGap={50} type="number" domain={['dataMin', 'dataMax']} scale="time" />
          <YAxis {...ax} unit={unit ? ` ${unit}` : ''} width={72} tickFormatter={(v: number) => (Math.abs(v) < 10 ? v.toFixed(2) : v.toFixed(0)).replace('.', ',')} domain={yDomain ?? ['auto', 'auto']} />
          <Tooltip {...tip} labelFormatter={(t) => fmtT(Number(t))} />
          {refLine != null && <ReferenceLine y={refLine} stroke="#e5534b" strokeDasharray="4 3" />}
          {series.map((s) => <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} dot={false} strokeWidth={1.6} isAnimationActive={false} />)}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SpectrumChart({ counts, kev, height = 200 }: { counts: number[]; kev: number; height?: number }) {
  const data = counts.map((c, i) => ({ e: Math.round((i + 0.5) * kev), c }));
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid stroke="#272727" strokeDasharray="2 3" />
          <XAxis dataKey="e" {...ax} unit=" keV" type="number" domain={[0, 'dataMax']} />
          <YAxis {...ax} width={44} />
          <Tooltip {...tip} formatter={(v: any) => [v, 'Counts']} labelFormatter={(e) => `${e} keV`} />
          <Area type="monotone" dataKey="c" stroke="#f0500a" fill="#f0500a33" dot={false} isAnimationActive={false} strokeWidth={1.2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export { BarChart, Bar };
