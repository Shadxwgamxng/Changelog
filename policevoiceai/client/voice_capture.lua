VoiceCapture = {}

-- =========================================================
-- PHASE 4: VOICE INPUT (Push-to-Talk / Voice Activation)
-- =========================================================
-- Eine einzige, ueber FiveM-Bindings frei umbelegbare Taste (Config.VoiceKey)
-- deckt beide Modi ab:
--   push_to_talk      -> halten = sprechen (klassisches PTT)
--   voice_activation  -> kurz druecken = Gespraech starten/beenden, danach
--                        hoert die NUI automatisch per RMS-Erkennung zu

local isRecording = false

RegisterKeyMapping('policevoiceai_talk', 'PoliceVoiceAI: Sprechen / Gespräch starten', 'keyboard', Config.VoiceKey)

RegisterCommand('+policevoiceai_talk', function()
    if Config.VoiceMode == 'voice_activation' then
        if NPCInteraction.IsInConversation() then
            NPCInteraction.EndConversation()
        else
            NPCInteraction.TryStartConversation()
        end
        return
    end

    -- push_to_talk
    if not NPCInteraction.IsInConversation() then
        NPCInteraction.TryStartConversation()
        -- Das eigentliche Gespraech startet asynchron (Serverantwort). Der Spieler
        -- muss die Taste fuer die erste Aeusserung erneut halten, sobald
        -- policevoiceai:client:startResult eingetroffen ist (siehe UI-Feedback).
        return
    end

    if isRecording then return end
    isRecording = true
    NUI.Send({ action = 'startRecording' })
    NUI.Send({ action = 'setListening', listening = true, name = Client.state.npcFirstName })
end, false)

RegisterCommand('-policevoiceai_talk', function()
    if Config.VoiceMode ~= 'push_to_talk' then return end
    if not isRecording then return end

    isRecording = false
    NUI.Send({ action = 'stopRecording' })
    NUI.Send({ action = 'setListening', listening = false })
end, false)

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
end)
