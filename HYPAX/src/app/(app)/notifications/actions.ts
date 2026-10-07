"use server";
import { action, formObject, str } from "@/server/action";
import * as N from "@/server/services/notifications";

export const markAllAction = action(async (ctx) => { await N.markAllRead(ctx); return "Alle als gelesen markiert."; });
export const markOneAction = action(async (ctx, f) => { await N.markRead(ctx, str(f, "id")); });
export const savePrefsAction = action(async (ctx, f) => {
  const o = formObject(f);
  const types = String(o.types ?? "").split(",").filter(Boolean);
  await N.setPreferences(ctx, types.map((t) => ({ type: t, inApp: f.get(`${t}:inApp`) === "on", email: f.get(`${t}:email`) === "on", push: f.get(`${t}:push`) === "on" })));
  return "Einstellungen gespeichert.";
});
