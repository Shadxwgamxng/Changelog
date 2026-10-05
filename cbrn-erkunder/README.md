# CBRN Erkunder Software (Simulation)

Eigenständige Web-App, die den digitalen Arbeitsplatz eines deutschen CBRN-Erkundungswagens (neue ErkW-Generation, konzeptionell nach öffentlichen BBK-Informationen) nachbildet – als Grundlage für ein späteres FiveM-NUI.

> **SIMULATION.** Stoff-/Nuklid-/Agensdaten sind fachliche Referenzdaten aus öffentlichen Quellen, **aber noch nicht gegen die Primärquellen geprüft** (Status `unverified`, Abrufdatum/Datenstand „NICHT DOKUMENTIERT“). Messwerte, GPS, Einsätze, Identifikationen und Laborergebnisse sind **simuliert** – auch wenn FiveM verbunden ist. Kein offizielles Produkt einer Behörde; das Logo (`public/logo.png`) wurde vom Betreiber bereitgestellt.

## Start

Einfachster Weg: **`start.bat`** (Windows) bzw. `./start.sh` doppelklicken/ausführen – installiert beim ersten Mal alles (die ZIP enthält die fertig gebaute App), startet und öffnet den Browser (http://localhost:3001). Voraussetzung: Node.js 22+.

```bash
npm install
npm run dev        # API :3001 + Web :5173 (http://localhost:5173)
# oder
npm run build && npm run start   # alles auf http://localhost:3001
```

Die SQLite-Datenbank (`data/cbrn.db`) wird beim ersten Start angelegt und befüllt (`npm run db:reset` setzt zurück). Rollen wechselt man oben rechts (Erkunder / Truppführer / Messleitung / Administrator).

## Optik

Dunkle, neutrale Oberfläche mit orangem Akzent, Geist-Schrift (lokal eingebunden, SIL OFL), einklappbare Seitenleiste mit Symbolen (lucide, ISC) und Karten/Chips in der Art moderner Fraktionsverwaltungs-Tools wie ignis (EmergencyForge). Es wurde nur die Gestaltungsidee nachempfunden – kein Code, keine Grafiken und keine Markenzeichen aus ignis (GPL-3.0) übernommen. Die Farb-Token stehen in `tailwind.config.js` und `src/index.css`.

## Funktionen für den Einsatz im Spiel

* **Messfahrt:** „▶ Messfahrt starten“ (Dashboard, Live-Messung, Karte, Fahrzeug). Mit FiveM-Verbindung kommen Position, Geschwindigkeit und Kurs **dauerhaft aus GTA** auf die Karte (Track, Strecke, Messpunkte werden aufgezeichnet); ohne FiveM fährt die Demo-Route. Übersicht unter Historie → Messfahrten.
* **Probe analysieren:** Probenahme → Probe wählen → „Probe analysieren“ (oder „Schnellanalyse“). Angaben: Herkunft, Aggregatzustand, entflammbar?, Geruch, Farbe, pH, Verhalten mit Wasser, Messwerte (PID/EX/CO/H₂S/O₂/Dosisleistung/Gamma-Linien), IMS-/Prüfröhrchen-Anzeige, UN-Nummer, eigene Vermutung, Symptome. Ergebnis: bewertete Stoffvorschläge (Hinweis / Verdacht / mögliche Identifikation) mit Begründung (✓/✗), nächsten Schritten und Link zu den Handlungsempfehlungen. Eine *bestätigte* Identifikation gibt es nur über das (simulierte) Labor.
* **Stoff-Wiki:** 90+ Stoffe, filterbar nach Merkmalen (brennbar, giftig, ätzend …) und Herkunft; jede Stoff-/Nuklid-/Agens-Seite hat **Handlungsempfehlungen** (Gefahren, Absperrung, Schutz, Brandbekämpfung, Freisetzung, Dekon, Rettung/Erste Hilfe, Messtechnik). Diese sind **klassenbasierte Richtwerte** (GAMS-Regel, FwDV 500), nicht stoffspezifisch geprüft – bitte mit Einsatzleiter-Wiki/GESTIS/ERG abgleichen und über Import/Administration anpassen.
* **Wetterdaten kopieren:** Button auf Wetter, Dashboard und Karte (mehrzeilig oder Kurzform). Mit FiveM kommen Wetterlage, Wind (kommt aus …) und Spielzeit aus GTA; Temperatur/Luftfeuchte/Druck werden daraus abgeleitet (GTA kennt sie nicht).
* **Ohne Spiel testen:** `npm run fivem-sim` sendet simulierte GTA-Telemetrie (Position + Wetter) an das Backend.

## Geräte-Grafiken

Jede Geräteseite (Messgeräte → Gerät anklicken) zeigt eine **eigene Vektorgrafik** des Geräts mit nummerierten Beschriftungen und den Live-Werten (Display, Sonde/Einlass, Status, GPS, Auftrag …); Zahl anklicken für Details. Für CoMo, MGMG, PID, Dosisleistungsmesser und IMS werden die vom Betreiber gelieferten Grafikdateien verwendet (`public/devices/<gerät>.png`; Display-Fläche und Beschriftungsanker in `src/components/deviceImages.ts`), FMG und Prüfröhrchen sind eigene schematische Zeichnungen (`src/components/DeviceFigure.tsx`). Eigene Bilder austauschen: Datei ersetzen und Display-/Ankerkoordinaten in `deviceImages.ts` anpassen.

## GTA-5-Karte

Die App läuft ausschließlich auf der GTA-V-Karte (`public/maps/gta5.webp`, vom Betreiber bereitgestellt). Positionen kommen als Spielkoordinaten (x/y in Metern) direkt aus FiveM. `config.json → gta5.bounds` legt fest, welchen Spielkoordinaten-Bereich das Bild abdeckt (aus Orientierungspunkten wie Flugplätzen/Stadtzentrum geschätzt, Abweichung bis ca. 200 m). Feinkorrektur ohne Neustart: **System → Konfiguration → Kartenversatz**. Eigenes Kartenbild: Datei ersetzen und `bounds` anpassen. Ohne FiveM-Verbindung bleibt das Fahrzeug am Einsatzzentrum (`gta5.center`, Standard Legion Square) stehen.

## Aufbau

| Teil | Inhalt |
|---|---|
| `server/` | Fastify + node:sqlite (relationales Schema, portables SQL → PostgreSQL), REST-API, WebSocket `/ws`, Simulationsengine, Berichte (PDF/CSV/JSON), Import (CSV/JSON mit CAS-Prüfziffer), Audit-Log |
| `server/data/` | Seed: 28 Stoffe (inkl. 7 Kampfstoffe, nur Identifikationsdaten), 13 Radionuklide, 9 biologische Agenzien, Geräte, Verfahren, Prüfröhrchen, Quellen, Szenarien |
| `src/` | React + TypeScript + Vite + Tailwind, MapLibre GL, Recharts, HashRouter (NUI-tauglich) |
| `fivem-adapter/` | Optionale FiveM-Ressource (Lua): sendet Position/Speed/Heading an die API |
| `public/config.js` | Laufzeitkonfiguration: `apiBase`, `wsUrl`, `tileUrl` (leer = komplett offline) |

## Fachlogik

* Arbeitsablauf: Messwert → Gerätehinweis → Stoffgruppe → mögliche Stoffe → weitere Messung/Probe → Laborbefund. Stufen: *Hinweis / Verdacht / mögliche Identifikation / bestätigte Identifikation*.
* **PID** (10,6 eV) spricht nur an, wenn die Ionisierungsenergie des Stoffs darunter liegt (z. B. Chlor: kein Ansprechen) und liefert nur *SCREENING / HINWEIS*.
* **MGMG**-Kanäle sind konfigurierbar (System → Konfiguration); Alarmschwellen sind als Simulationswerte gekennzeichnet.
* **Gammaspektrum** wird aus IAEA-Linienenergien + Szenario erzeugt, die Nuklidzuordnung per Linienvergleich – immer als *SIMULIERTE AUSWERTUNG* markiert.
* **Wind** wird als meteorologische Richtung geführt („Wind kommt aus NW“); die Ausbreitungsfahne läuft entgegengesetzt.
* Datenherkunft je Messpunkt: `REAL DATA` · `SIMULATED DATA` · `MANUAL ENTRY` · `DATABASE REFERENCE`.

## API (Auszug)

`GET /api/substances[?q&cat&state&group&hazard&method&device&cas&un]`, `/api/substances/:id`, `/api/radionuclides`, `/api/biological-agents`, `/api/vehicles`, `/api/missions` (POST), `/api/measurements` (POST/PATCH), `/api/samples` (POST, `/:id/events`, `/:id/lab`), `/api/weather`, `/api/alarms`, `/api/audit`, `/api/search?q=`, `/api/reports` (+ `/:id/pdf|csv`), `/api/import/:table`, `/api/admin/:table`, `POST /api/adapter/fivem/telemetry`.
WebSocket-Events: `vehicle.position`, `vehicle.status`, `measurement.created|updated`, `mission.created|updated`, `sample.created`, `alarm.created`, `weather.updated`, `reading.live`, `system.status`.

## FiveM

1. Backend starten, `FIVEM_TOKEN` setzen.
2. `fivem-adapter/` als Ressource einbinden, `config.lua` anpassen (Fahrzeugmodelle, API-URL, Token).
3. `Config.WebUrl` auf die vom Spieler erreichbare Adresse der Web-App setzen; `/cbrn` bzw. Taste F7 öffnet die Web-App als NUI-Fenster (ESC schließt). Die Web-App läuft auf dem Server-Rechner (`start.bat`), die Ressource sendet nur Position, Kurs, Speed und GTA-Wetter. Wind-Richtung ggf. über `Config.WindVectorIsTravelDirection` anpassen.
4. Sobald Telemetrie eintrifft, zeigt die Kopfzeile **FIVEM VERBUNDEN**; 10 s ohne Telemetrie → **FIVEM GETRENNT**. Spielkoordinaten werden direkt übernommen.

## GESTIS-Abgleich

`npm run gestis-check` (Internet nötig) gleicht CAS-Nummer und Stoffname aller Stoffe mit dem **öffentlichen GESTIS-Stoffindex** ab (nur CAS, Name, ZVG-Nr.; Ergebnis in `server/data/gestis-index.json`). Bestätigte Stoffe erhalten den Status „CAS/NAME GEPRÜFT" und einen Link auf ihren GESTIS-Eintrag. Die Stoffeigenschaften selbst (Einstufung, physikalische Daten) sind **nicht** übernommen, weil die GESTIS-Artikel nur über eine geschützte Schnittstelle erreichbar sind – dafür ist eine Lizenz/Zugang der DGUV nötig. Stand: 91 von 93 Stoffen im Index gefunden (VX und Flüssiggas nicht).

## Offene Punkte / Hinweise

* Fachdaten gegen GESTIS/ECHA/NIOSH/NIST/IAEA/OPCW/RKI prüfen und `quality`, `last_checked`, Quellen-`retrieved_at`/`data_stand` pflegen (Import- und Admin-Funktion vorhanden).
* Prüfröhrchen-Messbereiche: `QUELLE ERFORDERLICH` (Herstellerdatenblätter einpflegen). Chargen/Verfall sind simulierte Inventardaten.
* IMS-Treffer (`ims_sim`) sind Szenarioannahmen, keine Aussage über reale Gerätebibliotheken.
* Keine Authentifizierung (Rollenumschaltung in der Kopfzeile).
* Tablet-Ansicht: reduziertes Raster per CSS (≤ 1100 px); nicht alle Seiten sind für Touch optimiert.

## Anmeldung am Fahrzeug

Beim Öffnen der Seite wählt man eines von zwei Fahrzeugen (**Florian Falkenwalde 11-71-01** / **Florian Falkenwalde 01-71-01**), gibt Name und Funktion ein und hat danach vollen Zugriff. Messfahrten, Track, Spektrum und Proben gehören zum angemeldeten Fahrzeug.

FiveM: Fahrzeug-IDs sind `FFW-11-71-01` und `FFW-01-71-01`. Im NUI sendet die Web-App nach der Anmeldung `cbrn-vehicle` an den Adapter; die Telemetrie wird dann diesem Fahrzeug zugeordnet (Standard: `Config.Vehicle`). Simulator: `node tools/fivem-sim.mjs http://localhost:3001 dev-token FFW-01-71-01`.
Hinweis: Beim ersten Start mit dieser Version werden alte Betriebsdaten (CBRN-0x) verworfen.
