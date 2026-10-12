import { test } from "node:test";
import assert from "node:assert/strict";
import { shiftInput } from "../../src/server/schemas";

test("Dienst ohne Veranstaltung/Verantwortlichen: leere Auswahl wird zu null", () => {
  const r = shiftInput.parse({
    unitId: "u1", eventId: "", responsibleId: "", name: "Bereitschaftsabend", kind: "BEREITSCHAFTSABEND",
    startsAt: "2027-03-01T18:00", endsAt: "2027-03-01T21:00", signupDeadline: "",
    requirements: [{ label: "Helfer", count: "2", functionKey: "" }],
  });
  assert.equal(r.eventId, null);
  assert.equal(r.responsibleId, null);
  assert.equal(r.requirements[0].functionKey, null);
  assert.equal(shiftInput.parse({ unitId: "u1", eventId: "e1", name: "X", kind: "SONSTIGES", startsAt: "2027-03-01T18:00", endsAt: "2027-03-01T19:00" }).eventId, "e1");
});
