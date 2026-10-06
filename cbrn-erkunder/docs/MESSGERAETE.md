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

Öffentlich belegt (BBK/Presse): FMG (fahrzeuggestütztes Gamma-Messsystem, fährt mit), **Ionenmobilitätsspektrometer (IMS)**, **Photoionisationsdetektor (PID)**, Mehrgasmessgeräte, Prüfröhrchen, Dosisleistungsmessgerät, Kontaminationsnachweisgerät, Probenahmesätze; digital vernetzte Messdatenerfassung mit Ort/Zeit.
**Nicht öffentlich belegt:** exakte Typen/Bestückung jedes Handgeräts der BBK-Fahrzeuge – deshalb stehen die **Gerätetypen aus deinen Gerätebildern** in der Konfiguration (`model`) und sind jederzeit austauschbar.

| Gerät (im Spiel) | Zweck | Messgröße / Einheit | Messbereich (Herstellerangaben vergleichbarer Geräte) | Bedienung | Beleg |
|---|---|---|---|---|---|
| Dosisleistungsmessgerät DL-4 ER | Ortsdosisleistung | µSv/h (nSv/h…Sv/h) | 10 nSv/h–250 µSv/h (Niedrigdosis-Detektor), bis 10 Sv/h (Hochdosis-Detektor) | 4 Tasten: Menu, Info, Mute, On/Screen | Herstellerdatenblatt/Handbuch eines Handdosisleistungsmessers |
| Kontaminationsmonitor KM 170 | Oberflächenkontamination α und β/γ | cps (Ip/s), alternativ Bq, Bq/cm² | α bis 2.500 Ip/s, β/γ bis 20.000 Ip/s; 170 cm² Fläche | 5 Funktionstasten | Herstellerdatenblatt/Bedienungsanleitung eines Kontaminationsmonitors |
| Photoionisationsdetektor PID-XL | VOC-Screening | ppm | 1 ppb–20.000 ppm, Ansprechzeit ~2 s (genauer Bereich dieses Typs: TODO) | Soft-Tasten A/B, Auf/Ab, Esc, Enter/On/Off | Herstelleranleitung eines Handheld-PID |
| Ionenmobilitätsspektrometer IMS-100 | Detektion Kampfstoffe/Industriechemikalien | Gefahrenstufe in 8 Balken je Klasse G, H, T | – | Alarm akustisch + LED, Auto-Purge, Kaltstart bis messbereit 1–5 min | Herstellerangabe eines Handheld-IMS |
| Mehrgasmessgerät MG-8 | Mehrgas | O₂ Vol%, CO/H₂S ppm, CH₄ %UEG … | O₂ 0–25 Vol%, CO 0–2000 ppm (LC), H₂S 0–100 ppm (LC), CH₄ 0–100 %UEG | 3 Tasten; CO-Alarm A1 20 / A2 40 ppm | Produktinformation/Handbuch eines Mehrgasmessgeräts |

