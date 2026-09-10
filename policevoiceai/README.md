# PoliceVoiceAI

PoliceVoiceAI erweitert ein FivePD-Polizei-Rollenspielsystem um echte **Voice-AI-NPCs**:
Der Spieler spricht per Mikrofon direkt mit einem Zivilisten, die Sprache wird per
Speech-to-Text erkannt, eine KI erzeugt eine zur Persönlichkeit/Situation passende
Antwort, die per Text-to-Speech vertont und räumlich (3D) am NPC abgespielt wird -
inklusive Lippensynchronisation/Gestik. Kein Menü, kein Dialogbaum: der Spieler
nähert sich einfach einem Bürger und redet.

```
Spieler-Mikrofon → NUI-Aufnahme → Speech-to-Text → Conversation Manager
→ KI/LLM (+ NPC-Persönlichkeit + kontrollierter DB-Context) → Text-to-Speech
→ 3D-Voice am NPC + Lipsync/Gestik-Animation
```

## Die wichtigste Regel

**Die KI darf niemals Fakten erfinden, die nicht in der NPC-Datenbank existieren**
(`sql/install.sql`). Sie bekommt pro Frage nur einen kontrollierten Ausschnitt der
tatsächlich gespeicherten Daten (Punkt 19 der Spezifikation) und wird explizit
angewiesen, bei allem anderen auszuweichen statt zu improvisieren. Ob ein NPC bei
einer unangenehmen Tatsache lügt, hängt von seinem `honesty`-Wert ab - die
**Datenbank selbst bleibt dabei immer wahr**, damit ein Officer eine Lüge später
über MDT, Atemalkoholtest oder Durchsuchung aufdecken kann.

## Fehlerbehebung: UI blieb dauerhaft sichtbar / Sprache unzuverlässig

Zwei kritische Bugs wurden behoben:

- **UI blieb permanent sichtbar**: `web/css/style.css` setzte auf `#hud`,
  `.indicator` und `#dialog-menu` direkt `display: flex`. Das ist eine
  Autor-Regel und schlägt die Browser-Standardregel `[hidden] { display: none }`
  (User-Agent-Stylesheet) **immer**, unabhängig von Selektor-Spezifität - Autor-
  Origin gewinnt in der CSS-Kaskade grundsätzlich gegen User-Agent-Origin. Das
  `hidden`-Attribut, das Lua/JS korrekt gesetzt hat, wurde dadurch komplett
  ignoriert. Fix: eine `[hidden] { display: none !important; }`-Regel am
  Anfang von `style.css` erzwingt jetzt immer Vorrang. Die UI wird ausschließlich
  über `element.hidden = true/false` gesteuert, ausgelöst durch echte
  Conversation-State-Events (`setConversationActive`, `setListening`,
  `setSpeaking`) - kein Dauer-Loop sendet "show".
- **Sprachinteraktion unzuverlässig**: `Config.VoiceDebug = true` aktiviert
  detailliertes `[VOICE]`-Logging der kompletten Pipeline (PTT gedrückt →
  Recording gestartet → Audio an STT → STT-Ergebnis → Text an KI →
  KI-Antwort → TTS → NPC spricht) client- und serverseitig in der Konsole -
  Fehlschläge werden immer als `[VOICE ERROR]` geloggt, unabhängig vom Schalter.
  Zusätzlich: `getUserMedia` hat jetzt ein Timeout (erkennt einen hängenden
  Berechtigungsdialog statt für immer zu warten), und `/policevoiceai_setupmic`
  gibt der NUI kurz Fokus, damit ein evtl. hängender Mikrofon-Berechtigungsdialog
  anklickbar ist.

## Spracheinstellungen (Mikrofon/Taste/Lautstärke)

