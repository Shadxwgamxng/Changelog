// Lagekarte für Sanitätsdienste: Symbolvorrat (taktische Zeichen nach DV 102 + einfache Hinweis-Pins) und Linien-/Flächenstile.
// Die Zeichen selbst werden mit @taktische-zeichen/core (MIT) erzeugt; hier stehen nur die Konfigurationen.

export interface TzSpec {
  grundzeichen?: string;
  organisation?: string;
  fachaufgabe?: string;
  einheit?: string;
  symbol?: string;
  funktion?: string;
  text?: string;
  farbe?: string;
}

export interface Preset {
  id: string;
  label: string;
  group: string;
  /** Taktisches Zeichen (DV 102) … */
  tz?: TzSpec;
  /** … oder einfacher Hinweis-Pin */
  pin?: { emoji: string; color: string };
}

const HO = "hilfsorganisation";
const veh = (id: string, label: string, text: string, fachaufgabe: string): Preset => ({ id, label, group: "Fahrzeuge", tz: { grundzeichen: "kraftfahrzeug-landgebunden", organisation: HO, fachaufgabe, text } });
const unit = (id: string, label: string, einheit: string): Preset => ({ id, label, group: "Einheiten", tz: { grundzeichen: "taktische-formation", organisation: HO, fachaufgabe: "rettungswesen", einheit } });
const pin = (id: string, label: string, emoji: string, color: string): Preset => ({ id, label, group: "Veranstaltung", pin: { emoji, color } });

