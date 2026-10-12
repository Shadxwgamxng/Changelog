"use server";
import { action, checked, formObject, str } from "@/server/action";
import * as U from "@/server/services/units";
import * as Users from "@/server/services/users";

export const createUnitAction = action(async (ctx, f) => { await U.createUnit(ctx, { name: str(f, "name"), type: str(f, "type") as never, parentId: str(f, "parentId") || null }); return "Einheit angelegt."; });
export const updateUnitAction = action(async (ctx, f) => { await U.updateUnit(ctx, str(f, "id"), { name: str(f, "name"), type: str(f, "type") as never, active: checked(f, "active") }); return "Gespeichert."; });
export const moveUnitAction = action(async (ctx, f) => { await U.moveUnit(ctx, str(f, "id"), str(f, "parentId") || null); return "Verschoben."; });
export const deleteUnitAction = action(async (ctx, f) => { await U.deleteUnit(ctx, str(f, "id")); return "Gelöscht."; });

export const assignRoleAction = action(async (ctx, f) => {
  await Users.assignRole(ctx, { userId: str(f, "userId"), unitId: str(f, "unitId"), roleKey: str(f, "roleKey"), scope: str(f, "scope") === "SUBTREE" ? "SUBTREE" : "UNIT", grants: f.getAll("grants[]").map(String), denies: f.getAll("denies[]").map(String) });
  return "Rolle zugewiesen.";
});
export const removeRoleAction = action(async (ctx, f) => { await Users.removeRoleAssignment(ctx, str(f, "id")); return "Rolle entzogen."; });
export const setSystemRoleAction = action(async (ctx, f) => { await Users.setSystemRole(ctx, str(f, "userId"), str(f, "role") as never); return "Systemrolle geändert."; });
export const toggleUserAction = action(async (ctx, f) => { await Users.setUserActive(ctx, str(f, "userId"), checked(f, "active")); return "Gespeichert."; });
export const resetPwAction = action(async (ctx, f) => `Neues Initialpasswort (einmalig sichtbar): ${await Users.adminResetPassword(ctx, str(f, "userId"))}`);
export const createStandaloneUserAction = action(async (ctx, f) => { const r = await Users.createUser(ctx, { email: str(f, "email"), systemRole: (str(f, "systemRole") || "NONE") as never }); return `Konto angelegt. Initialpasswort (einmalig sichtbar): ${r.initialPassword}`; });
export const updateRoleAction = action(async (ctx, f) => { await Users.updateRoleDefinition(ctx, str(f, "id"), { name: str(f, "name"), description: str(f, "description"), permissions: f.getAll("permissions[]").map(String) }); return "Rolle gespeichert."; });
export const createRoleAction = action(async (ctx, f) => { const o = formObject(f); await Users.createRoleDefinition(ctx, { key: String(o.key), name: String(o.name), description: String(o.description ?? ""), permissions: f.getAll("permissions[]").map(String) }); return "Rolle angelegt."; });
