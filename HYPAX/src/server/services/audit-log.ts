import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { forbidden } from "../errors";
import { hasAnywhere, unitIdsWith, type Ctx } from "../context";

export interface AuditQuery { q?: string; entityType?: string; actor?: string; from?: Date; to?: Date; unitId?: string; page?: number; pageSize?: number }

/** Audit-Log lesen. Sichtbar sind Einträge der Einheiten, in denen `audit.view` gilt; systemweite Einträge (ohne Einheit) nur für Systemadministration/Support. */
export async function listAudit(ctx: Ctx, q: AuditQuery = {}) {
  if (!hasAnywhere(ctx, "audit.view")) throw forbidden();
  const global = ctx.all || ctx.globalPerms.has("audit.view");
  const unitIds = global ? null : await unitIdsWith(ctx, "audit.view");
  const and: Prisma.AuditLogWhereInput[] = [];
  if (unitIds) and.push({ unitId: { in: unitIds } });
  if (q.unitId) and.push({ unitId: q.unitId });
  if (q.entityType) and.push({ entityType: q.entityType });
  if (q.actor) and.push({ actorLabel: { contains: q.actor, mode: "insensitive" } });
  if (q.from) and.push({ at: { gte: q.from } });
  if (q.to) and.push({ at: { lte: q.to } });
  if (q.q) and.push({ OR: [{ summary: { contains: q.q, mode: "insensitive" } }, { action: { contains: q.q, mode: "insensitive" } }] });
  const pageSize = Math.min(q.pageSize ?? 50, 200), page = Math.max(q.page ?? 1, 1);
  const where: Prisma.AuditLogWhereInput = and.length ? { AND: and } : {};
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { at: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.auditLog.count({ where }),
  ]);
  return { items, total, page, pageSize };
}
