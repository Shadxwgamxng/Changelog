import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate, rankForRequirement, proposeStaffing, type Candidate, type ShiftCtx, type Requirement } from "../../src/lib/matching";

const H = 3_600_000;
const t0 = new Date("2027-07-18T16:00:00Z");
const shift: ShiftCtx = { unitId: "u1", kind: "SANITAETSDIENST", startsAt: t0, endsAt: new Date(t0.getTime() + 8 * H), weekday: 0, avgLoad: 20 };

function cand(id: string, over: Partial<Candidate> = {}): Candidate {
  return {
    helperId: id, name: id, unitId: "u1", active: true, functions: ["HELFER"], qualTypeIds: new Set(["SH"]),
    availability: "VERFUEGBAR", busy: [], confirmedThisMonth: 0, load: 10, maxShiftsPerMonth: null, minRestHours: 11,
    preferredKinds: [], preferredWeekdays: [], requested: false, alreadyOnShift: false, ...over,
  };
}
const reqSH: Requirement = { id: "r1", label: "Sanitätshelfer", count: 2, functionKey: null, qualTypeIds: ["SH"] };
const reqRS: Requirement = { id: "r2", label: "Rettungssanitäter", count: 1, functionKey: null, qualTypeIds: ["RS"] };

test("Fehlende Qualifikation ist ein harter Ausschluss – auch bei bester Verfügbarkeit", () => {
  const e = evaluate(cand("a"), reqRS, shift);
  assert.equal(e.eligible, false);
  assert.deepEqual(e.missingQualTypeIds, ["RS"]);
  assert.ok(e.score <= 49);
});

test("Empfehlung enthält nie ungeeignete Helfer", () => {
  const cands = [cand("a"), cand("b", { qualTypeIds: new Set(["RS", "SH"]) }), cand("c", { qualTypeIds: new Set() })];
  const plan = proposeStaffing(cands, [reqRS], shift);
  assert.deepEqual(plan[0].filled.map((f) => f.helperId), ["b"]);
});

test("Nicht verfügbar, inaktiv, Überschneidung, Ruhezeit, Monatslimit", () => {
  assert.ok(!evaluate(cand("a", { availability: "NICHT_VERFUEGBAR" }), reqSH, shift).eligible);
  assert.ok(!evaluate(cand("a", { active: false }), reqSH, shift).eligible);
  const overlap = { startsAt: new Date(t0.getTime() - 2 * H), endsAt: new Date(t0.getTime() + 1 * H) };
  assert.ok(!evaluate(cand("a", { busy: [overlap] }), reqSH, shift).eligible);
  const tooClose = { startsAt: new Date(t0.getTime() - 14 * H), endsAt: new Date(t0.getTime() - 5 * H) }; // 5 h Pause
  const e = evaluate(cand("a", { busy: [tooClose] }), reqSH, shift);
  assert.ok(!e.eligible && e.blockers.some((b) => b.includes("Ruhezeit")));
  const ok = { startsAt: new Date(t0.getTime() - 30 * H), endsAt: new Date(t0.getTime() - 20 * H) }; // 20 h Pause
  assert.ok(evaluate(cand("a", { busy: [ok] }), reqSH, shift).eligible);
  assert.ok(!evaluate(cand("a", { maxShiftsPerMonth: 3, confirmedThisMonth: 3 }), reqSH, shift).eligible);
  assert.ok(evaluate(cand("a", { maxShiftsPerMonth: 3, confirmedThisMonth: 2 }), reqSH, shift).eligible);
});

test("Benötigte Funktion wird erzwungen", () => {
  const r: Requirement = { id: "r3", label: "Fahrer", count: 1, functionKey: "FAHRER", qualTypeIds: [] };
  assert.ok(!evaluate(cand("a"), r, shift).eligible);
  assert.ok(evaluate(cand("b", { functions: ["FAHRER"] }), r, shift).eligible);
});

test("Ranking: Verfügbarkeit, Last, Selbstmeldung und Einheit erhöhen den Score", () => {
  const ranked = rankForRequirement(
    [
      cand("belastet", { load: 60 }),
      cand("frei", { load: 0 }),
      cand("eingeschr", { availability: "EINGESCHRAENKT" }),
      cand("fremd", { unitId: "u2" }),
      cand("meldet", { requested: true, load: 10 }),
    ],
    reqSH, shift,
  );
  assert.equal(ranked[0].helperId, "meldet");
  assert.ok(ranked.find((r) => r.helperId === "frei")!.score > ranked.find((r) => r.helperId === "belastet")!.score);
  assert.ok(ranked.find((r) => r.helperId === "frei")!.score > ranked.find((r) => r.helperId === "eingeschr")!.score);
  assert.ok(ranked.find((r) => r.helperId === "frei")!.score > ranked.find((r) => r.helperId === "fremd")!.score);
  assert.ok(ranked.every((r) => r.score >= 0 && r.score <= 100));
});

test("Beste Besetzung: knappe Positionen zuerst, jeder Helfer nur einmal", () => {
  // x hat RS+SH, y/z nur SH. Position RS (1) ist knapper als SH (2) → x muss RS bekommen, y+z SH.
  const cands = [cand("x", { qualTypeIds: new Set(["RS", "SH"]), load: 0 }), cand("y"), cand("z", { load: 15 })];
  const plan = proposeStaffing(cands, [reqSH, reqRS], shift);
  const rs = plan.find((p) => p.requirementId === "r2")!, sh = plan.find((p) => p.requirementId === "r1")!;
  assert.deepEqual(rs.filled.map((f) => f.helperId), ["x"]);
  assert.deepEqual(sh.filled.map((f) => f.helperId).sort(), ["y", "z"]);
  assert.equal(plan[0].requirementId, "r1"); // Ausgabe in Original-Reihenfolge
});

test("Unterbesetzung wird ausgewiesen; bereits Besetzte werden angerechnet", () => {
  const plan = proposeStaffing([cand("a")], [reqSH], shift);
  assert.equal(plan[0].unfilled, 1);
  const plan2 = proposeStaffing([cand("a")], [reqSH], shift, { r1: 1 });
  assert.equal(plan2[0].needed, 1);
  assert.equal(plan2[0].unfilled, 0);
  assert.equal(proposeStaffing([cand("a")], [reqSH], shift, { r1: 2 }).length, 0);
});
