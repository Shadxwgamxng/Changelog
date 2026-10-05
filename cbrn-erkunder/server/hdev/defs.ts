// ---------------------------------------------------------------------------------------------
// Messgeräte-Registry: EINE zentrale Definition je Handmessgerät (Bezeichnung, Modi, Messbereich, Ansprechzeit, Batterie, Schwellen ...).
// Neue Geräte: registerMeasurementDevice({...}) aufrufen (und ggf. mit registerEngine eine eigene Messlogik anmelden) – sonst ist nichts zu ändern
// (die Oberfläche kommt aus web/devices.js: dort ein Gerät mit gleicher id/ui registrieren).
//
// QUELLENLAGE (siehe docs/MESSGERAETE.md): Wo ein Wert aus einer öffentlichen Herstellerangabe stammt, steht `src:` daneben.
// Alle übrigen Werte sind SIMULATIONSANNAHMEN (Spiel/Training) und mit `// SIM` bzw. `TODO` markiert – bitte mit Hersteller-/BBK-Unterlagen prüfen.
// ---------------------------------------------------------------------------------------------
export type Alert = 'NORMAL' | 'AUFFÄLLIG' | 'WARNUNG' | 'ALARM';
export interface Thr { attention?: number; warning?: number; alarm?: number; lowAlarm?: number; lowWarning?: number }
export interface DevMode { id: string; label: string; unit: string; continuous?: boolean; integrates?: boolean }
export interface DevDef {
  id: string; label: string; short: string;
  /** Anzeigename des realen Gerätetyps laut Gerätebild (Konfiguration, ggf. ersetzen) */ model: string;
  engine: string; ui: string; skin: string;
  /** Gerätekürzel in der Messpunkt-Tabelle (bestehende Geräteliste des Computers) */ devKey: string;
  category: 'RADIOLOGISCH' | 'CHEMISCH';
  modes: DevMode[]; defaultMode: string;
  range: { min: number; max: number; unit: string; src?: string };
  resolution: { decimals: [number, number][]; note?: string }; // [bis Wert, Nachkommastellen]
  tau_s: number;                    // Ansprechzeit (Zeitkonstante des Messwertverlaufs)
  durations: { quick: number; normal: number; precise: number };      // Messdauer bis „stabil“ (ms)
  stability: { rel: number; abs: number };                             // Kriterium „Wert stabil“
  noise: { rel: number; abs: number; counting?: boolean };            // Messrauschen (sinkt mit Messdauer)
  battery: { start: number; drainPerMin: number; measureExtra: number; alarmExtra: number; chargePerMin: number; low: number };
  selfTest: { bootMs: number; testMs: number; failChance: number; items: string[] };
  thresholds: Record<string, Thr>;  // je Modus bzw. Kanal
  zero?: { label: string; ms: number };
  channels?: { id: string; label: string; unit: string; decimals: number; range: number; thr?: Thr }[];
  notes: string[];
}

const dev = (d: DevDef) => d;
export const DEVICES: Record<string, DevDef> = {};
export const ENGINES: Record<string, (ctx: any) => any> = {};
export function registerMeasurementDevice(d: DevDef) { DEVICES[d.id] = d; return d; }
export function registerEngine(name: string, fn: (ctx: any) => any) { ENGINES[name] = fn; }
export const deviceList = () => Object.values(DEVICES);

// ---- Dosisleistung (Gerätebild: Thermo RadEye PRD-ER4) --------------------------------------
registerMeasurementDevice(dev({
  id: 'dlm', label: 'Dosisleistungsmessgerät', short: 'DLM', model: 'Thermo RadEye PRD-ER4 (Gerätebild)', engine: 'dose', ui: 'dlm', skin: 'default', devKey: 'DLM', category: 'RADIOLOGISCH',
  modes: [{ id: 'RATE', label: 'Dosisleistung', unit: 'µSv/h', continuous: true }], defaultMode: 'RATE', // Dosis (µSv) und Maximum zeigt das Gerät als weitere Anzeige (Taste Info)
  range: { min: 0.01, max: 250, unit: 'µSv/h', src: 'Thermo RadEye PRD-ER4: 10 nSv/h – 250 µSv/h (Low-Rate-Detektor), bis 10 Sv/h mit High-Rate-Detektor (Herstellerangabe)' },
  resolution: { decimals: [[1, 3], [10, 2], [100, 1], [1e9, 0]], note: 'SIM: Auflösung nicht dokumentiert' },
  tau_s: 3, durations: { quick: 4000, normal: 10000, precise: 30000 }, stability: { rel: 0.06, abs: 0.004 }, noise: { rel: 0.005, abs: 0.002, counting: true },
  battery: { start: 100, drainPerMin: 0.06, measureExtra: 0.02, alarmExtra: 0.05, chargePerMin: 1.5, low: 15 }, // SIM (Herstellerangabe: >170 h Betrieb mit Alkaline-Batterien)
  selfTest: { bootMs: 3500, testMs: 4500, failChance: 0, items: ['Sensor', 'Speicher', 'Batterie', 'System'] },
  thresholds: { RATE: { attention: 0.3, warning: 1.0, alarm: 25 } /* SIM */ },
  notes: ['Messbereich laut Herstellerangabe (Thermo Fisher). Alarmschwellen = SIMULATION.', 'Bedienung laut Handbuch DB-117 E: EIN = On-Taste ≥ 1 s halten; ▲/Info wechselt die Anzeigen; Menu-Taste wählt im Menü, Pfeile blättern; Mute quittiert Alarme.'],
}));

