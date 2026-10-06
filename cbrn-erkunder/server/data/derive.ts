// Ableitung von Eigenschaften ("Traits") und Handlungsempfehlungen aus den Stoffdatensätzen.
// Handlungsempfehlungen sind klassenbasierte Richtwerte nach allgemeinen Einsatzgrundsätzen (z. B. GAMS-Regel, FwDV 500) –
// NICHT stoffspezifisch geprüft (QUELLE ERFORDERLICH). Sie unterstützen Simulation/Rollenspiel und ersetzen keine Einsatzvorschrift.
import type { SubstanceSeed } from './substances.js';

export const ORIGIN_LABEL: Record<string, string> = {
  industrie: 'Industrie / Chemiebetrieb', labor: 'Labor / Forschung', tankwagen: 'Gefahrguttransport (Straße/Schiene)', tankstelle: 'Tankstelle / Tanklager', schwimmbad: 'Schwimmbad / Wasseraufbereitung',
  kuehlanlage: 'Kälteanlage / Eishalle / Brauerei', landwirtschaft: 'Landwirtschaft (Gülle, Silo, Dünger, Begasung)', haushalt: 'Haushalt / Reiniger / Hobby', baustelle: 'Baustelle / Bauchemie', werkstatt: 'Werkstatt / Lackiererei / Schweißen',
  kanal: 'Kanalisation / Klär- / Biogasanlage', brand: 'Brand / Brandrauch', wasser: 'Gewässer / Wasser', verdaechtig: 'Verdächtiger Fund / Verdacht auf vorsätzliche Freisetzung', unbekannt: 'Unbekannt',
};

const ORIGINS: Record<string, string[]> = {
  ammoniak: ['kuehlanlage', 'landwirtschaft', 'industrie'], chlor: ['schwimmbad', 'industrie', 'tankwagen'], schwefeldioxid: ['industrie', 'brand', 'landwirtschaft'],
  kohlenmonoxid: ['brand', 'haushalt', 'werkstatt', 'industrie'], kohlendioxid: ['kuehlanlage', 'landwirtschaft', 'industrie', 'kanal'], schwefelwasserstoff: ['kanal', 'landwirtschaft', 'industrie'],
  phosgen: ['industrie', 'brand', 'verdaechtig'], cyanwasserstoff: ['brand', 'industrie', 'verdaechtig'], benzol: ['tankstelle', 'tankwagen', 'industrie'], toluol: ['werkstatt', 'industrie', 'baustelle'],
  xylol: ['werkstatt', 'baustelle', 'industrie'], aceton: ['haushalt', 'werkstatt', 'labor'], methanol: ['industrie', 'labor', 'werkstatt'], ethanol: ['haushalt', 'labor', 'industrie'],
  isopropanol: ['haushalt', 'labor', 'werkstatt'], acetonitril: ['labor', 'industrie'], formaldehyd: ['labor', 'industrie', 'haushalt'], salpetersaeure: ['industrie', 'labor'],
  schwefelsaeure: ['industrie', 'werkstatt', 'labor'], salzsaeure: ['industrie', 'schwimmbad', 'haushalt', 'baustelle'], natriumhydroxid: ['industrie', 'haushalt', 'labor'],
  sarin: ['verdaechtig'], soman: ['verdaechtig'], tabun: ['verdaechtig'], vx: ['verdaechtig'], schwefellost: ['verdaechtig'], stickstofflost: ['verdaechtig'], lewisit: ['verdaechtig'],
};

export interface Traits {
  flammable: boolean | null; oxidizer: boolean; toxic: boolean; corrosive: boolean; water_reactive: boolean; ph: 'sauer' | 'basisch' | 'neutral' | null;
  floats: boolean | null; vapor_heavier: boolean | null; states: string[]; asphyxiant: boolean; cmr: boolean; aquatic: boolean; polar: boolean;
  solubility: 'mischbar' | 'gut' | 'gering' | 'reagiert' | null; cwa: boolean; nerve: boolean; blister: boolean; origins: string[]; lel: number | null; gas: boolean;
}
const num = (s: string | null | undefined) => { const m = s?.match(/(\d+(?:[.,]\d+)?)/); return m ? parseFloat(m[1].replace(',', '.')) : null; };

