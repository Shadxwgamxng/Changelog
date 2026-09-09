NUI = {}

-- =========================================================
-- NUI-BRUECKE (Phase 4/9/26)
-- =========================================================
-- Die NUI (web/) macht ausschliesslich: Mikrofonzugriff (getUserMedia/MediaRecorder),
-- Voice-Activation-Erkennung (RMS) und Audiowiedergabe mit Panner-Node fuer die
-- Pseudo-3D-Ortung. Alle Spiellogik bleibt in Lua.

function NUI.Send(data)
    SendNUIMessage(data)
end

RegisterNUICallback('ready', function(_, cb)
    NUI.Send({
        action = 'setMode',
        mode = Config.VoiceMode,
        vadThreshold = Config.VoiceActivation.energyThreshold,
        silenceTimeoutMs = Config.VoiceActivation.silenceTimeoutMs,
        maxRecordingSeconds = Config.MaxRecordingSeconds,
    })
    cb('ok')
end)

RegisterNUICallback('speechRecorded', function(data, cb)
    if VoiceCapture then VoiceCapture.OnSpeechRecorded(data) end
    cb('ok')
end)

RegisterNUICallback('playbackEnded', function(_, cb)
    if VoicePlayback then VoicePlayback.OnPlaybackEnded() end
    cb('ok')
end)

RegisterNUICallback('micError', function(data, cb)
    if Config.Debug then
        print('[policevoiceai] Mikrofon-Fehler: ' .. tostring(data and data.message))
    end
    cb('ok')
end)
