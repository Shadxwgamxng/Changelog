VoiceCapture = {}

-- =========================================================
-- PHASE 4 / PUNKT 52-55: VOICE INPUT
-- =========================================================
-- Eine einzige, ueber FiveM-Bindings frei umbelegbare Taste
-- (Config.Voice.FallbackKey) deckt je nach Situation ab:
--
--  a) PMA-Voice erkannt (Config.Voice.UsePmaVoiceKey, Standard):
--     Taste = NUR Zielauswahl (Gespraech starten/beenden). Das eigentliche
--     "Zuhoeren" wird ueber die tatsaechliche pma-voice-Sprechererkennung
--     gesteuert (siehe client/pma_voice_integration.lua) - der Spieler nutzt
--     also weiterhin seine gewohnte Proximity-Voice-Taste (Punkt 52/53:
--     keine doppelte Voice-Steuerung).
--  b) push_to_talk (Fallback, falls PMA nicht erkannt wird): Taste halten = sprechen.
--  c) voice_activation: Taste = Toggle, danach automatisches Zuhoeren per RMS (NUI).

local isRecording = false

RegisterKeyMapping('policevoiceai_talk', 'PoliceVoiceAI: Sprechen / Gespräch starten', 'keyboard', Config.Voice.FallbackKey)

local function UsePmaMode()
    return Config.Voice.UsePmaVoiceKey and PmaVoice.IsAvailable()
end

local function BeginListening()
    if isRecording then return end
    isRecording = true
    NUI.Send({ action = 'startRecording' })
    NUI.Send({ action = 'setListening', listening = true })
    TriggerServerEvent('policevoiceai:server:voiceState', Client.state.conversationId, true)
end

local function StopListening()
    if not isRecording then return end
    isRecording = false
    NUI.Send({ action = 'stopRecording' })
    NUI.Send({ action = 'setListening', listening = false })
end

RegisterCommand('+policevoiceai_talk', function()
    if not Config.Voice.enabled or Config.VoiceMode == 'voice_activation' or UsePmaMode() then
        -- Reine Zielauswahl/Toggle - siehe oben (a) und (c)
        if NPCInteraction.IsInConversation() then
            NPCInteraction.EndConversation()
        else
            NPCInteraction.TryStartConversation()
        end
        return
    end

    -- Reiner push_to_talk Fallback (kein PMA erkannt, kein voice_activation)
    if not NPCInteraction.IsInConversation() then
        NPCInteraction.TryStartConversation()
        -- Das eigentliche Gespraech startet asynchron (Serverantwort). Der Spieler
        -- muss die Taste fuer die erste Aeusserung erneut halten, sobald
        -- policevoiceai:client:startResult eingetroffen ist (siehe UI-Feedback).
        return
    end

    BeginListening()
end, false)

RegisterCommand('-policevoiceai_talk', function()
    if not Config.Voice.enabled or Config.VoiceMode == 'voice_activation' or UsePmaMode() then return end
    StopListening()
end, false)

-- =========================================================
-- PMA-VOICE-GETRIEBENES ZUHOEREN (Punkt 52/53/55)
-- =========================================================
-- Solange ein Gespraech aktiv ist UND pma-voice erkannt wird, uebernimmt die
-- tatsaechliche pma-voice-Sprechererkennung die Steuerung von LISTENING.

CreateThread(function()
    local wasTalking = false

    while true do
        Wait(100)

        if Config.Voice.enabled and UsePmaMode() and NPCInteraction.IsInConversation() then
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
    if Config.Debug then print('[policevoiceai] Speech-Fehler: ' .. tostring(data.reason)) end
    NUI.Send({ action = 'setListening', listening = false })

    -- Punkt 74: bei nicht erkannter Sprache bleibt das Dialogmenu vollstaendig nutzbar
    if data.reason == 'speech_not_recognized' then
        NUI.Send({ action = 'showTranscript', role = 'npc', text = Locale('speech_not_recognized') })
    end
end)
