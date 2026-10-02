import type { ReactNode } from "react";

export function Stat({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="panel panel-tac p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="label-caps">{label}</p>
        {icon && <span className="text-accent-500">{icon}</span>}
      </div>
      <p className="mt-2 font-display text-3xl font-semibold text-fg">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
