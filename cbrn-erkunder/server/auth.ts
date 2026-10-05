// Anmeldung am Fahrzeug: Name + Funktion, danach voller Zugriff. Sitzungen liegen in der Datenbank.
import { randomBytes } from 'node:crypto';
import type { Req as FastifyRequest } from './router.js';
import { db, now } from './db.js';

export interface Session { token: string; vehicle_id: string; name: string; funktion: string; created_at: string; last_seen: string }
export interface AuthUser { id: string; token: string; name: string; callsign: string; vehicle_id: string; role: 'admin' }

export function createSession(vehicle_id: string, name: string, funktion: string) {
  const token = randomBytes(24).toString('hex'); const t = now();
  db.prepare('INSERT INTO sessions(token,vehicle_id,name,funktion,created_at,last_seen) VALUES(?,?,?,?,?,?)').run(token, vehicle_id, name, funktion, t, t);
  return token;
}
export const getSession = (token?: string | null) => (token ? (db.prepare('SELECT * FROM sessions WHERE token = ?').get(token) as unknown as Session | undefined) : undefined);
export const touch = (token: string) => db.prepare('UPDATE sessions SET last_seen = ? WHERE token = ?').run(now(), token);
export const endSession = (token: string) => db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
export const purgeSessions = () => db.prepare("DELETE FROM sessions WHERE last_seen < ?").run(new Date(Date.now() - 14 * 86400000).toISOString());

/** Aktive Besatzung eines Fahrzeugs = Anmeldungen mit Lebenszeichen in den letzten 2 Minuten. */
export function crewOf(vehicle_id?: string) {
  const since = new Date(Date.now() - 120000).toISOString();
  const rows = (vehicle_id
    ? db.prepare('SELECT * FROM sessions WHERE vehicle_id = ? AND last_seen >= ? ORDER BY created_at').all(vehicle_id, since)
    : db.prepare('SELECT * FROM sessions WHERE last_seen >= ? ORDER BY vehicle_id, created_at').all(since)) as unknown as Session[];
  return rows.map((s) => ({ id: s.token.slice(0, 8), vehicle_id: s.vehicle_id, role: s.funktion, name: s.name, since: s.created_at }));
}

export function authUser(req: FastifyRequest): AuthUser | null {
  const q = (req.query as any)?.token as string | undefined;
  const s = getSession(String(req.headers['x-session'] ?? q ?? ''));
  return s ? { id: `${s.name} (${s.funktion})`, token: s.token, name: s.name, callsign: s.funktion, vehicle_id: s.vehicle_id, role: 'admin' } : null;
}
