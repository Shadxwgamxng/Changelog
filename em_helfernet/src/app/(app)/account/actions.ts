"use server";
import { redirect } from "next/navigation";
import { action, str } from "@/server/action";
import { beginTotpSetup, changePassword, confirmTotpSetup, disableTotp, regenerateIcalToken } from "@/server/auth";
import { currentToken } from "@/server/session";
import { badRequest } from "@/server/errors";

export const changePasswordAction = action(async (ctx, f) => {
  if (str(f, "next") !== str(f, "repeat")) throw badRequest("Die neuen Passwörter stimmen nicht überein.");
  await changePassword(ctx, String(f.get("current") ?? ""), String(f.get("next") ?? ""), await currentToken());
  redirect("/account?changed=1");
});
export const beginTotpAction = action(async (ctx) => { const r = await beginTotpSetup(ctx); return { ok: "Scanne den Code und bestätige ihn.", data: r }; });
export const confirmTotpAction = action(async (ctx, f) => { const codes = await confirmTotpSetup(ctx, str(f, "code")); return { ok: "2FA aktiviert.", data: { codes } }; });
export const disableTotpAction = action(async (ctx, f) => { await disableTotp(ctx, String(f.get("password") ?? "")); return "2FA deaktiviert."; });
export const icalTokenAction = action(async (ctx) => { await regenerateIcalToken(ctx); return "Neuer Kalender-Link erzeugt. Der alte Link funktioniert nicht mehr."; });
export const revokeSessionsAction = action(async (ctx) => { const t = await currentToken(); const { revokeAllSessions } = await import("@/server/auth"); await revokeAllSessions(ctx.userId, t); return "Alle anderen Geräte wurden abgemeldet."; });
