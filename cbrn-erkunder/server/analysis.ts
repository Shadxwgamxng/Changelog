// Probenanalyse (Entscheidungshilfe): ordnet vor Ort erfasste Beobachtungen/Messwerte Datenbankstoffen zu.
// Ergebnis ist immer nur Hinweis / Verdacht / mögliche Identifikation – eine bestätigte Identifikation gibt es nur über das Labor.
import { list } from './db.js';
import type { Traits } from './data/derive.js';
import { ORIGIN_LABEL } from './data/derive.js';

export interface Obs {
  origin?: string; state?: string; flammable?: string; color?: string; odor?: string; ph?: string; water?: string; fumes?: boolean;
  pid?: number | null; lel?: number | null; co?: number | null; h2s?: number | null; o2?: number | null; dose?: number | null; gamma_kev?: number[]; ims?: string;
  tubes?: string; un?: string; guess?: string; symptoms?: string[]; kind?: string; notes?: string;
}
export interface Candidate { id: string; name: string; cas: string; category: string; subcategory: string; score: number; level: string; confidence: number; reasons: { ok: boolean | null; text: string }[]; next: string[] }

const ODOR: Record<string, string[]> = {
  geruchlos: [], stechend: ['stechend', 'beißend'], chlor: ['chlor'], ammoniak: ['ammoniak', 'stechend'], faule_eier: ['faule eier'], suesslich: ['süßlich', 'fruchtig', 'ätherisch'],
  alkohol: ['alkohol'], aromatisch: ['aromatisch', 'benzin'], benzin: ['benzin', 'aromatisch', 'petroleum', 'lösemittel'], bittermandel: ['bittermandel'], knoblauch: ['knoblauch', 'senf'],
  essig: ['essig'], oelig: ['ölig', 'petroleum'], heu: ['heu', 'faulend'], lösemittel: ['lösemittel', 'fruchtig', 'ätherisch'], teer: ['teer', 'phenol', 'charakteristisch'],
};
const SYMP: Record<string, { h: string[]; ids?: string[]; text: string }> = {
  augen: { h: ['H319', 'H314', 'H318'], text: 'Augenreizung' }, atemwege: { h: ['H335', 'H330', 'H331', 'H314'], text: 'Reizung der Atemwege / Husten' },
  atemnot: { h: ['H330', 'H331'], ids: ['chlor', 'phosgen', 'ammoniak', 'stickstoffdioxid', 'schwefeldioxid'], text: 'Atemnot / Lungenödem' },
  haut: { h: ['H314', 'H315', 'H311', 'H310'], text: 'Hautrötung/-verätzung' }, schwindel: { h: ['H336', 'H330', 'H331'], ids: ['kohlenmonoxid', 'schwefelwasserstoff'], text: 'Kopfschmerz / Schwindel / Benommenheit' },
  uebelkeit: { h: ['H302', 'H301', 'H332'], text: 'Übelkeit / Erbrechen' }, bewusstlos: { h: ['H330', 'H300', 'H310'], ids: ['cyanwasserstoff', 'schwefelwasserstoff', 'kohlenmonoxid', 'stickstoff', 'argon'], text: 'Plötzliche Bewusstlosigkeit' },
  pupillen: { h: [], ids: ['sarin', 'soman', 'tabun', 'vx'], text: 'Pupillenverengung / Speichelfluss / Krämpfe (cholinerg)' },
  blasen: { h: [], ids: ['schwefellost', 'stickstofflost', 'lewisit'], text: 'Verzögerte Hautblasen / Rötung' }, blau: { h: [], ids: ['anilin', 'nitrobenzol'], text: 'Blaue Lippen/Haut (Methämoglobin)' },
};

