import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon,
  color = "brand",
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  color?: "brand" | "accent" | "green" | "amber";
}) {
  const colors = {
    brand: "bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-300",
    accent: "bg-accent-500/10 text-accent-600",
    green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300",
  };

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-ink-200 bg-white p-5 shadow-card dark:border-ink-800 dark:bg-ink-900">
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", colors[color])}>{icon}</span>
      <div>
        <p className="font-display text-2xl font-extrabold text-ink-900 dark:text-white">{value}</p>
        <p className="text-sm text-ink-500 dark:text-ink-400">{label}</p>
      </div>
    </div>
  );
}
