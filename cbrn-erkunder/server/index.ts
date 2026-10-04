import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import fstatic from '@fastify/static';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { db, getSetting, setSetting } from './db.js';
import { config } from './config.js';
import { seedIfEmpty } from './seed.js';
import { registerRoutes } from './routes.js';
import { registerWs } from './ws.js';
import { startSim } from './sim.js';

const app = Fastify({ logger: { level: 'warn' } });
await app.register(cors, { origin: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] });
await app.register(websocket);
app.setErrorHandler((err: any, _req, rep) => rep.code(err.statusCode ?? 500).send({ error: err.message }));

// Kartenmodus gewechselt (geo <-> gta5)? Demo-Daten sind modusgebunden -> frisch aufsetzen.
{
  const seeded = getSetting('map_mode', null);
  if (seeded && seeded !== config.mapMode) {
    console.log(`Kartenmodus ${seeded} -> ${config.mapMode}: Demo-Daten werden neu angelegt.`);
    for (const t of ['sources','substances','radionuclides','biological_agents','measurement_devices','measurement_methods','test_tubes','users','vehicles','crew','scenarios','missions','measurements','samples','sample_events','weather_records','alarms','reports','audit_log','runs','settings']) db.exec(`DELETE FROM ${t}`);
  }
}
seedIfEmpty();
db.exec("UPDATE runs SET ended_at = COALESCE(ended_at, started_at) WHERE ended_at IS NULL"); // Reste einer unterbrochenen Messfahrt schließen
setSetting('map_mode', config.mapMode);
registerRoutes(app);
registerWs(app);

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const distAlt = path.resolve(process.cwd(), 'dist');
const root = fs.existsSync(dist) ? dist : fs.existsSync(distAlt) ? distAlt : null;
// config.json-unabhängige Laufzeit-Dateien: public/config.js und public/maps/* ohne Neubau änderbar
const pub = path.resolve(process.cwd(), 'public');
app.get('/config.js', async (_req, rep) => {
  const f = fs.existsSync(path.join(pub, 'config.js')) ? path.join(pub, 'config.js') : root ? path.join(root, 'config.js') : null;
  if (!f) return rep.code(404).send('');
  return rep.header('content-type', 'text/javascript').header('cache-control', 'no-store').send(fs.readFileSync(f));
});
app.get('/maps/:file', async (req, rep) => {
  const name = path.basename((req.params as any).file); const f = path.join(pub, 'maps', name);
  if (!fs.existsSync(f)) return rep.code(404).send({ error: 'Kartenbild nicht vorhanden' });
  const ext = path.extname(name).toLowerCase();
  return rep.header('content-type', ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg').header('cache-control', 'max-age=3600').send(fs.createReadStream(f));
});
if (root) {
  await app.register(fstatic, { root, wildcard: false, globIgnore: ['config.js', 'maps/**'] });
  app.setNotFoundHandler((req, rep) => (req.url.startsWith('/api') ? rep.code(404).send({ error: 'Nicht gefunden' }) : rep.sendFile('index.html')));
}
startSim();
const port = +(process.env.PORT ?? 3001);
await app.listen({ port, host: process.env.HOST ?? '0.0.0.0' });
console.log(`CBRN Erkunder API läuft auf http://localhost:${port}${root ? ' (inkl. Web-App)' : ' (Web-App: npm run dev → http://localhost:5173)'}`);
