import type { ReactNode } from "react";
import { cn } from "./cn";

export type Tone = "neutral" | "accent" | "ok" | "warn" | "danger" | "info";

const tones: Record<Tone, string> = {
  neutral: "border-line bg-elevated text-muted",
  accent: "border-accent-600/50 bg-accent-900/60 text-accent-300",
  ok: "border-ok/30 bg-ok/10 text-ok",
  warn: "border-warn/30 bg-warn/10 text-warn",
  danger: "border-danger/30 bg-danger/10 text-danger",
  info: "border-info/30 bg-info/10 text-info",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}
