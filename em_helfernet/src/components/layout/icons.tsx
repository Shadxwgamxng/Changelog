import * as L from "lucide-react";
import type { ComponentType } from "react";

export function Icon({ name, className = "h-5 w-5", ...rest }: { name: string; className?: string } & Record<string, unknown>) {
  const C = ((L as unknown as Record<string, ComponentType<{ className?: string }>>)[name] ?? L.Circle) as ComponentType<{ className?: string }>;
  return <C className={className} aria-hidden {...rest} />;
}
