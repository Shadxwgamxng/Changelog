import Link from "next/link";
import { Bell, LogOut, Search, ShieldAlert, UserRound, Settings } from "lucide-react";
import type { Ctx } from "@/server/context";
import { navItems } from "./nav";
import { Icon } from "./icons";
import { NavLink, NavScrim, SidebarToggle, ThemeToggle } from "./nav-client";
import { logoutAction } from "@/app/(auth)/login/actions";
import { Avatar } from "@/components/ui";
import { BrandFooter, EfMark } from "@/components/brand";

export function AppShell({ ctx, unread, unreadMessages, children, activeAlerts }: { ctx: Ctx; unread: number; unreadMessages: number; children: React.ReactNode; activeAlerts: number }) {
  const items = navItems(ctx);
  const groups = [...new Set(items.map((i) => i.group))];
  const name = ctx.helperName ?? ctx.email;
  return (
    <div className="app-shell">
      <header className="app-topbar no-print">
        <SidebarToggle />
        <Link href="/" className="flex items-center gap-2 pr-2" aria-label="HYPAX Startseite">
          <EfMark className="h-4 w-7 text-brand-600" label="EmergencyForge" />
          <span className="hidden text-sm font-semibold tracking-tight text-fg sm:inline">HYPAX</span>
        </Link>
        <form action="/search" role="search" className="relative mx-auto min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <input name="q" type="search" placeholder="Suchen …" aria-label="Globale Suche" className="input !min-h-[32px] !pl-8" />
        </form>
        {activeAlerts > 0 && <Link href="/alerts" className="badge badge-danger hidden sm:inline-flex"><ShieldAlert className="h-3 w-3" aria-hidden /> Alarmierung aktiv</Link>}
        <ThemeToggle />
        <Link href="/notifications" className="btn btn-ghost relative !min-h-[32px] !w-8 !px-0" aria-label={`Benachrichtigungen${unread ? `, ${unread} ungelesen` : ""}`}>
          <Bell className="h-[18px] w-[18px]" aria-hidden />
          {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-on-accent">{unread > 99 ? "99+" : unread}</span>}
        </Link>
        <details className="relative">
          <summary className="flex h-8 items-center gap-2 rounded-md px-1 hover:bg-fill-2" aria-label="Benutzermenü"><Avatar name={name} size={24} /><span className="hidden max-w-[10rem] truncate text-[13px] text-fg-muted lg:inline">{name}</span></summary>
          <div className="absolute right-0 z-[130] mt-1.5 w-56 rounded-lg border border-line bg-surface p-1 shadow-pop">
            <p className="truncate px-2.5 pt-1.5 text-[13px] font-medium">{name}</p>
            <p className="truncate px-2.5 pb-1.5 text-xs text-fg-subtle">{ctx.email}</p>
            <div className="my-1 border-t border-line" />
            {ctx.helperId && <Link href={`/helpers/${ctx.helperId}`} className="nav-link"><UserRound aria-hidden />Mein Profil</Link>}
            <Link href="/account" className="nav-link"><Settings aria-hidden />Konto & Sicherheit</Link>
            <form action={logoutAction}><button className="nav-link w-full text-danger"><LogOut aria-hidden />Abmelden</button></form>
          </div>
        </details>
      </header>

      <aside className="app-sidebar no-print" aria-label="Navigation">
        <nav aria-label="Hauptnavigation" className="flex flex-col gap-0.5 p-2">
          {groups.map((g) => (
            <div key={g} className="mb-2">
              <p className="nav-group px-2 pb-1 pt-2 text-xs font-medium text-fg-subtle">{g}</p>
              {items.filter((i) => i.group === g).map((i) => (
                <NavLink key={i.href} href={i.href} label={i.label} count={i.href === "/messages" ? unreadMessages : i.href === "/alerts" ? activeAlerts : undefined} tone={i.href === "/alerts" ? "danger" : "accent"}>
                  <Icon name={i.icon} />
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="nav-foot space-y-3 px-4 pb-4"><p className="text-[11px] leading-snug text-fg-subtle">Zugriffe auf sensible Daten werden protokolliert.</p><BrandFooter compact /></div>
      </aside>
      <NavScrim />

      <main id="main" className="app-main">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">{children}</div>
      </main>
    </div>
  );
}