export function analyze(o: Obs) {
  const subs = list('substances');
  const cands: Candidate[] = [];
  const unN = (o.un ?? '').replace(/\D/g, ''); const guess = (o.guess ?? '').trim().toLowerCase();
  const tubeTxt = (o.tubes ?? '').toLowerCase(); const imsTxt = (o.ims ?? '').toLowerCase();
  const odor = (o.odor ?? '').toLowerCase(); const color = (o.color ?? '').toLowerCase();
  const symp = (o.symptoms ?? []).filter((k) => SYMP[k]);
  const susp = o.origin === 'verdaechtig';

  for (const s of subs) {
    const t: Traits = s.traits; if (!t) continue;
    let sc = 0; const R: Candidate['reasons'] = [];
    const add = (pts: number, ok: boolean | null, text: string) => { sc += pts; R.push({ ok, text }); };
    const cwa = t.cwa;
    // ---- direkte Hinweise
    if (unN && (s.un_number ?? '').replace(/[^\d/]/g, '').split('/').includes(unN)) add(8, true, `UN-Nummer ${unN} passt (${s.un_number})`);
    if (guess && (s.name.toLowerCase().includes(guess) || s.synonyms.some((x: string) => x.toLowerCase().includes(guess)) || s.cas === guess)) add(6, true, 'Entspricht dem Namensvorschlag / der Kennzeichnung');
    const nm = s.name.toLowerCase().split(/[ (]/)[0];
    if (tubeTxt && nm.length > 3 && tubeTxt.includes(nm.slice(0, Math.max(4, nm.length - 2)))) add(5, true, 'Prüfröhrchen-Anzeige passt');
    if (imsTxt && (imsTxt.includes(nm.slice(0, 5)) || (s.substance_group && imsTxt.includes(s.substance_group.toLowerCase().split(' ')[0])))) add(4, true, 'IMS-Hinweis passt');
    // ---- Aggregatzustand
    if (o.state && o.state !== 'unbekannt') {
      if (t.states.includes(o.state)) add(1.5, true, `Aggregatzustand ${o.state} möglich`);
      else add(-7, false, `Aggregatzustand: Stoff liegt üblicherweise als ${t.states.join('/')} vor`);
    }
    // ---- Entflammbarkeit
    if (o.flammable === 'ja') { if (t.flammable) add(3, true, 'Brennbar/entzündbar – passt'); else add(-5, false, 'Stoff gilt als nicht brennbar'); }
    if (o.flammable === 'nein') { if (t.flammable) add(-4, false, 'Stoff ist brennbar, Probe wurde als nicht entflammbar beschrieben'); else add(1.5, true, 'Nicht brennbar – passt'); }
    // ---- pH
    if (o.ph && o.ph !== 'unbekannt' && s.state !== 'Gas') {
      if (t.ph === o.ph) add(4, true, `pH-Verhalten ${o.ph} passt`);
      else if (t.ph && t.ph !== o.ph) add(-5, false, `pH: Stoff reagiert ${t.ph}, gemessen ${o.ph}`);
    }
    // ---- Wasserverhalten
    if (o.water && o.water !== 'unbekannt') {
      if (o.water === 'mischbar') { if (t.solubility === 'mischbar' || t.solubility === 'gut') add(2.5, true, 'Mit Wasser mischbar/gut löslich'); else if (t.solubility === 'gering') add(-3, false, 'Stoff ist kaum wasserlöslich'); }
      if (o.water === 'schwimmt') { if (t.floats === true && t.solubility !== 'mischbar') add(3, true, 'Leichter als Wasser, schwimmt'); else if (t.floats === false) add(-4, false, 'Stoff ist schwerer als Wasser'); }
      if (o.water === 'sinkt') { if (t.floats === false) add(3, true, 'Schwerer als Wasser, sinkt'); else if (t.floats === true) add(-4, false, 'Stoff ist leichter als Wasser'); }
      if (o.water === 'reagiert') { if (t.water_reactive) add(6, true, 'Reagiert mit Wasser – passt'); else add(-1, false, 'Keine Wasserreaktivität hinterlegt'); }
    }
    // ---- Geruch / Farbe
    if (odor && odor !== 'unbekannt') {
      const kws = ODOR[odor] ?? [odor]; const so = (s.odor ?? '').toLowerCase();
      if (odor === 'geruchlos') { if (so && !/geruchlos/.test(so) && !/nahezu geruchlos/.test(so)) add(-1.5, false, 'Stoff hat üblicherweise Geruch'); else if (so) add(1, true, 'Geruchlos – passt'); }
      else if (so && kws.some((k) => so.includes(k))) add(3, true, `Geruch „${odor.replace('_', ' ')}" passt`);
      else if (so) add(-0.5, null, 'Geruch weicht von der Beschreibung ab');
    }
    if (color && color !== 'unbekannt' && color !== 'farblos') { const sc2 = (s.color ?? '').toLowerCase(); if (sc2 && sc2.includes(color.split('/')[0])) add(1.5, true, `Farbe ${color} passt`); else if (sc2) add(-1, null, 'Farbe weicht ab'); }
    if (color === 'farblos' && s.color && !/farblos/.test(s.color.toLowerCase())) add(-1.5, null, 'Stoff ist meist gefärbt');
    // ---- Messwerte
    if (o.pid != null) {
      const resp = s.ie_ev != null && s.ie_ev < 10.6;
      if (o.pid >= 2) { if (resp) add(2.5, true, 'PID-Anzeige erhöht – Stoff ist photoionisierbar (IE < 10,6 eV)'); else if (s.ie_ev != null) add(-3.5, false, `PID erhöht, aber IE ${String(s.ie_ev).replace('.', ',')} eV liegt über der Lampenenergie`); }
      else if (o.pid < 0.5 && (t.flammable || t.toxic) && s.state !== 'Feststoff') { if (resp) add(-2, false, 'PID ohne Anzeige, obwohl photoionisierbarer Dampf zu erwarten wäre'); else if (s.ie_ev != null) add(0.5, true, 'PID ohne Anzeige – passt (nicht photoionisierbar)'); }
    }
    if (o.lel != null && o.lel >= 1) { if (t.flammable) add(2.5, true, 'EX-Anzeige vorhanden – brennbarer Dampf/Gas'); else add(-2.5, false, 'EX-Anzeige, aber Stoff nicht brennbar'); }
    if (o.co != null && o.co > 5) { if (s.cas === '630-08-0') add(7, true, 'CO-Kanal erhöht'); else if (t.gas) add(-0.5, null, 'CO-Kanal erhöht (anderer Stoff?)'); }
    if (o.h2s != null && o.h2s > 0.5) { if (s.cas === '7783-06-4') add(7, true, 'H₂S-Kanal erhöht'); }
    if (o.o2 != null && o.o2 < 19.5) { if (t.asphyxiant) add(5, true, 'Sauerstoffmangel – verdrängendes Gas möglich'); else if (t.gas) add(0.5, null, 'Sauerstoffmangel möglich'); }
    if (o.dose != null && o.dose >= 0.3) add(-2, null, 'Dosisleistung erhöht (radiologische Komponente separat prüfen)');
    // ---- Herkunft
    if (o.origin && o.origin !== 'unbekannt') {
      if (t.origins.includes(o.origin)) add(2.5, true, `Typische Herkunft: ${ORIGIN_LABEL[o.origin] ?? o.origin}`);
      else if (t.origins.length) add(-0.5, null, `Herkunft „${ORIGIN_LABEL[o.origin] ?? o.origin}" untypisch`);
    }
    // ---- Symptome
    for (const k of symp) {
      const sy = SYMP[k]; const idHit = sy.ids?.includes(s.id); const hHit = sy.h.some((h) => s.h.includes(h));
      if (idHit) add(4, true, `Symptom „${sy.text}" typisch`); else if (hHit) add(1.5, true, `Symptom „${sy.text}" möglich (Gefahreneinstufung)`);
    }
    // ---- Kampfstoffe nur bei Verdacht/Indizien
    if (cwa) {
      const indic = susp || symp.some((k) => ['pupillen', 'blasen'].includes(k)) || /kampfstoff|sarin|vx|lost|tabun|soman|lewisit/.test(imsTxt + guess);
      if (!indic) add(-9, null, 'Kein Hinweis auf Kampfstoff (Herkunft/Symptome/IMS)');
    }
    cands.push({ id: s.id, name: s.name, cas: s.cas, category: s.cbrn_category, subcategory: s.subcategory, score: Math.round(sc * 10) / 10, level: 'hinweis', confidence: 0, reasons: R, next: [] });
  }
  cands.sort((a, b) => b.score - a.score);
  const top = cands.slice(0, 8);
  const best = top[0]?.score ?? 0; const second = top[1]?.score ?? -99;
  const nInfo = (o.state && o.state !== 'unbekannt' ? 1 : 0) + (o.flammable && o.flammable !== 'unbekannt' ? 1 : 0) + (o.ph && o.ph !== 'unbekannt' ? 1 : 0) + (o.water && o.water !== 'unbekannt' ? 1 : 0) + (o.odor && o.odor !== 'unbekannt' ? 1 : 0) + (o.pid != null ? 1 : 0) + (unN || guess || tubeTxt || imsTxt ? 2 : 0);
  top.forEach((c, i) => {
    const rel = best > 0 ? Math.max(0, c.score) / best : 0;
    c.confidence = Math.max(0, Math.min(95, Math.round(Math.max(0, c.score) * 4.2 * (nInfo >= 3 ? 1 : 0.6))));
    c.level = i === 0 && c.score >= 12 && best - second >= 3 && nInfo >= 3 ? 'moegliche_identifikation' : c.score >= 7 && nInfo >= 2 ? 'verdacht' : 'hinweis';
    if (rel < 0.45 && i > 0) c.level = 'hinweis';
    const tubes = list('test_tubes', 'WHERE cas = ?', [c.cas]);
    const sub = subs.find((x: any) => x.id === c.id);
    c.next = [
      ...(tubes.length ? [`Prüfröhrchen ${tubes[0].product} (${tubes[0].manufacturer}) zur Bestätigung einsetzen`] : []),
      ...(sub?.devices?.includes('IMS') ? ['IMS-Messung wiederholen / Bibliothek abgleichen'] : []),
      ...(sub?.devices?.includes('PID') ? ['PID-Verlauf beobachten (nur Screening)'] : []),
      'Probe sichern und mit Chain of Custody an das Labor übergeben',
    ];
  });
  // ---- Radiologisch / Biologisch (separate Hinweise)
  const extras: { type: string; title: string; text: string; refs?: { id: string; name: string; hint?: string }[] }[] = [];
  if (o.dose != null && o.dose >= 0.3) {
    const nucs = list('radionuclides').filter((n: any) => n.gamma_kev?.length);
    const hit = (o.gamma_kev ?? []).length ? nucs.map((n: any) => ({ n, d: Math.min(...(o.gamma_kev ?? []).flatMap((e) => n.gamma_kev.map((g: number) => Math.abs(g - e)))) })).filter((x: any) => x.d <= 10).sort((a: any, b: any) => a.d - b.d) : [];
    extras.push({ type: 'radiologisch', title: `Dosisleistung erhöht (${o.dose} µSv/h)`, text: hit.length ? 'Gamma-Linien passen zu folgenden Nukliden (Zuordnung vorläufig):' : 'Nuklidzuordnung über Gammaspektrum (Energie der Linien eingeben) – ohne Spektrum nicht möglich.', refs: hit.map((x: any) => ({ id: x.n.id, name: x.n.name, hint: `Linie ±${x.d.toFixed(1)} keV` })) });
  }
  if (o.kind === 'BIOLOGISCH' || susp && (o.state === 'Feststoff') && (o.kind === 'BIOLOGISCH')) {
    extras.push({ type: 'biologisch', title: 'Biologische Probe', text: 'Vor-Ort-Analyse nicht möglich – nur Probenahme/Transport durch geschulte Kräfte und Laboruntersuchung. Handlungsempfehlungen in der Biologischen Datenbank.', refs: list('biological_agents').slice(0, 9).map((b: any) => ({ id: b.id, name: b.name })) });
  }
  const topC = top[0];
  const summary = !topC ? 'Keine Zuordnung möglich.' : topC.score < 3 ? 'Keine belastbare Zuordnung – weitere Angaben/Messungen erforderlich.' : `${topC.level === 'moegliche_identifikation' ? 'Mögliche Identifikation' : topC.level === 'verdacht' ? 'Verdacht' : 'Hinweis'}: ${topC.name}`;
  return { candidates: top, extras, summary, inputs_used: nInfo, hint: nInfo < 3 ? 'Wenige Angaben – je mehr Beobachtungen und Messwerte, desto verlässlicher der Vorschlag.' : null, simulated: true };
}
