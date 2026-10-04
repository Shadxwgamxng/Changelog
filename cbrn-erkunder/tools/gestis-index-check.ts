// Gleicht CAS-Nummer und Name der eigenen Stoffliste mit dem öffentlichen GESTIS-Stoffindex ab
// (https://gestis-api.dguv.de/api/search/de – ohne Anmeldung abrufbar: nur CAS, Name, ZVG-Nr.).
// Es werden KEINE Stoffdaten aus den (geschützten) GESTIS-Artikeln abgerufen oder gespeichert.
import fs from 'node:fs';
import { substances } from '../server/data/substances.js';
import { substances2 } from '../server/data/substances2.js';

type E = { cas_nr: string; name: string; zvg_nr: string };
// GESTIS_INDEX_FILE: optional lokale Kopie (z. B. per curl geladen), sonst direkter Abruf
const idx: E[] = process.env.GESTIS_INDEX_FILE ? JSON.parse(fs.readFileSync(process.env.GESTIS_INDEX_FILE, 'utf8')) : await (await fetch('https://gestis-api.dguv.de/api/search/de')).json();
console.log('GESTIS-Index:', idx.length, 'Einträge');
const byCas = new Map<string, typeof idx>(); for (const e of idx) { if (!byCas.has(e.cas_nr)) byCas.set(e.cas_nr, []); byCas.get(e.cas_nr)!.push(e); }
const norm = (s: string) => s.toLowerCase().replace(/[^a-zäöüß0-9]/g, '');
const out: Record<string, { zvg: string; gestis_name: string; cas_match: boolean }> = {}; const miss: string[] = []; const warn: string[] = [];
for (const s of [...substances, ...substances2]) {
  const hit = byCas.get(s.cas);
  if (hit?.length) {
    const nm = norm(s.name.split(' (')[0]); const best = hit.find((h) => norm(h.name).includes(nm.slice(0, 5)) || nm.includes(norm(h.name).slice(0, 5))) ?? hit[0];
    out[s.id] = { zvg: best.zvg_nr, gestis_name: best.name, cas_match: true };
    if (!(norm(best.name).includes(nm.slice(0, 5)) || nm.includes(norm(best.name).slice(0, 5)))) warn.push(`${s.id}: CAS ${s.cas} -> GESTIS "${best.name}" (eigener Name "${s.name}")`);
  } else {
    const alt = idx.find((e) => norm(e.name) === norm(s.name.split(' (')[0])) ?? idx.find((e) => s.synonyms.some((y) => norm(e.name) === norm(y)));
    if (alt) { out[s.id] = { zvg: alt.zvg_nr, gestis_name: alt.name, cas_match: false }; warn.push(`${s.id}: CAS ${s.cas} nicht im Index; Namenstreffer "${alt.name}" (CAS ${alt.cas_nr})`); }
    else miss.push(`${s.id} (${s.name}, CAS ${s.cas})`);
  }
}
fs.writeFileSync(new URL('../server/data/gestis-index.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(`CAS+Name bestätigt/zugeordnet: ${Object.keys(out).length} von ${substances.length + substances2.length}`);
console.log('\nAbweichungen/Hinweise:\n' + warn.join('\n'));
console.log('\nNicht im GESTIS-Index gefunden:\n' + miss.join('\n'));