Jeder Spieler kann seine eigenen Voice-Einstellungen über ein eigenes Panel
konfigurieren - Taste **F9** (über FiveM-Tastenbelegung "PoliceVoiceAI:
Spracheinstellungen öffnen" frei umbelegbar) oder `/policevoiceai_settings`:

- **Sprechmodus**: Automatisch (Server-Standard) / PMA-Voice-Erkennung / Eigene
  Taste / Sprachaktivierung.
- **Eigene Taste**: "Taste festlegen" klicken, gewünschte Taste drücken - läuft
  unabhängig von der FiveM-Tastenbelegung über `IsRawKeyDown` und funktioniert
  daher sofort, ohne dass der Spieler etwas in den FiveM-Einstellungen umlegen muss.
- **Mikrofon-Gerät**: Dropdown mit allen erkannten Eingabegeräten + Testknopf
  mit Live-Lautstärkeanzeige - direkt hilfreich, um zu prüfen, ob überhaupt ein
  Signal ankommt (siehe Fehlerbehebung oben).
- **Mikrofon-Lautstärke**: echte Verstärkung/Dämpfung (0,3x-3x) über einen
  Web-Audio-`GainNode`, der zwischen Rohsignal und sowohl der Sprachaktivierungs-
  Erkennung als auch der tatsächlich aufgenommenen/an STT gesendeten Audiodatei
  sitzt - verändert also wirklich, was übertragen wird, nicht nur eine Anzeige.
  Beim "Mikrofon testen" sofort hör-/sichtbar.
- **Empfindlichkeit**: Schwellwert für die Sprachaktivierungs-Erkennung.
- **NPC-Lautstärke**: 0-150%, wirkt auf die komplette 3D-Sprachwiedergabe.

Alle Werte werden clientseitig persistiert (`GetResourceKvp`/`SetResourceKvp`)
und überleben Server-Neustarts.

### Admin-Bereich (im selben Panel)

Spieler mit der ACE-Permission `Config.Permissions.adminAce` sehen zusätzlich
einen Server-Bereich: KI-/STT-/TTS-Provider, Standard-Sprechmodus,
Gesprächs-/Annäherungsdistanz - live änderbar, ohne `config.lua` zu bearbeiten
oder den Server neu zu starten (persistiert in `runtime_config.json` über
`SaveResourceFile`/`LoadResourceFile`). **API-Keys sind bewusst NICHT Teil
dieses Panels** (Punkt 20 - die bleiben Server-Convars, siehe unten) - ohne
gültigen Key bewirkt eine Umstellung auf z.B. `openai_tts` hier nichts, das
Panel weist im Admin-Bereich darauf hin.

**Damit NPCs tatsächlich hörbar sprechen statt nur Text anzuzeigen**, muss im
Admin-Bereich (oder in `config.lua`) `Config.TTS.provider` auf einen echten
Anbieter (`openai_tts`/`elevenlabs`) gestellt UND der zugehörige API-Key als
Server-Convar gesetzt sein (siehe "Echte Provider aktivieren"). Im
`'mock'`-Standardmodus bleibt JEDE Antwort - auch wenn ein NPC von sich aus auf
den Officer zugeht - bewusst text-only, das ist kein Bug sondern der
dokumentierte Offline-Modus.

### "Reiter im MDT" - warum es das nicht gibt

FivePDs MDT ist eine fremde NUI mit unbekanntem, versionsabhängigem
Tab-/Plugin-System. Ohne Einsicht in dessen Quellcode lässt sich kein echter
Tab zuverlässig von außen einhängen (siehe Kommentar in
`integrations/fivepd.lua`) - ein geratener Ansatz würde bei der nächsten
FivePD-Version einfach nichts tun. Das eigene Einstellungspanel oben ist der
garantiert funktionierende Ersatz; `exports['policevoiceai']:OpenSettingsPanel()`
steht zur Verfügung, falls ein eigener FivePD-Menüeintrag es aufrufen soll.

## Voraussetzungen

- [oxmysql](https://github.com/overextended/oxmysql)
- Eine laufende FivePD-Resource (Name konfigurierbar, `Config.FivePD.resourceName`) -
  PoliceVoiceAI funktioniert aber auch komplett eigenständig ohne sie
- Optional: ein API-Key für einen echten KI-/STT-/TTS-Anbieter (siehe unten). Ohne
  Key läuft alles im **Mock-Modus** - kein Internetzugriff nötig, sofort testbar.

## Installation

1. Ordner `policevoiceai` nach `resources/` kopieren.
2. `sql/install.sql` in die Datenbank importieren.
3. `ensure policevoiceai` in die `server.cfg` eintragen (nach `oxmysql`, nach FivePD).
4. `config.lua` nach Bedarf anpassen (siehe unten).
5. **Optional** echte Anbieter aktivieren (siehe "Echte Provider aktivieren").

## Testen ohne API-Keys (Mock-Modus, Standardeinstellung)

`Config.AI.provider`, `Config.STT.provider` und `Config.TTS.provider` stehen
standardmäßig auf `'mock'`. Damit läuft die komplette Pipeline ohne externe
Anfragen:

- **KI**: regelbasierter Generator, der trotzdem persönlichkeits- und
  faktenabhängig antwortet (nie zwei identische Antworten, Punkt 25).
- **STT**: kann aus echtem Audio naturgemäß keinen Text erkennen. Zum Testen
  ohne Mikrofon/Whisper einfach in der Nähe eines NPCs `/pvoice <Text>` eingeben,
  z.B. `/pvoice Wo wohnen Sie?` - das Gespräch läuft danach normal weiter
  (Antwort, Emotion, Verlauf, MDT-Lookup, alles funktioniert).
- **TTS**: liefert keine Audiodatei, die Antwort bleibt "text-only" (Subtitle in
  der Voice-UI + Sprechanimation anhand der geschätzten Textlänge). Das ist
  zugleich Phase 27 (Fallback-System) in Aktion.

## Echte Provider aktivieren

API-Keys gehören **niemals** in `config.lua` oder ein Client-Script (Punkt 20).
Sie werden ausschließlich als Server-Convar gesetzt, z.B. in der `server.cfg`:

```
setr policevoiceai_openai_key "sk-...."
setr policevoiceai_elevenlabs_key "...."
```

| Bereich | `Config.AI.provider` / `Config.STT.provider` / `Config.TTS.provider` | Anbieter |
|---|---|---|
| KI | `'openai'` | OpenAI Chat Completions (`Config.AI.model`, z.B. `gpt-4o-mini`) |
| STT | `'openai_whisper'` | OpenAI Whisper (`Config.STT.model`) |
| TTS | `'openai_tts'` | OpenAI TTS |
| TTS | `'elevenlabs'` | ElevenLabs (benötigt `providerVoiceId` im NPC-Stimmprofil) |
| alle | `'custom_http'` | eigenes, selbst betriebenes Backend (`customBackendUrl`) - siehe Punkt 20 "Secure API Backend" |

Alle drei Provider-Dateien (`server/ai_provider.lua`, `server/stt_provider.lua`,
`server/tts_provider.lua`) sind bewusst austauschbar aufgebaut: ein neuer Anbieter
bedeutet nur eine neue Funktion + einen neuen `provider`-Fall, keine Änderung an
`conversation_manager.lua`.

## FivePD-Integration anpassen

Wie bei allen Integrationen mit Fremd-Resourcen (siehe `integrations/fivepd.lua`)
gilt: die tatsächlichen Export-/Event-Namen hängen von der eingesetzten
FivePD-Version ab und wurden deshalb **nicht erfunden**. PoliceVoiceAI kommt
trotzdem vollständig eigenständig zurecht:

- Eigene NPC-Datenbank (`sql/install.sql`), unabhängig von FivePDs Citizen-Tabellen.
- Eigenes MDT-Export-Interface (`server/mdt.lua`): `GetCitizenRecordByNpcId`,
  `GetCitizenRecordByConversationId`, `GetCitizenRecordByPlate`, `SetWarrant`.
- Optionaler, `pcall`-abgesicherter Versuch, FivePDs eigene Citizen-Record-UI zu
  öffnen (`Config.FivePD.openCitizenRecordExport`) - nur aktivieren, wenn die
  eigene FivePD-Version diesen Export tatsächlich bereitstellt.
- Ein sauberer Einstiegspunkt für andere Ressourcen (z.B. einen eigenen
  FivePD-Menüeintrag): `exports['policevoiceai']:StartConversationWithSituation({ type = 'traffic_stop', reason = '...' })`.

## Bedienung

- **PMA-Voice** (Standard, `Config.Voice.UsePmaVoiceKey = true`): dieselbe Taste,
  die der Spieler ohnehin für pma-voice als Push-to-Talk nutzt, treibt auch das
  NPC-Gespräch an. `Config.Voice.FallbackKey` (Standard `LALT`, über
  FiveM-Tastenbelegung frei änderbar) wählt/beendet nur das Gesprächsziel.
- **Push-to-Talk** (`Config.VoiceMode = 'push_to_talk'`, Fallback ohne pma-voice):
  Taste `Config.Voice.FallbackKey` in der Nähe eines Bürgers halten, um das
  Gespräch zu beginnen und zu sprechen.
- **Voice Activation** (`Config.VoiceMode = 'voice_activation'`): dieselbe Taste
  einmal drücken startet/beendet das Gespräch, danach hört die NUI per
  RMS-Lautstärkeerkennung automatisch zu, ganz ohne Taste halten zu müssen.
- **Dialogmenü-Fallback** (`Config.NPCInteraction.DialogMenuKey`, Standard `F7`):
  funktioniert immer, auch bei `Config.Voice.enabled = false` oder komplett ohne
  KI-Provider (Punkt 74) - eine vorgefertigte Frage wird 1:1 wie eine erkannte
  Sprachäußerung durch Persönlichkeit/Fakten/Lüge-Logik verarbeitet.
- Nur der zuletzt angesprochene NPC reagiert (Punkt 4/50) - steht der Spieler zu
  weit weg, endet das Gespräch automatisch.
- Das Gespräch endet außerdem automatisch bei: `ESC`, Einsteigen in ein
  Fahrzeug, Tod/Verschwinden des NPCs, oder wenn der Server die Verbindung
  zwischen Spieler und NPC nicht mehr autorisiert - in jedem Fall verschwindet
  die UI sofort mit (Punkt 9).

## Zuverlässigkeit & NPC-Verhalten (Punkte 47-84)

Diese Erweiterung behebt gezielt das Problem "NPC reagiert nicht/teilweise":

- **Server-autoritative State Machine** (`shared/npc_states.lua`,
  `server/npc_manager.lua`): jeder NPC durchläuft klar definierte Zustände
  (`IDLE → APPROACHING → WAITING_FOR_PLAYER → LISTENING → PROCESSING →
  RESPONDING → ... → LEAVING`). Jeder Zustand außer IDLE bekommt automatisch
  einen **Sicherheits-Timeout** - bleibt ein NPC z.B. in `LISTENING` hängen, weil
  ein Client-Event verloren ging, erzwingt der Server nach spätestens wenigen
  Sekunden einen sauberen Rückfall. Ein NPC kann dadurch nicht mehr dauerhaft in
  "Zuhören"/"Spricht" steckenbleiben (Punkt 75).
- **3D-Indikator über dem NPC-Kopf** (`client/npc_indicator.lua`): zeigt Name
  (`Config.NPCNameDisplay`) und Sprechstatus (🎙/⏳/🔊) direkt am Ped an, **nur**
  für den NPC, mit dem gerade tatsächlich kommuniziert wird (Punkt 49-51) -
  andere NPCs in der Nähe zeigen nichts an.
- **Debug-Modus** (`Config.Debug = true`): blendet zusätzlich NPC-ID, Zustand,
  Distanz, Ziel-Spieler und Kernpersönlichkeitswerte über dem Kopf ein - gedacht
  genau für "warum reagiert dieser NPC nicht"-Fehlersuche (Punkt 73).
- **Prioritäts-Override** (`client/npc_social.lua`): während eines aktiven
  Gesprächs blockiert der NPC ambientes GTA-Verhalten
  (`SetBlockingOfNonTemporaryEvents`, Rückkehr per `TaskStandStill` bei
  Ortsdrift) - er läuft nicht weg, weicht nicht aus, steigt nicht plötzlich in
  ein Fahrzeug (Punkt 62/67/69). Nach Gesprächsende wird der Override sauber
  aufgehoben (Punkt 68).
- **NPC-seitige Annäherung** (`server/social_ai.lua`, `client/npc_social.lua`):
  NPCs können, abhängig von Persönlichkeit (Selbstbewusstsein/Kooperation/
  Nervosität), selbstständig auf einen nahen Officer zugehen und ihn ansprechen
  (Zeuge/Opfer/allgemeine Frage, Punkt 58/59/65), oder bei hoher Kriminalität
  stattdessen fliehen (`TaskSmartFleePed`). Die Navigation nutzt
  `TaskGoStraightToCoord` (kein Teleport, natürliches Lauftempo) und bricht bei
  Timeout/zu großer Distanz sauber ab (kein Soft-Lock, Punkt 63/75).
- **Umgebungserkennung** (Punkt 60/61): erkennt Polizeifahrzeuge mit Blaulicht
  in der Nähe (`GetVehicleClass`/`IsVehicleSirenOn`) und lässt NPCs stattdessen
  hinschauen statt eine laufende Einsatzstelle zu durchqueren.

### PMA-Voice-Integration - ehrlich betrachtet (Punkt 54)

FiveM bietet **keine API**, um die tatsächlich in pma-voice hinterlegte
Push-to-Talk-Taste eines Spielers auszulesen - dieses Script behauptet das
nirgends. Stattdessen probiert `client/pma_voice_integration.lua` mehrere
bekannte pma-voice-Export-/State-Bag-Konventionen der Reihe nach (pcall-
abgesichert), um den **Sprechzustand** ("spricht der Spieler gerade") zu lesen.
Funktioniert das mit der eingesetzten pma-voice-Version/-Fork nicht, fällt das
Script automatisch und ohne Fehlermeldung auf `Config.Voice.FallbackKey` als
ganz normale, eigene Push-to-Talk-Taste zurück - das Script bleibt so in jedem
Fall benutzbar. Passe `client/pma_voice_integration.lua` an, falls die eigene
pma-voice-Version einen anderen, bekannten Export/State-Bag-Key bereitstellt.

### Akzeptanztests (Punkt 83)

| Test | Abgedeckt durch |
|---|---|
| 1 - Voice (PMA-PTT → Zuhören → Antwort) | `client/voice_capture.lua`, `client/npc_indicator.lua` |
| 2 - Menü (Voice aus, Dialogmenü) | `Config.Voice.enabled = false`, `client/dialog_menu.lua` |
| 3 - NPC geht zum Officer | `server/social_ai.lua`, `client/npc_social.lua` (`NavigateToOfficer`) |
| 4 - NPC ignoriert Ambient-Verhalten waehrend Gespraech | `NPCSocial.StartPriorityOverride` |
| 5 - Verkehrskontrolle | Integrationspunkt: `exports['policevoiceai']:StartConversationWithSituation({type='traffic_stop'})`, ausgelöst durch FivePDs eigene Anhalte-Taste/Logik |
| 6 - Funk/Leitstelle | Außerhalb des Scopes dieser Ressource - eigenständiges Dispatch/Funk-System, siehe FivePD/EmergencyDispatch |
| 7 - Fallback (Voice/KI down) | `Config.Fallback.*`, Dialogmenü bleibt unabhängig davon nutzbar |

**Test 6 ist bewusst nicht Teil von PoliceVoiceAI**: Funk/Leitstelle ist ein
eigenständiges System (siehe z.B. EmergencyDispatch in diesem Repo) und würde
eine erfundene Integration in eine fremde, nicht spezifizierte Funk-Ressource
bedeuten. `exports['policevoiceai']:StartConversationWithSituation(...)` ist der
saubere Anknüpfungspunkt, falls ein Funk-/Leitstellen-Script eigene
KI-Antworten darüber anfordern möchte.

## Sicherheit

- Distanz zwischen Spieler und NPC wird **immer serverseitig** geprüft
  (`server/security.lua`), unabhängig davon was der Client behauptet.
- Rate-Limiting pro Spieler (`Config.Conversation.cooldownBetweenRequestsMs`)
  verhindert Anfrage-Fluten gegen KI/STT/TTS-Provider.
- Alle API-Keys existieren ausschließlich serverseitig als Convar.
- Zielt ein Spieler auf einen echten Mitspieler statt einen NPC, startet
  **kein** Voice-AI-Gespräch (Phase 17) - echte Spieler-Zivilisten spielen sich selbst.
- Gespräche laufen nach `Config.Conversation.idleTimeoutSeconds` automatisch aus.

## Performance

- Kein Dauer-Loop, der die Datenbank oder den KI-Provider pollt - jede Anfrage
  entsteht ausschließlich als Reaktion auf eine tatsächliche Spieleräußerung.
- TTS-Antworten werden pro (Text, Stimmprofil)-Kombination gecacht
  (`Config.TTS.cacheEnabled`).
- Der einzige dauerhaft laufende Client-Thread ist ein leichter
  500-ms-Reichweiten-Check, der ausschließlich während eines aktiven Gesprächs
  etwas tut.

## Dateistruktur

```
policevoiceai/
├── fxmanifest.lua
├── config.lua
├── client/
│   ├── pma_voice_integration.lua  (best-effort PMA-Voice Sprechzustand)
│   ├── voice_capture.lua          (PTT/Voice-Activation/PMA-Steuerung)
│   ├── voice_playback.lua         (3D-Panning-Wiedergabe)
│   ├── animation.lua              (Lipsync/Gestik)
│   ├── npc_interaction.lua        (Targeting, Conversation-State)
│   ├── npc_indicator.lua          (3D-Kopf-Indikator + Debug-Overlay)
│   ├── npc_social.lua             (Annaeherung, Prioritaets-Override, Polizeierkennung)
│   ├── dialog_menu.lua            (Dialogmenue-Fallback)
│   └── fivepd_integration.lua     (optionaler FivePD-Hook)
├── server/             (Conversation Manager, KI/STT/TTS-Provider, Personality, NPC-/State-Manager, Social AI, MDT, Callouts)
├── integrations/
│   └── fivepd.lua       (einzige, optionale Schnittstelle zu FivePD)
├── shared/            (Locales, Utils, Personas, State-Machine-Enum)
├── web/               (NUI: Mikrofonaufnahme, Voice-Activation, 3D-Panning-Wiedergabe, Voice-UI, Dialogmenue)
└── sql/install.sql
```

## Phasen (Entwicklungsreihenfolge lt. Spezifikation)

- [x] Phase 1 - NPC-Framework (`server/npc_manager.lua`)
- [x] Phase 2 - NPC-Datenbank (`sql/install.sql`, `server/database.lua`)
- [x] Phase 3 - NPC-Persönlichkeiten (`shared/personas.lua`, `server/personality.lua`)
- [x] Phase 4 - Voice Capture (`web/js/app.js`, `client/voice_capture.lua`)
- [x] Phase 5 - Speech-to-Text (`server/stt_provider.lua`)
- [x] Phase 6 - Conversation Manager (`server/conversation_manager.lua`)
- [x] Phase 7 - AI Integration (`server/ai_provider.lua`)
- [x] Phase 8 - Text-to-Speech (`server/tts_provider.lua`)
- [x] Phase 9 - 3D NPC Voice (`client/voice_playback.lua`, `web/js/app.js`)
- [x] Phase 10 - NPC Animation/Lipsync (`client/animation.lua`)
- [x] Phase 11 - Traffic Stops (`FivePDClient.StartConversationWithSituation`, `situation.type = 'traffic_stop'`)
- [x] Phase 12 - Arrest/Search (Grundlage: MDT-Wahrheit vs. Gesprächs-Lüge, Punkt 18)
- [x] Phase 13 - MDT (`server/mdt.lua`)
- [x] Phase 14 - Callouts (`server/callouts.lua`, mehrere NPCs mit unterschiedlicher Rolle/Sicht)
- [x] Phase 15 - Dispatch-Anbindung (Integrationspunkt: `exports['policevoiceai']:StartConversationWithSituation`)
- [x] Phase 16 - Reports/Evidence/Warrants (`MDT.SetWarrant`, Strafregister in der NPC-DB)
- [x] Phase 17 - Spieler-Zivilisten (echte Spieler lösen bewusst keine Voice-AI aus)
- [x] Phase 18 - Performance/Security/Production Polish (`server/security.lua`, Rate-Limits, Timeouts, Cache)

## Bekannte Grenzen

- Echte KI-/STT-/TTS-Ergebnisse hängen vollständig vom gewählten externen
  Anbieter ab und benötigen einen gültigen, selbst finanzierten API-Key.
- Die "3D-Ortung" ist eine client-berechnete Lautstärke-/Stereo-Pan-Näherung
  (Distanz + Blickrichtung), kein echtes Engine-Sound-Emitter-System - dafür
  funktioniert sie ohne native Zusatzabhängigkeit in jeder NUI.
- Lipsync basiert auf dokumentierten GTA-V-Natives (`TaskChatEvent`,
  `TaskLookAtEntity`, Gestik-Animationen) und ist eine Annäherung, keine
  Phonem-genaue Mundbewegung.
- PMA-Voice-Sprecherkennung ist best-effort (siehe oben) - je nach Fork/Version
  kann ein Anpassen von `client/pma_voice_integration.lua` nötig sein; der
  Fallback über `Config.Voice.FallbackKey` funktioniert davon unabhängig immer.
- Die Umgebungserkennung deckt Polizeifahrzeuge/Sirenen ab (Punkt 60/61). Eine
  generische Erkennung von Schusswechsel/Unfall/Schlägerei (Punkt 60) ist
  bewusst nicht enthalten, da das zuverlässig nur mit tiefer Integration in ein
  konkretes Callout-/Kampf-System möglich wäre und sonst reine Vortäuschung
  wäre - `server/callouts.lua` bietet dafür den strukturierten Anknüpfungspunkt.
