Config = {}

-- =========================================================
-- ALLGEMEIN
-- =========================================================

Config.Locale = 'de'
Config.Debug = false

-- Detailliertes Schritt-fuer-Schritt-Logging der kompletten Voice-Pipeline
-- (Konsole client- UND serverseitig), z.B. "[VOICE] PTT pressed", "[VOICE] STT
-- result: ...". Unabhaengig von Config.Debug (das nur das NPC-State-Overlay
-- steuert) - gedacht, um "Sprachinteraktion funktioniert nicht zuverlaessig"
-- Schritt fuer Schritt nachvollziehen zu koennen. Fehler ([VOICE ERROR]) werden
-- IMMER geloggt, unabhaengig von diesem Schalter.
Config.VoiceDebug = false

-- =========================================================
-- PHASE 4 / PUNKT 52-55: VOICE INPUT (PMA-Voice / Push-to-Talk / Voice Activation)
-- =========================================================

-- 'push_to_talk' oder 'voice_activation'. Wird IGNORIERT, solange
-- Config.Voice.UsePmaVoiceKey aktiv ist UND pma-voice tatsaechlich laeuft/
-- erkannt wird (siehe unten) - dann uebernimmt pma-voice die eigentliche
-- Sprechsteuerung und Config.VoiceMode ist nur noch der Fallback dafuer.
Config.VoiceMode = 'push_to_talk'

-- Nur relevant wenn Config.VoiceMode = 'voice_activation'
Config.VoiceActivation = {
    enabled = false,
    -- RMS-Lautstaerke-Schwelle (0.0 - 1.0), ab der Sprache erkannt wird. Siehe web/js/app.js
    energyThreshold = 0.035,
    -- Wie lange Stille (ms) noetig ist, bevor die Aufnahme als beendet gilt
    silenceTimeoutMs = 700,
}

-- Absolute Obergrenze fuer eine einzelne Aufnahme, damit kein "offenes Mikro"
-- endlos Daten sendet (Performance/Sicherheit, Phase 28)
Config.MaxRecordingSeconds = 12

-- Punkt 52-54: PMA-Voice-Integration. Ziel: keine zweite, komplett eigene
-- Sprechtaste - die NPC-Konversation soll moeglichst dieselbe Taste nutzen,
-- die der Spieler ohnehin fuer den normalen Proximity-Voice-Chat gedrueckt haelt.
--
-- WICHTIG (Punkt 54): FiveM bietet keine API, mit der ein anderes Script
-- zuverlaessig auslesen kann, welche physische Taste ein Spieler in pma-voice
-- als PTT hinterlegt hat. Dieses Script behauptet das NICHT. Stattdessen wird
-- best-effort versucht, ueber pma-voice-Exports/State-Bags den *Sprechzustand*
-- ("spricht der Spieler gerade") auszulesen (siehe client/pma_voice_integration.lua).
-- Schlaegt das fehl (andere pma-voice-Version/-Fork, anderer Voice-Anbieter),
-- greift automatisch Config.Voice.FallbackKey als ganz normale, eigene
-- Push-to-Talk-Taste - das Script bleibt so IMMER funktionsfaehig.
Config.Voice = {
    -- Punkt 74 (Test 2/7): auf false stellen, um Voice komplett zu deaktivieren -
    -- das Dialogmenu (Config.NPCInteraction.DialogMenuKey) bleibt davon unberuehrt
    -- vollstaendig nutzbar.
    enabled = true,

    Provider = 'pma-voice',
    UsePmaVoiceKey = true,
    -- Eigene, ueber FiveM-Bindings frei umbelegbare Taste. Wird genutzt als:
    --  a) Ziel-Auswahl-Taste (Gespraech starten/beenden), wenn pma-voice-Erkennung
    --     funktioniert - der Spieler spricht dann ganz normal ueber seine eigene
    --     pma-voice-PTT-Taste weiter, ohne eine zweite Taste lernen zu muessen.
    --  b) Vollstaendige Push-to-Talk-Taste (Halten = Sprechen), falls pma-voice
    --     nicht erkannt werden kann.
    FallbackKey = 'LMENU',
}

