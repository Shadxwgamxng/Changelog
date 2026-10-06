export const sources = [
  { id: 'bbk', name: 'BBK – Bundesamt für Bevölkerungsschutz und Katastrophenhilfe', document: 'CBRN-Erkundungswagen; Mess- und Nachweistechnik; CBRN-Probenahme; Einsatztaktik CBRN; Informationen zur CBRN-Messleitkomponente', url: 'https://www.bbk.bund.de', publisher_priority: 1 },
  { id: 'gestis', name: 'GESTIS-Stoffdatenbank (DGUV)', document: 'Stoffdatensätze', url: 'https://gestis.dguv.de', publisher_priority: 2 },
  { id: 'baua', name: 'BAuA', document: 'Gefahrstoffinformationen', url: 'https://www.baua.de', publisher_priority: 2 },
  { id: 'echa', name: 'ECHA – C&L Inventory', document: 'Harmonisierte Einstufung (CLP)', url: 'https://echa.europa.eu/information-on-chemicals/cl-inventory-database', publisher_priority: 3 },
  { id: 'niosh', name: 'NIOSH Pocket Guide to Chemical Hazards', document: 'Ionisierungspotenziale', url: 'https://www.cdc.gov/niosh/npg/', publisher_priority: 8 },
  { id: 'opcw', name: 'OPCW – Chemiewaffenübereinkommen', document: 'Annex on Chemicals (Listen 1–3)', url: 'https://www.opcw.org', publisher_priority: 8 },
  { id: 'iaea', name: 'IAEA – Nuclear Data Section', document: 'Live Chart of Nuclides', url: 'https://www-nds.iaea.org/relnsd/vcharthtml/VChartHTML.html', publisher_priority: 5 },
  { id: 'who', name: 'WHO', document: 'Fachinformationen', url: 'https://www.who.int', publisher_priority: 6 },
  { id: 'rki', name: 'Robert Koch-Institut', document: 'Steckbriefe / Erregerinformationen', url: 'https://www.rki.de', publisher_priority: 8 },
  { id: 'nist', name: 'NIST Chemistry WebBook', document: 'Stoffdaten', url: 'https://webbook.nist.gov', publisher_priority: 7 },
];

export const devices = [
  { id: 'ims', short: 'IMS', name: 'Ionenmobilitätsspektrometer', kind: 'chemisch', description: 'Chemisches Screening über Ionenmobilität; liefert Hinweise auf Stoffklassen/Stoffe.', unit: null, source_id: 'bbk' },
  { id: 'como', short: 'KM 170', name: 'Kontaminationsnachweisgerät KM 170', kind: 'radiologisch', description: 'Radiologischer Kontaminationsnachweis.', unit: 'cps', source_id: 'bbk' },
  { id: 'dlm', short: 'DLM', name: 'Dosisleistungsmessgerät', kind: 'radiologisch', description: 'Radiologische Messung der Dosisleistung.', unit: 'µSv/h', source_id: 'bbk' },
  { id: 'pid', short: 'PID', name: 'Photoionisationsdetektor', kind: 'chemisch', description: 'Summenanzeige flüchtiger organischer Verbindungen (VOC). Screening – keine sichere Stoffidentifikation.', unit: 'ppm', source_id: 'bbk' },
  { id: 'fmg', short: 'FMG', name: 'Fahrzeuggesteuertes Messsystem Gamma', kind: 'radiologisch', description: 'Kontinuierliche, georeferenzierte Gamma-Dosisleistungsmessung während der Fahrt.', unit: 'µSv/h', source_id: 'bbk' },
  { id: 'mgmg', short: 'MGMG', name: 'Mehrgasmessgerät', kind: 'chemisch', description: 'Mehrkanalige Gasmessung (Kanäle konfigurierbar).', unit: null, source_id: 'bbk' },
  { id: 'tubes', short: 'Prüfröhrchen', name: 'Kurzzeit-Prüfröhrchensatz', kind: 'chemisch', description: 'Chemische Messung über Prüfröhrchen (Inventar-/Informationsfunktion).', unit: 'ppm', source_id: 'bbk' },
];

export const methods = [
  { id: 'm-pid', name: 'PID-Screening', description: 'Photoionisation; Ansprechen abhängig von Ionisierungsenergie und Lampe (hier 10,6 eV).' },
  { id: 'm-ims', name: 'IMS-Screening', description: 'Ionenmobilitätsspektrometrie; Hinweis auf Stoffe/Stoffklassen.' },
  { id: 'm-tubes', name: 'Prüfröhrchen', description: 'Kolorimetrische Kurzzeit-Prüfröhrchen.' },
  { id: 'm-echem', name: 'Elektrochemischer Sensor', description: 'Gasspezifische Sensorkanäle (MGMG).' },
  { id: 'm-ph', name: 'pH-Messung', description: 'Vor-Ort-Bestimmung des pH-Werts von Flüssigkeiten.' },
  { id: 'm-gamma', name: 'Gammaspektrometrie', description: 'Energieaufgelöste Gammamessung zur Nuklidzuordnung.' },
  { id: 'm-dose', name: 'Dosisleistungsmessung', description: 'Ortsdosisleistung in µSv/h.' },
  { id: 'm-lab', name: 'Laboranalytik', description: 'GC-MS, LC-MS, PCR, Immunoassay u. a. – im Labor.' },
];

