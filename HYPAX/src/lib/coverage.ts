// Zeitliche Abdeckung von Dienst-Positionen: Helfer können sich nur für einen Teil des Dienstes melden und
// werden für diesen Zeitraum eingeteilt. Mehrere Teilzeit-Einteilungen können sich eine Position teilen.

export interface Window { from: Date; to: Date }

/** Effektiver Zeitraum einer Einteilung/Meldung (null = ganzer Dienst). */
export function effective(shift: Window, from: Date | null | undefined, to: Date | null | undefined): Window {
  return { from: from ?? shift.from, to: to ?? shift.to };
}

export const minutesOf = (w: Window) => Math.max(0, Math.round((w.to.getTime() - w.from.getTime()) / 60_000));
export const overlaps = (a: Window, b: Window) => a.from < b.to && b.from < a.to;
export const isFull = (shift: Window, w: Window) => w.from.getTime() <= shift.from.getTime() && w.to.getTime() >= shift.to.getTime();
export const within = (outer: Window, inner: Window) => inner.from >= outer.from && inner.to <= outer.to;

export interface Segment { from: Date; to: Date; count: number }

/** Zerlegt den Dienst in Abschnitte mit gleicher Anzahl gleichzeitig eingeteilter Personen. */
export function segments(shift: Window, windows: Window[]): Segment[] {
  const pts = new Set<number>([shift.from.getTime(), shift.to.getTime()]);
  for (const w of windows) {
    if (w.from > shift.from && w.from < shift.to) pts.add(w.from.getTime());
    if (w.to > shift.from && w.to < shift.to) pts.add(w.to.getTime());
  }
  const sorted = [...pts].sort((a, b) => a - b);
  const out: Segment[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const from = new Date(sorted[i]), to = new Date(sorted[i + 1]);
    const count = windows.filter((w) => w.from <= from && w.to >= to).length;
    const last = out[out.length - 1];
    if (last && last.count === count) last.to = to; else out.push({ from, to, count });
  }
  return out;
}

/** Höchste Gleichzeitigkeit innerhalb eines Zeitraums. */
export function peak(windows: Window[], range?: Window): number {
  const ws = range ? windows.filter((w) => overlaps(w, range)) : windows;
  let max = 0;
  for (const w of ws) {
    const at = range && w.from < range.from ? range.from : w.from;
    max = Math.max(max, ws.filter((x) => x.from <= at && x.to > at).length);
  }
  return max;
}

/** Wie viele Plätze sind über den gesamten Dienst lückenlos besetzt (Minimum der Abdeckung)? */
export function fullSeats(shift: Window, windows: Window[]): number {
  const segs = segments(shift, windows);
  return segs.length ? Math.min(...segs.map((s) => s.count)) : 0;
}

/** Passt ein weiterer Zeitraum noch in eine Position mit `capacity` Plätzen? */
export function fits(windows: Window[], candidate: Window, capacity: number): boolean {
  return peak([...windows, candidate], candidate) <= capacity;
}

/** Lücken (Abschnitte mit weniger als `need` Personen), für Hinweise in der Oberfläche. */
export function gaps(shift: Window, windows: Window[], need: number): Segment[] {
  return segments(shift, windows).filter((s) => s.count < need);
}