-- =========================================================
-- PHASE 1/4 / PUNKT 64: REICHWEITE & TARGETING
-- =========================================================

Config.NPCInteraction = {
    -- Ab dieser Entfernung (Meter) kann ein NPC einen Officer ueberhaupt als
    -- moegliches Gespraechsziel wahrnehmen (Punkt 57-59, NPC spricht Officer an)
    StartDistance = 3.5,

    -- Ab welcher Entfernung (Meter) ein NPC den Spieler ueberhaupt hoeren kann.
    -- Wird SOWOHL client- als auch serverseitig geprueft (Server ist autoritativ,
    -- siehe Config.Security.validateDistanceServerSide).
    ConversationDistance = 4.0,

    -- Zieldistanz, in der ein auf den Officer zulaufender NPC stehen bleibt (Punkt 63/64)
    StopDistance = 1.8,

    -- Ab dieser Entfernung (Meter) kann ein NPC ueberhaupt in Erwaegung ziehen,
    -- selbststaendig auf den Officer zuzugehen (Punkt 58/63)
    ApproachDistance = 15.0,

    -- Taste zum Oeffnen des Dialogmenu-Fallbacks (Punkt 74, funktioniert IMMER,
    -- auch komplett ohne Voice/KI-Provider)
    DialogMenuKey = 'F7',

    -- Wie oft (Sekunden) ein einzelner NPC maximal neu bewerten darf, ob er den
    -- Officer anspricht (verhindert staendiges Neu-Wuerfeln bei jedem Scan-Tick)
    ApproachRerollCooldownSeconds = 20,
}

-- Nur der zuletzt gezielt angesprochene NPC "hoert zu". Auch wenn mehrere NPCs
-- in Reichweite stehen, reagiert nicht automatisch jeder von ihnen.
Config.MaxSimultaneousListeners = 1

-- =========================================================
-- PUNKT 72: NAME UEBER DEM KOPF
-- =========================================================
-- 'always' | 'conversation_only' | 'never'
Config.NPCNameDisplay = 'conversation_only'

-- =========================================================
-- PUNKT 74: DIALOGMENU-FALLBACK (funktioniert immer, auch ohne Voice/KI)
-- =========================================================
-- Jeder Eintrag wird 1:1 wie eine transkribierte Officer-Aeusserung durch
-- Conversation Manager + KI verarbeitet (Persoenlichkeit/Fakten/Luegen etc.
-- greifen genauso wie bei echter Sprache) - nur die Spracherkennung entfaellt.
Config.DialogQuestions = {
    { id = 'intro', text = 'Guten Tag. Koennen Sie sich bitte ausweisen?' },
    { id = 'license', text = 'Koennen Sie mir Ihren Fuehrerschein zeigen?' },
    { id = 'address', text = 'Wo wohnen Sie?' },
    { id = 'occupation', text = 'Was arbeiten Sie?' },
    { id = 'vehicle', text = 'Gehoert dieses Fahrzeug Ihnen?' },
    { id = 'alcohol', text = 'Haben Sie heute etwas getrunken?' },
    { id = 'warrant', text = 'Haben Sie schon einmal Probleme mit der Polizei gehabt?' },
    { id = 'reason', text = 'Wissen Sie, warum ich Sie angehalten habe?' },
    { id = 'goodbye', text = 'Alles klar, das waer\'s. Einen schoenen Tag noch.' },
}

