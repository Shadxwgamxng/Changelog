import { requireCtx } from "@/server/session";
import { AppShell } from "@/components/layout/shell";
import { unreadNotificationCount } from "@/server/services/notifications";
import { unreadMessageCount } from "@/server/services/messages";
import { listAlerts } from "@/server/services/alerts";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireCtx();
  const [unread, unreadMessages, alerts] = await Promise.all([unreadNotificationCount(ctx), unreadMessageCount(ctx), listAlerts(ctx, 10)]);
  const open = alerts.filter((a) => a.status === "AKTIV" && (a.myResponse === "OFFEN" || a.myResponse === null)).length;
  return <AppShell ctx={ctx} unread={unread} unreadMessages={unreadMessages} activeAlerts={open}>{children}</AppShell>;
}