export const PRESETS: Preset[] = [
  // Führung & Einrichtungen
  { id: "einsatzleitung", label: "Einsatzleitung / Befehlsstelle", group: "Führung & Stellen", tz: { grundzeichen: "befehlsstelle", organisation: HO, fachaufgabe: "fuehrung" } },
  { id: "behandlungsplatz", label: "Behandlungsplatz (BHP)", group: "Führung & Stellen", tz: { grundzeichen: "stelle", organisation: HO, fachaufgabe: "aerztliche-versorgung", symbol: "zelt" } },
  { id: "sanitaetsstation", label: "Sanitätsstation / Unfallhilfsstelle", group: "Führung & Stellen", tz: { grundzeichen: "ortsfeste-stelle", organisation: HO, fachaufgabe: "rettungswesen" } },
  { id: "sichtung", label: "Sichtung", group: "Führung & Stellen", tz: { grundzeichen: "stelle", organisation: HO, fachaufgabe: "rettungswesen", symbol: "sichten" } },
  { id: "patientenablage", label: "Patientenablage / Verletztensammelstelle", group: "Führung & Stellen", tz: { grundzeichen: "stelle", organisation: HO, symbol: "sammelplatz-betroffene" } },
  { id: "bereitstellung", label: "Bereitstellungsraum", group: "Führung & Stellen", tz: { grundzeichen: "stelle", organisation: HO, symbol: "sammeln" } },
  { id: "betreuung", label: "Betreuungsstelle", group: "Führung & Stellen", tz: { grundzeichen: "stelle", organisation: HO, fachaufgabe: "betreuung" } },
  { id: "verpflegung", label: "Verpflegung", group: "Führung & Stellen", tz: { grundzeichen: "stelle", organisation: HO, symbol: "verpflegung" } },
  { id: "funk", label: "Funk / Kommunikation (IuK)", group: "Führung & Stellen", tz: { grundzeichen: "stelle", organisation: HO, fachaufgabe: "iuk" } },
  { id: "logistik", label: "Logistik / Materiallager", group: "Führung & Stellen", tz: { grundzeichen: "stelle", organisation: HO, fachaufgabe: "logistik" } },
  { id: "hubschrauberlandeplatz", label: "Hubschrauberlandeplatz", group: "Führung & Stellen", tz: { grundzeichen: "stelle", organisation: HO, symbol: "hubschrauber" } },
  // Fahrzeuge
  veh("rtw", "Rettungswagen (RTW)", "RTW", "rettungswesen"),
  veh("ktw", "Krankentransportwagen (KTW)", "KTW", "rettungswesen"),
  veh("nef", "Notarzteinsatzfahrzeug (NEF)", "NEF", "aerztliche-versorgung"),
  veh("gwsan", "Gerätewagen Sanitätsdienst", "GW-San", "rettungswesen"),
  veh("elw", "Einsatzleitwagen (ELW)", "ELW", "fuehrung"),
  veh("mtw", "Mannschaftstransportwagen (MTW)", "MTW", "transport"),
  { id: "kraftrad", label: "Kraftrad-Streife", group: "Fahrzeuge", tz: { grundzeichen: "kraftrad", organisation: HO, fachaufgabe: "rettungswesen" } },
  { id: "fahrrad", label: "Fahrrad-Streife", group: "Fahrzeuge", tz: { grundzeichen: "fahrrad", organisation: HO, fachaufgabe: "rettungswesen" } },
  // Einheiten
  unit("trupp", "Trupp", "trupp"),
  unit("staffel", "Staffel", "staffel"),
  unit("gruppe", "Gruppe", "gruppe"),
  unit("zug", "Zug", "zug"),
  { id: "sanitaeter", label: "Sanitäter / Streife (Einzelperson)", group: "Einheiten", tz: { grundzeichen: "person", organisation: HO, fachaufgabe: "rettungswesen" } },
  { id: "arzt", label: "Notarzt", group: "Einheiten", tz: { grundzeichen: "person", organisation: HO, fachaufgabe: "aerztliche-versorgung" } },
  // Lage
  { id: "person-verletzt", label: "Verletzte Person", group: "Lage", tz: { grundzeichen: "ohne", symbol: "person-verletzt" } },
  { id: "person-transport", label: "Person zu transportieren", group: "Lage", tz: { grundzeichen: "ohne", symbol: "person-zu-transportieren" } },
  { id: "person-transportiert", label: "Person transportiert", group: "Lage", tz: { grundzeichen: "ohne", symbol: "person-transportiert" } },
  { id: "person-vermisst", label: "Vermisste Person", group: "Lage", tz: { grundzeichen: "ohne", symbol: "person-vermisst" } },
  { id: "person-gerettet", label: "Person gerettet / versorgt", group: "Lage", tz: { grundzeichen: "ohne", symbol: "person-gerettet" } },
  { id: "gefahr", label: "Gefahr", group: "Lage", tz: { grundzeichen: "gefahr" } },
  { id: "gefahr-vermutet", label: "Gefahr vermutet", group: "Lage", tz: { grundzeichen: "gefahr-vermutet" } },
  { id: "gefahr-akut", label: "Gefahr akut", group: "Lage", tz: { grundzeichen: "gefahr-akut" } },
  { id: "brand", label: "Brand", group: "Lage", tz: { grundzeichen: "gefahr", symbol: "vollbrand" } },
  { id: "blockiert", label: "Weg blockiert", group: "Lage", tz: { grundzeichen: "ohne", symbol: "blockiert" } },
  { id: "massnahme", label: "Maßnahme", group: "Lage", tz: { grundzeichen: "massnahme" } },
  // Veranstaltungs-Hinweise (einfache Pins)
  pin("aed", "AED / Defibrillator", "❤️", "#d4380d"),
  pin("erste-hilfe", "Erste-Hilfe-Punkt", "➕", "#16a34a"),
  pin("wc", "Toiletten", "🚻", "#2563eb"),
  pin("wasser", "Trinkwasser", "💧", "#0891b2"),
  pin("eingang", "Eingang", "🚪", "#7c3aed"),
  pin("ausgang", "Ausgang / Notausgang", "🏃", "#16a34a"),
  pin("zufahrt", "Zufahrt Rettungsdienst", "🚑", "#16a34a"),
  pin("parken", "Parkplatz", "🅿️", "#475569"),
  pin("buehne", "Bühne", "🎤", "#9333ea"),
  pin("info", "Infopunkt", "ℹ️", "#2563eb"),
  pin("loescher", "Feuerlöscher", "🧯", "#dc2626"),
  pin("sperre", "Sperrstelle", "⛔", "#dc2626"),
];

export const PRESET_GROUPS = ["Führung & Stellen", "Fahrzeuge", "Einheiten", "Lage", "Veranstaltung"];
export const presetById = (id: string) => PRESETS.find((p) => p.id === id);
export const isPreset = (id: string) => PRESETS.some((p) => p.id === id);

export interface LineStyle { id: string; label: string; color: string; weight: number; dash?: string }
export const LINE_STYLES: LineStyle[] = [
  { id: "absperrung", label: "Absperrung", color: "#dc2626", weight: 5, dash: "10 8" },
  { id: "rettungsweg", label: "Rettungsweg / Zufahrt", color: "#16a34a", weight: 6 },
  { id: "zaun", label: "Zaun / Grenze", color: "#111827", weight: 3, dash: "2 6" },
  { id: "weg", label: "Weg / Laufweg", color: "#2563eb", weight: 4, dash: "12 6" },
  { id: "route", label: "Transportroute", color: "#f59e0b", weight: 5 },
];

