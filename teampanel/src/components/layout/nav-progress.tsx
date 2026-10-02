"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Dünner Ladebalken oben, sobald ein interner Link angeklickt wurde und die neue Seite noch lädt. */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [loading, setLoading] = useState(false);

  useEffect(() => setLoading(false), [pathname, search]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      setLoading(true);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  if (!loading) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[120] h-0.5 overflow-hidden bg-accent-900" role="progressbar" aria-label="Seite wird geladen">
      <div className="h-full w-1/3 animate-[nav-progress_1s_ease-in-out_infinite] bg-accent-400" />
    </div>
  );
}
