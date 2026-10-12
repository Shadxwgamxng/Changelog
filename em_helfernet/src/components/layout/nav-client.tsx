"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, Moon, PanelLeftClose, Sun } from "lucide-react";

export function NavLink({ href, label, count, tone, children }: { href: string; label: string; count?: number; tone?: "danger" | "accent"; children: ReactNode }) {
  const path = usePathname();
  const active = href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
  return (
    <Link href={href} aria-current={active ? "page" : undefined} title={label} className="nav-link" onClick={() => document.documentElement.classList.remove("is-nav-open")}>
      {children}
      <span className="nav-label flex-1 truncate">{label}</span>
      {count ? <span className={`nav-count rounded px-1.5 text-[11px] font-semibold ${tone === "danger" ? "bg-danger text-white" : "bg-brand-600 text-on-accent"}`}>{count}</span> : null}
    </Link>
  );
}

/** Desktop: Sidebar ein-/ausklappen. Mobil: Drawer öffnen. */
export function SidebarToggle() {
  const toggle = () => {
    const root = document.documentElement;
    if (window.matchMedia("(max-width: 900px)").matches) root.classList.toggle("is-nav-open");
    else {
      const on = root.classList.toggle("is-collapsed");
      try { localStorage.setItem("hxCollapsed", on ? "1" : "0"); } catch { /* privater Modus */ }
    }
  };
  return (
    <button type="button" onClick={toggle} className="btn btn-ghost !min-h-[32px] !w-8 !px-0" aria-label="Navigation ein-/ausklappen">
      <Menu className="h-[18px] w-[18px] md:hidden" aria-hidden /><PanelLeftClose className="hidden h-[18px] w-[18px] md:block" aria-hidden />
    </button>
  );
}

export function NavScrim() {
  return <div className="app-scrim" onClick={() => document.documentElement.classList.remove("is-nav-open")} aria-hidden />;
}

export function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => { setDark(getComputedStyle(document.documentElement).colorScheme === "dark"); }, []);
  return (
    <button type="button" className="btn btn-ghost !min-h-[32px] !w-8 !px-0" aria-label={dark ? "Helles Design" : "Dunkles Design"} title={dark ? "Helles Design" : "Dunkles Design"}
      onClick={() => {
        const next = dark ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        try { localStorage.setItem("hxTheme", next); } catch { /* privater Modus */ }
        setDark(!dark);
      }}>
      {dark ? <Sun className="h-[18px] w-[18px]" aria-hidden /> : <Moon className="h-[18px] w-[18px]" aria-hidden />}
    </button>
  );
}
