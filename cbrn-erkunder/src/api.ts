declare global { interface Window { CBRN_CONFIG?: { apiBase?: string; wsUrl?: string; tileUrl?: string; tileAttribution?: string } } }
export const cfg = () => window.CBRN_CONFIG ?? {};
export const userId = () => { try { return localStorage.getItem('cbrn.user') ?? 'u-tf'; } catch { return 'u-tf'; } };
export const setUserId = (id: string) => { try { localStorage.setItem('cbrn.user', id); } catch { /* ignore */ } };
export const url = (p: string) => (cfg().apiBase ?? '') + p;

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const r = await fetch(url('/api' + path), {
    method: opts.method ?? 'GET',
    headers: { 'content-type': 'application/json', 'x-user-id': userId() },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
  return j as T;
}
