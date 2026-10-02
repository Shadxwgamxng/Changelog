import "server-only";
import { db } from "./db";

export interface RateLimitOptions {
  max: number;
  windowMs: number;
  blockMs: number;
}

export const LOGIN_LIMIT: RateLimitOptions = { max: 8, windowMs: 15 * 60_000, blockMs: 15 * 60_000 };
export const SENSITIVE_LIMIT: RateLimitOptions = { max: 5, windowMs: 60 * 60_000, blockMs: 60 * 60_000 };

/** Sekunden bis zur Freigabe, 0 wenn nicht gesperrt. */
export async function blockedFor(key: string): Promise<number> {
  const row = await db.rateLimit.findUnique({ where: { key } });
  if (!row?.blockedUntil) return 0;
  const left = row.blockedUntil.getTime() - Date.now();
  return left > 0 ? Math.ceil(left / 1000) : 0;
}

/** Zählt einen Versuch; sperrt bei Überschreitung. */
export async function registerAttempt(key: string, opts: RateLimitOptions) {
  const now = new Date();
  const existing = await db.rateLimit.findUnique({ where: { key } });
  const expired = !existing || now.getTime() - existing.windowStart.getTime() > opts.windowMs;
  if (expired) {
    await db.rateLimit.upsert({
      where: { key },
      create: { key, count: 1, windowStart: now },
      update: { count: 1, windowStart: now, blockedUntil: null },
    });
    return;
  }
  const updated = await db.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
  if (updated.count >= opts.max) {
    await db.rateLimit.update({ where: { key }, data: { blockedUntil: new Date(now.getTime() + opts.blockMs) } });
  }
}

export async function clearAttempts(key: string) {
  await db.rateLimit.deleteMany({ where: { key } });
}

export function formatWait(seconds: number) {
  const minutes = Math.ceil(seconds / 60);
  return minutes <= 1 ? "einer Minute" : `${minutes} Minuten`;
}
