# CBRN Erkunder – FiveM-Script (Simulation)

Bordcomputer für den CBRN-Erkundungswagen als **reine FiveM-Ressource**: Einsatz anlegen, Messfahrt mit GTA-Position, Messgeräte (PID, IMS, MGMG, Dosisleistung …), Probenanalyse, Stoff-/Nuklid-/Bio-Datenbank, Wetter, Aufträge, Berichte. Es läuft **kein Webserver und kein Port**: Die Oberfläche ist eine NUI, die Simulation läuft im Server-Skript der Ressource.

> Stoffdaten (CAS, UN, GHS …) sind Referenzdaten, **Messwerte, Identifikationen, Laborergebnisse und Einsatzlagen sind Simulation**. Fachdaten sind ungeprüft (siehe Quellenstatus im Programm).

## Installation

1. Den Ordner `resource/cbrn-erkunder` in den `resources`-Ordner des FiveM-Servers kopieren (fertig gebaut, nichts zu installieren).
2. In der `server.cfg`: `ensure cbrn-erkunder`
3. `config.lua` anpassen – vor allem `Config.Models` (Spawnnamen der Fahrzeuge, in denen der Computer verfügbar ist).
4. Optional `config.json` (Kartenmitte, Kartenbild-Grenzen).

Die Datenbank (`data/cbrn.db`) legt die Ressource beim ersten Start selbst an; zum Zurücksetzen Server stoppen und die Datei löschen.

## Bedienung im Spiel

- In ein Fahrzeug aus `Config.Models` einsteigen und einen **Beifahrerplatz** nehmen (der Fahrer hat keinen Zugriff).
- Hinweis „Drücke E um den Computer des CBRN-Erkunders zu öffnen“ → **E** öffnet den Computer im Monitor-Rahmen, **ESC** schließt ihn. Beim Aussteigen oder Wechsel auf den Fahrersitz schließt er sich selbst. Es gibt keinen Befehl.
- **Anmeldung am Fahrzeug:** *Florian Falkenwalde 11-71-01* oder *01-71-01* wählen, Name und Funktion eingeben – danach voller Zugriff. Erst mit der Anmeldung startet die Telemetrie (Position, Kurs, Speed, GTA-Wetter) für dieses Fahrzeug.
- **Einsatz anlegen (Pflicht):** Stichwort, Ort, Lage, Gefahrenart C/R/B/U, Menge und Einsatzstelle auf der Karte. Daraus rechnet die Simulation die Lage (Ausbreitung nach Wind). Der Wahrheitsstoff bleibt verdeckt, außer die Lage meldet ihn als bekannt; nach Einsatzende steht er unter System → Einsätze.
- **Messfahrt starten:** den eigenen Standort auf der Karte markieren; danach kommt alles Weitere aus FiveM (bei > 150 m Abweichung erscheint ein Hinweis).
- Berichte/Wetterdaten werden in die Zwischenablage kopiert (kein Datei-Download in der NUI).

## Entwickeln / selbst bauen

```
npm install
npm run build        # Oberfläche (Vite) + Server-Skript (esbuild) -> resource/cbrn-erkunder
npm run dev:sim      # Entwickler-Testserver im Browser (http://localhost:3001) mit simulierter FiveM-Telemetrie
npm run typecheck
```

Aufbau: `src/` Oberfläche (React) · `server/` Simulation, Datenbank (sql.js), Routen · `resource/cbrn-erkunder/` die fertige Ressource (`client.lua`, `web/` Monitor-Hülle, `app/` Oberfläche, `server/main.js`).

Der Server-Teil ist ein Node-Skript (Standard-Node der FiveM-Laufzeit genügt, Ziel Node 16). Falls dein Server-Artifact eine neuere Laufzeit verlangt, `node_version '22'` in die `fxmanifest.lua` eintragen.

## GESTIS-Abgleich

`tools/gestis-index-check.ts` gleicht CAS/Name mit dem öffentlichen GESTIS-Stoffindex ab (nur Index, keine Artikeldaten); Ergebnis in `server/data/gestis-index.json`.

## Probenentnahme-System

Ablauf: **Am Fahrzeug (Offset-Punkt) Probenentnahmeset nehmen → zum gewünschten Ort gehen → J = Probe dort entnehmen (Animation, Fortschritt) → Herkunft/Art/Beschreibung → Proben-ID → beschriften → Probe zurück zum Fahrzeug bringen und am Punkt abgeben (Status EINGELAGERT) → CBRN-Computer „Proben“ → Analyse starten → Ergebnis, Historie, Stoffdaten.**

**Voraussetzungen:** `ox_lib` (Pflicht), OneSync (Server-Prüfung der Entfernungen). Optional: `ox_inventory` (Items `sample_collection_kit`, `sample_container` – Einträge in `ox_inventory_items.lua`; ohne Inventar verwaltet das Skript das Set intern).

