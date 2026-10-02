import type { Metadata } from "next";
import Link from "next/link";
import { Activity, CalendarDays, ClipboardList, ShoppingCart, TrendingUp, UserCheck, Users } from "lucide-react";
import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { fmtDate, fmtRelative } from "@/lib/dates";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { Tabs } from "@/components/ui/tabs";
import { adminTabs } from "@/components/features/admin-tabs";
import { countOpenRequirements } from "@/server/queries/equipment";

export const metadata: Metadata = { title: "Administration" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const user = await requirePagePermission("admin.dashboard", "members.viewAdmin");
  const now = new Date();

  const [total, active, upcoming, openRequirements, openShopping, past, activity] = await Promise.all([
    db.user.count({ where: { profile: { isNot: null } } }),
    db.user.count({ where: { active: true } }),
    db.event.count({ where: { startsAt: { gte: now }, status: { notIn: ["CANCELLED", "COMPLETED"] }, type: "SPIELTAG" } }),
    countOpenRequirements(),
    db.shoppingItem.count({ where: { status: "OPEN" } }),
    db.event.findMany({
      where: { startsAt: { lt: now }, status: { not: "CANCELLED" }, type: "SPIELTAG" },
      orderBy: { startsAt: "desc" },
      take: 6,
      include: { _count: { select: { attendances: { where: { status: "ACCEPTED" } } } } },
    }),
    can(user, "audit.view") ? db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }) : Promise.resolve([]),
  ]);

  const avg = past.length ? past.reduce((s, e) => s + e._count.attendances, 0) / past.length : 0;
  const avgPct = active ? Math.round((avg / active) * 100) : 0;
  const maxCount = Math.max(1, ...past.map((e) => e._count.attendances));

  return (
    <>
      <PageHeader eyebrow="Administration" title="Übersicht" />
      <Tabs items={adminTabs("overview", user)} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat label="Mitglieder gesamt" value={total} icon={<Users className="h-5 w-5" />} />
        <Stat label="Aktive Mitglieder" value={active} hint={`${total - active} inaktiv`} icon={<UserCheck className="h-5 w-5" />} />
        <Stat label="Kommende Spieltage" value={upcoming} icon={<CalendarDays className="h-5 w-5" />} />
        <Stat label="Ø Teilnahme" value={avg.toFixed(1).replace(".", ",")} hint={past.length ? `≈ ${avgPct} % der aktiven Mitglieder · letzte ${past.length} Spieltage` : "Noch keine abgeschlossenen Spieltage"} icon={<TrendingUp className="h-5 w-5" />} />
        <Link href="/admin/requirements" className="block focus-visible:rounded-lg">
          <Stat label="Offene Anforderungen" value={openRequirements} hint="Zugewiesene, noch nicht vorhandene Ausrüstung" icon={<ClipboardList className="h-5 w-5" />} />
        </Link>
        <Link href="/shopping/team" className="block focus-visible:rounded-lg">
          <Stat label="Offene Einkaufsartikel" value={openShopping} icon={<ShoppingCart className="h-5 w-5" />} />
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Teilnahme der letzten Spieltage" icon={<TrendingUp className="h-4 w-4" />} />
          {past.length === 0 ? (
            <EmptyState title="Noch keine Daten" />
          ) : (
            <ul className="space-y-3 p-4 sm:p-5">
              {past.map((e) => (
                <li key={e.id}>
                  <Link href={`/events/${e.id}`} className="block">
                    <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate">{e.title}</span>
                      <span className="shrink-0 text-xs text-muted">
                        {fmtDate(e.startsAt)} · <strong className="text-fg">{e._count.attendances}</strong>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-bg">
                      <div className="h-full rounded-full bg-accent-500" style={{ width: `${(e._count.attendances / maxCount) * 100}%` }} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {can(user, "audit.view") && (
          <Card>
            <CardHeader title="Letzte Aktivitäten" icon={<Activity className="h-4 w-4" />} action={<Link href="/admin/audit" className="text-xs text-accent-300 hover:underline">Alle</Link>} />
            {activity.length === 0 ? (
              <EmptyState title="Noch keine Aktivitäten" />
            ) : (
              <ul className="divide-y divide-line">
                {activity.map((a) => (
                  <li key={a.id} className="px-4 py-3 text-sm sm:px-5">
                    <p className="break-words">{a.message}</p>
                    <p className="mt-0.5 text-xs text-subtle">{fmtRelative(a.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
