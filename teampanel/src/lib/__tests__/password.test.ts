import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generatePassword, hashPassword, verifyPassword } from "../password";

describe("password", () => {
  it("hashes with unique salt and verifies", async () => {
    const a = await hashPassword("Correct-Horse-1");
    const b = await hashPassword("Correct-Horse-1");
    assert.notEqual(a, b);
    assert.equal(await verifyPassword("Correct-Horse-1", a), true);
    assert.equal(await verifyPassword("wrong", a), false);
    assert.equal(await verifyPassword("x", "garbage"), false);
  });
  it("generates passwords of requested length", () => {
    assert.equal(generatePassword(16).length, 16);
  });
});
