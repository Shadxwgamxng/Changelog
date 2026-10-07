// Benachrichtigungen: In-App (immer prüfbar), E-Mail und Web-Push – pro Benutzer und Typ konfigurierbar.
import type { NotificationType } from "@prisma/client";
import { prisma } from "./db";
import { sendMail } from "./mailer";
import { env } from "./env";
import { NOTIFICATION_DEFAULTS } from "@/lib/constants";

export interface NotifyInput {
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  /** Verhindert Doppelbenachrichtigungen (pro Benutzer eindeutig). */
  dedupeKey?: string;
}

export async function notifyUsers(userIds: string[], n: NotifyInput): Promise<number> {
  const ids = [...new Set(userIds)];
  if (!ids.length) return 0;
  const [users, prefs] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: ids }, active: true }, select: { id: true, email: true } }),
    prisma.notificationPreference.findMany({ where: { userId: { in: ids }, type: n.type } }),
  ]);
  const prefBy = new Map(prefs.map((p) => [p.userId, p]));
  let created = 0;
  for (const u of users) {
    const p = prefBy.get(u.id) ?? NOTIFICATION_DEFAULTS[n.type];
    if (p.inApp) {
      try {
        await prisma.notification.create({ data: { userId: u.id, type: n.type, title: n.title, body: n.body, link: n.link, dedupeKey: n.dedupeKey } });
        created++;
      } catch (e) {
        if ((e as { code?: string }).code === "P2002") continue; // Duplikat → bewusst überspringen
        throw e;
      }
    } else if (n.dedupeKey) {
      continue;
    }
    if (p.email) void sendMail(u.email, `[HYPAX] ${n.title}`, `${n.title}\n\n${n.body ?? ""}\n\n${n.link ? env.appUrl + n.link : env.appUrl}`);
    if (p.push) void sendPush(u.id, n);
  }
  return created;
}

/** Benachrichtigt die Benutzerkonten der angegebenen Helfer (Helfer ohne Konto werden übersprungen). */
export async function notifyHelpers(helperIds: string[], n: NotifyInput): Promise<number> {
  if (!helperIds.length) return 0;
  const rows = await prisma.helper.findMany({ where: { id: { in: helperIds }, userId: { not: null } }, select: { userId: true } });
  return notifyUsers(rows.map((r) => r.userId!), n);
}

/** Alle Benutzer, die `perm` in der Einheit besitzen (z. B. Dienstplaner einer Einheit). */
export async function usersWithPermission(perm: string, unitId: string): Promise<string[]> {
  const unit = await prisma.orgUnit.findUnique({ where: { id: unitId }, select: { path: true } });
  if (!unit) return [];
  const ancestors = unit.path.split("/").filter(Boolean);
  const rows = await prisma.roleAssignment.findMany({
    where: {
      OR: [{ unitId, scope: "UNIT" }, { unitId: { in: ancestors }, scope: "SUBTREE" }],
      user: { active: true },
    },
    include: { role: true },
  });
  return [...new Set(rows.filter((a) => (a.role.permissions.includes(perm) || a.grants.includes(perm)) && !a.denies.includes(perm)).map((a) => a.userId))];
}

async function sendPush(userId: string, n: NotifyInput) {
  const vapid = env.vapid;
  if (!vapid) return;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (!subs.length) return;
  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  const payload = JSON.stringify({ title: n.title, body: n.body ?? "", url: n.link ?? "/" });
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
      }
    }),
  );
}
