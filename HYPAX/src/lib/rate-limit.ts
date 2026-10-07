// Einfacher In-Memory-Limiter (pro Prozess). Für mehrere Instanzen durch Redis o. Ä. ersetzen.
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, max: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k);
    return { ok: true, retryAfterSec: 0 };
  }
  b.count++;
  return { ok: b.count <= max, retryAfterSec: Math.ceil((b.reset - now) / 1000) };
}

export function resetRateLimit(prefix?: string) {
  if (!prefix) return buckets.clear();
  for (const k of buckets.keys()) if (k.startsWith(prefix)) buckets.delete(k);
}
