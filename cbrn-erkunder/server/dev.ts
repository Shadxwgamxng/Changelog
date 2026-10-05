// Entwickler-Testserver (NICHT für den Spielbetrieb): bedient die NUI-Oberfläche im Browser, ohne FiveM.
// Anfragen: POST /__api, Ereignisse: GET /__events (SSE). Optional DEV_SIM=1: simulierte FiveM-Telemetrie.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { boot } from './core.js';
import { bus, ingestFivem } from './sim.js';
import { list } from './db.js';

const root = path.resolve(process.cwd(), 'resource', 'cbrn-erkunder');
const appDir = path.join(root, 'app');
const app = await boot({ dbFile: process.env.DB_FILE ?? path.resolve(process.cwd(), 'data', 'dev.db'), wasmFile: path.join(root, 'server', 'sql-wasm.wasm') });
const MIME: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };
const clients = new Set<http.ServerResponse>();
bus.on('event', (e) => { const m = `data: ${JSON.stringify(e)}\n\n`; for (const c of clients) c.write(m); });

http.createServer(async (req, res) => {
  const u = new URL(req.url ?? '/', 'http://x');
  if (req.method === 'POST' && u.pathname === '/__api') {
    let b = ''; for await (const c of req) b += c; const j = JSON.parse(b || '{}');
    const r = await app.dispatch(j.method, j.path, j.body, { 'x-session': j.token ?? '' });
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ status: r.status, text: JSON.stringify(r.body) })); return;
  }
  if (u.pathname === '/__events') { res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' }); res.write(':ok\n\n'); clients.add(res); req.on('close', () => clients.delete(res)); return; }
  let f = path.join(appDir, u.pathname === '/' ? 'index.html' : path.normalize(u.pathname)); if (!f.startsWith(appDir) || !fs.existsSync(f)) f = path.join(appDir, 'index.html');
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] ?? 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(+(process.env.PORT ?? 3001), () => console.log(`Entwickler-Testserver: http://localhost:${process.env.PORT ?? 3001}`));

if (process.env.DEV_SIM === '1') {
  let t = 0; // Fahrzeug 1 fährt eine Runde um Legion Square (Spielkoordinaten)
  setInterval(() => { t += 0.05; const v = list('vehicles')[0]; if (!v) return;
    ingestFivem({ vehicle: v.id, x: 195 + 260 * Math.cos(t), y: -934 + 260 * Math.sin(t), speed_kmh: 38, heading: (90 - (t * 180) / Math.PI) % 360, player: 'Sim-Spieler', in_vehicle: true,
      weather: { type: 'CLOUDS', wind_speed: 3.4, wind_from: 300, hour: 14, minute: 30 } }); }, 1000);
}
