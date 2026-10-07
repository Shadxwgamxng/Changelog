// Autorisierungskern: Ctx (wer fragt an?), can()/require() und Scope-Filter für Listenabfragen.
// JEDE Datenabfrage muss über diese Funktionen laufen – UI und API nutzen dieselben Services.
import type { AssignmentScope, SystemRole } from "@prisma/client";
import { prisma } from "./db";
import { forbidden, notFound, unauthorized } from "./errors";
import { loadUnits, unitInfo, type UnitInfo } from "./units";
import { SUPPORT_PERMISSIONS, isPermission, type Permission } from "@/lib/permissions";

export interface Grant { unitId: string; unitPath: string; scope: AssignmentScope; perms: Set<Permission>; roleKey: string }

export interface Ctx {
  userId: string;
  email: string;
  systemRole: SystemRole;
  /** Superadmin/Systemadmin: alle Rechte in allen Einheiten */
  all: boolean;
  /** Einheitenunabhängige Rechte (Support) */
  globalPerms: Set<Permission>;
  helperId: string | null;
  helperUnitId: string | null;
  helperName: string | null;
  grants: Grant[];
  ip?: string;
  userAgent?: string;
}

export async function loadCtx(userId: string, meta: { ip?: string; userAgent?: string } = {}): Promise<Ctx> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      helper: { select: { id: true, unitId: true, firstName: true, lastName: true, status: true } },
      roleAssignments: { include: { role: true, unit: { select: { id: true, path: true, active: true } } } },
    },
  });
  if (!user || !user.active) throw unauthorized();
  const grants: Grant[] = [];
  for (const a of user.roleAssignments) {
    if (!a.unit.active) continue;
    const perms = new Set<Permission>(a.role.permissions.filter(isPermission));
    for (const g of a.grants) if (isPermission(g)) perms.add(g);
    for (const d of a.denies) perms.delete(d as Permission);
    grants.push({ unitId: a.unitId, unitPath: a.unit.path, scope: a.scope, perms, roleKey: a.role.key });
  }
  const all = user.systemRole === "SUPERADMIN" || user.systemRole === "SYSTEMADMIN";
  return {
    userId: user.id,
    email: user.email,
    systemRole: user.systemRole,
    all,
    globalPerms: new Set(user.systemRole === "SUPPORT" ? SUPPORT_PERMISSIONS : []),
    helperId: user.helper?.id ?? null,
    helperUnitId: user.helper?.unitId ?? null,
    helperName: user.helper ? `${user.helper.firstName} ${user.helper.lastName}` : null,
    grants,
    ...meta,
  };
}

const covers = (g: Grant, unit: Pick<UnitInfo, "id" | "path">) =>
  g.scope === "SUBTREE" ? unit.path.startsWith(g.unitPath) : g.unitId === unit.id;

/** Darf der Benutzer `perm` in der Einheit `unit` ausüben? */
export function canIn(ctx: Ctx, perm: Permission, unit: Pick<UnitInfo, "id" | "path">): boolean {
  if (ctx.all) return true;
  if (ctx.globalPerms.has(perm)) return true;
  return ctx.grants.some((g) => g.perms.has(perm) && covers(g, unit));
}

export async function can(ctx: Ctx, perm: Permission, unitId: string): Promise<boolean> {
  if (ctx.all || ctx.globalPerms.has(perm)) return true;
  const u = await unitInfo(unitId);
  return !!u && canIn(ctx, perm, u);
}

/** Wirft 403. `hide` = stattdessen 404 (Existenz nicht verraten). */
export async function require_(ctx: Ctx, perm: Permission, unitId: string, hide = false): Promise<void> {
  if (!(await can(ctx, perm, unitId))) throw hide ? notFound() : forbidden();
}

/** Hat der Benutzer `perm` irgendwo? (z. B. für Navigationspunkte) */
export function hasAnywhere(ctx: Ctx, perm: Permission): boolean {
  return ctx.all || ctx.globalPerms.has(perm) || ctx.grants.some((g) => g.perms.has(perm));
}

/** Prisma-Filter für Modelle mit `unitId` + Relation `unit`: nur Einheiten, in denen `perm` gilt. */
export function scopeWhere(ctx: Ctx, perm: Permission): Record<string, unknown> {
  if (ctx.all || ctx.globalPerms.has(perm)) return {};
  const or: Record<string, unknown>[] = [];
  for (const g of ctx.grants) {
    if (!g.perms.has(perm)) continue;
    or.push(g.scope === "SUBTREE" ? { unit: { path: { startsWith: g.unitPath } } } : { unitId: g.unitId });
  }
  return or.length ? { OR: or } : { unitId: { in: [] as string[] } };
}

/** IDs aller Einheiten, in denen `perm` gilt. */
export async function unitIdsWith(ctx: Ctx, perm: Permission): Promise<string[]> {
  const units = [...(await loadUnits()).values()].filter((u) => u.active);
  if (ctx.all || ctx.globalPerms.has(perm)) return units.map((u) => u.id);
  return units.filter((u) => canIn(ctx, perm, u)).map((u) => u.id);
}

export async function unitsWith(ctx: Ctx, perm: Permission): Promise<UnitInfo[]> {
  const ids = new Set(await unitIdsWith(ctx, perm));
  return [...(await loadUnits()).values()].filter((u) => ids.has(u.id)).sort((a, b) => a.path.localeCompare(b.path));
}

/** Alle Einheiten, die der Benutzer überhaupt „sieht“ (irgendein Recht oder eigene Heimateinheit). */
export async function visibleUnits(ctx: Ctx): Promise<UnitInfo[]> {
  const all = [...(await loadUnits()).values()].filter((u) => u.active);
  if (ctx.all || ctx.globalPerms.size) return all.sort((a, b) => a.path.localeCompare(b.path));
  return all
    .filter((u) => ctx.helperUnitId === u.id || ctx.grants.some((g) => covers(g, u)))
    .sort((a, b) => a.path.localeCompare(b.path));
}

export function isSelf(ctx: Ctx, helperId: string): boolean {
  return !!ctx.helperId && ctx.helperId === helperId;
}

