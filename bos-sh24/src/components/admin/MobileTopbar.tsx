"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import type { Role } from "@/lib/types";
import { Sidebar } from "./Sidebar";

export function MobileTopbar({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-ink-200 dark:border-ink-800 lg:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <span className="font-display text-sm font-extrabold text-ink-900 dark:text-white">BOS_SH24 Admin</span>
        <button onClick={() => setOpen((v) => !v)} aria-label="Menü" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-600 dark:text-ink-300">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="h-[calc(100vh-3.5rem)] border-t border-ink-200 dark:border-ink-800">
          <Sidebar role={role} mobile onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
