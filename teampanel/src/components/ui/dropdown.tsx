"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreVertical } from "lucide-react";
import { cn } from "./cn";

/** Aktionsmenü (⋮). Positioniert sich fixed, damit es nicht von scrollenden Tabellen abgeschnitten wird. */
export function Dropdown({ children, label = "Aktionen" }: { children: ReactNode; label?: string }) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const open = pos !== null;

  useEffect(() => {
    if (!open) return;
    const close = () => setPos(null);
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={(e) => {
          if (open) return setPos(null);
          const r = e.currentTarget.getBoundingClientRect();
          const menuHeight = 200;
          const top = r.bottom + menuHeight > window.innerHeight ? Math.max(8, r.top - menuHeight) : r.bottom + 4;
          setPos({ top, right: Math.max(8, window.innerWidth - r.right) });
        }}
        className="rounded-md p-2 text-muted hover:bg-elevated hover:text-fg"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {pos && (
        <div
          role="menu"
          onClick={() => setPos(null)}
          style={{ top: pos.top, right: pos.right }}
          className="fixed z-50 min-w-52 animate-fade-in rounded-md border border-line bg-elevated p-1 shadow-xl"
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ children, onClick, danger }: { children: ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn("flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-surface", danger ? "text-danger" : "text-fg")}
    >
      {children}
    </button>
  );
}
