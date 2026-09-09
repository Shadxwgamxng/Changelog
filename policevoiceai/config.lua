Config = {}

-- =========================================================
-- ALLGEMEIN
-- =========================================================

Config.Locale = 'de'
Config.Debug = false

-- =========================================================
-- PHASE 4: VOICE INPUT (Push-to-Talk / Voice Activation)
-- =========================================================

-- 'push_to_talk' oder 'voice_activation'
Config.VoiceMode = 'push_to_talk'

-- Default-Taste zum Sprechen. Der Spieler kann sie in den FiveM-Bindings
-- (Einstellungen -> Tastenbelegung -> FiveM -> "PoliceVoiceAI: Sprechen") aendern,
-- da wir RegisterKeyMapping benutzen (siehe client/voice_capture.lua).
Config.VoiceKey = 'LMENU'

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

-- =========================================================
-- PHASE 1/4: REICHWEITE & TARGETING
-- =========================================================

-- Ab welcher Entfernung (Meter) ein NPC den Spieler ueberhaupt hoeren kann.
-- Wird SOWOHL client- als auch serverseitig geprueft (Server ist autoritativ,
-- siehe Config.Security.validateDistanceServerSide).
Config.NPCConversationDistance = 4.0

-- Nur der zuletzt gezielt angesprochene NPC "hoert zu". Auch wenn mehrere NPCs
-- in Reichweite stehen, reagiert nicht automatisch jeder von ihnen.
Config.MaxSimultaneousListeners = 1

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