export interface AreaStyle { id: string; label: string; color: string; fillOpacity: number; dash?: string }
export const AREA_STYLES: AreaStyle[] = [
  { id: "veranstaltung", label: "Veranstaltungsfläche", color: "#2563eb", fillOpacity: 0.12 },
  { id: "gefahrenbereich", label: "Gefahren-/Sperrbereich", color: "#dc2626", fillOpacity: 0.22, dash: "8 6" },
  { id: "behandlung", label: "Behandlungsbereich", color: "#16a34a", fillOpacity: 0.2 },
  { id: "bereitstellung", label: "Bereitstellungsfläche", color: "#f59e0b", fillOpacity: 0.18 },
  { id: "sichtungsbereich", label: "Sichtungs-/Sammelbereich", color: "#9333ea", fillOpacity: 0.18 },
];
export const lineStyleById = (id: string) => LINE_STYLES.find((s) => s.id === id);
export const areaStyleById = (id: string) => AREA_STYLES.find((s) => s.id === id);

/** Passendes Fahrzeug-Symbol zu Fahrzeugtyp/-name (für „Fahrzeuge dieses Dienstes“). */
export function presetForVehicle(type?: string | null, name?: string | null): string {
  const t = `${type ?? ""} ${name ?? ""}`.toLowerCase();
  if (/\bnef\b|notarzt/.test(t)) return "nef";
  if (/\bktw\b|krankentransport/.test(t)) return "ktw";
  if (/\brtw\b|rettungswagen/.test(t)) return "rtw";
  if (/\belw\b|einsatzleit|kdow|kommando/.test(t)) return "elw";
  if (/gw-?san|gerätewagen|geraetewagen/.test(t)) return "gwsan";
  if (/\bmtw\b|mannschaft/.test(t)) return "mtw";
  return "rtw";
}

export type LatLng = [number, number];

// ── Kartengrundlage: GTA-V-/FiveM-Atlas (San Andreas) als Kachelpyramide, lokal unter /map/gta/{z}/{x}/{y}.png ──
// Koordinatensystem „Simple“: Breite (lat) 0 … −256 von oben nach unten, Länge (lng) 0 … 256 von links nach rechts.
// 1 Einheit = 32 Pixel im 8192×8192-Atlas.
export const MAP_TILE_URL = "/map/gta/{z}/{x}/{y}.png";
export const MAP_SIZE = 256;
export const MAP_NATIVE_ZOOM = 5;
export const MAP_MAX_ZOOM = 7;
export const MAP_DEFAULT_VIEW = { lat: -195, lng: 105, zoom: 3 };

export interface Place { id: string; label: string; lat: number; lng: number; zoom: number }
const place = (id: string, label: string, x: number, y: number, zoom = 5): Place => ({ id, label, lat: -y, lng: x, zoom });
/** Orientierungspunkte (Sprungziele) – Position x/y in Karteneinheiten. */
export const PLACES: Place[] = [
  place("ls-zentrum", "Los Santos – Zentrum", 112, 189, 4),
  place("vinewood", "Vinewood", 115, 173),
  place("rockford", "Rockford Hills", 99, 177),
  place("del-perro", "Del Perro", 82, 191),
  place("vespucci", "Vespucci / Strand", 85, 199),
  place("maze-arena", "Maze Bank Arena", 110, 214),
  place("davis", "Davis / South Los Santos", 118, 205),
  place("hafen", "Hafen South Los Santos", 118, 225),
  place("lsia", "Flughafen LSIA", 88, 229, 4),
  place("rennbahn", "Vinewood Rennbahn", 141, 170),
  place("zancudo", "Fort Zancudo", 71, 110, 4),
  place("chiliad", "Mount Chiliad", 125, 60, 4),
  place("alamo", "Alamo Sea", 133, 90, 4),
  place("sandy", "Sandy Shores", 153, 96),
  place("grapeseed", "Grapeseed", 155, 72),
  place("paleto", "Paleto Bay", 113, 38),
  place("gefaengnis", "Bolingbroke-Gefängnis", 188, 97),
];
export const MAX_POINTS = 400;
export const MAX_OBJECTS = 400;
