# Handmessgeräte-System – Recherche, Architektur, Bedienung

> **Alle Messwerte im Spiel sind Trainings-/Spielsimulation.** Sie ersetzen keinen realen Einsatzmesswert.

## 1. Bestand (Phase 1)

| Bereich | Vorhanden (wiederverwendet) |
|---|---|
| NUI | `web/index.html` (Shell, HUD, Pin) + React-Computer unter `app/`; **neu:** `web/devices.js/.css` (Geräte-UI, getrennt vom Computer) |
| Interaktion | Pin-Kreis am Fahrzeug-Offset (`client/interaction.lua`), `sample_config.lua`, Offset Finder (`client/offset.lua`) |
| Server | `server/sampleEvents.ts` (Punktprüfung `checkPoint`, `resolveVehicleId`), Router/API, Sim (`sim.ts`), Brand/Rauch (`fire.ts`) |
| Datenbank | `measurements` (Messpunkte, Karte, Computer), `samples`, `alarms`, Stoffdatenbank (`substances`, `radionuclides`) |
| Computer | Messpunkte-Seite, Karte, Geräteseite, Alarme |

## 2. Recherche (Phase 2) – Ausstattung CBRN-ErkW (neue Generation, BBK)

Öffentlich belegt (BBK/Presse): FMG (fahrzeuggestütztes Gamma-Messsystem, fährt mit), **Ionenmobilitätsspektrometer Bruker RAID-M 100**, **PID Ion Science TIGER**, Mehrgasmessgeräte, Prüfröhrchen, Dosisleistungsmessgerät (Vorgängergeneration: FH 40 G), Kontaminationsnachweisgerät, Probenahmesätze; digital vernetzte Messdatenerfassung mit Ort/Zeit.
**Nicht öffentlich belegt:** exakte Typen/Bestückung jedes Handgeräts der BBK-Fahrzeuge – deshalb stehen die **Gerätetypen aus deinen Gerätebildern** in der Konfiguration (`model`) und sind jederzeit austauschbar.

| Gerät (Bild) | Zweck | Messgröße / Einheit | Messbereich (belegt) | Bedienung | Quelle |
|---|---|---|---|---|---|
| Thermo RadEye PRD-ER4 (DLM) | Ortsdosisleistung | µSv/h (nSv/h…Sv/h) | 10 nSv/h–250 µSv/h (Low-Rate-Detektor), bis 10 Sv/h (High-Rate) | Tasten Menu, Info, Mute, On/Screen | Thermo Fisher Produktseite RadEye PRD-ER4 |
| (Vorgänger-Doku) FH 40 G | Dosisleistung | Sv/h, R/h, Gy/h wählbar | 10 nSv/h–1 Sv/h (Sv-Version) | – | Thermo Fisher FH 40 G |
| Graetz CoMo 170 ZS (CoMo) | Oberflächenkontamination α und β/γ | cps (Ip/s), alternativ Bq, Bq/cm² | α bis 2.500 Ip/s, β/γ bis 20.000 Ip/s; 170 cm² Fläche | 5 Funktionstasten | Hersteller-/Händlerdatenblatt CoMo 170 |
| Ion Science TIGER (XTL im Bild) | VOC-Screening | ppm | 1 ppb–20.000 ppm (TIGER XT), Ansprechzeit ~2 s | Tasten A, B, ▲, ▼, Esc | Ion Science Datenblatt (XTL-Bereich: TODO prüfen) |
| Bruker RAID-M 100 (IMS) | Detektion CWA/TIC | Gefahrenstufe in 8 Balken je Klasse G, H, T | – | Alarm akustisch+LED, Auto-Purge | Bruker Produktseite |
| Dräger X-am 8000 (MGMG) | Mehrgas | O₂ Vol%, CO/H₂S ppm, CH₄ %UEG … | O₂ 0–25 Vol%, CO 0–2000 ppm (LC), H₂S 0–100 ppm (LC), CH₄ 0–100 %UEG | 3 Tasten; CO-Alarm A1 20 / A2 40 ppm | Dräger Produktinformation X-am 8000 |

**Quellenlinks** (WebSearch-Ergebnisse, im Entwicklungslauf abgerufen):
BBK Pressemitteilung „Die neue Generation: CBRN-Erkundungswagen“ (bbk.bund.de), Feuerwehrmagazin/Rettungsdienst-Berichte zu den neuen ErkW,
Thermo Fisher RadEye PRD-ER4 und FH 40 G, Graetz/Nuviatech/rapp-iso CoMo 170, Ion Science TIGER Datenblatt, Bruker RAID-M 100, Dräger X-am 8000.
Die BBK-Seiten konnten im Sandbox-Netz **nicht direkt geöffnet** werden (nur Suchauszüge) – Details bitte gegenprüfen.