**Einrichtung**
1. Berechtigung für `/offset`, `/debugsample`, `/debugsamplepoint` (`/cbrnoffset` ist ein Alias): erlaubt ist, wer die ACE `cbrn.offset` hat (`add_ace group.admin cbrn.offset allow`), die ACE `command` (Standard-Admins), in `Config.Sample.AdminIdentifiers` steht oder Framework-Admin ist. Wird abgelehnt, steht dein Identifier mit Anleitung in der Server-Konsole.
2. Fahrzeugmodell in `Config.Models` eintragen (Standard: `ELWBlaichach`; Computer) und den Entnahmepunkt ermitteln: **`/offset`** im oder neben dem Fahrzeug. Pfeil ↑/↓ = Y (vorne/hinten), ←/→ = X (rechts/links), Bild ↑/↓ = Z, SHIFT = 0.10, STRG = 0.01, ENTER = speichern, Rücktaste = abbrechen. Nach ENTER erscheint die fertige Zeile (`Config.SamplePoints = { [`modell`] = vector3(...) }`), sie liegt in der Zwischenablage und wird in der Server-Konsole ausgegeben. Optional wird ein getrennter Ablagepunkt abgefragt (`{ sample = ..., storage = ... }`).
3. Zeile in `sample_config.lua` unter `Config.SamplePoints` eintragen, Ressource neu starten. Die Punkte sind immer lokale Fahrzeug-Offsets (keine Weltkoordinaten) und bleiben beim Fahren, Drehen und Neuspawnen korrekt.

**Bedienung:** Am Fahrzeug ist am Offset-Punkt ein **sichtbarer Kreis** (kein ox_target, kein Draufschauen nötig). Im Kreis **J gedrückt halten** (`Config.Sample.HoldTime`): ohne Set = Probenentnahmeset nehmen, mit Set = Set zurückgeben, mit Probe = Probe abgeben. Danach überall zu Fuß `J` = Probe entnehmen (kein Fahrzeug nötig; Probe wird mit der Position des Entnahmeorts auf der Karte gespeichert), Rücktaste = Entnahme abbrechen (ESC öffnet das Pause-Menü und kann nicht belegt werden). Entnommene Proben gehen nicht verloren (auch nicht bei Reconnect): Status TRANSPORT bleibt in der Datenbank, nach dem Verbinden wird die Probe wieder getragen. Ablage nur am Punkt (`Config.SampleReturnDistance`), Lager voll bei `Config.MaxSamples` je Fahrzeug.

**Architektur (Dateien)**
- `sample_config.lua` – Konfiguration (shared) · `server/bridge.lua` – Lua-Export von Config/Rechten an den JS-Server
- `client/interaction.lua` (Kreis am Punkt aus Fahrzeug+Rotation+Offset, J halten) · `client/sample.lua` (Ablauf, HUD, Tasten, Dialoge) · `client/offset.lua` (/offset)
- `server/sampleEvents.ts` – Server-Events `cbrn:sample:takeKit | startCollection | create | label | return | sync | get | getAll`, serverseitige Distanz-/Besitz-/Statusprüfung · `server/samples.ts` – **Sample Service** (Proben, Lager, Analysen, Historie; UI-unabhängig, auch für Messleitung/Berichte nutzbar) · API `GET /api/samples`, `GET /api/samples/:id`, `POST /api/samples/:id/analyses`, `POST /api/samples/:id/archive`
- `web/index.html` – HUD unten rechts · `src/pages/Samples.tsx` – Computer-Modul „Proben“

Analyse: Dauer je Art in `Config.Sample.AnalysisDurations`; das Ergebnis wird aus dem verdeckten Einsatzprofil an der Entnahmestelle simuliert und ist mehrstufig (KEIN BEFUND · UNBEKANNT · STOFFGRUPPE ERKANNT · VERDACHT · SIMULIERTE IDENTIFIKATION).

## Brandeinsatz / Rauchgasmessung

- **Einsatz anlegen:** Gefahrenart „Brand (Rauchgasmessung)“ wählen und Brandart festlegen. Die erste Brandstelle entsteht an der Einsatzstelle. Bei jedem Einsatz können auf der **Karte** (rechte Leiste → „Brandstellen“) weitere Brandstellen eingezeichnet (Brandart, Größe) und wieder entfernt werden. Die Karte zeigt Brandstelle und Rauchfahne in Windrichtung.
- **Messfahrt starten:** Auswahl **CBRN-Einsatz** oder **Brandeinsatz**. Brandeinsatz braucht mindestens eine eingezeichnete Brandstelle; bei reinem Brandeinsatz ist nur der Brandmodus möglich.
- **Brandmodus:** Das MGMG zeigt O₂, CO, CO₂, HCN, HCl, der PID VOC; Werte folgen der Rauchfahne (Wind). Schwellen sind Simulationswerte. Proben im Rauch liefern als Analyse nur die Stoffgruppe „Brandrauch“.
- Alle Werte sind **simuliert**. Eine automatische Übernahme von z_fire-Bränden ist nicht eingebaut (die Brandstellen werden manuell eingezeichnet).
