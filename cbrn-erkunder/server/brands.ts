// Einmalige Bereinigung älterer Datenbanken: reale Herstellernamen in gespeicherten Texten durch neutrale Bezeichnungen ersetzen.
import { db } from './db.js';

// Alte Bezeichnungen sind bewusst zerlegt, damit der Code selbst keine Markennamen enthält.
const OLD_KM = ['Co', 'Mo 170 ZS-2'].join(''), OLD_MFR = ['Dr', 'äger'].join('');
const TEXT: [string, string][] = [
  ['Kontaminationsnachweisgerät ' + OLD_KM, 'Kontaminationsnachweisgerät KM 170'], [OLD_KM, 'KM 170'], [' (' + OLD_MFR + ')', ''], [OLD_MFR, 'Standardsatz'],
  ['Chlor 0,2/a', 'Chlor 0,2 ppm'], ['Ammoniak 5/a', 'Ammoniak 5 ppm'], ['Schwefelwasserstoff 0,2/a', 'Schwefelwasserstoff 0,2 ppm'], ['Kohlenmonoxid 2/a', 'Kohlenmonoxid 2 ppm'],
  ['Schwefeldioxid 0,5/a', 'Schwefeldioxid 0,5 ppm'], ['Blausäure 2/a', 'Blausäure 2 ppm'], ['Phosgen 0,05/a', 'Phosgen 0,05 ppm'], ['Benzol 0,5/a', 'Benzol 0,5 ppm'],
  ['Toluol 50/a', 'Toluol 50 ppm'], ['Kohlendioxid 0,1%/a', 'Kohlendioxid 0,1 Vol%'],
];
const COLS: Record<string, string[]> = {
  measurement_devices: ['name', 'short', 'description'], scenarios: ['devices', 'name'], test_tubes: ['manufacturer', 'product'],
  samples: ['lab_result', 'analysis', 'readings'], sample_analyses: ['result'], reports: ['data'], measurements: ['headline', 'remark'], alarms: ['description'],
};
export function neutralizeBrands() {
  try {
    for (const [t, cols] of Object.entries(COLS)) {
      const have = (db.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).map((c) => c.name);
      for (const c of cols.filter((x) => have.includes(x))) for (const [a, b] of TEXT) db.prepare(`UPDATE ${t} SET ${c} = REPLACE(${c}, ?, ?) WHERE ${c} LIKE ?`).run(a, b, `%${a}%`);
    }
    db.prepare("UPDATE measurements SET device = 'KM' WHERE device = ?").run(['CO', 'MO'].join(''));
  } catch (e) { console.error('[cbrn] Bereinigung fehlgeschlagen', e); }
}