Alles, was nicht aus diesen Quellen stammt (Schwellen, Aufwärmzeiten, Messdauern, Auflösungen, Nullung, Tastenbelegung der Geräte, Rauschmodell), ist in `server/hdev/defs.ts` als **`SIM`/`TODO`** markiert.

## 3. Architektur (Phase 3)

```
 FiveM-Spieler ── E/Pin ──► client/devices.lua ──cbrn:dev:*──► server/hdev/events.ts   (Prüfung: Fahrzeug, Punkt, Abstand, Tod/Trennung)
                                  │ NUI                                  │
                          web/devices.js (Geräte-UI)                     ▼
                       Tasten/Tastatur → nur Aktionen          server/hdev/service.ts  (Zustandsmaschine, Bestand, Batterie, Speichern)
                                  ▲                                      │ ruft
                    cbrn:dev:state (Anzeigewerte)                        ▼
                                                        engine.ts (Ansprechzeit, Rauschen, Bereich, Schwellen)
                                                                         │ liest
                                                                         ▼
                                      env.ts (Messumgebung: Hintergrund + Einsatzlage sim.ts + Rauch fire.ts + Messquellen DB)
 Speichern ──► storeMeasurement() ──► Tabelle measurements ──► Computer „Messpunkte“ (Liste, Details, Verlauf) + Einsatzkarte + Alarme
```

* **Messlogik nur im Server** (`server/hdev/*`). Die UI zeigt an und sendet Tastenaktionen; Messwert, Alarm, Bestand, Position und Speichern entstehen serverseitig (Position: `GetEntityCoords(GetPlayerPed(src))`).
* **Neue Geräte:** `registerMeasurementDevice({...})` (+ optional `registerEngine`) in `defs.ts`, dazu ein Skin in `web/devices.js` (`SKINS.<ui>`).

## 4. Messmodell

* Hintergrund (Dosis ~0,085 µSv/h, Nullrate ~1,1 cps, VOC ~0,06 ppm, O₂ 20,9 Vol% …) + Einsatzlage (bestehende Ausbreitung) + Brandrauch + **Messquellen**.
* Radiologisch: Abstandsgesetz `D = I / max(d, 0,3 m)²` (I = µSv/h in 1 m), weicher Auslauf zwischen Radius und 1,5 × Radius.
* Chemisch: windgerichtete Fahne (Gauß), Stoffeigenschaften aus der Stoffdatenbank (`substanceId`, nicht kopiert).
* Gerät: Zeitkonstante je Gerät (Wert „läuft“ zum wahren Wert), Poisson-/Relativrauschen das mit der Messzeit sinkt, Bereichsende („OVER“), Auflösung, „stabil“-Kriterium nach Messdauer (schnell/normal/genau), Nullpunktdrift (Nullung setzt zurück).
* Quellen sind für Spieler **nie sichtbar** – nur das Gerät steigt.

## 5. Bedienung im Spiel

1. Am Fahrzeug im Kreis **J halten** (Messgerätefach; ohne eigenen `device`-Punkt teilt es sich den Kreis mit dem Probenset und zeigt ein Auswahlmenü).
2. Gerät wählen → Gerät-UI erscheint unten rechts. **E** = Maus-Bedienmodus (Tasten anklicken), **Pfeile/Enter** bedienen das Gerät, **⌫** blendet aus/ein.
3. Einschalten → Initialisierung → Selbsttest → BEREIT → **Messung starten (OK/Enter)** → Wert läuft → STABIL → Menü → **Messung speichern** (Bezeichnung, Bemerkung, Probe).
4. Messpunkt erscheint im Computer (Messpunkte, Details mit Verlaufsgrafik) und auf der Karte. Am Fach **J halten** → Gerät zurücklegen.

Admin: `/offset` (Punktarten sample/storage/device/computer/equipment), `/createcbrnsource`, `/clearcbrnsources`, `/debugdevice`, `/debugmeasurement`, `/cbrndeviceerror` (nächster Selbsttest schlägt fehl).

## 5a. Tastenbelegung (nach Herstellerhandbüchern, soweit öffentlich belegt)

