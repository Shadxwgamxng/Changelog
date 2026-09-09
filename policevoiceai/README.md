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

- **Push-to-Talk** (`Config.VoiceMode = 'push_to_talk'`, Standard): Taste
  `Config.VoiceKey` (Standard `LALT`, über FiveM-Tastenbelegung frei änderbar)
  in der Nähe eines Bürgers halten, um das Gespräch zu beginnen und zu sprechen.
- **Voice Activation** (`Config.VoiceMode = 'voice_activation'`): dieselbe Taste
  einmal drücken startet/beendet das Gespräch, danach hört die NUI per
  RMS-Lautstärkeerkennung automatisch zu, ganz ohne Taste halten zu müssen.
- Nur der zuletzt angesprochene NPC reagiert (Punkt 4) - steht der Spieler zu
  weit weg, endet das Gespräch automatisch.

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
├── client/            (Mikrofonsteuerung, Targeting, 3D-Wiedergabe, Animation, FivePD-Hook)
├── server/             (Conversation Manager, KI/STT/TTS-Provider, Personality, MDT, Callouts)
├── integrations/
│   └── fivepd.lua       (einzige, optionale Schnittstelle zu FivePD)
├── shared/            (Locales, Utils, Personas)
├── web/               (NUI: Mikrofonaufnahme, Voice-Activation, 3D-Panning-Wiedergabe, Voice-UI)
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