-- =========================================================
-- PUNKT 57-70: NPC SOCIAL AI (Annaeherung, Prioritaeten, Umgebungserkennung)
-- =========================================================
Config.SocialAI = {
    enabled = true,

    -- Wie oft (ms) ein Client umliegende Peds auf moegliche Annaeherung prueft
    scanIntervalMs = 4000,

    -- Basis-Wahrscheinlichkeit (%) dass ein grundsaetzlich kooperativer/soziale
    -- NPC (Persoenlichkeit) den Officer anspricht, wenn er ihn wahrnimmt (Punkt 65)
    baseApproachChance = 12,

    -- Timeout (ms) fuer die Annaeherungs-Navigation (Punkt 63) - laeuft der NPC
    -- so lange nicht an, wird der Versuch sauber abgebrochen (kein Soft-Lock)
    approachTimeoutMs = 15000,

    -- Punkt 60/61: reagiert auf Polizeifahrzeuge mit Blaulicht in der Naehe
    -- (unterdrueckt Annaeherungs-Wuerfe, NPC schaut stattdessen zum Fahrzeug)
    policeVehicleAwarenessRadius = 12.0,
}

-- =========================================================
-- PHASE 6: CONVERSATION MANAGER
-- =========================================================

Config.Conversation = {
    -- Nach dieser Inaktivitaet (Sekunden) wird ein Gespraech automatisch beendet
    idleTimeoutSeconds = 90,
    -- Wie viele Nachrichten maximal im Verlauf behalten werden (aeltere werden verworfen)
    maxHistoryMessages = 24,
    -- Wie viele Zeichen aus dem Verlauf maximal an die KI gesendet werden (Kostenschutz)
    maxHistoryCharsSentToAI = 4000,
    -- Mindestabstand (ms) zwischen zwei Anfragen desselben Spielers (Rate-Limit, Phase 28)
    cooldownBetweenRequestsMs = 800,
}

-- =========================================================
-- PHASE 7: AI / LLM INTEGRATION
-- =========================================================
--
-- WICHTIG (Punkt 20 - Datenschutz/API-Sicherheit):
-- Der API-Key gehoert NIEMALS in diese Datei und NIEMALS in einen Client-Script.
-- Er wird ausschliesslich als Server-Convar gesetzt, z.B. in der server.cfg:
--     setr policevoiceai_openai_key "sk-...."
-- Siehe server/ai_provider.lua.

Config.AI = {
    -- 'mock'          -> regelbasierte Antworten, keine externe Anfrage, funktioniert ohne API-Key (Standard/Dev)
    -- 'openai'        -> ruft die OpenAI Chat Completions API direkt vom FiveM-Server aus auf
    -- 'custom_http'   -> ruft eine eigene, selbst betriebene Backend-URL auf (Config.AI.customBackendUrl)
    provider = 'mock',

    model = 'gpt-4o-mini',
    endpoint = 'https://api.openai.com/v1/chat/completions',
    temperature = 0.9,
    maxTokens = 220,
    timeoutMs = 8000,

    -- Nur fuer provider = 'custom_http': eigene Backend-Instanz, die intern den
    -- eigentlichen KI-Anbieter aufruft (Punkt 20, "Secure API Backend"). Das
    -- Backend erhaelt denselben Context wie Config.AI.provider = 'openai'.
    customBackendUrl = nil,
    customBackendAuthHeader = nil, -- z.B. "Bearer xyz", ebenfalls nur ueber Convar setzen
}

-- =========================================================
-- PHASE 5: SPEECH-TO-TEXT
-- =========================================================

Config.STT = {
    -- 'mock' | 'openai_whisper' | 'custom_http'
    provider = 'mock',
    endpoint = 'https://api.openai.com/v1/audio/transcriptions',
    model = 'whisper-1',
    language = 'de',
    timeoutMs = 8000,
    customBackendUrl = nil,
}

-- =========================================================
-- PHASE 8: TEXT-TO-SPEECH
-- =========================================================

Config.TTS = {
    -- 'mock' | 'openai_tts' | 'elevenlabs' | 'custom_http'
    provider = 'mock',

    openai = {
        endpoint = 'https://api.openai.com/v1/audio/speech',
        model = 'tts-1',
    },

    elevenlabs = {
        -- %s wird durch die pro-NPC hinterlegte voiceId ersetzt (siehe VoiceProfile.providerVoiceId)
        endpoint = 'https://api.elevenlabs.io/v1/text-to-speech/%s',
    },

    customBackendUrl = nil,

    -- Identische Texte + identisches Stimmprofil muessen nicht erneut synthetisiert werden
    cacheEnabled = true,
    cacheMaxEntries = 300,
}

