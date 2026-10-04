import fs from 'node:fs';
import path from 'node:path';

export interface AppConfig {
  mapMode: 'geo' | 'gta5';
  geo: { center: { lat: number; lon: number }; tileUrl?: string; attribution?: string };
  gta5: { center: { x: number; y: number }; image: string; bounds: { minX: number; maxX: number; minY: number; maxY: number } };
}
const DEFAULT: AppConfig = {
  mapMode: 'geo',
  geo: { center: { lat: 54.3233, lon: 10.1228 }, tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© OpenStreetMap-Mitwirkende' },
  gta5: { center: { x: 195, y: -934 }, image: '/maps/gta5.jpg', bounds: { minX: -4000, maxX: 4500, minY: -4000, maxY: 8000 } },
};
export function loadConfig(): AppConfig {
  try {
    const j = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'config.json'), 'utf8'));
    return { ...DEFAULT, ...j, geo: { ...DEFAULT.geo, ...j.geo }, gta5: { ...DEFAULT.gta5, ...j.gta5 } };
  } catch { return DEFAULT; }
}
export const config = loadConfig();
if (process.env.MAP_MODE === 'geo' || process.env.MAP_MODE === 'gta5') config.mapMode = process.env.MAP_MODE;
