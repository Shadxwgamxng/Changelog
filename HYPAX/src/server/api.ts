// REST-API-Hilfen: Authentifizierung per Session-Cookie, CSRF-Schutz (Origin), einheitliche Fehler.
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { COOKIE_NAME, env } from "./env";
import { ctxFromToken } from "./auth";
import { HttpError, unauthorized } from "./errors";
import type { Ctx } from "./context";

export function json(data: unknown, init?: number | ResponseInit) {
  const body = JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? Number(v) : v));
  return new NextResponse(body, { ...(typeof init === "number" ? { status: init } : init), headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...(typeof init === "object" ? (init.headers as Record<string, string>) : {}) } });
}

export function errorResponse(e: unknown) {
  if (e instanceof HttpError) return json({ error: { code: e.code, message: e.message, details: e.details } }, e.status);
  if (e instanceof ZodError) return json({ error: { code: "validation", message: "Ungültige Eingabe", details: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })) } }, 400);
  console.error("[api]", e);
  return json({ error: { code: "internal", message: "Interner Fehler" } }, 500);
}

/** Zustandsändernde Anfragen müssen vom eigenen Origin kommen (Schutz gegen Cross-Site-Requests). */
export function assertSameOrigin(req: NextRequest) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") throw new HttpError(403, "Cross-Site-Anfrage abgelehnt.", "csrf");
  if (origin) {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    const o = new URL(origin);
    if (o.host !== host && o.origin !== env.appUrl) throw new HttpError(403, "Ungültiger Origin.", "csrf");
  } else if (!site) {
    // Weder Origin noch Fetch-Metadata: nur reine JSON-Clients zulassen (Browser-Formulare senden immer Origin)
    if (!(req.headers.get("content-type") ?? "").includes("application/json")) throw new HttpError(403, "Origin fehlt.", "csrf");
  }
}

export async function apiCtx(req: NextRequest): Promise<Ctx> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || undefined;
  const ctx = await ctxFromToken(token, { ip, userAgent: req.headers.get("user-agent") ?? undefined });
  if (!ctx) throw unauthorized();
  return ctx;
}
