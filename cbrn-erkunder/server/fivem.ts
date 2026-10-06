// Einstieg im FiveM-Server: keine Netzwerk-Ports – die NUI spricht über Events (Client -> Server) mit dem Router.
import path from 'node:path';
import { boot } from './core.js';
import { bus, ingestFivem, systemStatus } from './sim.js';
import { db } from './db.js';
import { RES_DIR } from './paths.js';
import { registerSampleEvents } from './sampleEvents.js';
import { registerDeviceEvents } from './hdev/events.js';

const CHUNK = 12000; // Zeichen je Antwort-Event (große Listen werden in Teilen übertragen)
const subs = new Set<number>(); // Spieler mit gültiger Anmeldung -> erhalten Live-Ereignisse
const live = (src: number) => { try { return GetPlayerName(src) != null; } catch { return false; } };

// Datenbank im Ordner „data“ der Ressource (FiveM erlaubt dem Server-Skript nur Schreibzugriffe innerhalb des Ressourcenordners).
// Beim Aktualisieren der Ressource den Ordner „data“ NICHT löschen/überschreiben (dort liegt cbrn.db).
const dbPath = path.join(RES_DIR, 'data', 'cbrn.db');
console.log('[cbrn] Datenbank:', dbPath);
boot({ dbFile: dbPath, wasmFile: path.join(RES_DIR, 'server', 'sql-wasm.wasm') }).then((app) => {
  onNet('cbrn:req', async (id: number, method: string, url: string, body: any, token: string) => {
    const src = source;
    let res: { status: number; body: any };
    try { res = await app.dispatch(String(method), String(url), body, { 'x-session': String(token ?? '') }); }
    catch (e: any) { res = { status: 500, body: { error: e?.message ?? 'Fehler' } }; }
    if (res.status !== 401 && token) { if (!subs.has(src)) { subs.add(src); emitNet('cbrn:evt', src, JSON.stringify({ type: 'hello', payload: systemStatus(), ts: new Date().toISOString() })); } }
    const text = JSON.stringify(res.body === undefined ? {} : res.body); const total = Math.max(1, Math.ceil(text.length / CHUNK));
    for (let i = 0; i < total; i++) emitNet('cbrn:resp', src, id, i, total, res.status, text.slice(i * CHUNK, (i + 1) * CHUNK));
  });
  // Telemetrie aus dem Spiel (Position/Kurs/Speed/Wetter) – Messwerte entstehen im Server
  onNet('cbrn:telemetry', (d: any) => {
    const src = source; if (!d || typeof d.vehicle !== 'string') return;
    ingestFivem({ ...d, player: GetPlayerName(src) ?? undefined });
  });
  registerSampleEvents(); registerDeviceEvents();
  bus.on('event', (e: any) => {
    if (!subs.size) return; const msg = JSON.stringify(e);
    for (const s of [...subs]) { if (!live(s)) subs.delete(s); else emitNet('cbrn:evt', s, msg); }
  });
  on('playerDropped', () => { subs.delete(source); });
  on('onResourceStop', (name: string) => { if (name === GetCurrentResourceName()) db.save(); });
  console.log('[cbrn] CBRN-Erkunder bereit');
}).catch((e) => console.error('[cbrn] Start fehlgeschlagen:', e));