export function deriveTraits(s: SubstanceSeed): Traits {
  const H = new Set(s.h); const has = (...c: string[]) => c.some((x) => H.has(x));
  const fire = s.fire_info ?? '';
  const flamH = has('H220', 'H221', 'H222', 'H224', 'H225', 'H226', 'H228', 'H260');
  const flammable = flamH || /(?<!nicht )(?<!nicht\s)\bbrennbar|entzündbar/i.test(fire.replace(/nicht brennbar/gi, '')) ? true : (s.h.length || /nicht brennbar/i.test(fire)) ? false : null;
  const gas = s.state === 'Gas';
  const toxic = has('H300', 'H301', 'H310', 'H311', 'H330', 'H331') || s.subcategory === 'CWA';
  const corrosive = has('H314', 'H318');
  const oxidizer = !!s.oxidizer || has('H270', 'H271', 'H272');
  const wr = !!s.water_reactive || has('H260', 'H261', 'EUH014');
  const w = (s.water_solubility ?? '').toLowerCase();
  let solubility: Traits['solubility'] = null;
  if (/mischbar/.test(w)) solubility = 'mischbar'; else if (/reagiert/.test(w)) solubility = 'reagiert';
  else if (/sehr gering|gering|unlöslich|praktisch/.test(w)) solubility = 'gering';
  else if (/g\/l/.test(w)) solubility = (num(w) ?? 0) >= 50 ? 'gut' : 'gering'; else if (/gut|sehr gut/.test(w)) solubility = 'gut';
  const d = s.density ?? ''; const dn = num(d);
  const floats = !gas && dn != null && /g\/cm/.test(d) ? dn < 1 : null;
  const M = s.molar_mass ?? (/gemisch/i.test(s.formula) ? 100 : null);
  const vapor_heavier = M == null ? null : M > 29;
  const bp = num(s.boiling_point); const states = [s.state];
  if (s.state === 'Flüssigkeit' && bp != null && /°C/.test(s.boiling_point ?? '') && !/−/.test((s.boiling_point ?? '').slice(0, 1)) && bp < 30) states.push('Gas');
  if (s.state === 'Feststoff' && (solubility === 'mischbar' || solubility === 'gut')) states.push('Flüssigkeit');
  let ph: Traits['ph'] = s.ph ?? (/säure/i.test(s.substance_group) ? 'sauer' : /base|lauge/i.test(s.substance_group) ? 'basisch' : null);
  if (!ph && !corrosive && !oxidizer && !gas) ph = 'neutral';
  const cwa = s.subcategory === 'CWA';
  return {
    flammable, oxidizer, toxic, corrosive, water_reactive: wr, ph, floats, vapor_heavier, states, asphyxiant: gas && !toxic && !flammable && !oxidizer,
    cmr: has('H340', 'H341', 'H350', 'H351', 'H360D', 'H360F', 'H361d', 'H361f', 'H361fd'), aquatic: has('H400', 'H410', 'H411', 'H412'),
    polar: /alkohol|keton|ether|ester|nitril|glykol|aldehyd/i.test(s.substance_group) || (solubility === 'mischbar' && flammable === true && !gas),
    solubility, cwa, nerve: cwa && /nerven/i.test(s.substance_group), blister: cwa && /haut/i.test(s.substance_group), origins: s.origins ?? ORIGINS[s.id] ?? [], lel: s.lel_vol, gas,
  };
}

export interface Response { gefahren: string[]; absperrung: string[]; schutz: string[]; brand: string[]; freisetzung: string[]; dekon: string[]; rettung: string[]; messen: string[]; hinweise: string[] }
const uniq = (a: string[]) => [...new Set(a)];

