// Discord-OAuth: /api/auth/discord/start?mode=login|link → Discord → /api/auth/discord/callback
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, env } from "@/server/env";
import { HttpError } from "@/server/errors";
import { discordAuthorizeUrl, discordEnabled, fetchDiscordProfile, linkDiscord, loginWithDiscord } from "@/server/discord";
import { clientMeta, getCtx } from "@/server/session";
import { randomToken, safeEqual } from "@/lib/crypto";

export const dynamic = "force-dynamic";
const STATE_COOKIE = "helfernet_discord_state";

const back = (path: string, params: Record<string, string>) => NextResponse.redirect(`${env.appUrl}${path}?${new URLSearchParams(params)}`, 303);

export async function GET(req: NextRequest, { params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  const jar = await cookies();
  if (!discordEnabled()) return back("/login", { error: "Discord-Login ist nicht eingerichtet." });

  if (step === "start") {
    const mode = req.nextUrl.searchParams.get("mode") === "link" ? "link" : "login";
    if (mode === "link" && !(await getCtx())) return back("/login", { error: "Bitte zuerst anmelden." });
    const state = `${mode}.${randomToken(24)}`;
    jar.set(STATE_COOKIE, state, { httpOnly: true, sameSite: "lax", secure: env.secureCookies, path: "/api/auth/discord", maxAge: 600 });
    return NextResponse.redirect(discordAuthorizeUrl(state), 303);
  }

  if (step !== "callback") return new NextResponse("Not found", { status: 404 });
  const expected = jar.get(STATE_COOKIE)?.value ?? "";
  jar.delete({ name: STATE_COOKIE, path: "/api/auth/discord" });
  const state = req.nextUrl.searchParams.get("state") ?? "";
  const code = req.nextUrl.searchParams.get("code");
  const mode = expected.startsWith("link.") ? "link" : "login";
  const errorPath = mode === "link" ? "/account" : "/login";
  if (!expected || !safeEqual(state, expected)) return back(errorPath, { error: "Die Discord-Anmeldung ist abgelaufen. Bitte erneut versuchen." });
  if (!code) return back(errorPath, { error: "Die Discord-Anmeldung wurde abgebrochen." });

  try {
    const profile = await fetchDiscordProfile(code);
    if (mode === "link") {
      const ctx = await getCtx();
      if (!ctx) return back("/login", { error: "Bitte zuerst anmelden." });
      await linkDiscord(ctx, profile);
      return back("/account", { discord: "verknuepft" });
    }
    const r = await loginWithDiscord(profile, await clientMeta());
    jar.set(COOKIE_NAME, r.token, { httpOnly: true, sameSite: "lax", secure: env.secureCookies, path: "/" });
    return NextResponse.redirect(`${env.appUrl}${r.status === "2fa" ? "/login/2fa" : "/"}`, 303);
  } catch (e) {
    return back(errorPath, { error: e instanceof HttpError ? e.message : "Die Discord-Anmeldung ist fehlgeschlagen." });
  }
}
