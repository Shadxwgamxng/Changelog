import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "./db";
import { ROLE_LABELS } from "./permissions";
import type { SessionUser } from "./auth";
import { shortName } from "./labels";

type Client = PrismaClient | Prisma.TransactionClient;

export interface AuditEntry {
  action: string; // z. B. "member.create"
  targetType: string;
  targetId?: string | null;
  targetLabel?: string | null;
  message: string;
  data?: Prisma.InputJsonValue;
}

/** "Admin Raptor" – Rolle + Rufname/Vorname des Akteurs. */
export function actorLabel(user: SessionUser) {
  return `${ROLE_LABELS[user.role]} ${shortName(user)}`;
}

export async function audit(actor: SessionUser | null, entry: AuditEntry, client: Client = db) {
  await client.auditLog.create({
    data: {
      actorId: actor?.id ?? null,
      actorLabel: actor ? actorLabel(actor) : "System",
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId ?? null,
      targetLabel: entry.targetLabel ?? null,
      message: entry.message,
      data: entry.data,
    },
  });
}
