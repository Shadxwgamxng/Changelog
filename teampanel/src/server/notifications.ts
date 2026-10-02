import "server-only";
import type { NotificationType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { daysBetween, fmtDate } from "@/lib/dates";

type Client = Prisma.TransactionClient | typeof db;

export interface NotificationInput {
  type: NotificationType;
  title: string;
  body?: string;
  href?: string;
  dedupeKey?: string;
}

export async function notifyUsers(userIds: string[], n: NotificationInput, client: Client = db) {
  if (userIds.length === 0) return;
  await client.notification.createMany({
    data: userIds.map((userId) => ({ userId, type: n.type, title: n.title, body: n.body, href: n.href, dedupeKey: n.dedupeKey })),
    skipDuplicates: true,
  });
}

export async function notifyAllActive(n: NotificationInput, exceptUserId?: string, client: Client = db) {
  const users = await client.user.findMany({ where: { active: true, ...(exceptUserId ? { id: { not: exceptUserId } } : {}) }, select: { id: true } });
  await notifyUsers(users.map((u) => u.id), n, client);
}

const lastSync = new Map<string, number>();

/**
 * Erzeugt automatische Benachrichtigungen (Termin-Erinnerungen, fehlende Pflichtausrüstung).
 * Läuft lazy beim Seitenaufruf, max. alle 10 Minuten pro Benutzer; dedupeKey verhindert Doppelungen.
 */
export async function syncAutoNotifications(userId: string) {
  const now = Date.now();
  if (now - (lastSync.get(userId) ?? 0) < 10 * 60_000) return;
  lastSync.set(userId, now);

  const today = new Date();
  const horizon = new Date(now + 7 * 86_400_000);
  const events = await db.event.findMany({
    where: { startsAt: { gte: today, lte: horizon }, status: { in: ["PLANNED", "OPEN", "FULL"] } },
    select: { id: true, title: true, startsAt: true },
  });
  for (const e of events) {
    const days = daysBetween(today, e.startsAt);
    const when = days <= 0 ? "heute" : days === 1 ? "morgen" : `in ${days} Tagen`;
    await notifyUsers([userId], {
      type: "EVENT_REMINDER",
      title: `${e.title} am ${fmtDate(e.startsAt)} findet ${when} statt.`,
      href: `/events/${e.id}`,
      dedupeKey: `reminder:${e.id}`,
    });
  }

  const [requiredTotal, owned] = await Promise.all([
    db.equipment.count({ where: { required: true } }),
    db.userEquipment.count({ where: { userId, status: "OWNED", equipment: { required: true } } }),
  ]);
  const missing = requiredTotal - owned;
  if (missing > 0) {
    const week = Math.floor(now / (7 * 86_400_000));
    await notifyUsers([userId], {
      type: "EQUIPMENT_MISSING",
      title: "Dir fehlt noch vorgeschriebene Ausrüstung.",
      body: `${missing} von ${requiredTotal} Pflichtgegenständen fehlen noch.`,
      href: "/equipment",
      dedupeKey: `equipment-missing:${week}`,
    });
  }
}
