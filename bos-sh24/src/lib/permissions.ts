import type { Role } from "@/lib/types";

// Zentrale Rollenhierarchie: jede Rolle erbt die Rechte der links stehenden Rollen.
const ORDER: Role[] = ["VISITOR", "USER", "EDITOR", "ADMIN"];

export function roleAtLeast(role: Role | undefined | null, required: Role): boolean {
  if (!role) return required === "VISITOR";
  return ORDER.indexOf(role) >= ORDER.indexOf(required);
}

export const can = {
  manageOwnProfile: (role?: Role | null) => roleAtLeast(role, "USER"),
  saveFavorites: (role?: Role | null) => roleAtLeast(role, "USER"),
  createPosts: (role?: Role | null) => roleAtLeast(role, "EDITOR"),
  editOwnPost: (role?: Role | null) => roleAtLeast(role, "EDITOR"),
  editAnyPost: (role?: Role | null) => roleAtLeast(role, "ADMIN"),
  manageMedia: (role?: Role | null) => roleAtLeast(role, "EDITOR"),
  manageEvents: (role?: Role | null) => roleAtLeast(role, "ADMIN"),
  manageCategories: (role?: Role | null) => roleAtLeast(role, "ADMIN"),
  manageUsers: (role?: Role | null) => roleAtLeast(role, "ADMIN"),
  manageContact: (role?: Role | null) => roleAtLeast(role, "ADMIN"),
  manageSettings: (role?: Role | null) => roleAtLeast(role, "ADMIN"),
  accessAdmin: (role?: Role | null) => roleAtLeast(role, "EDITOR"),
};

export const roleLabels: Record<Role, string> = {
  VISITOR: "Besucher",
  USER: "Benutzer",
  EDITOR: "Redakteur",
  ADMIN: "Administrator",
};
