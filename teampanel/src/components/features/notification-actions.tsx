"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useRunAction } from "@/components/ui/use-action";
import { deleteReadNotifications, markAllNotificationsRead, markNotificationRead } from "@/server/actions/team";

export function NotificationBulkActions({ unread, hasRead }: { unread: number; hasRead: boolean }) {
  const { run, pending } = useRunAction();
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={pending || unread === 0} onClick={() => run(() => markAllNotificationsRead())}>
        Alle als gelesen markieren
      </Button>
      <Button size="sm" variant="ghost" disabled={pending || !hasRead} onClick={() => run(() => deleteReadNotifications())}>
        Gelesene löschen
      </Button>
    </div>
  );
}

/** Klick öffnet das Ziel und markiert die Benachrichtigung als gelesen. */
export function NotificationLink({ id, href, unread, children }: { id: string; href: string | null; unread: boolean; children: React.ReactNode }) {
  const router = useRouter();
  const { run } = useRunAction();
  const open = () => {
    if (unread) run(() => markNotificationRead(id), { success: undefined, refresh: false, onSuccess: () => href && router.push(href) });
    if (!unread && href) router.push(href);
    if (unread && !href) router.refresh();
  };
  return (
    <button type="button" onClick={open} className="block w-full text-left">
      {children}
    </button>
  );
}
