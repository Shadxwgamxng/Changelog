declare global { interface Window { CBRN_CONFIG?: { apiBase?: string; wsUrl?: string; tileUrl?: string; tileAttribution?: string } } }
export const cfg = () => window.CBRN_CONFIG ?? {};
const KEY = 'cbrn.session';
export const getToken = (): string | null => { try { return localStorage.getItem(KEY); } catch { return null; } };
export const setToken = (t: string | null) => { try { if (t) localStorage.setItem(KEY, t); else localStorage.removeItem(KEY); } catch { /* ignore */ } };
export const url = (p: string) => (cfg().apiBase ?? '') + p;

export class AuthError extends Error {}
export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const r = await fetch(url('/api' + path), {
    method: opts.method ?? 'GET',
    headers: { 'content-type': 'application/json', 'x-session': getToken() ?? '' },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && !path.startsWith('/auth/login')) { window.dispatchEvent(new Event('cbrn-auth-lost')); throw new AuthError(j.error ?? 'Nicht angemeldet'); }
  if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
  return j as T;
}
