import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import fstatic from '@fastify/static';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import './db.js';
import { seedIfEmpty } from './seed.js';
import { registerRoutes } from './routes.js';
import { registerWs } from './ws.js';
import { startSim } from './sim.js';

const app = Fastify({ logger: { level: 'warn' } });
await app.register(cors, { origin: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] });
await app.register(websocket);
app.setErrorHandler((err: any, _req, rep) => rep.code(err.statusCode ?? 500).send({ error: err.message }));

seedIfEmpty();
registerRoutes(app);
registerWs(app);

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const distAlt = path.resolve(process.cwd(), 'dist');
const root = fs.existsSync(dist) ? dist : fs.existsSync(distAlt) ? distAlt : null;
if (root) {
  await app.register(fstatic, { root, wildcard: false });
  app.setNotFoundHandler((req, rep) => (req.url.startsWith('/api') ? rep.code(404).send({ error: 'Nicht gefunden' }) : rep.sendFile('index.html')));
}
startSim();
const port = +(process.env.PORT ?? 3001);
await app.listen({ port, host: process.env.HOST ?? '0.0.0.0' });
console.log(`CBRN Erkunder API läuft auf http://localhost:${port}${root ? ' (inkl. Web-App)' : ' (Web-App: npm run dev → http://localhost:5173)'}`);
