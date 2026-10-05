// Minimaler Router: bildet die von routes.ts benötigte Fastify-Teilmenge ab, ohne HTTP-Server.
// Die Anfragen kommen im FiveM-Betrieb aus der NUI (über Client -> Server-Event), im Entwicklungsbetrieb per HTTP-Test-Server.
export interface Req { method: string; url: string; params: Record<string, string>; query: Record<string, string>; body: any; headers: Record<string, string> }
export interface Rep { code(n: number): Rep; header(k: string, v: string): Rep; statusCode: number; headers: Record<string, string> }
type Handler = (req: Req, rep: Rep) => unknown | Promise<unknown>;
type Hook = (req: Req) => unknown | Promise<unknown>;
interface Route { method: string; re: RegExp; keys: string[]; fn: Handler }

export class App {
  private routes: Route[] = []; private hooks: Hook[] = [];
  private add(method: string, pattern: string, fn: Handler) {
    const keys: string[] = []; const re = new RegExp('^' + pattern.replace(/:([a-zA-Z_]+)/g, (_m, k) => { keys.push(k); return '([^/]+)'; }) + '$');
    this.routes.push({ method, re, keys, fn });
  }
  get(p: string, fn: Handler) { this.add('GET', p, fn); }
  post(p: string, fn: Handler) { this.add('POST', p, fn); }
  patch(p: string, fn: Handler) { this.add('PATCH', p, fn); }
  put(p: string, fn: Handler) { this.add('PUT', p, fn); }
  delete(p: string, fn: Handler) { this.add('DELETE', p, fn); }
  addHook(_name: 'onRequest', fn: Hook) { this.hooks.push(fn); }

  async dispatch(method: string, fullUrl: string, body: any, headers: Record<string, string> = {}): Promise<{ status: number; body: any; headers: Record<string, string> }> {
    const u = new URL(fullUrl, 'http://local'); const path = u.pathname; const query: Record<string, string> = {}; u.searchParams.forEach((v, k) => (query[k] = v));
    const rep: Rep = { statusCode: 200, headers: {}, code(n) { this.statusCode = n; return this; }, header(k, v) { this.headers[k.toLowerCase()] = v; return this; } };
    try {
      const r = this.routes.find((x) => x.method === method && x.re.test(path));
      const req: Req = { method, url: fullUrl, params: {}, query, body: body ?? {}, headers };
      for (const h of this.hooks) await h(req);
      if (!r) return { status: 404, body: { error: 'Nicht gefunden' }, headers: {} };
      const m = r.re.exec(path)!; r.keys.forEach((k, i) => (req.params[k] = decodeURIComponent(m[i + 1])));
      const out = await r.fn(req, rep);
      return { status: rep.statusCode, body: out === undefined ? {} : out, headers: rep.headers };
    } catch (e: any) {
      return { status: e.statusCode ?? 500, body: { error: e.message }, headers: {} };
    }
  }
}
