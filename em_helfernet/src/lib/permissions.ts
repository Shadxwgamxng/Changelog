// Berechtigungskatalog und Standard-Rollen. Reine Daten + reine Funktionen (ohne DB) – gut testbar.

export const PERMISSIONS = {
  // Helfer
  "helper.view": "Helfer anzeigen (Name, Funktion, Einheit, Qualifikationen)",
  "helper.view_contact": "Kontaktdaten von Helfern sehen (E-Mail, Telefon, Adresse)",
  "helper.view_sensitive": "Sensible Daten sehen (Geburtsdatum, interne Notizen)",
  "helper.create": "Helfer anlegen",
  "helper.edit": "Helfer bearbeiten",
  "helper.delete": "Helfer anonymisieren / löschen",
  "helper.export": "Personenbezogene Daten exportieren",
  // Qualifikationen
  "qualification.view": "Qualifikationen von Helfern sehen",
  "qualification.manage": "Qualifikationen und Qualifikationsarten verwalten",
  // Dienste & Veranstaltungen
  "shift.view": "Dienste ansehen",
  "shift.create": "Dienste erstellen",
  "shift.edit": "Dienste bearbeiten",
  "shift.staff": "Dienste besetzen (Anfragen entscheiden, Helfer einteilen)",
  "shift.cancel": "Dienste absagen / abschließen",
  "event.view": "Veranstaltungen ansehen",
  "event.manage": "Veranstaltungen verwalten",
  "availability.view_others": "Verfügbarkeiten anderer Helfer sehen",
  // Alarmierung & Einsatz
  "alert.view": "Alarmierungen und Rückmeldungen ansehen",
  "alert.create": "Alarmierungen auslösen",
  "incident.view": "Einsätze ansehen",
  "incident.manage": "Einsätze verwalten",
  // Ressourcen
  "vehicle.view": "Fahrzeuge ansehen",
  "vehicle.manage": "Fahrzeuge verwalten",
  "material.view": "Material ansehen",
  "material.manage": "Material verwalten",
  "document.view": "Dokumente ansehen (Stufe „Helfer“)",
  "document.manage": "Dokumente verwalten (auch Stufe „Führung“ lesen)",
  // Kommunikation
  "message.send": "Nachrichten an Gruppen/Einheiten senden",
  "message.announce": "Bekanntmachungen veröffentlichen",
  // Auswertung
  "report.view": "Berichte und Statistiken ansehen",
  "report.export": "Berichte exportieren (PDF/CSV/Excel)",
  // Administration
  "user.view": "Benutzer ansehen",
  "user.manage": "Benutzer und Rollenzuweisungen verwalten",
  "unit.manage": "Einheiten verwalten",
  "role.manage": "Rollen und Rechte konfigurieren",
  "audit.view": "Audit-Log einsehen",
} as const;

export type Permission = keyof typeof PERMISSIONS;
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];
export function isPermission(p: string): p is Permission {
  return p in PERMISSIONS;
}

const base: Permission[] = ["shift.view", "event.view", "vehicle.view", "material.view", "document.view", "helper.view"];

const staffing: Permission[] = [
  "shift.view", "shift.create", "shift.edit", "shift.staff", "event.view", "event.manage", "availability.view_others",
  "qualification.view", "helper.view",
];

export interface DefaultRole {
  key: string;
  name: string;
  description: string;
  rank: number;
  permissions: Permission[];
}

/** Systemrollen mit sinnvollen Standardrechten – im Admin-Bereich anpassbar. */
export const DEFAULT_ROLES: DefaultRole[] = [
  {
    key: "EINHEITENLEITER",
    name: "Einheitenleiter",
    description: "Vollständige Verwaltung der eigenen Einheit inkl. Benutzer und Berichte.",
    rank: 90,
    permissions: ALL_PERMISSIONS.filter((p) => !["role.manage", "unit.manage"].includes(p)),
  },
  {
    key: "BEREITSCHAFTSLEITER",
    name: "Bereitschaftsleiter",
    description: "Leitung einer Bereitschaft: Helfer, Dienste, Ressourcen, Berichte.",
    rank: 80,
    permissions: ALL_PERMISSIONS.filter((p) => !["role.manage", "unit.manage", "user.manage", "audit.view"].includes(p)),
  },
  {
    key: "ZUGFUEHRER",
    name: "Zugführer",
    description: "Führung eines Zuges: Einsatz- und Dienstführung, Alarmierung.",
    rank: 70,
    permissions: [
      ...base, ...staffing, "helper.view_contact", "alert.view", "alert.create", "incident.view", "incident.manage",
      "message.send", "report.view", "document.manage",
    ],
  },
  {
    key: "GRUPPENFUEHRER",
    name: "Gruppenführer",
    description: "Führung einer Gruppe: Kontaktdaten, Alarmierung, Dienste einsehen.",
    rank: 60,
    permissions: [...base, "qualification.view", "helper.view_contact", "availability.view_others", "alert.view", "alert.create", "incident.view", "message.send"],
  },
  {
    key: "DIENSTPLANER",
    name: "Dienstplaner",
    description: "Erstellt Dienste und teilt Helfer ein – ohne Stammdaten ändern zu dürfen.",
    rank: 50,
    permissions: [...base, ...staffing, "shift.cancel", "alert.view", "message.send"],
  },
  {
    key: "HELFER",
    name: "Helfer",
    description: "Normaler Helfer: eigene Daten, Dienste, Kalender, Dokumente der Einheit.",
    rank: 10,
    permissions: [...base],
  },
  {
    key: "GAST",
    name: "Gast / eingeschränkter Benutzer",
    description: "Sieht nur freigegebene Dienste und Veranstaltungen.",
    rank: 1,
    permissions: ["shift.view", "event.view"],
  },
];

/** Support darf Stammdaten lesen und das Audit-Log einsehen, aber nichts ändern. */
export const SUPPORT_PERMISSIONS: Permission[] = ["helper.view", "user.view", "audit.view"];
