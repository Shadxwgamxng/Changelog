VoiceCapture = {}

-- =========================================================
-- PHASE 4 / PUNKT 52-55: VOICE INPUT
-- =========================================================
-- Eine einzige Taste deckt je nach effektivem Modus (Server-Standard ODER
-- Spieler-Override aus dem Einstellungspanel, siehe client/settings.lua) ab:
--
--  a) PMA-Voice erkannt: Taste = NUR Zielauswahl (Gespraech starten/beenden).
--     Das eigentliche "Zuhoeren" wird ueber die tatsaechliche pma-voice-
--     Sprechererkennung gesteuert (client/pma_voice_integration.lua) - der
--     Spieler nutzt weiterhin seine gewohnte Proximity-Voice-Taste
--     (Punkt 52/53: keine doppelte Voice-Steuerung).
--  b) push_to_talk: Taste halten = sprechen.
--  c) voice_activation: Taste = Toggle, danach automatisches Zuhoeren per RMS (NUI).
--
-- Hat der Spieler im Einstellungspanel eine EIGENE Taste festgelegt, wird
-- stattdessen ein Raw-Key-Polling-Thread (IsRawKeyDown) genutzt und die
-- FiveM-Keybind-Taste ('policevoiceai_talk') deaktiviert sich selbst.

local isRecording = false

RegisterKeyMapping('policevoiceai_talk', 'PoliceVoiceAI: Sprechen / Gespräch starten', 'keyboard', Config.Voice.FallbackKey)

local function EffectiveMode()
    return Settings.GetEffectiveMode()
end

local function BeginListening()
    if isRecording then return end
    if not NPCInteraction.IsInConversation() then return end

    isRecording = true
    Utils.VoiceLog('PTT pressed')
    NUI.Send({ action = 'startRecording' })
    NUI.Send({ action = 'setListening', listening = true })
    Utils.VoiceLog('Recording started')
    TriggerServerEvent('policevoiceai:server:voiceState', Client.state.conversationId, true)
end

local function StopListening()
    if not isRecording then return end
    isRecording = false
    Utils.VoiceLog('PTT released')
    NUI.Send({ action = 'stopRecording' })
    NUI.Send({ action = 'setListening', listening = false })
    Utils.VoiceLog('Recording stopped')
end

local function OnTalkPressed()
    local mode = EffectiveMode()

    if not Config.Voice.enabled or mode == 'voice_activation' or mode == 'pma' then
        -- Reine Zielauswahl/Toggle - siehe (a) und (c) oben
        if NPCInteraction.IsInConversation() then
            NPCInteraction.EndConversation()
        else
            NPCInteraction.TryStartConversation()
        end
        return
    end

    -- Reiner push_to_talk Fallback (kein PMA erkannt/gewaehlt, kein voice_activation)
    if not NPCInteraction.IsInConversation() then
        NPCInteraction.TryStartConversation()
        -- Das eigentliche Gespraech startet asynchron (Serverantwort). Der Spieler
        -- muss die Taste fuer die erste Aeusserung erneut halten, sobald
        -- policevoiceai:client:startResult eingetroffen ist (siehe UI-Feedback).
        return
    end

    BeginListening()
end

local function OnTalkReleased()
    local mode = EffectiveMode()
    if not Config.Voice.enabled or mode == 'voice_activation' or mode == 'pma' then return end
    StopListening()
end

RegisterCommand('+policevoiceai_talk', function()
    if Settings.HasCustomKey() then return end -- eigene Taste uebernimmt (siehe unten)
    OnTalkPressed()
end, false)

RegisterCommand('-policevoiceai_talk', function()
    if Settings.HasCustomKey() then return end
    OnTalkReleased()
end, false)

-- =========================================================
-- EIGENE TASTE AUS DEM EINSTELLUNGSPANEL (Raw-Key statt FiveM-Keybind)
-- =========================================================

CreateThread(function()
    local wasDown = false

    while true do
        if Settings.HasCustomKey() then
            Wait(0)
            local code = Settings.Get().customKeyCode
            local down = IsRawKeyDown(code)

            if down and not wasDown then OnTalkPressed() end
            if not down and wasDown then OnTalkReleased() end
            wasDown = down
        else
            wasDown = false
            Wait(250)
        end
    end
end)

-- =========================================================
-- PMA-VOICE-GETRIEBENES ZUHOEREN (Punkt 52/53/55)
-- =========================================================
-- Solange ein Gespraech aktiv ist UND der effektive Modus 'pma' ist, uebernimmt
-- die tatsaechliche pma-voice-Sprechererkennung die Steuerung von LISTENING.

CreateThread(function()
    local wasTalking = false

    while true do
        Wait(100)

        if Config.Voice.enabled and EffectiveMode() == 'pma' and NPCInteraction.IsInConversation() then
            local talking = PmaVoice.IsPlayerTalking()
            if talking == nil then talking = isRecording end -- Erkennung nicht verfuegbar -> nichts erzwingen

            if talking and not wasTalking then
                BeginListening()
            elseif not talking and wasTalking then
                StopListening()
            end
            wasTalking = talking
        else
            wasTalking = false
        end
    end
end)

-- =========================================================
-- NUI -> LUA: FERTIGE SPRACHAUFNAHME
-- =========================================================

function VoiceCapture.OnSpeechRecorded(data)
    if not NPCInteraction.IsInConversation() then return end
    if not data then return end

    if Utils.IsEmpty(data.audioBase64) and Utils.IsEmpty(data.debugText) then
        Utils.VoiceLogError('Recording finished with no audio data (Mikrofon evtl. nicht verfuegbar - siehe /policevoiceai_setupmic oder Einstellungspanel)')
        NUI.Send({ action = 'setListening', listening = false })
        return
    end

    Utils.VoiceLog('Sending audio to STT')
    TriggerServerEvent('policevoiceai:server:speech', {
        conversationId = Client.state.conversationId,
        audioBase64 = data.audioBase64,
        format = data.format,
        mimeType = data.mimeType,
        debugText = data.debugText,
    })
end

RegisterNetEvent('policevoiceai:client:transcript', function(data)
    NUI.Send({ action = 'showTranscript', role = 'officer', text = data.text })
end)

RegisterNetEvent('policevoiceai:client:speechError', function(data)
    Utils.VoiceLogError('Speech-Fehler: %s', tostring(data.reason))
    NUI.Send({ action = 'setListening', listening = false })

    -- Punkt 74: bei nicht erkannter Sprache bleibt das Dialogmenu vollstaendig nutzbar
    if data.reason == 'speech_not_recognized' then
        NUI.Send({ action = 'showTranscript', role = 'npc', text = Locale('speech_not_recognized') })
    end
end)

-- =========================================================
-- MANUELLES MIKROFON-SETUP (Fallback, falls getUserMedia beim NUI-Start
-- keine Berechtigung bekommen hat, z.B. weil ein Klick-Dialog Fokus brauchte)
-- =========================================================

RegisterCommand('policevoiceai_setupmic', function()
    SetNuiFocus(true, true)
    NUI.Send({ action = 'setupMic' })
end, false)

RegisterNUICallback('micSetupDone', function(data, cb)
    SetNuiFocus(false, false)
    if data and data.ok then
        Utils.VoiceLog('Mikrofon-Setup erfolgreich')
    else
        Utils.VoiceLogError('Mikrofon-Setup fehlgeschlagen: %s', tostring(data and data.message))
    end
    cb('ok')
end)
