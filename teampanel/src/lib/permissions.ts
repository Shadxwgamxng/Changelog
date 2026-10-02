import type { RoleKey } from "@prisma/client";

/**
 * Zentrale Rechteverwaltung.
 * Alle Rechteprüfungen im Frontend UND Backend laufen über diese Datei.
 * Neue Rechte werden nur hier definiert und einer Rolle zugeordnet.
 */

export const PERMISSIONS = [
  "members.viewAdmin", // Mitgliederverwaltung ansehen (inkl. Kontaktdaten, Admin-Notizen)
  "members.viewNotes", // private Admin-Notizen lesen/schreiben
  "members.manage", // Mitglieder anlegen, bearbeiten, (de)aktivieren, löschen
  "members.assignRole", // Systemrollen vergeben
  "invitations.manage", // Einladungslinks erzeugen
  "events.create",
  "events.editAny",
  "events.deleteAny",
  "attendance.manage", // Anwesenheit für andere pflegen, Teilnehmerübersicht
  "equipment.manage", // Ausrüstungskatalog pflegen
  "equipment.manageAll", // Ausrüstung/Anforderungen anderer Mitglieder verwalten
  "shopping.manage",
  "announcements.create",
  "announcements.editAny",
  "team.edit",
  "admin.dashboard",
  "audit.view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const SUPERADMIN: readonly Permission[] = PERMISSIONS;

const ADMIN: readonly Permission[] = [
  "members.viewAdmin",
  "members.viewNotes",
  "members.manage",
  "members.assignRole",
  "invitations.manage",
  "events.create",
  "events.editAny",
  "events.deleteAny",
  "attendance.manage",
  "equipment.manage",
  "equipment.manageAll",
  "shopping.manage",
  "announcements.create",
  "announcements.editAny",
  "team.edit",
  "admin.dashboard",
  "audit.view",
];

const TEAMLEITUNG: readonly Permission[] = [
  "members.viewAdmin",
  "events.create",
  "attendance.manage",
  "equipment.manage",
  "equipment.manageAll",
  "shopping.manage",
  "announcements.create",
];

const MITGLIED: readonly Permission[] = [];

const ROLE_PERMISSIONS: Record<RoleKey, ReadonlySet<Permission>> = {
  SUPERADMIN: new Set(SUPERADMIN),
  ADMIN: new Set(ADMIN),
  TEAMLEITUNG: new Set(TEAMLEITUNG),
  MITGLIED: new Set(MITGLIED),
};

export const ROLE_RANK: Record<RoleKey, number> = {
  SUPERADMIN: 400,
  ADMIN: 300,
  TEAMLEITUNG: 200,
  MITGLIED: 100,
};

export const ROLE_LABELS: Record<RoleKey, string> = {
  SUPERADMIN: "Superadmin",
  ADMIN: "Admin",
  TEAMLEITUNG: "Teamleitung",
  MITGLIED: "Mitglied",
};

export const ROLE_DESCRIPTIONS: Record<RoleKey, string> = {
  SUPERADMIN: "Darf alles verwalten, einschließlich weiterer Admins.",
  ADMIN: "Verwaltet Mitglieder, Termine, Ausrüstung und Ankündigungen.",
  TEAMLEITUNG: "Plant Spieltage, pflegt Anwesenheit, Ausrüstung und Ankündigungen.",
  MITGLIED: "Eigenes Profil, Zu-/Absagen, eigene Ausrüstung, Ankündigungen lesen.",
};

export interface Actor {
  id: string;
  role: RoleKey;
}

export function can(actor: Pick<Actor, "role"> | null | undefined, permission: Permission): boolean {
  if (!actor) return false;
  return ROLE_PERMISSIONS[actor.role].has(permission);
}

export function canAny(actor: Pick<Actor, "role"> | null | undefined, ...permissions: Permission[]) {
  return permissions.some((p) => can(actor, p));
}

/** Zugang zum Administrationsbereich (Navigation). */
export function canAccessAdmin(actor: Pick<Actor, "role"> | null | undefined) {
  return canAny(actor, "members.viewAdmin", "admin.dashboard", "audit.view", "team.edit");
}

/** Darf der Akteur den Zielbenutzer verwalten (bearbeiten, deaktivieren, löschen)? Nur Benutzer mit niedrigerem Rang – Superadmins dürfen alle. */
export function canManageUser(actor: Actor, target: Actor): boolean {
  if (!can(actor, "members.manage")) return false;
  if (actor.id === target.id) return false; // Selbst-Verwaltung läuft über das Profil
  if (actor.role === "SUPERADMIN") return true;
  return ROLE_RANK[actor.role] > ROLE_RANK[target.role];
}

/** Rollen, die der Akteur vergeben darf (nie gleich oder höher als die eigene, außer Superadmin). */
export function assignableRoles(actor: Pick<Actor, "role">): RoleKey[] {
  if (!can(actor, "members.assignRole")) return [];
  if (actor.role === "SUPERADMIN") return ["SUPERADMIN", "ADMIN", "TEAMLEITUNG", "MITGLIED"];
  return (Object.keys(ROLE_RANK) as RoleKey[]).filter((r) => ROLE_RANK[r] < ROLE_RANK[actor.role]);
}

export function canAssignRole(actor: Pick<Actor, "role">, role: RoleKey) {
  return assignableRoles(actor).includes(role);
}

/** Termine: Admins bearbeiten alle, die Teamleitung nur selbst angelegte. */
export function canEditEvent(actor: Actor, event: { createdById: string | null }) {
  if (can(actor, "events.editAny")) return true;
  return can(actor, "events.create") && event.createdById === actor.id;
}

export function canDeleteEvent(actor: Actor) {
  return can(actor, "events.deleteAny");
}

export function canEditAnnouncement(actor: Actor, a: { authorId: string | null }) {
  if (can(actor, "announcements.editAny")) return true;
  return can(actor, "announcements.create") && a.authorId === actor.id;
}
