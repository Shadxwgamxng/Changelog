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