**Quellen:** BBK (Pressemitteilungen zur neuen ErkW-Generation), Datenblätter und Bedienungsanleitungen der jeweiligen Gerätetypen (Herstellerangaben). Die BBK-Seiten konnten im Entwicklungsumfeld nicht direkt geöffnet werden (nur Suchauszüge) – Details bitte gegenprüfen. Die Gerätebilder sind neutralisiert (Fantasiebezeichnungen, keine realen Hersteller- oder Produktnamen).

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
| Dosisleistungsmessgerät DL-4 ER | **On/Screen** ▼: ≥ 1 s halten = Ein, 3 s halten = Aus, kurz = Display-Beleuchtung · **Info** ▲: Anzeige wechseln (Dosisleistung → Dosis → Maximum → Info); im Menü auf · **Menu**: Menü öffnen, im Menü Auswahl · **Mute**: Alarm quittieren | Handbuch des Handdosisleistungsmessers: EIN = On-Taste ≥ 1 s; ▲/Info kurz = weitere Anzeigen; Pfeile blättern im Menü, Menu-Taste wählt; Mute/Alarm-Quittierung. *Display-Beleuchtung und 3-s-Aus = Annahme* |
| Kontaminationsmonitor KM 170 | **Oben links**: kurz = Kurzmenü (u. a. Nulleffekt-Messung), halten = Aus · **Oben rechts**: Ton aus / quittieren · **Pfeile**: im Menü auf/ab, im Hauptbild Kanal α ↔ β/γ · **Enter**: Messung Start/Stop, im Menü Auswahl | Bedienungsanleitung des Kontaminationsmonitors: 5 Funktionstasten, Taste oben links Ein/Aus + Kurzmenü + Nulleffektmessung, oben rechts Ton unterdrücken, Pfeile + Enter im Menü. *Einschalten über die Taste oben links und Kanalumschaltung = Annahme* |
| Photoionisationsdetektor PID-XL | **A** Soft-Taste „Nullung“ · **B** Soft-Taste „Menü“ · **▲▼** Anzeige/Menü · **Esc** abbrechen · **Enter/On/Off** (unten rechts im Mittelkreis): kurz = Ein, im Betrieb Start/Stop, halten = Aus mit 3-s-Countdown | Handbuch des PID: Soft-Tasten A/B (frei belegbar), Auf/Ab, Esc, Enter/On/Off; EIN = einmal drücken, AUS = halten (3-s-Countdown); „Zero“-Soft-Taste. *Belegung A/B ist Annahme (laut Handbuch konfigurierbar)* |
| Mehrgasmessgerät MG-8 | **▼** = ☰ Menü (im Menü ab) · **OK** = 🔍 Alarm quittieren / Detail, im Menü Auswahl, halten = Ein (1 s) / Aus (3 s) · **▲** = ★ Start/Stop (im Menü auf) | Produktinformation des Mehrgasgeräts: Bedienung über drei Tasten. Die Symbole ☰ 🔍 ★ am Displayrand gehören laut Gerätebild zu den Tasten. *Haltezeiten und genaue Funktionen = Annahme, technisches Handbuch des Geräts bitte gegenprüfen* |
| Ionenmobilitätsspektrometer IMS-100 | Drehknopf: links = Menü/auf, drücken = Start/Stop (halten: Ein/Aus), rechts = Info/ab | **TODO**: Bedienung nicht öffentlich belegt (nur Hersteller: 1–5 min Kaltstart bis messbereit – hier 60 s Selbsttest) |

Bei allen Geräten bedienen **Pfeiltasten + Enter** (Enter halten = Ein/Aus) die Tasten; **´** (Taste rechts neben ß, FiveM-Name `EQUALS`) schaltet den **Mauszeiger** ein, ´ oder ESC schaltet ihn aus. Rücktaste blendet das Gerät aus/ein.

## 5b. Sounds

* Mehrgasgerät: Aufnahme `web/sounds/mgmg_alarm.ogg` – Alarm läuft als Schleife bis quittiert (OK) oder Wert wieder normal; Warnung = einzelner Zyklus alle 5 s.
* Dosisleistungsmesser: Aufnahme `web/sounds/dlm_alarm.ogg` – einmal bei Alarm, Wiederholung alle 20 s bis Mute.
* Atemschutz „Gerät leer“: Aufnahme `web/sounds/pa_leer.ogg` – im Computer einmal bei Pfeife (55 bar) und einmal bei leer.
* Kontaminationsmonitor, PID, IMS: keine Aufnahme vorhanden → neutrale WebAudio-Töne.

## 6. Bekannte Grenzen / TODO

* Reale Tastenbelegung und Menüs der Geräte (Kontaminationsmonitor, PID, IMS) nicht aus Handbüchern übernommen → TODO.
* Bestand und Batterie liegen im Arbeitsspeicher (Neustart der Ressource setzt auf 100 % zurück).
* Biologische Quellen werden von den Handgeräten nicht gemessen (nur Proben/Analyse).
* Kein 3D-Prop (optional über `Config.Devices.Props`).
* Export (CSV/PDF) vorbereitet (Datenstruktur: `measurements.series/stats/pos`), noch nicht implementiert.
