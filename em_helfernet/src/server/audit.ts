import type { Prisma } from "@prisma/client";
import { prisma, type Db } from "./db";
import type { Ctx } from "./context";

export type Changes = Record<string, [unknown, unknown]>;

/** Felder, deren Werte nie im Klartext ins Audit-Log gehören. */
const REDACT = new Set(["passwordHash", "totpSecretEnc", "internalNotes", "recoveryHashes", "icalToken", "birthDate", "street", "zip", "city", "phone", "email"]);

const norm = (v: unknown) => (v instanceof Date ? v.toISOString() : Array.isArray(v) ? JSON.stringify(v) : v ?? null);

export function diff(before: Record<string, unknown>, after: Record<string, unknown>, fields: string[]): Changes {
  const out: Changes = {};
  for (const f of fields) {
    if (!(f in after)) continue;
    const a = norm(before[f]), b = norm(after[f]);
    if (a === b) continue;
    out[f] = REDACT.has(f) ? ["[verborgen]", "[geändert]"] : [a, b];
  }
  return out;
}

export interface AuditEntry {
  action: string;
  entityType: string;
  entityId?: string | null;
  unitId?: string | null;
  summary: string;
  changes?: Changes | Record<string, unknown> | null;
}

export async function audit(ctx: Pick<Ctx, "userId" | "email" | "ip"> | null, e: AuditEntry, db: Db = prisma) {
  await db.auditLog.create({
    data: {
      actorUserId: ctx?.userId ?? null,
      actorLabel: ctx?.email ?? "System",
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId ?? null,
      unitId: e.unitId ?? null,
      summary: e.summary,
      changes: (e.changes as Prisma.InputJsonValue) ?? undefined,
      ip: ctx?.ip ?? null,
    },
  });
}