-- =========================================================
-- PHASE 9: 3D VOICE
-- =========================================================

Config.Voice3D = {
    maxHearingDistance = 12.0,
    -- Wie oft (ms) Position/Distanz/Panning waehrend der Wiedergabe aktualisiert werden
    updateIntervalMs = 150,
}

-- =========================================================
-- PHASE 10: ANIMATION / LIPSYNC
-- =========================================================

Config.Animation = {
    enabled = true,
    lookAtPlayer = true,
    -- Wahrscheinlichkeit pro Antwort, dass zusaetzlich eine Gestik-Animation abgespielt wird
    gestureChance = 0.35,
}

-- =========================================================
-- PHASE 11-16: FIVEPD INTEGRATION
-- =========================================================
--
-- Wie bei EmergencyDispatch in Alarm24: Die tatsaechlichen Event-/Export-Namen
-- haengen von der real eingesetzten FivePD-Version ab und werden deshalb NICHT
-- hart verdrahtet, sondern hier gemappt. Siehe integrations/fivepd.lua fuer die
-- vollstaendige Erklaerung und Anpassungshinweise.

Config.FivePD = {
    enabled = true,
    resourceName = 'fivepd',

    -- Haengt sich in das bestehende Ped-Interaktionsmenu von FivePD ein
    -- (z.B. "/id"-Menu), um "Gespraech beginnen (Voice AI)" als Option anzubieten.
    hookPedInteractMenu = true,

    -- Export-Namen, die FivePD (je nach Version) fuer Fahrzeug-/Fuehrerschein-/
    -- Fahndungsabfragen bereitstellen KOENNTE. Nur aktivieren/anpassen, wenn die
    -- eigene FivePD-Version diese Exports tatsaechlich besitzt. Ist das nicht der
    -- Fall, nutzt PoliceVoiceAI automatisch seine eigenen NPC-Datensaetze
    -- (siehe sql/install.sql, server/database.lua).
    useNativeCitizenLookup = false,
    nativeCitizenLookupExport = 'GetCitizenByPlate',

    -- Optionaler Export, ueber den FivePD (falls vorhanden) eine per Voice-AI
    -- identifizierte Person direkt in seiner eigenen Citizen-Record-UI anzeigen
    -- koennte. Bleibt deaktiviert (nil), solange kein passender Export bekannt ist -
    -- server/mdt.lua funktioniert auch ohne dies vollstaendig eigenstaendig.
    openCitizenRecordExport = nil,
}

-- =========================================================
-- PHASE 14/29: CALLOUTS
-- =========================================================

Config.Callouts = {
    enabled = true,
    -- Maximale Anzahl NPCs, die gleichzeitig Teil einer Callout-Szene sein koennen
    maxSceneNPCs = 4,
}

-- =========================================================
-- PHASE 27: FALLBACK-SYSTEM
-- =========================================================

Config.Fallback = {
    useOnAIError = true,
    useOnSTTError = true,
    useOnTTSError = true,
}

-- =========================================================
-- PHASE 18/20/28: SICHERHEIT & PERFORMANCE
-- =========================================================

Config.Security = {
    -- Server prueft IMMER selbst die Distanz zwischen Spieler und NPC, unabhaengig
    -- davon was der Client behauptet.
    validateDistanceServerSide = true,
    -- Harte Obergrenze fuer vom Client gesendeten (bereits transkribierten) Text
    maxSpeechCharsFromClient = 500,
    -- Harte Obergrenze fuer die Groesse eines einzelnen Audio-Uploads (Base64, Bytes)
    maxAudioPayloadBytes = 2 * 1024 * 1024,
}

Config.Permissions = {
    adminAce = 'policevoiceai.admin',
}
