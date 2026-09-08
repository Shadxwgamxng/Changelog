"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { Menu, X, Search, ShieldCheck, User, LogOut, LayoutDashboard, Bookmark } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { SearchBox } from "./SearchBox";
import { cn, initials } from "@/lib/utils";
import { can } from "@/lib/permissions";

const NAV = [
  { href: "/", label: "Startseite" },
  { href: "/beitraege", label: "Neueste Beiträge" },
  { href: "/veranstaltungen", label: "Veranstaltungen" },
  { href: "/ueber-uns", label: "Über uns" },
  { href: "/kontakt", label: "Kontakt" },
];

export function Header({ siteName }: { siteName: string }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    setSearchOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-ink-200 bg-white/85 backdrop-blur dark:border-ink-800 dark:bg-ink-950/85">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight text-ink-900 dark:text-white">
            {siteName}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-white",
                pathname === item.href && "bg-ink-100 text-ink-900 dark:bg-ink-800 dark:text-white",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden flex-1 max-w-xs lg:block">
          <SearchBox />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            aria-label="Suche öffnen"
            onClick={() => setSearchOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800 lg:hidden"
          >
            <Search className="h-[18px] w-[18px]" />
          </button>
          <ThemeToggle />

          {session ? (
            <div className="relative hidden lg:block">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-ink-200 py-1 pl-1 pr-3 text-sm font-medium text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-200">
                  {initials(session.user.name ?? session.user.username)}
                </span>
                {session.user.name?.split(" ")[0]}
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-ink-200 bg-white p-1.5 shadow-soft dark:border-ink-700 dark:bg-ink-900">
                  <Link href="/profil" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800">
                    <User className="h-4 w-4" /> Mein Profil
                  </Link>
                  <Link href="/profil/favoriten" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800">
                    <Bookmark className="h-4 w-4" /> Gespeicherte Beiträge
                  </Link>
                  {can.accessAdmin(session.user.role) && (
                    <Link href="/admin" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800">
                      <LayoutDashboard className="h-4 w-4" /> Admin-Dashboard
                    </Link>
                  )}
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-accent-500 hover:bg-ink-100 dark:hover:bg-ink-800"
                  >
                    <LogOut className="h-4 w-4" /> Abmelden
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 lg:inline-flex"
            >
              Login
            </Link>
          )}

          <button
            aria-label="Menü öffnen"
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800 lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-ink-200 p-3 dark:border-ink-800 lg:hidden">
          <SearchBox autoFocus />
        </div>
      )}

      {open && (
        <div className="border-t border-ink-200 dark:border-ink-800 lg:hidden">
          <nav className="container-page flex flex-col gap-1 py-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800",
                  pathname === item.href && "bg-ink-100 dark:bg-ink-800",
                )}
              >
                {item.label}
              </Link>
            ))}
            <div className="my-1 h-px bg-ink-200 dark:bg-ink-800" />
            {session ? (
              <>
                <Link href="/profil" className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800">Mein Profil</Link>
                <Link href="/profil/favoriten" className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800">Gespeicherte Beiträge</Link>
                {can.accessAdmin(session.user.role) && (
                  <Link href="/admin" className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800">Admin-Dashboard</Link>
                )}
                <button onClick={() => signOut({ callbackUrl: "/" })} className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-accent-500 hover:bg-ink-100 dark:hover:bg-ink-800">Abmelden</button>
              </>
            ) : (
              <div className="flex gap-2 px-3 pt-1">
                <Link href="/login" className="flex-1 rounded-lg bg-brand-600 px-4 py-2.5 text-center text-sm font-medium text-white">Login</Link>
                <Link href="/registrieren" className="flex-1 rounded-lg border border-ink-300 px-4 py-2.5 text-center text-sm font-medium text-ink-700 dark:border-ink-600 dark:text-ink-200">Registrieren</Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