export function buildResponse(s: SubstanceSeed, t: Traits): Response {
  const R: Response = { gefahren: [], absperrung: [], schutz: [], brand: [], freisetzung: [], dekon: [], rettung: [], messen: [], hinweise: [] };
  const G = (...a: string[]) => R.gefahren.push(...a), A = (...a: string[]) => R.absperrung.push(...a), P = (...a: string[]) => R.schutz.push(...a), B = (...a: string[]) => R.brand.push(...a);
  const F = (...a: string[]) => R.freisetzung.push(...a), D = (...a: string[]) => R.dekon.push(...a), E = (...a: string[]) => R.rettung.push(...a), M = (...a: string[]) => R.messen.push(...a), N = (...a: string[]) => R.hinweise.push(...a);
  const heavy = t.vapor_heavier === true, light = t.vapor_heavier === false;
  const H = new Set(s.h);

  // ---- Chemische Kampfstoffe (defensiv, ausschließlich Eigenschutz/Dekon/Rettung)
  if (t.cwa) {
    G(t.nerve ? 'Hochgiftiger Nervenkampfstoff: Wirkung über Atemwege und Haut (Dampf und Flüssigkeit).' : 'Hochgiftiger Hautkampfstoff: Schädigung von Haut, Augen und Atemwegen, Wirkung kann mit Verzögerung (Stunden) eintreten.',
      t.nerve ? 'Typische Anzeichen: Pupillenverengung, Speichelfluss/Schwitzen, Atemnot, Muskelzuckungen/Krämpfe, Bewusstlosigkeit.' : 'Typische Anzeichen: Hautrötung und später Blasenbildung, Augenreizung, Husten/Atemwegsreizung; zunächst oft kaum Schmerz.', 'Verdacht auf vorsätzliche Freisetzung: Polizei und Spezialkräfte einbinden, Tatort-/Beweissicherung beachten.');
    A('Weiträumig absperren (Richtwert ≥ 300 m, nach Lage/Spezialkräften anpassen); Anfahrt mit Wind im Rücken (aus Windrichtung), nicht in Senken/Tiefpunkte.', 'Nur ABC-Erkundungs-/Spezialkräfte (Messtrupp, ggf. Analytische Task Force) im Gefahrenbereich; alle anderen außerhalb.');
    P('Vollschutz: gasdichter Chemikalienschutzanzug mit umluftunabhängigem Atemschutz – ausschließlich ausgebildete Kräfte.', 'Keine Rettungs- oder Messversuche ohne geeignete Schutzausrüstung.');
    B('Löschmaßnahmen auf Umgebungsbrand abstimmen; Löschwasser auffangen (kontaminiert).');
    F('Nicht in die Lache/Wolke fahren oder laufen; Austritt nur durch Spezialkräfte bekämpfen; Löschwasser/Abwasser auffangen; Gewässer- und Kanalschutz.');
    D('Soforthilfe-Dekon: Betroffene ohne Verzug aus dem Gefahrenbereich, Kleidung vollständig entfernen (entfernt den größten Teil der Kontamination), Haut mit viel Wasser und Seife abwaschen, Augen ausgiebig spülen.', 'Einsatzkräfte/Geräte über Dekon-Strecke (Schwarz-/Weißbereich); Dekon-Abwasser auffangen.');
    E(t.nerve ? 'Antidot-Therapie ausschließlich durch Notarzt/Rettungsdienst nach Protokoll; Betroffene möglichst rasch dekontaminiert übergeben.' : 'Ärztliche Behandlung (Brandwunden-/Augenversorgung); Betroffene dekontaminiert übergeben; Giftinformationszentrum.', 'Rettung nur mit Eigenschutz (GAMS: Gefahr erkennen – Absperren – Menschenrettung – Spezialkräfte).');
    M('IMS und Kampfstoff-Prüfröhrchen = Screening; Bestätigung durch Labor (Probenahme gemäß BBK-/Landesvorgaben). Messwerte, Zeit, Position und Wetter dokumentieren.');
    N('Identifikation erst nach Laborbefund bestätigt. Alle Angaben: Richtwerte, QUELLE ERFORDERLICH – Einsatzleitung/Spezialkräfte entscheiden.');
    return finish(R, s, t);
  }

  // ---- Gefahren
  if (t.toxic) G(`Giftig${H.has('H330') || H.has('H300') || H.has('H310') ? ' bis lebensgefährlich' : ''} (${[H.has('H330') || H.has('H331') ? 'Einatmen' : '', H.has('H310') || H.has('H311') ? 'Hautkontakt' : '', H.has('H300') || H.has('H301') ? 'Verschlucken' : ''].filter(Boolean).join(', ')}).`);
  if (t.gas) G(heavy ? 'Gas schwerer als Luft: sammelt sich in Senken, Kellern, Schächten, Kanälen.' : light ? 'Gas leichter als Luft: steigt auf, sammelt sich in geschlossenen Räumen unter der Decke.' : 'Ausbreitung abhängig von Dichte und Wetter beachten.');
  if (t.gas && !t.asphyxiant) G('Druckgasbehälter: bei Erwärmung Bersten/Abreißen möglich; Gasaustritt kann kalt sein (Kälteverbrennung).');
  if (t.asphyxiant) G('Verdrängt Sauerstoff: Erstickungsgefahr besonders in geschlossenen/tiefliegenden Räumen – O₂-Messung vor Betreten.');
  if (t.flammable) G(t.gas ? `Entzündbares Gas${s.lel_vol ? ` (UEG ca. ${String(s.lel_vol).replace('.', ',')} Vol.-%)` : ''}: explosionsfähige Gemische mit Luft.` : `Entzündbare Flüssigkeit${heavy ? ' – Dämpfe schwerer als Luft, breiten sich am Boden aus und zünden zurück' : ''}; explosionsfähige Dampf-Luft-Gemische.`);
  if (t.oxidizer) G('Brandfördernd: verstärkt Brände, Kontakt mit brennbaren Stoffen (Öl, Fett, Holz, Textilien) vermeiden.');
  if (t.water_reactive) G('Reagiert mit Wasser (Wärme, entzündbare Gase) – kein Wasser auf den Stoff.');
  if (t.corrosive) G('Ätzend: schwere Haut- und Augenschäden; Dämpfe/Aerosole schädigen Atemwege.');
  if (t.cmr) G('Krebserzeugend/erbgutverändernd/fortpflanzungsgefährdend (einzelne Einstufungen): Exposition minimieren, Kontamination nicht verschleppen.');
  if (t.aquatic) G('Wassergefährdend: Eintrag in Kanalisation und Gewässer verhindern.');
  if (s.id === 'ammoniak' || s.id === 'chlor' || s.id === 'schwefelwasserstoff' || s.id === 'phosgen') G('Hohe Konzentrationen führen schnell zu Bewusstlosigkeit/Lungenschäden; verzögertes Lungenödem möglich.');
  if (!R.gefahren.length) G('Keine besonderen Einstufungsgefahren hinterlegt – NICHT VERFÜGBAR, Sicherheitsdatenblatt prüfen.');

  // ---- Absperrung
  if (t.gas && (t.toxic || t.oxidizer)) A('Erst-Gefahrenbereich weiträumig (Richtwert ≥ 100 m, bei Behälterversagen/großen Mengen deutlich mehr), quer zur Windrichtung beginnen, anschließend nach Messung anpassen.', 'Anfahrt/Aufstellung mit Wind im Rücken (Wind kommt aus Rückseite), nicht in Senken stellen.');
  else if (t.gas && t.flammable) A('Gefahrenbereich ≥ 100 m (Richtwert), Zündquellen im Bereich ausschalten (kein Funkenflug, keine Elektrik), Ex-Messung (EX/UEG) vor jedem Vordringen.');
  else if (t.gas) A('Gefahrenbereich ≥ 50 m (Richtwert); geschlossene/tiefliegende Räume erst nach O₂-Messung betreten.');
  else if (t.flammable) A('Gefahrenbereich ≥ 50 m (Richtwert); Zündquellen ausschalten, Ex-Messung, Funkenarme Geräte; Dämpfe am Boden beachten.');
  else if (t.toxic || t.corrosive) A('Gefahrenbereich ≥ 25–50 m (Richtwert, Lage/Menge/Messung maßgeblich).');
  else A('Gefahrenbereich nach Lage und Messung festlegen (Richtwert ≥ 25 m).');
  A('Unbeteiligte evakuieren bzw. Gebäude schließen (Lüftung/Klima aus), Absperrung nach Windrichtung und Messwerten laufend anpassen.');

  // ---- Schutz
  if (t.gas && t.toxic) P('Umluftunabhängiger Atemschutz und gasdichter Chemikalienschutzanzug (Form 3) – ausschließlich dafür ausgebildete Kräfte (Chemikalienschutzanzug-Träger).');
  else if (t.corrosive || t.toxic) P('Umluftunabhängiger Atemschutz bei Dämpfen/Aerosolen, Chemikalienschutzkleidung (Spritzschutz bis gasdicht je nach Lage), Schutzhandschuhe, Gesichtsschutz.');
  else if (t.flammable) P('Feuerwehr-Einsatzkleidung, Atemschutz bei Dämpfen/Brandrauch; Ex-geschützte Geräte und Beleuchtung.');
  else P('Standard-Einsatzkleidung; bei Staub/Dämpfen Atemschutz; Hautkontakt vermeiden.');
  if (t.oxidizer) P('Keine öl-/fettverschmutzte Kleidung und Ausrüstung im Bereich (Entzündungsgefahr).');
  if (t.asphyxiant) P('Atemschutz (umluftunabhängig) beim Betreten sauerstoffverdrängter Bereiche; Sicherungsposten.');
  if (t.cmr) P('Kontakt konsequent vermeiden; Kontamination nicht in Fahrzeuge/Aufenthaltsräume verschleppen.');

  // ---- Brandbekämpfung
  if (t.water_reactive) B('KEIN Wasser, KEIN Schaum; trockene Löschmittel (Metallbrandpulver, trockener Sand/Löschpulver). Ggf. kontrolliert abbrennen lassen, Umgebung schützen.', 'Behälter nicht öffnen; Brandrauch kann ätzend/giftig sein.');
  else if (t.gas && t.flammable) B('Brennendes Gas nur löschen, wenn der Gasaustritt sofort gestoppt werden kann (sonst Gefahr der Rückzündung/Explosion) – Flamme kontrolliert brennen lassen.', 'Behälter aus Deckung mit Sprühstrahl kühlen; Behälterexplosion (BLEVE) beachten.');
  else if (t.flammable && t.polar) B('Alkoholbeständiger Schaum, Pulver oder CO₂; Behälter mit Sprühstrahl kühlen; Vollstrahl vermeiden (Verschleppung).');
  else if (t.flammable) B('Schaum, Pulver oder CO₂; Behälter/Umgebung mit Sprühstrahl kühlen; Wasser-Vollstrahl vermeiden (Verschleppung des brennenden Stoffs); Löschwasser auffangen.');
  else if (t.oxidizer) B('Mit viel Wasser (Sprühstrahl) kühlen/löschen; Erstickungslöschmittel (CO₂, Schaum) sind weniger wirksam, da der Stoff Sauerstoff liefert; keine brennbaren Stoffe in Kontakt.');
  else B('Nicht brennbar: Löschmittel auf die Umgebung abstimmen; Behälter bei Brandeinwirkung kühlen.');
  if (t.toxic || t.corrosive || /chlor|fluor|brom|nitr|cyan|schwefel|phosph/i.test(s.name + s.formula)) B('Brandgase können giftig/ätzend sein (z. B. HCl, NOₓ, SO₂, HCN, Phosgen) – nur mit Atemschutz.');

  // ---- Freisetzung
  if (t.gas) F('Austritt nur stoppen, wenn gefahrlos möglich (z. B. Ventil schließen); Behälter in Windrichtung/ins Freie bringen nur durch Fachkräfte.', t.toxic ? 'Gaswolke/Dämpfe mit Sprühstrahl niederschlagen bzw. verwirbeln, soweit wasserlöslich/zweckmäßig; Abwasser auffangen.' : 'Bereich belüften, Gaskonzentration messen.');
  else if (t.water_reactive) F('Trocken aufnehmen (Schaufel, geeignetes Bindemittel), in trockene, dicht verschließbare Behälter; keinen Wasserzutritt.');
  else if (t.gas === false && s.state === 'Feststoff') F('Staubentwicklung vermeiden, Verschüttetes mechanisch aufnehmen oder befeuchten (außer wasserreaktiv), in geeignete Behälter füllen.');
  else F('Leckage abdichten (wenn gefahrlos), Ausbreitung eindämmen, Kanaleinläufe abdecken, mit geeignetem Bindemittel aufnehmen; große Mengen abpumpen.');
  if (t.flammable && !t.gas) F('Zündquellen vermeiden, funkenarme Geräte, Erdung beachten; Dampfbildung ggf. mit Schaumdecke mindern.');
  if (t.corrosive && t.ph === 'sauer') F('Säurebeständige Bindemittel; Neutralisation nur nach Fachberatung/Anweisung der Einsatzleitung.');
  if (t.corrosive && t.ph === 'basisch') F('Laugenbeständige Bindemittel; Neutralisation nur nach Fachberatung/Anweisung der Einsatzleitung.');
  if (t.aquatic || t.floats === true) F(t.floats === true ? 'Schwimmt auf Wasser: Ölsperren/Ölbindemittel einsetzen, Untere Wasserbehörde informieren.' : 'Gewässerschutz: Untere Wasserbehörde informieren.');
  if (t.floats === false && s.state === 'Flüssigkeit' && t.solubility === 'gering') F('Schwerer als Wasser und kaum löslich: sinkt ab – Gewässereintrag besonders kritisch, Behörde informieren.');
  F('Aufgenommenes Material und Löschwasser als gefährlichen Abfall entsorgen lassen.');

  // ---- Dekon
  if (t.toxic || t.corrosive || t.cmr) {
    D('Kontaminierte Personen: Kleidung entfernen, betroffene Haut mit reichlich Wasser spülen (mind. 10–15 min), Augen ausgiebig spülen.', 'Einsatzkräfte/Geräte über Dekon-Strecke (Schwarz-/Weißbereich); Abwasser auffangen.');
    if (s.id === 'fluorwasserstoff') D('Besonderheit Flusssäure: nach Spülung ärztliche Behandlung zwingend (Calciumgluconat-Gel/Therapie nur durch Rettungsdienst/Arzt); Symptome oft verzögert.');
  } else D('Verunreinigte Kleidung wechseln, Haut mit Wasser und Seife reinigen; Geräte reinigen.');

  // ---- Rettung / Erste Hilfe
  E('Eigenschutz vor Menschenrettung (GAMS-Regel: Gefahr erkennen – Absperren – Menschenrettung durchführen – Spezialkräfte anfordern).');
  if (t.toxic || t.corrosive || t.asphyxiant) E('Einatmen: Betroffene aus dem Gefahrenbereich an frische Luft, ruhig lagern, Rettungsdienst/Notarzt, Sauerstoffgabe durch Fachpersonal; Lungenödem kann verzögert auftreten.');
  E('Haut/Augen: reichlich Wasser; Verschlucken: Mund ausspülen, kein Erbrechen auslösen, ärztliche Hilfe; Giftinformationszentrum kontaktieren.');
  if (s.id === 'cyanwasserstoff' || s.id.includes('cyanid')) E('Cyanid-Vergiftung: Antidot-Gabe ausschließlich durch Rettungsdienst/Notarzt.');
  if (s.id === 'kohlenmonoxid') E('CO-Vergiftung: 100 % Sauerstoff durch Rettungsdienst; Betroffene auch bei guter Befindlichkeit ärztlich untersuchen lassen.');
  if (s.id === 'natrium' || s.id === 'calciumcarbid') E('Hautkontakt mit Pulver/Partikeln: zuerst trocken abbürsten, dann mit viel Wasser spülen.');

  // ---- Messen
  if (t.flammable) M('Ex-Messung (EX/UEG) mit MGMG vor dem Vordringen und während des Einsatzes.');
  if (s.ie_ev != null && s.ie_ev < 10.6) M(`PID (10,6-eV-Lampe) spricht voraussichtlich an (IE ${String(s.ie_ev).replace('.', ',')} eV) – nur Screening.`);
  else if (s.ie_ev != null) M(`PID (10,6 eV) spricht voraussichtlich NICHT an (IE ${String(s.ie_ev).replace('.', ',')} eV).`);
  if (t.asphyxiant || (t.gas && t.oxidizer)) M('O₂-Kanal des MGMG (Sauerstoffmangel/-anreicherung).');
  if (s.devices.includes('Prüfröhrchen')) M('Prüfröhrchen für den Messstoff (sofern im Inventar) zur orientierenden Bestätigung.');
  if (t.ph && t.ph !== 'neutral' && s.state !== 'Gas') M('pH-Messung vor Ort (Indikatorpapier/Messgerät) zur Einordnung.');
  M('Messpunkt, Zeit, Position, Windrichtung (kommt aus …) und Messgerät dokumentieren; Probenahme für Laborbestätigung.');

  // ---- Hinweise
  if (s.notes) N(s.notes);
  N('Alle Angaben sind klassenbasierte Richtwerte aus allgemeinen Einsatzgrundsätzen (GAMS-Regel, FwDV 500) – nicht stoffspezifisch geprüft (QUELLE ERFORDERLICH). Maßgeblich: Sicherheitsdatenblatt, GESTIS, ERG/Einsatzleiter-Wiki, Fachberatung. Simulations-/Rollenspielhilfe.');
  return finish(R, s, t);
}
function finish(R: Response, _s: SubstanceSeed, _t: Traits): Response { for (const k of Object.keys(R) as (keyof Response)[]) R[k] = uniq(R[k]); return R; }

