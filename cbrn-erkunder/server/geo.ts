import { config } from './config.js';

// Zwei Kartenmodi: "geo" (echte Koordinaten, Demo-Raum Kiel) und "gta5" (Spielkoordinaten x/y in Metern,
// intern als Pseudo-lat/lon = y|x / 111320 geführt, damit MapLibre/Messengine unverändert funktionieren).
export const MODE = config.mapMode;
export const KIEL = { lat: 54.3233, lon: 10.1228 };
export const CENTER = MODE === 'gta5'
  ? { lat: config.gta5.center.y / 111320, lon: config.gta5.center.x / 111320 }
  : { ...config.geo.center };
export const gameToLL = (x: number, y: number) => ({ lat: y / 111320, lon: x / 111320 });
export const llToGame = (lat: number, lon: number) => ({ x: lon * 111320, y: lat * 111320 });
const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;
export const mPerDegLat = 111320;
export const mPerDegLon = (lat: number) => (MODE === 'gta5' ? 111320 : 111320 * Math.cos(rad(lat)));
export const offsetToLL = (xEast: number, yNorth: number, c = CENTER) => ({ lat: c.lat + yNorth / mPerDegLat, lon: c.lon + xEast / mPerDegLon(c.lat) });
export const llToOffset = (lat: number, lon: number, c = CENTER) => ({ x: (lon - c.lon) * mPerDegLon(c.lat), y: (lat - c.lat) * mPerDegLat });
export function distM(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export const bearing = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};
const DIRS = ['N', 'NNO', 'NO', 'ONO', 'O', 'OSO', 'SO', 'SSO', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
export const compass = (deg: number) => DIRS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];

// Sektoren relativ zum Einsatzzentrum (Quadrate 600 m Kantenlänge, Demo)
export const SECTORS: Record<string, { name: string; cx: number; cy: number }> = {
  NORD: { name: 'SEKTOR NORD', cx: 0, cy: 600 }, OST: { name: 'SEKTOR OST', cx: 600, cy: 0 },
  SUED: { name: 'SEKTOR SÜD', cx: 0, cy: -600 }, WEST: { name: 'SEKTOR WEST', cx: -600, cy: 0 }, ZENTRUM: { name: 'SEKTOR ZENTRUM', cx: 0, cy: 0 },
};
export const sectorPolygon = (key: string) => {
  const s = SECTORS[key]; const h = 300;
  const pts = [[-h, -h], [h, -h], [h, h], [-h, h], [-h, -h]].map(([x, y]) => { const p = offsetToLL(s.cx + x, s.cy + y); return [p.lon, p.lat]; });
  return pts;
};
