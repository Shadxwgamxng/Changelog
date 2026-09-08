import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const styles = {
  brand: "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200",
  accent: "bg-accent-500/10 text-accent-600 dark:text-accent-500",
  gray: "bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200",
  green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

export function Badge({
  children,
  color = "brand",
  className,
}: {
  children: ReactNode;
  color?: keyof typeof styles;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
        styles[color],
        className,
      )}
    >
      {children}
    </span>
  );
}
