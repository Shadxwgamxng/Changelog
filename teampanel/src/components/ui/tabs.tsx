import Link from "next/link";
import { cn } from "./cn";

export interface TabItem {
  href: string;
  label: string;
  active: boolean;
  count?: number;
}

export function Tabs({ items, className }: { items: TabItem[]; className?: string }) {
  return (
    <nav className={cn("-mx-1 mb-5 flex gap-1 overflow-x-auto border-b border-line px-1", className)} aria-label="Bereiche">
      {items.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.active ? "page" : undefined}
          className={cn(
            "-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 font-display text-sm uppercase tracking-wider transition-colors",
            t.active ? "border-accent-500 text-fg" : "border-transparent text-muted hover:text-fg",
          )}
        >
          {t.label}
          {t.count !== undefined && <span className="ml-1.5 rounded bg-elevated px-1.5 py-0.5 text-[11px] text-muted">{t.count}</span>}
        </Link>
      ))}
    </nav>
  );
}
