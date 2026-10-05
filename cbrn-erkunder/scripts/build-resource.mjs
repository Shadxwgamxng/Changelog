// Baut das Server-Skript der FiveM-Ressource (ein einzelnes JS inkl. sql.js) und kopiert Laufzeitdateien.
import { build } from 'esbuild';
import fs from 'node:fs';
const out = 'resource/cbrn-erkunder';
fs.mkdirSync(`${out}/server`, { recursive: true });
await build({ entryPoints: ['server/fivem.ts'], bundle: true, platform: 'node', target: 'node16', format: 'cjs', outfile: `${out}/server/main.js`, logLevel: 'warning', legalComments: 'none',
  // FiveM stellt __dirname/__filename nicht bereit (sql.js greift darauf zu) -> aus dem Ressourcenpfad ableiten
  banner: { js: "var __dirname = (typeof GetResourcePath === 'function' ? GetResourcePath(GetCurrentResourceName()) : process.cwd()) + '/server'; var __filename = __dirname + '/main.js';" } });
fs.copyFileSync('node_modules/sql.js/dist/sql-wasm.wasm', `${out}/server/sql-wasm.wasm`);
fs.copyFileSync('config.json', `${out}/config.json`);
console.log('Ressource gebaut:', out);
