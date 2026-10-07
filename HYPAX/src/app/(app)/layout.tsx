import { requireCtx } from "@/server/session";
import { AppShell } from "@/components/layout/shell";
import { unreadNotificationCount } from "@/server/services/notifications";
import { unreadMessageCount } from "@/server/services/messages";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireCtx();
  const [unread, unreadMessages] = await Promise.all([unreadNotificationCount(ctx), unreadMessageCount(ctx)]);
  return <AppShell ctx={ctx} unread={unread} unreadMessages={unreadMessages}>{children}</AppShell>;
}
