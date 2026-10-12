import { test } from "node:test";
import assert from "node:assert/strict";
import { erzeugeTaktischesZeichen } from "@taktische-zeichen/core";
import { PRESETS, PRESET_GROUPS, presetForVehicle, isPreset, LINE_STYLES, AREA_STYLES } from "../../src/lib/lagekarte";

test("Alle Symbolvorlagen lassen sich als taktisches Zeichen (DV 102) erzeugen", () => {
  for (const p of PRESETS.filter((x) => x.tz)) {
    const z = erzeugeTaktischesZeichen({ ...(p.tz as object), skipFontRegistration: true } as never);
    assert.ok(z.size[0] > 0 && z.dataUrl.startsWith("data:image/svg+xml"), p.id);
  }
});

test("Vorlagen: eindeutige IDs, gültige Gruppen, Pins mit Emoji", () => {
  assert.equal(new Set(PRESETS.map((p) => p.id)).size, PRESETS.length);
  for (const p of PRESETS) { assert.ok(PRESET_GROUPS.includes(p.group), p.id); assert.ok(p.tz || p.pin, p.id); }
  assert.ok(isPreset("rtw") && !isPreset("x"));
  assert.ok(LINE_STYLES.length >= 4 && AREA_STYLES.length >= 4);
});

test("Fahrzeugtyp → Symbol", () => {
  assert.equal(presetForVehicle("RTW", "RTW 1"), "rtw");
  assert.equal(presetForVehicle("KTW", null), "ktw");
  assert.equal(presetForVehicle(null, "NEF Musterstadt"), "nef");
  assert.equal(presetForVehicle("Kommandowagen", "KdoW"), "elw");
  assert.equal(presetForVehicle("Mannschaftstransporter", "MTW"), "mtw");
  assert.equal(presetForVehicle(null, "Sonstiges"), "rtw");
});
