"use client";

import { useEffect } from "react";

/** Registriert den Service Worker (nur in Produktion; erfordert HTTPS oder localhost). */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  }, []);
  return null;
}
