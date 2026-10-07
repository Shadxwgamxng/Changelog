// Next.js-spezifische Sitzungshelfer (Cookies, Redirects). Fachlogik bleibt in auth.ts.
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, env } from "./env";
import { ctxFromToken, logout } from "./auth";
import type { Ctx } from "./context";

export async function clientMeta() {
  const h = await headers();
  const fwd = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || undefined;
  return { ip: fwd, userAgent: h.get("user-agent") ?? undefined };
}

export const getCtx = cache(async (): Promise<Ctx | null> => {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  return ctxFromToken(token, await clientMeta());
});

export async function requireCtx(): Promise<Ctx> {
  const ctx = await getCtx();
  if (!ctx) redirect("/login");
  if (ctx.mustChangePw) redirect("/account?force=1");
  return ctx;
}

/** Wie requireCtx, erlaubt aber den erzwungenen Passwortwechsel (für /account). */
export async function requireCtxAllowPwChange(): Promise<Ctx> {
  const ctx = await getCtx();
  if (!ctx) redirect("/login");
  return ctx;
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", secure: env.secureCookies, path: "/" });
}

export async function currentToken() {
  return (await cookies()).get(COOKIE_NAME)?.value;
}

export async function endSession() {
  const c = await cookies();
  await logout(c.get(COOKIE_NAME)?.value);
  c.delete(COOKIE_NAME);
}
