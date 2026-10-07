// Gemeinsame Konstanten und deutsche Beschriftungen (UI + API).

export const FUNCTIONS = [
  { key: "HELFER", label: "Helfer" },
  { key: "SANITAETER", label: "Sanitäter" },
  { key: "RETTUNGSSANITAETER", label: "Rettungssanitäter" },
  { key: "FAHRER", label: "Fahrer" },
  { key: "FUNKER", label: "Funker" },
  { key: "EINSATZLEITER", label: "Einsatzleiter" },
  { key: "GRUPPENFUEHRER", label: "Gruppenführer" },
  { key: "ZUGFUEHRER", label: "Zugführer" },
  { key: "AUSBILDER", label: "Ausbilder" },
  { key: "BETREUER", label: "Betreuer" },
] as const;
export type FunctionKey = (typeof FUNCTIONS)[number]["key"];
export const FUNCTION_LABEL: Record<string, string> = Object.fromEntries(FUNCTIONS.map((f) => [f.key, f.label]));

export const UNIT_TYPE_LABEL = {
  KREISVERBAND: "Kreisverband",
  ORTSVEREIN: "Ortsverein",
  BEREITSCHAFT: "Bereitschaft",
  EINSATZEINHEIT: "Einsatzeinheit",
  SEG: "SEG",
  WASSERWACHT: "Wasserwacht",
  JUGENDROTKREUZ: "Jugendrotkreuz",
  SONSTIGE: "Sonstige Einheit",
} as const;

export const SYSTEM_ROLE_LABEL = {
  NONE: "—",
  SUPERADMIN: "Superadministrator",
  SYSTEMADMIN: "Systemadministrator",
  SUPPORT: "Support",
} as const;

export const HELPER_STATUS_LABEL = {
  AKTIV: "Aktiv",
  PASSIV: "Passiv",
  INAKTIV: "Inaktiv",
  AUSGETRETEN: "Ausgetreten",
  ANONYMISIERT: "Anonymisiert",
} as const;

export const QUAL_CATEGORY_LABEL = {
  AUSBILDUNG: "Ausbildung",
  LEHRGANG: "Lehrgang",
  FUEHRERSCHEIN: "Führerschein",
  MEDIZIN: "Medizinisch",
  FUNK: "Funk",
  SANITAET: "Sanitätsausbildung",
  FUEHRUNG: "Führungsausbildung",
  TECHNIK: "Technisch",
  SONDER: "Sonderqualifikation",
} as const;

export const SHIFT_KIND_LABEL = {
  SANITAETSDIENST: "Sanitätsdienst",
  BEREITSCHAFTSABEND: "Bereitschaftsabend",
  AUSBILDUNG: "Ausbildung",
  BESPRECHUNG: "Besprechung",
  EINSATZ: "Einsatz",
  UEBUNG: "Übung",
  SONSTIGES: "Sonstiges",
} as const;

export const SHIFT_STATUS_LABEL = {
  ENTWURF: "Entwurf",
  OFFEN: "Veröffentlicht",
  ABGESAGT: "Abgesagt",
  ABGESCHLOSSEN: "Abgeschlossen",
} as const;

export const ASSIGNMENT_STATUS_LABEL = {
  EINGELADEN: "Eingeladen",
  ANGEFRAGT: "Angefragt",
  BESTAETIGT: "Bestätigt",
  WARTELISTE: "Warteliste",
  ABGELEHNT: "Abgelehnt",
  ZURUECKGEZOGEN: "Zurückgezogen",
} as const;

export const AVAILABILITY_LABEL = {
  VERFUEGBAR: "Verfügbar",
  EINGESCHRAENKT: "Eingeschränkt verfügbar",
  NICHT_VERFUEGBAR: "Nicht verfügbar",
} as const;
export const AVAILABILITY_EMOJI = { VERFUEGBAR: "🟢", EINGESCHRAENKT: "🟡", NICHT_VERFUEGBAR: "🔴", NONE: "⚪" } as const;

export const AVAILABILITY_REASON_LABEL = {
  URLAUB: "Urlaub",
  SCHULE: "Schule",
  ARBEIT: "Arbeit",
  KRANKHEIT: "Krankheit",
  PRIVAT: "Privater Termin",
  SONSTIGES: "Sonstiges",
} as const;

export const VEHICLE_STATUS_LABEL = {
  EINSATZBEREIT: "Einsatzbereit",
  EINGESCHRAENKT: "Eingeschränkt",
  NICHT_EINSATZBEREIT: "Nicht einsatzbereit",
  IN_WARTUNG: "In Wartung",
} as const;
export const VEHICLE_STATUS_EMOJI = { EINSATZBEREIT: "🟢", EINGESCHRAENKT: "🟡", NICHT_EINSATZBEREIT: "🔴", IN_WARTUNG: "🔧" } as const;