// ---- Kontamination (Gerätebild: Graetz CoMo 170 ZS) -----------------------------------------
registerMeasurementDevice(dev({
  id: 'como', label: 'Kontaminationsnachweisgerät', short: 'CoMo', model: 'Graetz CoMo 170 ZS (Gerätebild)', engine: 'contam', ui: 'como', skin: 'default', devKey: 'COMO', category: 'RADIOLOGISCH',
  modes: [{ id: 'BETA_GAMMA', label: 'β/γ-Kanal', unit: 'cps', continuous: true }, { id: 'ALPHA', label: 'α-Kanal', unit: 'cps', continuous: true }], defaultMode: 'BETA_GAMMA',
  range: { min: 0, max: 20000, unit: 'cps', src: 'CoMo 170: α-Kanal bis 2.500 Ip/s, β/γ-Kanal bis 20.000 Ip/s; Anzeige in cps oder Bq / Bq/cm² (Herstellerangabe)' },
  resolution: { decimals: [[100, 1], [1e9, 0]], note: 'SIM' },
  tau_s: 1.6, durations: { quick: 3000, normal: 8000, precise: 20000 }, stability: { rel: 0.12, abs: 0.6 }, noise: { rel: 1, abs: 0, counting: true },
  battery: { start: 100, drainPerMin: 0.08, measureExtra: 0.02, alarmExtra: 0.04, chargePerMin: 1.5, low: 15 },
  selfTest: { bootMs: 3000, testMs: 5000, failChance: 0, items: ['Detektor', 'Speicher', 'Batterie', 'System'] },
  thresholds: { BETA_GAMMA: { attention: 8, warning: 25, alarm: 200 } /* SIM (Nullrate ~1,2 cps) */, ALPHA: { attention: 1, warning: 3, alarm: 20 } /* SIM */ },
  zero: { label: 'Nullrate messen', ms: 8000 }, // TODO: reale Bedienung des CoMo 170 (Nulleffekt-Messung) mit Herstellerhandbuch prüfen
  notes: ['Bereiche laut Herstellerangabe. Bedienung/Tastenbelegung: TODO Herstellerhandbuch prüfen (laut Hersteller 5 Funktionstasten).', 'Nullrate-Messung = Simulationsannahme.'],
}));

// ---- PID (Gerätebild: Ion Science TIGER XTL) ------------------------------------------------
registerMeasurementDevice(dev({
  id: 'pid', label: 'Photoionisationsdetektor (PID)', short: 'PID', model: 'Ion Science TIGER XTL (Gerätebild)', engine: 'voc', ui: 'pid', skin: 'default', devKey: 'PID', category: 'CHEMISCH',
  modes: [{ id: 'LIVE', label: 'Momentanwert (VOC)', unit: 'ppm', continuous: true }], defaultMode: 'LIVE',
  range: { min: 0.001, max: 20000, unit: 'ppm', src: 'Ion Science TIGER (XT): 1 ppb – 20.000 ppm, Ansprechzeit ca. 2 s (Herstellerangabe; XTL-Bereich: TODO prüfen)' },
  resolution: { decimals: [[10, 3], [100, 2], [1000, 1], [1e9, 0]], note: 'SIM' },
  tau_s: 0.9, durations: { quick: 3000, normal: 8000, precise: 20000 }, stability: { rel: 0.04, abs: 0.02 }, noise: { rel: 0.03, abs: 0.015 },
  battery: { start: 100, drainPerMin: 0.07, measureExtra: 0.03, alarmExtra: 0.05, chargePerMin: 2, low: 15 },
  selfTest: { bootMs: 3500, testMs: 5500, failChance: 0, items: ['Lampe', 'Sensor', 'Batterie', 'System'] },
  thresholds: { LIVE: { attention: 2, warning: 20, alarm: 100 } /* SIM */ },
  zero: { label: 'Nullung (Frischluft)', ms: 6000 }, // TODO: Bedienablauf TIGER prüfen
  notes: ['Ansprechzeit/Bereich laut Herstellerangabe (TIGER-Reihe). Schwellen = SIMULATION.', 'PID zeigt VOC-Summe – keine Stoffidentifikation.'],
}));

