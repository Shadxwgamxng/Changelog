# CBRN Erkunder Software (Simulation)

Eigenständige Web-App, die den digitalen Arbeitsplatz eines deutschen CBRN-Erkundungswagens (neue ErkW-Generation, konzeptionell nach öffentlichen BBK-Informationen) nachbildet – als Grundlage für ein späteres FiveM-NUI.

> **SIMULATION.** Stoff-/Nuklid-/Agensdaten sind fachliche Referenzdaten aus öffentlichen Quellen, **aber noch nicht gegen die Primärquellen geprüft** (Status `unverified`, Abrufdatum/Datenstand „NICHT DOKUMENTIERT“). Messwerte, GPS, Einsätze, Identifikationen und Laborergebnisse sind **simuliert** – auch wenn FiveM verbunden ist. Kein offizielles Produkt einer Behörde; das Emblem ist ein eigenes Platzhalter-Symbol (umgedrehtes Dreieck).

## Start

```bash
npm install
npm run dev        # API :3001 + Web :5173 (http://localhost:5173)
# oder
npm run build && npm run start   # alles auf http://localhost:3001
```

Die SQLite-Datenbank (`data/cbrn.db`) wird beim ersten Start angelegt und befüllt (`npm run db:reset` setzt zurück). Rollen wechselt man oben rechts (Erkunder / Truppführer / Messleitung / Administrator).

## Aufbau

| Teil | Inhalt |
|---|---|
| `server/` | Fastify + better-sqlite3 (relationales Schema, portables SQL → PostgreSQL), REST-API, WebSocket `/ws`, Simulationsengine, Berichte (PDF/CSV/JSON), Import (CSV/JSON mit CAS-Prüfziffer), Audit-Log |
| `server/data/` | Seed: 28 Stoffe (inkl. 7 Kampfstoffe, nur Identifikationsdaten), 13 Radionuklide, 9 biologische Agenzien, Geräte, Verfahren, Prüfröhrchen, Quellen, Szenarien |
| `src/` | React + TypeScript + Vite + Tailwind, MapLibre GL, Recharts, HashRouter (NUI-tauglich) |
| `fivem-adapter/` | Optionale FiveM-Ressource (Lua): sendet Position/Speed/Heading an die API |
| `public/config.js` | Laufzeitkonfiguration: `apiBase`, `wsUrl`, `tileUrl` (leer = komplett offline) |

## Fachlogik

* Arbeitsablauf: Messwert → Gerätehinweis → Stoffgruppe → mögliche Stoffe → weitere Messung/Probe → Laborbefund. Stufen: *Hinweis / Verdacht / mögliche Identifikation / bestätigte Identifikation*.
* **PID** (10,6 eV) spricht nur an, wenn die Ionisierungsenergie des Stoffs darunter liegt (z. B. Chlor: kein Ansprechen) und liefert nur *SCREENING / HINWEIS*.
* **MGMG**-Kanäle sind konfigurierbar (System → Konfiguration); Demo-Schwellen sind als solche gekennzeichnet.
* **Gammaspektrum** wird aus IAEA-Linienenergien + Szenario erzeugt, die Nuklidzuordnung per Linienvergleich – immer als *SIMULIERTE AUSWERTUNG* markiert.
* **Wind** wird als meteorologische Richtung geführt („Wind kommt aus NW“); die Ausbreitungsfahne läuft entgegengesetzt.
* Datenherkunft je Messpunkt: `REAL DATA` · `SIMULATED DATA` · `MANUAL ENTRY` · `DATABASE REFERENCE`.

## API (Auszug)

`GET /api/substances[?q&cat&state&group&hazard&method&device&cas&un]`, `/api/substances/:id`, `/api/radionuclides`, `/api/biological-agents`, `/api/vehicles`, `/api/missions` (POST), `/api/measurements` (POST/PATCH), `/api/samples` (POST, `/:id/events`, `/:id/lab`), `/api/weather`, `/api/alarms`, `/api/audit`, `/api/search?q=`, `/api/reports` (+ `/:id/pdf|csv`), `/api/import/:table`, `/api/admin/:table`, `POST /api/adapter/fivem/telemetry`.
WebSocket-Events: `vehicle.position`, `vehicle.status`, `measurement.created|updated`, `mission.created|updated`, `sample.created`, `alarm.created`, `weather.updated`, `reading.live`, `system.status`.

## FiveM

1. Backend starten, `FIVEM_TOKEN` setzen.
2. `fivem-adapter/` als Ressource einbinden, `config.lua` anpassen (Fahrzeugmodelle, API-URL, Token).
3. Optional `dist/` nach `fivem-adapter/web/` kopieren und `public/config.js` (`apiBase`, `wsUrl`) auf die Backend-Adresse setzen; `/cbrn` öffnet die NUI.
4. Spielkoordinaten → Demo-Raum: System → Konfiguration (`fivem_origin`: x, y, Meter/Spieleinheit). Sobald Telemetrie eintrifft, zeigt die Kopfzeile **FIVEM CONNECTED**; 10 s ohne Telemetrie → zurück zu **DEMO MODE**.

## Offene Punkte / Hinweise

* Fachdaten gegen GESTIS/ECHA/NIOSH/NIST/IAEA/OPCW/RKI prüfen und `quality`, `last_checked`, Quellen-`retrieved_at`/`data_stand` pflegen (Import- und Admin-Funktion vorhanden).
* Prüfröhrchen-Messbereiche: `QUELLE ERFORDERLICH` (Herstellerdatenblätter einpflegen). Chargen/Verfall sind Demo-Inventar.
* IMS-Treffer (`ims_sim`) sind Szenarioannahmen, keine Aussage über reale Gerätebibliotheken.
* Keine Authentifizierung (Demo-Rollenumschaltung). Demo-Route nicht straßengenau; OSM-Hintergrundkarte nur bei Internet (sonst Gitter/Sektoren).
* Tablet-Ansicht: reduziertes Raster per CSS (≤ 1100 px); nicht alle Seiten sind für Touch optimiert.