export const MATERIAL_STATUS_LABEL = { OK: "In Ordnung", DEFEKT: "Defekt", IN_WARTUNG: "In Wartung", AUSGESONDERT: "Ausgesondert" } as const;

export const DOC_CATEGORY_LABEL = {
  QUALIFIKATIONSNACHWEIS: "Qualifikationsnachweis",
  DIENSTANWEISUNG: "Dienstanweisung",
  AUSBILDUNG: "Ausbildungsunterlage",
  FAHRZEUG: "Fahrzeugdokument",
  PRUEFBERICHT: "Prüfbericht",
  INTERN: "Intern",
} as const;

export const DOC_ACCESS_LABEL = {
  HELFER: "Alle Helfer der Einheit",
  FUEHRUNG: "Nur Führungskräfte / Verwalter",
  PERSOENLICH: "Persönlich (Besitzer + Berechtigte)",
} as const;

export const ALERT_RESPONSE_LABEL = { OFFEN: "Keine Antwort", KOMME: "Ich komme", VIELLEICHT: "Ich komme eventuell", KANN_NICHT: "Ich kann nicht" } as const;
export const ALERT_RESPONSE_EMOJI = { OFFEN: "⚪", KOMME: "🟢", VIELLEICHT: "🟡", KANN_NICHT: "🔴" } as const;

export const ALERT_AUDIENCE_LABEL = {
  EINHEIT: "Gesamte Einheit",
  GRUPPE: "Bestimmte Gruppe",
  QUALIFIKATION: "Bestimmte Qualifikation",
  ALARMGRUPPE: "Definierte Alarmgruppe",
} as const;

export const EVENT_TASK_LABEL = {
  SANITAETSDIENST: "Sanitätsdienst",
  EINSATZLEITUNG: "Einsatzleitung",
  FAHRZEUG: "Fahrzeug",
  MATERIAL: "Material",
  FUNK: "Funk",
  SONSTIGES: "Sonstiges",
} as const;

export const NOTIFICATION_TYPE_LABEL = {
  DIENST_NEU: "Neuer Dienst",
  DIENST_ANFRAGE: "Neue Dienstanfrage (für Planer)",
  DIENST_BESTAETIGT: "Dienstbestätigung",
  DIENST_ABGELEHNT: "Anfrage abgelehnt / Warteliste",
  DIENST_GEAENDERT: "Dienständerung",
  DIENST_ABGESAGT: "Dienstabsage",
  ALARM: "Alarmierung",
  NACHRICHT: "Neue Nachricht",
  BEKANNTMACHUNG: "Bekanntmachung",
  QUALIFIKATION_LAEUFT_AB: "Qualifikation läuft ab",
  DOKUMENT_LAEUFT_AB: "Dokument läuft ab",
  VERANSTALTUNG_GEAENDERT: "Veranstaltung geändert",
  SYSTEM: "Systemhinweise",
} as const;

/** Standard-Benachrichtigungen: Alarm & Dienst-Entscheidungen sind standardmäßig an. */
export const NOTIFICATION_DEFAULTS: Record<keyof typeof NOTIFICATION_TYPE_LABEL, { inApp: boolean; email: boolean; push: boolean }> = {
  DIENST_NEU: { inApp: true, email: false, push: true },
  DIENST_ANFRAGE: { inApp: true, email: false, push: true },
  DIENST_BESTAETIGT: { inApp: true, email: true, push: true },
  DIENST_ABGELEHNT: { inApp: true, email: true, push: true },
  DIENST_GEAENDERT: { inApp: true, email: true, push: true },
  DIENST_ABGESAGT: { inApp: true, email: true, push: true },
  ALARM: { inApp: true, email: false, push: true },
  NACHRICHT: { inApp: true, email: false, push: true },
  BEKANNTMACHUNG: { inApp: true, email: false, push: true },
  QUALIFIKATION_LAEUFT_AB: { inApp: true, email: true, push: false },
  DOKUMENT_LAEUFT_AB: { inApp: true, email: false, push: false },
  VERANSTALTUNG_GEAENDERT: { inApp: true, email: false, push: true },
  SYSTEM: { inApp: true, email: false, push: false },
};

/** Warnstufen (Tage vor Ablauf), jeweils einmalig benachrichtigt. */
export const EXPIRY_WARN_DAYS = [90, 30, 7] as const;
export const EXPIRING_SOON_DAYS = 90;

export const TZ = "Europe/Berlin";
