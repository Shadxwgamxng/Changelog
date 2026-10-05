// Entwickler-Testserver (NICHT für den Spielbetrieb): bedient die NUI-Oberfläche im Browser, ohne FiveM.
// Anfragen: POST /__api, Ereignisse: GET /__events (SSE). Optional DEV_SIM=1: simulierte FiveM-Telemetrie.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { boot } from './core.js';
import { bus, ingestFivem } from './sim.js';
import { list } from './db.js';
import { providers, startService, take, giveBack, action, heldBy, publicState, defsFor, publicInventory, releaseAll } from './hdev/service.js';
import { addSource, clearSources, envAt } from './hdev/env.js';
import { createSample, labelSample, storeSample, applySampleConfig } from './samples.js';

const root = path.resolve(process.cwd(), 'resource', 'cbrn-erkunder');
const appDir = path.join(root, 'app');
const app = await boot({ dbFile: process.env.DB_FILE ?? path.resolve(process.cwd(), 'data', 'dev.db'), wasmFile: path.join(root, 'server', 'sql-wasm.wasm') });
const MIME: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };
const clients = new Set<http.ServerResponse>();
// ---- Handmessgeräte im Entwicklungsserver: ein Testspieler (src 1), Position frei setzbar
let devPos = { x: 0, y: 0, z: 30 }; const devPlayer = { src: 1, license: 'license:dev', name: 'Max Muster' };
const sse = (o: any) => { const m = `data: ${JSON.stringify(o)}\n\n`; for (const c of clients) c.write(m); };
providers.pos = () => devPos; providers.alive = () => true; providers.vehicleAt = () => (list('vehicles')[0] as any)?.id ?? null; providers.notify = (_s, st) => sse({ type: 'hdev', state: st });
startService();
bus.on('event', (e) => { const m = `data: ${JSON.stringify(e)}\n\n`; for (const c of clients) c.write(m); });

http.createServer(async (req, res) => {
  const u = new URL(req.url ?? '/', 'http://x');
  if (req.method === 'POST' && u.pathname === '/__api') {
    let b = ''; for await (const c of req) b += c; const j = JSON.parse(b || '{}');
    const r = await app.dispatch(j.method, j.path, j.body, { 'x-session': j.token ?? '' });
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ status: r.status, text: JSON.stringify(r.body) })); return;
  }
  // Nur Entwicklung: eine Probe wie im Spiel erzeugen (entnehmen -> beschriften -> einlagern) – nutzt denselben Sample Service
  if (req.method === 'POST' && u.pathname === '/__dev/sample') {
    let b = ''; for await (const c of req) b += c; const j = JSON.parse(b || '{}'); applySampleConfig({ analysisDurations: { CHEMICAL: 6000, RADIOLOGICAL: 6000, BIOLOGICAL: 8000, GENERAL: 4000 } });
    try { const s = createSample({ source: j.source ?? 'unbekannte Flüssigkeit', type: j.type ?? 'FLUESSIGKEIT', description: j.description ?? '', by: 'Max Muster', license: 'license:dev', pos: { x: j.x ?? 195, y: j.y ?? -934, z: 30 }, vehicleId: j.vehicle ?? 'FFW-11-71-01', model: 'dev', offset: { x: 0, y: -3, z: 0.5 } });
      labelSample(s.id, j.label ?? 'Unbekannte Flüssigkeit', j.info ?? 'Fahrbahnrand', 'Max Muster'); if (j.store !== false) storeSample(s.id, 'Max Muster');
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ id: s.id })); } catch (e: any) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
    return;
  }
  if (req.method === 'POST' && u.pathname === '/__dev/hdev') {
    let b = ''; for await (const c of req) b += c; const j = JSON.parse(b || '{}'); const out = (o: any, code = 200) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    try {
      if (j.op === 'take') { const i = take(devPlayer, 'net:1', providers.vehicleAt(devPos), 1, j.type); return out({ def: defsFor(i.type), state: publicState(i) }); }
      if (j.op === 'return') { giveBack(devPlayer, 'net:1', 1); sse({ type: 'hdev-close' }); return out({ ok: true }); }
      if (j.op === 'action') { const r = action(1, j.act, j.payload ?? {}); return out({ ok: true, id: (r as any)?.id }); }
      if (j.op === 'pos') { devPos = { x: +j.x, y: +j.y, z: +(j.z ?? 30) }; return out({ ok: true }); }
      if (j.op === 'source') { return out(addSource('dev', { ...j.source, x: j.source.x ?? devPos.x, y: j.source.y ?? devPos.y, z: j.source.z ?? devPos.z })); }
      if (j.op === 'clear') return out({ n: clearSources('dev') });
      if (j.op === 'env') return out(envAt(devPos));
      if (j.op === 'inventory') return out(publicInventory('net:1', providers.vehicleAt(devPos), 1, 1));
      if (j.op === 'state') { const i = heldBy(1)[0]; return out(i ? publicState(i) : null); }
      if (j.op === 'drop') { releaseAll(1, 'dead'); return out({ ok: true }); }
      return out({ error: 'op?' }, 400);
    } catch (e: any) { return out({ error: e.message }, 409); }
  }
  if (u.pathname === '/__events') { res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' }); res.write(':ok\n\n'); clients.add(res); req.on('close', () => clients.delete(res)); return; }
  if (u.pathname.startsWith('/web/')) { const wf = path.join(root, path.normalize(u.pathname)); if (wf.startsWith(path.join(root, 'web')) && fs.existsSync(wf)) { res.writeHead(200, { 'content-type': MIME[path.extname(wf)] ?? 'application/octet-stream' }); fs.createReadStream(wf).pipe(res); return; } }
  if (u.pathname.startsWith('/app/')) u.pathname = u.pathname.slice(4);
  if (u.pathname === '/devui') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(fs.readFileSync(path.join(root, 'web', 'devtest.html'))); return; }
  let f = path.join(appDir, u.pathname === '/' ? 'index.html' : path.normalize(u.pathname)); if (!f.startsWith(appDir) || !fs.existsSync(f)) f = path.join(appDir, 'index.html');
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] ?? 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(+(process.env.PORT ?? 3001), () => console.log(`Entwickler-Testserver: http://localhost:${process.env.PORT ?? 3001}`));

if (process.env.DEV_SIM === '1') {
  let t = 0; // Fahrzeug 1 fährt eine Runde um Legion Square (Spielkoordinaten)
  setInterval(() => { t += 0.05; const v = list('vehicles')[0]; if (!v) return;
    ingestFivem({ vehicle: v.id, x: 195 + 260 * Math.cos(t), y: -934 + 260 * Math.sin(t), speed_kmh: 38, heading: (90 - (t * 180) / Math.PI) % 360, player: 'Sim-Spieler', in_vehicle: true,
      weather: { type: 'CLOUDS', wind_speed: 3.4, wind_from: 300, hour: 14, minute: 30 } }); }, 1000);
}
