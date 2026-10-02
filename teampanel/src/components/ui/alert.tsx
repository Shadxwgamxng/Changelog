import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "./cn";

type Variant = "info" | "success" | "warning" | "danger";

const styles: Record<Variant, { box: string; icon: ReactNode }> = {
  info: { box: "border-info/30 bg-info/10 text-info", icon: <Info className="h-4 w-4" /> },
  success: { box: "border-ok/30 bg-ok/10 text-ok", icon: <CheckCircle2 className="h-4 w-4" /> },
  warning: { box: "border-warn/30 bg-warn/10 text-warn", icon: <AlertTriangle className="h-4 w-4" /> },
  danger: { box: "border-danger/40 bg-danger/10 text-danger", icon: <XCircle className="h-4 w-4" /> },
};

export function Alert({ variant = "info", title, children, className }: { variant?: Variant; title?: string; children?: ReactNode; className?: string }) {
  const s = styles[variant];
  return (
    <div role={variant === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-md border px-3 py-2.5 text-sm", s.box, className)}>
      <span className="mt-0.5 shrink-0">{s.icon}</span>
      <div className="min-w-0">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(title && "mt-0.5", "text-fg/90")}>{children}</div>}
      </div>
    </div>
  );
}
