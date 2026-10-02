import type {
  AirsoftRole,
  AnnouncementPriority,
  AttendanceStatus,
  EquipmentCategory,
  EventStatus,
  EventType,
  NotificationType,
  OwnershipStatus,
  Priority,
  ShoppingStatus,
} from "@prisma/client";

export type Option<T extends string> = { value: T; label: string };

function options<T extends string>(map: Record<T, string>): Option<T>[] {
  return (Object.keys(map) as T[]).map((value) => ({ value, label: map[value] }));
}

export const AIRSOFT_ROLE_LABELS: Record<AirsoftRole, string> = {
  SQUAD_LEADER: "Squad Leader",
  RIFLEMAN: "Rifleman",
  SUPPORT_GUNNER: "Support Gunner",
  MEDIC: "Medic",
  RECON: "Recon",
  SNIPER: "Sniper",
  FUNKER: "Funker",
  FAHRER: "Fahrer",
  SONSTIGE: "Sonstige",
};
export const AIRSOFT_ROLE_OPTIONS = options(AIRSOFT_ROLE_LABELS);

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  SPIELTAG: "Spieltag",
  TRAINING: "Training",
  BESPRECHUNG: "Besprechung",
  SONSTIGES: "Sonstiger Termin",
};
export const EVENT_TYPE_OPTIONS = options(EVENT_TYPE_LABELS);

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  PLANNED: "Geplant",
  OPEN: "Anmeldung offen",
  FULL: "Voll",
  COMPLETED: "Abgeschlossen",
  CANCELLED: "Abgesagt",
};
export const EVENT_STATUS_OPTIONS = options(EVENT_STATUS_LABELS);

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  ACCEPTED: "Zugesagt",
  MAYBE: "Vielleicht",
  DECLINED: "Abgesagt",
};
export const ATTENDANCE_ICONS: Record<AttendanceStatus, string> = {
  ACCEPTED: "✅",
  MAYBE: "❓",
  DECLINED: "❌",
};
export const ATTENDANCE_OPTIONS = options(ATTENDANCE_LABELS);

export const CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  PRIMARY_WEAPON: "Primärwaffe",
  SIDEARM: "Backup/Sidearm",
  MAGAZINES: "Magazine",
  EYE_PROTECTION: "Schutzbrille",
  FACE_PROTECTION: "Gesichtsschutz",
  HELMET: "Helm",
  CHEST_RIG: "Chest Rig",
  PLATE_CARRIER: "Plattenträger",
  UNIFORM: "Uniform",
  BOOTS: "Schuhe",
  GLOVES: "Handschuhe",
  RADIO: "Funkgerät",
  HEARING_PROTECTION: "Gehörschutz",
  IFAK: "IFAK",
  BAGS: "Taschen",
  OTHER: "Sonstiges",
};
export const CATEGORY_OPTIONS = options(CATEGORY_LABELS);

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Niedrig",
  MEDIUM: "Mittel",
  HIGH: "Hoch",
};
export const PRIORITY_OPTIONS = options(PRIORITY_LABELS);

export const OWNERSHIP_LABELS: Record<OwnershipStatus, string> = {
  OWNED: "Vorhanden",
  MISSING: "Fehlt",
  ORDERED: "Bestellt",
  PARTIAL: "Teilweise vorhanden",
  DEFECTIVE: "Defekt",
};
export const OWNERSHIP_ICONS: Record<OwnershipStatus, string> = {
  OWNED: "✅",
  MISSING: "❌",
  ORDERED: "📦",
  PARTIAL: "⚠️",
  DEFECTIVE: "🛠️",
};
export const OWNERSHIP_OPTIONS = options(OWNERSHIP_LABELS);

export const ANNOUNCEMENT_PRIORITY_LABELS: Record<AnnouncementPriority, string> = {
  NORMAL: "Normal",
  IMPORTANT: "Wichtig",
  URGENT: "Dringend",
};
export const ANNOUNCEMENT_PRIORITY_OPTIONS = options(ANNOUNCEMENT_PRIORITY_LABELS);

export const SHOPPING_STATUS_LABELS: Record<ShoppingStatus, string> = {
  OPEN: "Offen",
  ORDERED: "Bestellt",
  PURCHASED: "Gekauft",
};
export const SHOPPING_STATUS_OPTIONS = options(SHOPPING_STATUS_LABELS);

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  EVENT_CREATED: "Neuer Termin",
  EVENT_REMINDER: "Erinnerung",
  EVENT_CANCELLED: "Termin abgesagt",
  EQUIPMENT_MISSING: "Ausrüstung",
  EQUIPMENT_REQUIRED: "Ausrüstung",
  ANNOUNCEMENT: "Ankündigung",
  ROLE_CHANGED: "Rolle",
  GENERAL: "Info",
};

export function memberName(p: { firstName: string; lastName: string; callsign?: string | null }) {
  return p.callsign ? `${p.firstName} „${p.callsign}“ ${p.lastName}` : `${p.firstName} ${p.lastName}`;
}

/** Kurzname für Listen: Rufname, sonst Vorname. */
export function shortName(p: { firstName: string; callsign?: string | null }) {
  return p.callsign || p.firstName;
}

export const PERSONAL_GROUP_LABELS = {
  CLOTHING: "Kleidung",
  WEAPON: "Waffe",
  ATTACHMENT: "Anbauteil",
  GADGET: "Gadget",
} as const;
export type PersonalGroupKey = keyof typeof PERSONAL_GROUP_LABELS;
