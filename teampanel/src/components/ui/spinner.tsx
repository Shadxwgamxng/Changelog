import { Loader2 } from "lucide-react";

export function Spinner({ label = "Lädt …" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted" role="status">
      <Loader2 className="h-5 w-5 animate-spin text-accent-500" aria-hidden />
      {label}
    </div>
  );
}
