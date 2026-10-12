import type { NotificationType } from "@prisma/client";
import { prisma } from "../db";
import { badRequest } from "../errors";
import type { Ctx } from "../context";
import { NOTIFICATION_DEFAULTS, NOTIFICATION_TYPE_LABEL } from "@/lib/constants";

export async function listNotifications(ctx: Ctx, opts: { unreadOnly?: boolean; take?: number } = {}) {
  return prisma.notification.findMany({ where: { userId: ctx.userId, ...(opts.unreadOnly ? { readAt: null } : {}) }, orderBy: { createdAt: "desc" }, take: opts.take ?? 50 });
}
export const unreadNotificationCount = (ctx: Ctx) => prisma.notification.count({ where: { userId: ctx.userId, readAt: null } });
export async function markRead(ctx: Ctx, id: string) {
  await prisma.notification.updateMany({ where: { id, userId: ctx.userId, readAt: null }, data: { readAt: new Date() } });
}
export async function markAllRead(ctx: Ctx) {
  await prisma.notification.updateMany({ where: { userId: ctx.userId, readAt: null }, data: { readAt: new Date() } });
}

export async function getPreferences(ctx: Ctx) {
  const rows = await prisma.notificationPreference.findMany({ where: { userId: ctx.userId } });
  const by = new Map(rows.map((r) => [r.type, r]));
  return (Object.keys(NOTIFICATION_TYPE_LABEL) as NotificationType[]).filter((t) => t !== "ALARM").map((type) => ({ type, label: NOTIFICATION_TYPE_LABEL[type], ...(by.get(type) ?? NOTIFICATION_DEFAULTS[type]) }));
}

export async function setPreferences(ctx: Ctx, prefs: { type: string; inApp: boolean; email: boolean }[]) {
  for (const p of prefs) {
    if (!(p.type in NOTIFICATION_TYPE_LABEL)) throw badRequest("Unbekannter Benachrichtigungstyp.");
    await prisma.notificationPreference.upsert({
      where: { userId_type: { userId: ctx.userId, type: p.type as NotificationType } },
      create: { userId: ctx.userId, type: p.type as NotificationType, inApp: p.inApp, email: p.email },
      update: { inApp: p.inApp, email: p.email },
    });
  }
}

