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
    local settings = Settings and Settings.Get() or {}
    NUI.Send({
        action = 'setMode',
        mode = Config.VoiceMode,
        vadThreshold = Settings and Settings.GetEffectiveVadThreshold() or Config.VoiceActivation.energyThreshold,
        silenceTimeoutMs = Config.VoiceActivation.silenceTimeoutMs,
        maxRecordingSeconds = Config.MaxRecordingSeconds,
        micDeviceId = settings.micDeviceId,
        micGain = settings.micGain,
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
    Utils.VoiceLogError('Mikrofon-Fehler: %s', tostring(data and data.message))
    cb('ok')
end)
