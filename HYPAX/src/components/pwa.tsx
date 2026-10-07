"use client";
import { useEffect, useState } from "react";

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}

/** Push-Benachrichtigungen für dieses Gerät ein-/ausschalten. */
export function PushToggle({ publicKey }: { publicKey: string | null }) {
  const [state, setState] = useState<"unsupported" | "off" | "on" | "denied" | "busy">("off");
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !publicKey) { setState("unsupported"); return; }
    if (Notification.permission === "denied") { setState("denied"); return; }
    navigator.serviceWorker.getRegistration().then((r) => r?.pushManager.getSubscription()).then((s) => setState(s ? "on" : "off")).catch(() => setState("off"));
  }, [publicKey]);

  async function toggle() {
    setState("busy");
    try {
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await fetch("/api/v1/me/push", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: existing.endpoint }) });
        await existing.unsubscribe();
        setState("off");
        return;
      }
      if ((await Notification.requestPermission()) !== "granted") { setState("denied"); return; }
      const key = Uint8Array.from(atob(publicKey!.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      const res = await fetch("/api/v1/me/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      setState(res.ok ? "on" : "off");
    } catch { setState("off"); }
  }

  if (state === "unsupported") return <p className="text-sm text-fg-muted">Push ist auf diesem Gerät oder Server nicht eingerichtet. In-App- und E-Mail-Benachrichtigungen funktionieren trotzdem.</p>;
  if (state === "denied") return <p className="text-sm text-warn">Push wurde im Browser blockiert. Erlaube Benachrichtigungen in den Browser-Einstellungen.</p>;
  return <button type="button" onClick={toggle} disabled={state === "busy"} className="btn">{state === "on" ? "Push auf diesem Gerät deaktivieren" : "Push auf diesem Gerät aktivieren"}</button>;
}
