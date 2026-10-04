// Simuliert die FiveM-Telemetrie (Position + GTA-Wetter) zum Testen ohne Spiel.
// Aufruf: node tools/fivem-sim.mjs [http://localhost:3001] [token]
const base = process.argv[2] ?? 'http://localhost:3001';
const token = process.argv[3] ?? 'dev-token';
const WEATHER = ['EXTRASUNNY', 'CLEAR', 'CLOUDS', 'OVERCAST', 'RAIN', 'THUNDER', 'CLEARING'];
let t = 0;
console.log(`Sende simulierte GTA-Telemetrie an ${base} (Strg+C beendet) …`);
setInterval(async () => {
  t += 1;
  const a = t / 25;
  const x = 195 + 380 * Math.sin(a), y = -934 + 260 * Math.sin(2 * a);
  const hx = 380 * Math.cos(a), hy = 520 * Math.cos(2 * a);
  const body = {
    vehicle: 'CBRN-01', x, y, speed_kmh: 38 + 8 * Math.sin(a * 3), heading: (Math.atan2(hx, hy) * 180 / Math.PI + 360) % 360, player: 'Sim-Spieler', in_vehicle: true,
    ...(t % 3 === 1 ? { weather: { type: WEATHER[Math.floor(t / 90) % WEATHER.length], wind_speed: 3 + 2 * Math.sin(a), wind_from: (225 + 20 * Math.sin(a / 3) + 360) % 360, hour: 12 + Math.floor(t / 60) % 12, minute: t % 60 } } : {}),
  };
  try { await fetch(`${base}/api/adapter/fivem/telemetry`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-adapter-token': token }, body: JSON.stringify(body) }); }
  catch (e) { console.log('Backend nicht erreichbar:', e.message); }
}, 1000);
