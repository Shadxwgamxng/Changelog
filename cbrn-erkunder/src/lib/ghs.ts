export const H_TEXT: Record<string, string> = {
  H220: 'Extrem entzündbares Gas', H221: 'Entzündbares Gas', H225: 'Flüssigkeit und Dampf leicht entzündbar', H226: 'Flüssigkeit und Dampf entzündbar',
  H270: 'Kann Brand verursachen oder verstärken; Oxidationsmittel', H272: 'Kann Brand verstärken; Oxidationsmittel', H280: 'Enthält Gas unter Druck; kann bei Erwärmung explodieren',
  H290: 'Kann gegenüber Metallen korrosiv sein', H300: 'Lebensgefahr bei Verschlucken', H301: 'Giftig bei Verschlucken', H302: 'Gesundheitsschädlich bei Verschlucken',
  H304: 'Kann bei Verschlucken und Eindringen in die Atemwege tödlich sein', H310: 'Lebensgefahr bei Hautkontakt', H311: 'Giftig bei Hautkontakt', H312: 'Gesundheitsschädlich bei Hautkontakt',
  H314: 'Verursacht schwere Verätzungen der Haut und schwere Augenschäden', H315: 'Verursacht Hautreizungen', H317: 'Kann allergische Hautreaktionen verursachen', H319: 'Verursacht schwere Augenreizung',
  H330: 'Lebensgefahr bei Einatmen', H331: 'Giftig bei Einatmen', H332: 'Gesundheitsschädlich bei Einatmen', H335: 'Kann die Atemwege reizen', H336: 'Kann Schläfrigkeit und Benommenheit verursachen',
  H340: 'Kann genetische Defekte verursachen', H341: 'Kann vermutlich genetische Defekte verursachen', H350: 'Kann Krebs erzeugen', H360D: 'Kann das Kind im Mutterleib schädigen',
  H361d: 'Kann vermutlich das Kind im Mutterleib schädigen', H370: 'Schädigt die Organe', H372: 'Schädigt die Organe bei längerer oder wiederholter Exposition',
  H373: 'Kann die Organe schädigen bei längerer oder wiederholter Exposition', H400: 'Sehr giftig für Wasserorganismen', H410: 'Sehr giftig für Wasserorganismen mit langfristiger Wirkung',
  EUH032: 'Entwickelt bei Berührung mit Säure sehr giftige Gase', EUH066: 'Wiederholter Kontakt kann zu spröder oder rissiger Haut führen', EUH071: 'Wirkt ätzend auf die Atemwege',
};
export const P_TEXT: Record<string, string> = {
  P210: 'Von Hitze, heißen Oberflächen, Funken, offenen Flammen fernhalten. Nicht rauchen.', P233: 'Behälter dicht verschlossen halten.',
  P260: 'Gas/Dampf/Aerosol nicht einatmen.', P280: 'Schutzhandschuhe/Schutzkleidung/Augenschutz/Gesichtsschutz tragen.', P284: 'Atemschutz tragen.',
  'P303+P361+P353': 'BEI BERÜHRUNG MIT DER HAUT: Alle kontaminierten Kleidungsstücke sofort ausziehen. Haut mit Wasser abwaschen/duschen.',
  'P304+P340': 'BEI EINATMEN: Person an die frische Luft bringen und in einer Position ruhigstellen, die das Atmen erleichtert.',
  'P305+P351+P338': 'BEI KONTAKT MIT DEN AUGEN: Einige Minuten lang behutsam mit Wasser spülen. Kontaktlinsen nach Möglichkeit entfernen. Weiter spülen.',
  P310: 'Sofort GIFTINFORMATIONSZENTRUM/Arzt anrufen.', 'P403+P233': 'An einem gut belüfteten Ort aufbewahren. Behälter dicht verschlossen halten.',
};
export const GHS_PICT: Record<string, { name: string; sym: string }> = {
  GHS01: { name: 'Explodierende Bombe', sym: '✹' }, GHS02: { name: 'Flamme', sym: '♨' }, GHS03: { name: 'Flamme über Kreis', sym: '◎' }, GHS04: { name: 'Gasflasche', sym: '⬯' },
  GHS05: { name: 'Ätzwirkung', sym: '⚗' }, GHS06: { name: 'Totenkopf', sym: '☠' }, GHS07: { name: 'Ausrufezeichen', sym: '!' }, GHS08: { name: 'Gesundheitsgefahr', sym: '✚' }, GHS09: { name: 'Umwelt', sym: '❦' },
};
