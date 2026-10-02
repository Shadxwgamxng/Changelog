"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { Bell, CalendarDays, Crosshair, LayoutDashboard, LogOut, Megaphone, Menu, ShieldCheck, ShoppingCart, User, Users, X, type LucideIcon } from "lucide-react";
import { logout } from "@/server/actions/auth";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/components/ui/cn";
import { NavProgress } from "./nav-progress";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Auch bei Unterseiten aktiv (außer "/") */
  match?: string[];
}

const MAIN_NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/team", label: "Team", icon: Users },
  { href: "/events", label: "Spieltage", icon: Crosshair },
  { href: "/calendar", label: "Kalender", icon: CalendarDays },
  { href: "/equipment", label: "Ausrüstung", icon: ShieldCheck },
  { href: "/shopping", label: "Einkaufsliste", icon: ShoppingCart },
  { href: "/announcements", label: "Ankündigungen", icon: Megaphone },
  { href: "/profile", label: "Mein Profil", icon: User },
];

const ADMIN_ITEM: NavItem = { href: "/admin", label: "Administration", icon: ShieldCheck };

function isActive(pathname: string, item: NavItem) {
  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

interface AppShellProps {
  children: ReactNode;
  user: { name: string; shortName: string; roleLabel: string; avatarUrl: string | null };
  team: { name: string; logoUrl: string };
  showAdmin: boolean;
  unread: number;
}

export function AppShell({ children, user, team, showAdmin, unread }: AppShellProps) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const nav = showAdmin ? [...MAIN_NAV, ADMIN_ITEM] : MAIN_NAV;

  useEffect(() => setDrawer(false), [pathname]);
  useEffect(() => {
    document.documentElement.style.overflow = drawer ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [drawer]);

  const bottom = [MAIN_NAV[0]!, MAIN_NAV[2]!, MAIN_NAV[4]!, MAIN_NAV[6]!];

  const brand = (
    <Link href="/" className="flex items-center gap-3" aria-label="Zum Dashboard">
      <Image src={team.logoUrl} alt="" width={40} height={40} unoptimized className="h-10 w-10 rounded-full" priority />
      <span className="leading-tight">
        <span className="block font-display text-sm font-semibold uppercase tracking-[0.12em] text-fg">SH Airsoft Kommando</span>
        <span className="label-caps block text-accent-400">Team Panel</span>
      </span>
    </Link>
  );

  const bell = (
    <Link href="/notifications" className="relative rounded-md p-2 text-muted hover:bg-elevated hover:text-fg" aria-label={unread ? `Benachrichtigungen (${unread} ungelesen)` : "Benachrichtigungen"}>
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-bg">{unread > 99 ? "99+" : unread}</span>
      )}
    </Link>
  );

  const userBlock = (
    <div className="border-t border-line p-3">
      <div className="flex items-center gap-3 rounded-md px-2 py-2">
        <Avatar src={user.avatarUrl} name={user.shortName} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-fg">{user.name}</p>
          <p className="truncate text-xs text-muted">{user.roleLabel}</p>
        </div>
        <div className="hidden lg:block">{bell}</div>
      </div>
      <form action={logout} className="mt-1">
        <button type="submit" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted hover:bg-elevated hover:text-fg">
          <LogOut className="h-4 w-4" /> Abmelden
        </button>
      </form>
    </div>
  );

  const links = (onNavigate?: () => void) => (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4" aria-label="Hauptnavigation">
      {nav.map((item) => {
        const active = isActive(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-md border-l-2 px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "border-accent-500 bg-accent-900/40 text-fg" : "border-transparent text-muted hover:bg-elevated hover:text-fg",
            )}
          >
            <Icon className={cn("h-4 w-4", active ? "text-accent-400" : "text-subtle group-hover:text-muted")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh lg:pl-64">
      <Suspense fallback={null}>
        <NavProgress />
      </Suspense>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded focus:bg-accent-500 focus:px-3 focus:py-2 focus:text-bg">
        Zum Inhalt springen
      </a>

      {/* Desktop-Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-16 items-center border-b border-line px-5">{brand}</div>
        {links()}
        {userBlock}
      </aside>

      {/* Mobile Kopfzeile */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/95 px-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setDrawer(true)} className="rounded-md p-2 text-muted hover:bg-elevated hover:text-fg" aria-label="Menü öffnen">
            <Menu className="h-5 w-5" />
          </button>
          <Image src={team.logoUrl} alt="" width={32} height={32} unoptimized className="h-8 w-8 rounded-full" />
          <span className="font-display text-sm font-semibold uppercase tracking-[0.12em]">Team Panel</span>
        </div>
        {bell}
      </header>

      {/* Mobile Drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menü">
          <button type="button" className="absolute inset-0 bg-black/70" onClick={() => setDrawer(false)} aria-label="Menü schließen" />
          <div className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs animate-fade-in flex-col border-r border-line bg-surface">
            <div className="flex h-14 items-center justify-between border-b border-line px-4">
              {brand}
              <button type="button" onClick={() => setDrawer(false)} className="rounded p-1 text-subtle hover:text-fg" aria-label="Menü schließen">
                <X className="h-5 w-5" />
              </button>
            </div>
            {links(() => setDrawer(false))}
            {userBlock}
          </div>
        </div>
      )}

      <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
        {children}
      </main>

      {/* Mobile Tab-Leiste */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/95 backdrop-blur lg:hidden" aria-label="Schnellzugriff">
        {bottom.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center gap-0.5 py-2.5 text-[11px]", active ? "text-accent-400" : "text-muted")}>
              <Icon className="h-5 w-5" />
              {item.label === "Ankündigungen" ? "News" : item.label === "Dashboard" ? "Start" : item.label}
            </Link>
          );
        })}
        <button type="button" onClick={() => setDrawer(true)} className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] text-muted">
          <Menu className="h-5 w-5" />
          Mehr
        </button>
      </nav>
    </div>
  );
}
