import type { FastifyInstance } from 'fastify';
import { bus, systemStatus } from './sim.js';
import { getSession } from './auth.js';

export function registerWs(app: FastifyInstance) {
  app.get('/ws', { websocket: true }, (socket, req) => {
    if (!getSession(String((req.query as any)?.token ?? ''))) { socket.close(4401, 'Nicht angemeldet'); return; }
    const send = (e: any) => { if (socket.readyState === 1) socket.send(JSON.stringify(e)); };
    send({ type: 'hello', payload: systemStatus(), ts: new Date().toISOString() });
    const h = (e: any) => send(e); bus.on('event', h);
    socket.on('close', () => bus.off('event', h));
  });
}
