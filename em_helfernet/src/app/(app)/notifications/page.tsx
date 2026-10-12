import Link from "next/link";
import { requireCtx } from "@/server/session";
import { listNotifications } from "@/server/services/notifications";
import { Card, Empty, PageHeader } from "@/components/ui";
import { ActionButton } from "@/components/forms";
import { fmtDateTime } from "@/lib/dates";
import { markAllAction, markOneAction } from "./actions";

export const metadata = { title: "Benachrichtigungen" };

export default async function NotificationsPage() {
  const ctx = await requireCtx();
  const list = await listNotifications(ctx, { take: 100 });
  return (
    <>
      <PageHeader title="Benachrichtigungen" actions={<><ActionButton action={markAllAction} small={false} label="Alle als gelesen markieren" /><Link href="/account#benachrichtigungen" className="btn">Einstellungen</Link></>} />
      {list.length === 0 ? <Empty title="Keine Benachrichtigungen" /> : (
        <Card pad={false}><ul className="divide-y divide-line">{list.map((n) => (
          <li key={n.id} className="flex items-start gap-3 px-4 py-3"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-brand-600"}`} /><div className="min-w-0 flex-1"><Link href={n.link ?? "#"} className={`block ${n.readAt ? "text-fg-muted" : "font-medium"}`}>{n.title}</Link>{n.body && <p className="text-sm text-fg-muted">{n.body}</p>}<p className="text-xs text-fg-subtle">{fmtDateTime(n.createdAt)}</p></div>{!n.readAt && <ActionButton action={markOneAction} fields={{ id: n.id }} variant="ghost" label="Gelesen" />}</li>
        ))}</ul></Card>
      )}
    </>
  );
}
