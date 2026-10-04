// Import-Pipeline: Quelle -> Import -> Validierung -> lokale Datenbank. Kein Abruf externer Seiten zur Laufzeit.
import { get, columns } from './db.js';

export function casValid(cas: string) {
  const m = /^(\d{2,7})-(\d{2})-(\d)$/.exec(cas ?? ''); if (!m) return false;
  const digits = (m[1] + m[2]).split('').reverse(); const sum = digits.reduce((a, d, i) => a + (i + 1) * +d, 0);
  return sum % 10 === +m[3];
}
export function parseCsv(text: string) {
  const sep = text.split('\n')[0].includes(';') ? ';' : ','; const rows: string[][] = []; let cur: string[] = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; }
    else if (c === '"') q = true; else if (c === sep) { cur.push(f); f = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; cur.push(f); rows.push(cur); cur = []; f = ''; } else f += c;
  }
  if (f || cur.length) { cur.push(f); rows.push(cur); }
  const [h, ...rest] = rows.filter((r) => r.some((x) => x.trim())); if (!h) return [];
  return rest.map((r) => Object.fromEntries(h.map((k, i) => [k.trim(), r[i]?.trim() === '' ? null : r[i]?.trim()])));
}
const JSONISH = ['synonyms', 'ghs', 'h', 'p', 'methods', 'devices', 'radiation', 'gamma_kev'];
export function validateImport(table: string, format: 'json' | 'csv', content: string) {
  let rows: any[] = [];
  try { rows = format === 'csv' ? parseCsv(content) : JSON.parse(content); } catch { return { total: 0, valid: [], review: [], invalid: [{ reason: 'Datei nicht lesbar (kein gültiges ' + format.toUpperCase() + ')' }] }; }
  if (!Array.isArray(rows)) rows = [rows];
  const valid: any[] = [], review: any[] = [], invalid: any[] = []; const cols = columns(table);
  rows.forEach((r, i) => {
    const o: any = {}; for (const k of Object.keys(r)) if (cols.includes(k)) o[k] = r[k];
    for (const k of JSONISH) if (typeof o[k] === 'string' && cols.includes(k)) o[k] = o[k].includes('|') ? o[k].split('|').map((x: string) => x.trim()) : o[k] ? [o[k]] : [];
    if (!o.name && !o.product) { invalid.push({ row: i + 1, reason: 'name fehlt' }); return; }
    o.id ??= String(o.name ?? o.product).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const reasons: string[] = [];
    if (table === 'substances') {
      if (!o.cas || !casValid(o.cas)) reasons.push('CAS fehlt oder Prüfziffer ungültig');
      if (!['C', 'B', 'R', 'N', 'UNKNOWN'].includes(o.cbrn_category)) { reasons.push('CBRN-Kategorie ungültig'); o.cbrn_category = 'UNKNOWN'; }
    }
    if (table !== 'test_tubes' && (!o.source_id || !get('sources', o.source_id))) reasons.push('Quelle fehlt/unbekannt (QUELLE ERFORDERLICH)');
    if (reasons.length) review.push({ ...o, _reasons: reasons }); else valid.push(o);
  });
  return { total: rows.length, valid, review, invalid };
}