// Prüfröhrchen-Inventar (generische Bezeichnungen); Messbereiche bewusst offen => QUELLE ERFORDERLICH.
// Chargen/Verfall/Lagerstatus sind Inventardaten des Spiels.
export const tubes = [
  ['Standardsatz', 'Chlor 0,2 ppm', 'Kurzzeit', 'Chlor', '7782-50-5'],
  ['Standardsatz', 'Ammoniak 5 ppm', 'Kurzzeit', 'Ammoniak', '7664-41-7'],
  ['Standardsatz', 'Schwefelwasserstoff 0,2 ppm', 'Kurzzeit', 'Schwefelwasserstoff', '7783-06-4'],
  ['Standardsatz', 'Kohlenmonoxid 2 ppm', 'Kurzzeit', 'Kohlenmonoxid', '630-08-0'],
  ['Standardsatz', 'Schwefeldioxid 0,5 ppm', 'Kurzzeit', 'Schwefeldioxid', '7446-09-5'],
  ['Standardsatz', 'Blausäure 2 ppm', 'Kurzzeit', 'Cyanwasserstoff', '74-90-8'],
  ['Standardsatz', 'Phosgen 0,05 ppm', 'Kurzzeit', 'Phosgen', '75-44-5'],
  ['Standardsatz', 'Benzol 0,5 ppm', 'Kurzzeit', 'Benzol', '71-43-2'],
  ['Standardsatz', 'Toluol 50 ppm', 'Kurzzeit', 'Toluol', '108-88-3'],
  ['Standardsatz', 'Kohlendioxid 0,1 Vol%', 'Kurzzeit', 'Kohlendioxid', '124-38-9'],
].map(([manufacturer, product, tube_type, analyte, cas], i) => ({
  id: `T-${String(i + 1).padStart(3, '0')}`, manufacturer, product, tube_type, analyte, cas,
  range_text: null, unit: 'ppm', application: 'Orientierende Messung im Gasraum (Inventarfunktion)',
  storage_status: i === 6 ? 'Nachbestellen' : 'Verfügbar', lot: `SIM-${2400 + i * 7}`, expiry: `${2027 + (i % 3)}-0${1 + (i % 9)}-30`,
}));



export const vehicles = [
  { id: 'FFW-11-71-01', name: 'Florian Falkenwalde 11-71-01', status: 'EINSATZBEREIT', link: 'OFFLINE', online: 1, lat: 0, lon: 0, heading: 90, speed: 0, gps_fix: 0, power: 'OK' },
  { id: 'FFW-01-71-01', name: 'Florian Falkenwalde 01-71-01', status: 'EINSATZBEREIT', link: 'OFFLINE', online: 1, lat: 0, lon: 0, heading: 90, speed: 0, gps_fix: 0, power: 'OK' },
];



// Szenarien: reale Stoff-/Nuklidreferenzen, erzeugte Ereignisse. Zentrum = Einsatzzentrum aus config.json.
export const scenarios = [
  { id: 'sc-chlor', name: 'Industrieunfall Chlor', category: 'C', ref_type: 'substance', ref_id: 'chlor', radius_m: 500, devices: ['PID', 'IMS', 'MGMG'], weather: 'variabel', peak: 12, unit: 'ppm' },
  { id: 'sc-ammoniak', name: 'Industrieunfall Ammoniak', category: 'C', ref_type: 'substance', ref_id: 'ammoniak', radius_m: 600, devices: ['PID', 'IMS', 'MGMG'], weather: 'variabel', peak: 80, unit: 'ppm' },
  { id: 'sc-loesemittel', name: 'Lösemittelaustritt', category: 'C', ref_type: 'substance', ref_id: 'toluol', radius_m: 300, devices: ['PID', 'MGMG'], weather: 'variabel', peak: 120, unit: 'ppm' },
  { id: 'sc-unbekannt', name: 'Unbekannter Gefahrstoff', category: 'U', ref_type: 'substance', ref_id: 'aceton', radius_m: 250, devices: ['PID', 'IMS', 'MGMG'], weather: 'variabel', peak: 40, unit: 'ppm' },
  { id: 'sc-rad', name: 'Radiologische Quelle', category: 'R', ref_type: 'radionuclide', ref_id: 'cs-137', radius_m: 200, devices: ['FMG', 'DLM', 'KM 170'], weather: 'variabel', peak: 85, unit: 'µSv/h' },
  { id: 'sc-kontam', name: 'Kontaminierter Bereich', category: 'R', ref_type: 'radionuclide', ref_id: 'co-60', radius_m: 350, devices: ['FMG', 'DLM', 'KM 170'], weather: 'variabel', peak: 30, unit: 'µSv/h' },
  { id: 'sc-bio', name: 'Verdächtige biologische Probe', category: 'B', ref_type: 'biological', ref_id: 'b-anthracis', radius_m: 100, devices: ['Probenahme'], weather: 'variabel', peak: 0, unit: '' },
];
