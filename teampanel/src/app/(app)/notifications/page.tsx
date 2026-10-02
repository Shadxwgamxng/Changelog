import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtRelative } from "@/lib/dates";
import { NOTIFICATION_TYPE_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { NotificationBulkActions, NotificationLink } from "@/components/features/notification-actions";

export const metadata: Metadata = { title: "Benachrichtigungen" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  const unread = items.filter((n) => !n.readAt).length;

  return (
    <>
      <PageHeader eyebrow="Postfach" title="Benachrichtigungen" subtitle={unread ? `${unread} ungelesen` : "Alles gelesen"} actions={<NotificationBulkActions unread={unread} hasRead={items.some((n) => n.readAt)} />} />
      <Card>
        {items.length === 0 ? (
          <EmptyState icon={<Bell className="h-8 w-8" />} title="Keine Benachrichtigungen">
            Neue Termine, wichtige Ankündigungen und Erinnerungen erscheinen hier.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((n) => (
              <li key={n.id} className={n.readAt ? "" : "bg-accent-900/20"}>
                <NotificationLink id={n.id} href={n.href} unread={!n.readAt}>
                  <div className="flex items-start gap-3 px-4 py-3.5 hover:bg-elevated sm:px-5">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-accent-400"}`} aria-label={n.readAt ? undefined : "Ungelesen"} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${n.readAt ? "text-muted" : "font-medium text-fg"}`}>{n.title}</p>
                      {n.body && <p className="mt-0.5 text-xs text-muted">{n.body}</p>}
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-subtle">
                        <Badge>{NOTIFICATION_TYPE_LABELS[n.type]}</Badge>
                        <span>{fmtRelative(n.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </NotificationLink>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