// ---- Radionuklide und biologische Agenzien (defensiv, allgemein)
export function radResponse(n: { name: string; radiation: string[]; half_life: string; gamma_kev: number[] | null }): Response {
  const alpha = n.radiation.some((r) => /alpha/i.test(r)), beta = n.radiation.some((r) => /beta/i.test(r)), gamma = n.radiation.some((r) => /gamma/i.test(r));
  return {
    gefahren: [
      gamma ? 'Gammastrahlung: durchdringend, äußere Bestrahlung auch ohne Berührung.' : '', beta ? 'Betastrahlung: Hautdosis/Augen bei Nahdistanz, Inkorporation gefährlich.' : '', alpha ? 'Alphastrahlung: von außen kaum gefährlich, bei Inkorporation (Einatmen/Verschlucken) sehr gefährlich.' : '',
      'Kontaminationsverschleppung (Staub, Flüssigkeit, Schuhe, Fahrzeuge) vermeiden.'].filter(Boolean),
    absperrung: ['Absperrung nach Dosisleistung und Einsatzvorschrift/Strahlenschutz-Fachberatung (Messwerte laufend aktualisieren); Messtrupp und Strahlenschutz einbinden.', 'Unbeteiligte aus dem Bereich, Windrichtung beachten (Staub/Aerosole).'],
    schutz: ['4A-Regel: Abstand halten, Abschirmung nutzen, Aufenthaltszeit minimieren, Aktivitätsaufnahme (Inkorporation) verhindern.', 'Persönliches Dosimeter und Dosisleistungswarngerät; Schutzkleidung/Handschuhe/Atemschutz (bei Staub/Aerosol) – Kontaminationsschutz.', gamma ? 'Abschirmung gegen Gamma: dichte Materialien (Blei, Beton, Stahl) – Wirkung begrenzt.' : ''].filter(Boolean),
    brand: ['Löschmittel auf Umgebungsbrand abstimmen; Brandrauch/Löschwasser können kontaminiert sein – Atemschutz, Löschwasser auffangen.'],
    freisetzung: ['Quelle nicht berühren; Bereich sichern; Strahlenschutz-Fachkräfte (z. B. ABC-Erkundung, Landesbehörde) anfordern.', 'Kontamination eingrenzen (abdecken, Staub binden), Abwasser auffangen.'],
    dekon: ['Kontaminationskontrolle an Personen/Geräten (Kontaminationsmonitor), Kleidung ausziehen, Abduschen; Dekon-Abwasser auffangen; Dosisbuch führen.'],
    rettung: ['Eigenschutz vor Menschenrettung; Verletzte zuerst retten und medizinisch versorgen, Dekon nachrangig, sofern keine lebensbedrohliche Kontamination.', 'Rettungsdienst/Krankenhaus über mögliche Kontamination informieren.'],
    messen: ['Dosisleistung (FMG/Dosisleistungsmessgerät), Kontaminationsnachweis (Kontaminationsmonitor), Gammaspektrometrie zur Nuklidzuordnung; Messpunkte georeferenziert dokumentieren.'],
    hinweise: [`Halbwertszeit ${n.half_life}.`, 'Richtwerte; QUELLE ERFORDERLICH – Strahlenschutz-Fachberatung/Einsatzvorschrift maßgeblich. Simulations-/Rollenspielhilfe.'],
  };
}
export function bioResponse(b: { name: string; kind: string; transmission: string }): Response {
  return {
    gefahren: [`${b.kind}: biologische Gefahr – Übertragung: ${b.transmission}.`, 'Vor-Ort-Messgeräte können biologische Gefahren allenfalls als Screening anzeigen; Bestätigung nur im zuständigen Labor.'],
    absperrung: ['Bereich absperren, Zutritt beschränken; keine Verschleppung (Personen, Fahrzeuge, Luft); Lüftung/Klima abschalten bei Innenräumen.', 'Gesundheitsamt, Polizei und ggf. Landesbehörden informieren.'],
    schutz: ['Eigenschutz: Chemikalien-/Infektionsschutzkleidung, Handschuhe, Atemschutz (je nach Lage umluftunabhängig/Partikelfilter) – Vorgaben der Fachberatung.', 'Probenahme nur durch geschulte Kräfte.'],
    brand: ['Löschmittel auf Umgebungsbrand abstimmen; Löschwasser auffangen.'],
    freisetzung: ['Verdächtiges Material nicht berühren/aufwirbeln; abdecken, Bereich sichern; Spezialkräfte anfordern.'],
    dekon: ['Dekon von Personen/Geräten über Dekon-Strecke; Kleidung ablegen, Haut mit Wasser und Seife waschen; Desinfektion nach Vorgabe der Fachberatung; Abwasser auffangen.'],
    rettung: ['Eigenschutz vor Menschenrettung; Betroffene isoliert halten, Rettungsdienst/Gesundheitsamt informieren; Kontaktpersonen erfassen.'],
    messen: ['Probenahme und Transport nach BBK-/Landesvorgaben (Chain of Custody); Wetter und Position dokumentieren.'],
    hinweise: ['Richtwerte; QUELLE ERFORDERLICH – Gesundheitsbehörden/RKI-Fachinformation maßgeblich. Simulations-/Rollenspielhilfe.'],
  };
}
