import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dateToLocalInput, daysBetween, localToDate } from "../dates";

describe("dates (Europe/Berlin)", () => {
  it("converts summer time local input to UTC", () => {
    assert.equal(localToDate("2026-07-15T09:30", "Europe/Berlin")?.toISOString(), "2026-07-15T07:30:00.000Z");
  });
  it("converts winter time local input to UTC", () => {
    assert.equal(localToDate("2026-01-15T09:30", "Europe/Berlin")?.toISOString(), "2026-01-15T08:30:00.000Z");
  });
  it("roundtrips", () => {
    const d = localToDate("2026-10-25T12:00", "Europe/Berlin")!;
    assert.equal(dateToLocalInput(d, "Europe/Berlin"), "2026-10-25T12:00");
  });
  it("rejects garbage", () => {
    assert.equal(localToDate("morgen"), null);
  });
  it("counts calendar days in local zone", () => {
    const a = localToDate("2026-05-01T23:30", "Europe/Berlin")!;
    const b = localToDate("2026-05-02T00:30", "Europe/Berlin")!;
    assert.equal(daysBetween(a, b, "Europe/Berlin"), 1);
  });
});
