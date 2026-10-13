import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CERT_TEMPLATE, fillPlaceholders, renderBody } from "../../src/lib/certificate-template";

test("Zertifikat-Vorlage: Platzhalter, Überschriften, bedingte Zeilen", () => {
  const vars = { name: "Max Muster", lehrgang: "Funk", zeitraum: "am 01.02.2027", qualifikation: null, gueltig_bis: "01.02.2029" };
  const lines = renderBody(DEFAULT_CERT_TEMPLATE.body, vars);
  assert.deepEqual(lines.find((l) => l.style === "h1"), { style: "h1", text: "Max Muster" });
  assert.deepEqual(lines.find((l) => l.style === "h2"), { style: "h2", text: "„Funk“" });
  assert.ok(!lines.some((l) => l.text.includes("Qualifikation")), "Zeile ohne Qualifikation entfällt");
  assert.ok(lines.some((l) => l.text === "Gültig bis 01.02.2029"));
  assert.notEqual(lines.at(-1)?.style, "gap");
  assert.equal(fillPlaceholders("{name} / {tippfehler}", vars), "Max Muster / {tippfehler}");
  assert.deepEqual(renderBody("### {lehrgang}\n\n\n\nText", vars).map((l) => l.style), ["h3", "gap", "text"]);
});

test("Unterschrift: Namensform, mehrere Personen, Titel, stabile Variation", async () => {
  const { signatureText, seedOf } = await import("../../src/lib/certificate-template");
  assert.equal(signatureText("Anna Ausbilder, Ben Beispiel", "KURZ"), "A. Ausbilder");
  assert.equal(signatureText("Anna Ausbilder und Ben Beispiel", "VOLL"), "Anna Ausbilder");
  assert.equal(signatureText("Dr. Leonie Schäfer-Brandt", "KURZ"), "L. Schäfer-Brandt");
  assert.equal(signatureText("Alexander von Hohenstein", "KURZ"), "A. von Hohenstein");
  assert.equal(signatureText("Madonna", "KURZ"), "Madonna");
  assert.equal(signatureText("  ", "KURZ"), "");
  assert.equal(seedOf("A. Ausbilder"), seedOf("A. Ausbilder"));
  assert.notEqual(seedOf("A. Ausbilder"), seedOf("B. Beispiel"));
});
