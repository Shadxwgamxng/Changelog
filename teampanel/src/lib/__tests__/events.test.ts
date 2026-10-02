import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { effectiveStatus, registrationState } from "../events";

const base = {
  status: "OPEN" as const,
  startsAt: new Date(Date.now() + 3 * 86_400_000),
  endsAt: null,
  maxParticipants: 2,
  registrationDeadline: null,
};

describe("events", () => {
  it("marks event as full when limit reached", () => {
    assert.equal(effectiveStatus(base, 2), "FULL");
    assert.equal(effectiveStatus(base, 1), "OPEN");
  });
  it("marks past events completed, cancelled stays cancelled", () => {
    const past = { ...base, startsAt: new Date(Date.now() - 3 * 86_400_000) };
    assert.equal(effectiveStatus(past, 0), "COMPLETED");
    assert.equal(effectiveStatus({ ...past, status: "CANCELLED" }, 0), "CANCELLED");
  });
  it("blocks registration after deadline and when planned", () => {
    assert.equal(registrationState({ ...base, registrationDeadline: new Date(Date.now() - 1000) }, 0).open, false);
    assert.equal(registrationState({ ...base, status: "PLANNED" }, 0).open, false);
    assert.equal(registrationState(base, 0).open, true);
  });
  it("blocks only accepting when full", () => {
    const s = registrationState(base, 2);
    assert.equal(s.open, true);
    assert.ok(s.acceptBlocked);
  });
});