// ---- IMS (Gerätebild: Bruker RAID-M 100) ----------------------------------------------------
registerMeasurementDevice(dev({
  id: 'ims', label: 'Ionenmobilitätsspektrometer (IMS)', short: 'IMS', model: 'Bruker RAID-M 100 (Gerätebild)', engine: 'ims', ui: 'ims', skin: 'default', devKey: 'IMS', category: 'CHEMISCH',
  modes: [{ id: 'DETECT', label: 'Detektion (G/H/T)', unit: 'Balken', continuous: true }], defaultMode: 'DETECT',
  range: { min: 0, max: 8, unit: 'Balken', src: 'RAID-M 100: Anzeige der Gefahrenstufe in 8 Balkensegmenten je Klasse G, H, T; akustischer + optischer Alarm; Auto-Purge (Herstellerangabe)' },
  resolution: { decimals: [[1e9, 0]] },
  tau_s: 2.5, durations: { quick: 5000, normal: 12000, precise: 30000 }, stability: { rel: 0.01, abs: 0.5 }, noise: { rel: 0, abs: 0 },
  battery: { start: 100, drainPerMin: 0.15, measureExtra: 0.05, alarmExtra: 0.1, chargePerMin: 2, low: 20 },
  selfTest: { bootMs: 25000, testMs: 35000, failChance: 0, items: ['Messzelle', 'Pumpe', 'Batterie', 'System'] }, // Hersteller: Kaltstart bis messbereit 1–5 min (hier untere Grenze: 60 s)
  thresholds: { DETECT: { attention: 1, warning: 3, alarm: 5 } /* SIM */ },
  zero: { label: 'Reinigung (Auto-Purge)', ms: 12000 },
  notes: ['Klassen G/H/T und 8 Balken laut Herstellerangabe. Bedienung (Drehknopf) laut Gerätebild; reale Menüs: TODO Handbuch prüfen.'],
}));

// ---- Mehrgas (Gerätebild: Dräger X-am 8000) -------------------------------------------------
registerMeasurementDevice(dev({
  id: 'mgmg', label: 'Mehrgasmessgerät', short: 'MGMG', model: 'Dräger X-am 8000 (Gerätebild)', engine: 'gas', ui: 'mgmg', skin: 'default', devKey: 'MGMG', category: 'CHEMISCH',
  modes: [{ id: 'MEASURE', label: 'Messung', unit: '', continuous: true }], defaultMode: 'MEASURE',
  range: { min: 0, max: 100, unit: '', src: 'X-am 8000: O2 0–25 Vol%, CO 0–2000 ppm (LC), H2S 0–100 ppm (LC), CH4 0–100 %UEG; Bedienung über 3 Tasten (Dräger Produktinformation)' },
  resolution: { decimals: [[1e9, 1]] },
  tau_s: 5, durations: { quick: 8000, normal: 20000, precise: 45000 }, stability: { rel: 0.03, abs: 0.2 }, noise: { rel: 0.01, abs: 0.1 },
  battery: { start: 100, drainPerMin: 0.05, measureExtra: 0.01, alarmExtra: 0.05, chargePerMin: 2, low: 15 }, // SIM (Herstellerangabe: >24 h Betrieb)
  selfTest: { bootMs: 4000, testMs: 8000, failChance: 0, items: ['Sensoren', 'Pumpe', 'Batterie', 'System'] },
  thresholds: {},
  channels: [
    { id: 'iBut', label: 'iBut', unit: 'ppm', decimals: 1, range: 2000 }, { id: 'CO2', label: 'CO₂', unit: 'Vol%', decimals: 2, range: 5 },
    { id: 'CH4', label: 'CH₄', unit: '%UEG', decimals: 0, range: 100, thr: { attention: 5, warning: 10, alarm: 20 } },
    { id: 'O2', label: 'O₂', unit: 'Vol%', decimals: 1, range: 25, thr: { lowWarning: 20.0, lowAlarm: 19.0, warning: 21.5, alarm: 23.0 } }, // SIM
    { id: 'H2S', label: 'H₂S', unit: 'ppm', decimals: 1, range: 100, thr: { attention: 1, warning: 5, alarm: 10 } }, // SIM
    { id: 'CO', label: 'CO', unit: 'ppm', decimals: 0, range: 2000, thr: { warning: 20, alarm: 40 } }, // A1 20 ppm / A2 40 ppm laut Dräger-Unterlage (CO-Sensor)
    { id: 'SO2', label: 'SO₂', unit: 'ppm', decimals: 1, range: 100, thr: { warning: 0.5, alarm: 2 } }, // SIM
  ],
  notes: ['Messbereiche O2/CO/H2S/CH4 und 3-Tasten-Bedienung laut Dräger. Schwellen außer CO = SIMULATION. Sensorbestückung der BBK-Geräte: TODO prüfen.'],
}));

/** Öffentliche, für die Oberfläche bestimmte Sicht (keine Interna der Messlogik). */
export const publicDef = (d: DevDef) => ({ id: d.id, label: d.label, short: d.short, model: d.model, ui: d.ui, skin: d.skin, category: d.category, modes: d.modes, defaultMode: d.defaultMode, range: d.range, durations: d.durations, zero: d.zero ?? null, channels: d.channels ?? null, resolution: d.resolution, battery: { low: d.battery.low }, selfTest: { items: d.selfTest.items }, thresholds: d.thresholds });
