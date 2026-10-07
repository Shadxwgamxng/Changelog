import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword, passwordProblems, encryptBuffer, decryptBuffer } from "../../src/lib/crypto";
import { totpAt, verifyTotp, base32Encode, base32Decode } from "../../src/lib/totp";
import { parseBerlinLocal, toBerlinInput, fmtRange, daysUntil, parseDateOnly } from "../../src/lib/dates";
import { qualState, computeValidUntil, isValidAt, resolveCovers, effectiveQualTypes, addMonthsUTC } from "../../src/lib/qualification";
import { buildIcs, fold } from "../../src/lib/ics";
import { csvCell, toCsv } from "../../src/lib/csv";

test("Passwort-Hash: korrekt/falsch, Salz verschieden", async () => {
  const h1 = await hashPassword("Geheim123!x"), h2 = await hashPassword("Geheim123!x");
  assert.notEqual(h1, h2);
  assert.ok(await verifyPassword("Geheim123!x", h1));
  assert.ok(!(await verifyPassword("geheim123!x", h1)));
  assert.ok(!(await verifyPassword("x", "kaputt")));
});

test("Passwort-Richtlinie", () => {
  assert.ok(passwordProblems("kurz").length > 0);
  assert.ok(passwordProblems("nurkleinbuchstaben").length > 0);
  assert.equal(passwordProblems("Sicher#Passwort1").length, 0);
});

test("AES-GCM: Roundtrip und Manipulationserkennung", () => {
  const plain = Buffer.from("Qualifikationsnachweis");
  const enc = encryptBuffer(plain);
  assert.ok(!enc.includes(plain));
  assert.deepEqual(decryptBuffer(enc), plain);
  enc[enc.length - 1] ^= 1;
  assert.throws(() => decryptBuffer(enc));
});

test("TOTP: RFC-6238-Testvektor (SHA-1)", () => {
  const secret = base32Encode(Buffer.from("12345678901234567890"));
  assert.equal(totpAt(secret, 59_000, 30, 8), "94287082");
  assert.equal(totpAt(secret, 1111111109_000, 30, 8), "07081804");
  assert.deepEqual(base32Decode(secret), Buffer.from("12345678901234567890"));
  const now = Date.now();
  assert.ok(verifyTotp(secret, totpAt(secret, now), now));
  assert.ok(!verifyTotp(secret, "000000", now) || totpAt(secret, now) === "000000");
});

test("Zeitzonen: Sommer-/Winterzeit und Lücke", () => {
  assert.equal(parseBerlinLocal("2027-07-18T18:00")!.toISOString(), "2027-07-18T16:00:00.000Z");
  assert.equal(parseBerlinLocal("2027-01-18T18:00")!.toISOString(), "2027-01-18T17:00:00.000Z");
  assert.equal(parseBerlinLocal("2027-03-28T02:30"), null); // existiert nicht (Umstellung)
  assert.equal(toBerlinInput(parseBerlinLocal("2027-07-18T18:00")), "2027-07-18T18:00");
  assert.equal(parseBerlinLocal("quatsch"), null);
  assert.equal(parseDateOnly("2027-02-30"), null);
});

test("Zeitraum-Formatierung über Mitternacht", () => {
  const s = parseBerlinLocal("2027-07-18T18:00")!, e = parseBerlinLocal("2027-07-19T02:00")!;
  assert.equal(fmtRange(s, e), "18.07. · 18:00–02:00");
  assert.equal(fmtRange(s, parseBerlinLocal("2027-07-20T12:00")!), "18.07. 18:00 – 20.07. 12:00");
});

test("Qualifikationsstatus", () => {
  const now = new Date("2027-06-01T10:00:00Z");
  const d = (s: string) => new Date(s + "T00:00:00Z");
  assert.equal(qualState({ validUntil: null, status: "GUELTIG" }, now), "GUELTIG");
  assert.equal(qualState({ validUntil: d("2027-07-16"), status: "GUELTIG" }, now), "LAEUFT_AB");
  assert.equal(qualState({ validUntil: d("2027-05-31"), status: "GUELTIG" }, now), "ABGELAUFEN");
  assert.equal(qualState({ validUntil: d("2027-06-01"), status: "GUELTIG" }, now), "LAEUFT_AB"); // heute = letzter Tag
  assert.equal(qualState({ validUntil: d("2030-01-01"), status: "WIDERRUFEN" }, now), "WIDERRUFEN");
  assert.equal(daysUntil(d("2027-06-01"), now), 0);
  assert.equal(computeValidUntil(d("2027-01-31"), 1)!.toISOString().slice(0, 10), "2027-02-28");
  assert.equal(addMonthsUTC(d("2024-02-29"), 12).toISOString().slice(0, 10), "2025-02-28");
  assert.equal(computeValidUntil(null, 24), null);
});

test("Gültigkeit zum Dienstzeitpunkt", () => {
  const q = { validUntil: new Date("2027-07-10T00:00:00Z"), status: "GUELTIG" as const };
  assert.ok(isValidAt(q, new Date("2027-07-10T20:00:00Z")));
  assert.ok(!isValidAt(q, new Date("2027-07-11T00:00:01Z")));
  assert.ok(!isValidAt({ ...q, status: "WIDERRUFEN" as const }, new Date("2027-01-01")));
});

test("Qualifikation „deckt ab“ (transitiv, zyklenfest)", () => {
  const covers = resolveCovers(new Map([["RS", ["SH"]], ["NFS", ["RS"]], ["SH", []], ["A", ["B"]], ["B", ["A"]]]));
  assert.ok(covers.get("NFS")!.has("SH"));
  assert.ok(!covers.get("SH")!.has("RS"));
  const held = effectiveQualTypes([{ typeId: "NFS", validUntil: null, status: "GUELTIG" }], covers, new Date());
  assert.ok(held.has("RS") && held.has("SH"));
  assert.ok(covers.get("A")!.has("B"));
});

test("ICS: Escaping, Faltung, CRLF", () => {
  const long = "ä".repeat(100);
  const ics = buildIcs("Test", [{ uid: "1@x", start: new Date("2027-07-18T16:00:00Z"), end: new Date("2027-07-19T00:00:00Z"), summary: "A, B; C\nD", description: long }]);
  assert.ok(ics.includes("DTSTART:20270718T160000Z"));
  assert.ok(ics.includes("SUMMARY:A\\, B\; C\\nD"));
  assert.ok(ics.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  assert.equal(fold("kurz"), "kurz");
});

test("CSV: Formel-Injektion und Quoting", () => {
  assert.equal(csvCell("=1+1"), "'=1+1");
  assert.equal(csvCell('a;"b"'), '"a;""b"""');
  assert.ok(toCsv(["a"], [["x"]]).startsWith("﻿a"));
});
