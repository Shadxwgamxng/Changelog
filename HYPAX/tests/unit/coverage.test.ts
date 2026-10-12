import { test } from "node:test";
import assert from "node:assert/strict";
import { effective, fits, fullSeats, gaps, isFull, minutesOf, peak, segments } from "../../src/lib/coverage";

const h = (n: number) => new Date(Date.UTC(2027, 0, 1, n));
const shift = { from: h(12), to: h(18) };

test("Abdeckung: zwei Teilzeit-Einteilungen ergeben einen vollen Platz", () => {
  const ws = [{ from: h(12), to: h(15) }, { from: h(15), to: h(18) }];
  assert.equal(fullSeats(shift, ws), 1);
  assert.equal(peak(ws), 1);
  assert.deepEqual(gaps(shift, ws, 1), []);
  assert.equal(segments(shift, ws).length, 1, "gleiche Anzahl → ein Abschnitt");
});

test("Abdeckung: Lücken und Gleichzeitigkeit", () => {
  const ws = [{ from: h(12), to: h(14) }, { from: h(13), to: h(16) }];
  assert.equal(fullSeats(shift, ws), 0);
  assert.equal(peak(ws), 2);
  const g = gaps(shift, ws, 1);
  assert.equal(g.length, 1);
  assert.equal(g[0].from.getTime(), h(16).getTime());
  assert.equal(fits(ws, { from: h(13), to: h(14) }, 2), false);
  assert.equal(fits(ws, { from: h(16), to: h(18) }, 1), true);
  assert.equal(fits(ws, { from: h(14), to: h(16) }, 2), true);
});

test("Zeitraum-Helfer", () => {
  assert.deepEqual(effective(shift, null, null), shift);
  assert.equal(isFull(shift, shift), true);
  assert.equal(isFull(shift, { from: h(13), to: h(18) }), false);
  assert.equal(minutesOf({ from: h(12), to: h(15) }), 180);
});
