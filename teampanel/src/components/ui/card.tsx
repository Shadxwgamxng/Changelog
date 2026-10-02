import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export function Card({ className, tactical = false, ...rest }: HTMLAttributes<HTMLDivElement> & { tactical?: boolean }) {
  return <div className={cn("panel", tactical && "panel-tac", className)} {...rest} />;
}

export function CardHeader({ title, action, icon, className }: { title: ReactNode; action?: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5", className)}>
      <h2 className="flex items-center gap-2 font-display text-sm font-medium uppercase tracking-[0.12em] text-fg">
        {icon && <span className="text-accent-400">{icon}</span>}
        {title}
      </h2>
      {action}
    </div>
  );
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 sm:p-5", className)} {...rest} />;
}
