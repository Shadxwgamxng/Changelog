declare global { interface Window { CBRN_CONFIG?: { tileUrl?: string; tileAttribution?: string } } }
export const cfg = () => window.CBRN_CONFIG ?? {};
const KEY = 'cbrn.session';
export const getToken = (): string | null => { try { return localStorage.getItem(KEY); } catch { return null; } };
export const setToken = (t: string | null) => { try { if (t) localStorage.setItem(KEY, t); else localStorage.removeItem(KEY); } catch { /* ignore */ } };
/** Dateien der Oberfläche (z. B. Kartenbild) relativ zur Seite auflösen – funktioniert in der NUI und im Entwickler-Testserver. */
export const url = (p: string) => p.replace(/^\//, '');

// ---- Transport: In FiveM läuft die Oberfläche in einem iframe der NUI-Hülle (web/index.html); Anfragen gehen per postMessage
// an die Hülle -> Lua-Client -> Server-Skript. Ohne Hülle (Entwickler-Testserver) per fetch/SSE.
const nui = window.parent !== window;
export const inNui = nui;
let seq = 0; const pending = new Map<number, (r: { status: number; text: string }) => void>(); const handlers = new Set<(e: any) => void>();
window.addEventListener('message', (m) => {
  const d = m.data; if (!d || typeof d !== 'object' || !d.cbrn) return;
  if (d.cbrn === 'res') { pending.get(d.id)?.(d); pending.delete(d.id); }
  else if (d.cbrn === 'evt') { try { const e = typeof d.data === 'string' ? JSON.parse(d.data) : d.data; handlers.forEach((h) => h(e)); } catch { /* ignore */ } }
});
async function transport(method: string, path: string, body: unknown, token: string | null): Promise<{ status: number; text: string }> {
  if (nui) return new Promise((resolve) => {
    const id = ++seq; pending.set(id, resolve);
    window.parent.postMessage({ cbrn: 'req', id, method, path, body: body ?? null, token: token ?? '' }, '*');
    setTimeout(() => { if (pending.delete(id)) resolve({ status: 504, text: '{"error":"Keine Antwort vom Server (Zeitüberschreitung)"}' }); }, 25000);
  });
  const r = await fetch('__api', { method: 'POST', body: JSON.stringify({ method, path, body: body ?? null, token: token ?? '' }) });
  return r.json();
}
/** Live-Ereignisse des Servers. Rückgabe: Abbestell-Funktion. onState meldet den Verbindungsstatus. */
export function subscribe(cb: (e: any) => void, onState: (up: boolean) => void): () => void {
  handlers.add(cb);
  if (nui) { onState(true); return () => { handlers.delete(cb); }; }
  const es = new EventSource('__events'); es.onopen = () => onState(true); es.onerror = () => onState(false); es.onmessage = (m) => { try { handlers.forEach((h) => h(JSON.parse(m.data))); } catch { /* ignore */ } };
  return () => { handlers.delete(cb); es.close(); };
}

export class AuthError extends Error {}
export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const r = await transport(opts.method ?? 'GET', '/api' + path, opts.body, getToken());
  let j: any = {}; try { j = JSON.parse(r.text); } catch { /* ignore */ }
  if (r.status === 401 && !path.startsWith('/auth/login')) { window.dispatchEvent(new Event('cbrn-auth-lost')); throw new AuthError(j.error ?? 'Nicht angemeldet'); }
  if (r.status < 200 || r.status >= 300) throw new Error(j.error ?? `Fehler ${r.status}`);
  return j as T;
}