| Gerät | Belegung im Spiel | Beleg |
|---|---|---|
| RadEye PRD-ER4 | **On/Screen** ▼: ≥ 1 s halten = Ein, 3 s halten = Aus, kurz = Display-Beleuchtung · **Info** ▲: Anzeige wechseln (Dosisleistung → Dosis → Maximum → Info); im Menü auf · **Menu**: Menü öffnen, im Menü Auswahl · **Mute**: Alarm quittieren | Handbuch DB-117 E: EIN = On-Taste ≥ 1 s; ▲/Info kurz = weitere Anzeigen; Pfeile blättern im Menü, Menu-Taste wählt; Mute/Alarm-Quittierung. *Display-Beleuchtung und 3-s-Aus = Annahme* |
| CoMo 170 ZS | **Oben links**: kurz = Kurzmenü (u. a. Nulleffekt-Messung), halten = Aus · **Oben rechts**: Ton aus / quittieren · **Pfeile**: im Menü auf/ab, im Hauptbild Kanal α ↔ β/γ · **Enter**: Messung Start/Stop, im Menü Auswahl | Bedienungsanleitung CoMo 170 ZS (BABS/Graetz): 5 Funktionstasten, Taste oben links Ein/Aus + Kurzmenü + Nulleffektmessung, oben rechts Ton unterdrücken, Pfeile + Enter im Menü. *Einschalten über die Taste oben links und Kanalumschaltung = Annahme* |
| TIGER (XTL im Bild) | **A** Soft-Taste „Nullung“ · **B** Soft-Taste „Menü“ · **▲▼** Anzeige/Menü · **Esc** abbrechen · **Enter/On/Off** (unten rechts im Mittelkreis): kurz = Ein, im Betrieb Start/Stop, halten = Aus mit 3-s-Countdown | TIGER-Handbuch: Soft-Tasten A/B (frei belegbar), Auf/Ab, Esc, Enter/On/Off; EIN = einmal drücken, AUS = halten (3-s-Countdown); „Zero“-Soft-Taste. *Belegung A/B ist Annahme (laut Handbuch konfigurierbar)* |
| X-am 8000 | **▼** = ☰ Menü (im Menü ab) · **OK** = 🔍 Alarm quittieren / Detail, im Menü Auswahl, halten = Ein (1 s) / Aus (3 s) · **▲** = ★ Start/Stop (im Menü auf) | Dräger-Produktinformation: Bedienung über drei Tasten. Die Symbole ☰ 🔍 ★ am Displayrand gehören laut Gerätebild zu den Tasten. *Haltezeiten und genaue Funktionen = Annahme, Technisches Handbuch X-am 3500/8000 bitte gegenprüfen* |
| RAID-M 100 | Drehknopf: links = Menü/auf, drücken = Start/Stop (halten: Ein/Aus), rechts = Info/ab | **TODO**: Bedienung nicht öffentlich belegt (nur Hersteller: 1–5 min Kaltstart bis messbereit – hier 60 s Selbsttest) |

Bei allen Geräten bedienen **Pfeiltasten + Enter** (Enter halten = Ein/Aus) die Tasten; **´** (Taste rechts neben ß, FiveM-Name `EQUALS`) schaltet den **Mauszeiger** ein, ´ oder ESC schaltet ihn aus. Rücktaste blendet das Gerät aus/ein.

## 5b. Sounds

* Dräger (X-am/MGMG): Aufnahme `web/sounds/mgmg_alarm.ogg` – Alarm läuft als Schleife bis quittiert (OK) oder Wert wieder normal; Warnung = einzelner Zyklus alle 5 s.
* RadEye: Aufnahme `web/sounds/dlm_alarm.ogg` – einmal bei Alarm, Wiederholung alle 20 s bis Mute.
* Atemschutz „Gerät leer“: Aufnahme `web/sounds/pa_leer.ogg` – im Computer einmal bei Pfeife (55 bar) und einmal bei leer.
* CoMo, TIGER, RAID-M 100: keine Aufnahme vorhanden → neutrale WebAudio-Töne.
* Die Datei `am-2500---alarms.mp3` enthält laut Spektralanalyse überwiegend Sprache/tieffrequentes Signal (kein klarer Alarmton) und wurde **nicht** verwendet.

## 6. Bekannte Grenzen / TODO

* Reale Tastenbelegung und Menüs der Geräte (CoMo, TIGER, RAID-M 100) nicht aus Handbüchern übernommen → TODO.
* Bestand und Batterie liegen im Arbeitsspeicher (Neustart der Ressource setzt auf 100 % zurück).
* Biologische Quellen werden von den Handgeräten nicht gemessen (nur Proben/Analyse).
* Kein 3D-Prop (optional über `Config.Devices.Props`).
* Export (CSV/PDF) vorbereitet (Datenstruktur: `measurements.series/stats/pos`), noch nicht implementiert.
