# Alarm24

Alarm24 ist eine digitale Alarmierungs-App für ehrenamtliche Einsatzkräfte in FiveM,
funktional angelehnt an Alarmierungsplattformen wie DIVERA 24/7.

## Die wichtigste Regel

**Alarm24 trifft niemals selbst eine Alarmierungsentscheidung.**

Es gibt keinerlei Logik der Art "Einsatzstichwort → Organisation alarmieren". Alarm24
wartet ausschließlich darauf, dass die Leitstelle von **EmergencyDispatch** eine
*konkrete* Person alarmiert. Erst dann wird genau diese Person über Alarm24 auf ihrem
FiveM-Handy benachrichtigt.

```
EmergencyDispatch Leitstelle
        ↓
EmergencyDispatch alarmiert Person X
        ↓
Alarm24 erkennt Person X
        ↓
Alarm24 alarmiert Person X
```

Alarmiert EmergencyDispatch niemanden, passiert in Alarm24 nichts. Alarmiert
EmergencyDispatch fünf Personen, erzeugt Alarm24 fünf unabhängige Alarmierungen mit
jeweils eigenem Rückmeldungsstatus.

## Voraussetzungen

- [oxmysql](https://github.com/overextended/oxmysql)
- Eine laufende EmergencyDispatch-Resource (Name konfigurierbar, siehe unten)
- Framework optional (ESX / QBCore / qbx_core werden automatisch erkannt, ansonsten
  Standalone-Betrieb über FiveM-Identifier)

## Installation

1. Ordner `alarm24` nach `resources/` kopieren.
2. `sql/install.sql` in die Datenbank importieren.
3. `ensure alarm24` in die `server.cfg` eintragen (nach `oxmysql` und nach
   `EmergencyDispatch`).
4. `config.lua` anpassen (siehe unten).
5. Benutzer hinterlegen, entweder über die Server-Konsole:
   ```
   alarm24adduser license:xxxxxxxx "Max Mustermann" "Feuerwehr Musterstadt"
   ```
   oder im Spiel über `/alarm24admin` (benötigt die ACE-Permission `alarm24.admin`).

## EmergencyDispatch-Integration anpassen

**Das ist der wichtigste Konfigurationsschritt.** Die tatsächlichen Event-/Export-Namen
und die Datenstruktur hängen von der real eingesetzten EmergencyDispatch-Version ab und
wurden hier bewusst **nicht erfunden**. Passe stattdessen `Config.EmergencyDispatch` in
`config.lua` an:

| Einstellung | Bedeutung |
|---|---|
| `incoming.eventName` | Name des Events, das EmergencyDispatch feuert, sobald die Leitstelle eine Person alarmiert |
| `incoming.useExport` | Aktiviert den Export `exports['alarm24']:OnEmergencyDispatchAlarm(data)`, falls EmergencyDispatch (oder ein Vermittler-Skript) lieber direkt einen Export aufruft |
| `fieldMapping` | Ordnet EmergencyDispatch-Feldnamen den internen Alarm24-Feldern zu (unterstützt verschachtelte Pfade wie `"coords.x"`) |
| `recipientsListField` | Falls EmergencyDispatch mehrere alarmierte Personen in einem Payload bündelt |
| `outgoing.enabled` | Nur aktivieren, wenn EmergencyDispatch tatsächlich eine Schnittstelle für Rückmeldungen (Zusage/Absage) bereitstellt |

Die vollständige Erklärung inkl. Beispielen steht in
[`integrations/emergencydispatch.lua`](integrations/emergencydispatch.lua).

Findet EmergencyDispatch keine passende Schnittstelle (weder Event noch Export), bleibt
`Config.EmergencyDispatch.outgoing.enabled = false` – Rückmeldungen werden dann
ausschließlich lokal in Alarm24 gespeichert (Historie, Statistik), aber nicht an
EmergencyDispatch zurückgemeldet.

## Ablauf für die Einsatzkraft

1. EmergencyDispatch alarmiert eine konkrete Person.
2. Alarm24 erkennt den zugehörigen Alarm24-Benutzer anhand des FiveM-Identifiers.
3. Ist der Spieler online, öffnet sich sofort ein Vollbild-Alarm-Popup mit Alarmton,
   Einsatzstichwort, Ort, Uhrzeit, Priorität und Einsatztext.
4. Der Spieler antwortet mit **Zusagen**, **Absagen** oder **Später**.
5. Die Antwort wird gespeichert und – sofern konfiguriert – an EmergencyDispatch
   zurückgemeldet.
6. Ist der Spieler offline, wird die Alarmierung gespeichert und beim nächsten Login als
   verpasste Alarmierung angezeigt.

## Bedienung

- `F6` (konfigurierbar über `Config.OpenKeyMapping`) oder `/alarm24` öffnet die App.
- `/alarm24admin` öffnet den Adminbereich (nur mit ACE-Permission `alarm24.admin`).

## Sicherheit

- Der Client kann niemals selbst behaupten, alarmiert worden zu sein. Jede Alarmierung
  wird ausschließlich serverseitig durch die EmergencyDispatch-Integration erzeugt.
- Ein Spieler kann ausschließlich auf seine eigene Alarmierung antworten
  (Eigentümerprüfung in `server/alarms.lua`).
- Der Adminbereich verwaltet nur Benutzer/Zuordnungen/Logs und disponiert niemals
  Einsätze.

## Performance

Alarm24 arbeitet vollständig eventbasiert. Es existiert kein Loop, der Datenbank oder
Spielerzustand periodisch abfragt – im Leerlauf verbraucht die Resource praktisch 0.00 ms.

## Dateistruktur

```
alarm24/
├── fxmanifest.lua
├── config.lua
├── client/            (NUI-Steuerung, Alarm-Popup, Navigation)
├── server/             (Alarmlogik, Benutzerverwaltung, Datenbank, Berechtigungen)
├── integrations/
│   └── emergencydispatch.lua   (einzige Schnittstelle zu EmergencyDispatch)
├── shared/            (Locales, Utils)
├── web/               (NUI-App: Start, Alarmierungen, Einsätze, Profil, Einstellungen)
└── sql/install.sql
```
