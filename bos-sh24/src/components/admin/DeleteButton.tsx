"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function DeleteButton({
  url,
  confirmText = "Diesen Eintrag wirklich unwiderruflich löschen?",
  className,
  label,
}: {
  url: string;
  confirmText?: string;
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    if (!window.confirm(confirmText)) return;
    setLoading(true);
    const res = await fetch(url, { method: "DELETE" });
    setLoading(false);
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Löschen fehlgeschlagen.");
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-accent-500 hover:bg-accent-500/10 disabled:opacity-60", className)}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      {label ?? "Löschen"}
    </button>
  );
}
