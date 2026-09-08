"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Newspaper, CalendarDays, Tags, Image as ImageIcon,
  Users, Mail, Settings, Send, ArrowLeftCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";
import { can } from "@/lib/permissions";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  show: (role: Role) => boolean;
}

const NAV: NavItem[] = [
  { href: "/admin", label: "Übersicht", icon: LayoutDashboard, show: () => true },
  { href: "/admin/beitraege", label: "Beiträge", icon: Newspaper, show: (r) => can.createPosts(r) },
  { href: "/admin/veranstaltungen", label: "Veranstaltungen", icon: CalendarDays, show: (r) => can.manageEvents(r) },
  { href: "/admin/kategorien", label: "Kategorien", icon: Tags, show: (r) => can.manageCategories(r) },
  { href: "/admin/medien", label: "Medienbibliothek", icon: ImageIcon, show: (r) => can.manageMedia(r) },
  { href: "/admin/benutzer", label: "Benutzer", icon: Users, show: (r) => can.manageUsers(r) },
  { href: "/admin/kontaktanfragen", label: "Kontaktanfragen", icon: Mail, show: (r) => can.manageContact(r) },
  { href: "/admin/newsletter", label: "Newsletter", icon: Send, show: (r) => can.manageSettings(r) },
  { href: "/admin/einstellungen", label: "Einstellungen", icon: Settings, show: (r) => can.manageSettings(r) },
];

export function Sidebar({ role, mobile, onNavigate }: { role: Role; mobile?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className={cn("flex h-full flex-col", mobile ? "" : "w-64 shrink-0 border-r border-ink-200 dark:border-ink-800")}>
      <div className="flex h-16 items-center gap-2 border-b border-ink-200 px-5 dark:border-ink-800">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">B</span>
        <span className="font-display text-sm font-extrabold text-ink-900 dark:text-white">BOS_SH24 Admin</span>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV.filter((item) => item.show(role)).map((item) => {
          const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800",
                active && "bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-ink-200 p-3 dark:border-ink-800">
        <Link href="/" className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800">
          <ArrowLeftCircle className="h-4 w-4" /> Zurück zur Website
        </Link>
      </div>
    </div>
  );
}
