STTProvider = {}

-- =========================================================
-- PHASE 5: SPEECH-TO-TEXT (austauschbare Schnittstelle)
-- =========================================================
-- Input: { audioBase64, format, debugText }
-- Output: text, nil  ODER  nil, errorReason
--
-- audioBase64 kommt vom Client (web/js/app.js nimmt das Mikrofon per
-- MediaRecorder auf und kodiert den Clip als Base64). Der eigentliche Aufruf
-- passiert AUSSCHLIESSLICH hier auf dem Server - der Client kennt keinerlei
-- API-Keys (Punkt 20).

local function BuildMultipartBody(fields, fileField, fileName, fileBytes, fileMime)
    local boundary = 'PoliceVoiceAI' .. tostring(math.random(100000, 999999))
    local parts = {}

    for key, value in pairs(fields) do
        parts[#parts + 1] = ('--%s\r\nContent-Disposition: form-data; name="%s"\r\n\r\n%s\r\n')
            :format(boundary, key, value)
    end

    parts[#parts + 1] = ('--%s\r\nContent-Disposition: form-data; name="%s"; filename="%s"\r\nContent-Type: %s\r\n\r\n')
        :format(boundary, fileField, fileName, fileMime)
    parts[#parts + 1] = fileBytes
    parts[#parts + 1] = ('\r\n--%s--\r\n'):format(boundary)

    return table.concat(parts), boundary
end

-- OpenAI Whisper (v1/audio/transcriptions) - https://platform.openai.com/docs/api-reference/audio
function STTProvider.TranscribeOpenAI(payload)
    local apiKey = GetConvar('policevoiceai_openai_key', '')
    if Utils.IsEmpty(apiKey) then
        return nil, 'missing_api_key'
    end

    local audioBytes = Utils.Base64Decode(payload.audioBase64)
    local body, boundary = BuildMultipartBody(
        { model = Config.STT.model, language = Config.STT.language },
        'file', 'speech.' .. (payload.format or 'ogg'), audioBytes,
        payload.mimeType or 'audio/ogg'
    )

    local result = Utils.HttpAwait(Config.STT.endpoint, 'POST', body, {
        ['Authorization'] = 'Bearer ' .. apiKey,
        ['Content-Type'] = 'multipart/form-data; boundary=' .. boundary,
    })

    if not result or result.statusCode ~= 200 then
        return nil, 'stt_http_error_' .. tostring(result and result.statusCode or 'none')
    end

    local decoded = Utils.SafeJsonDecode(result.body, nil)
    if not decoded or Utils.IsEmpty(decoded.text) then
        return nil, 'stt_empty_response'
    end

    return Security.SanitizeSpeechText(decoded.text)
end

-- Eigenes Backend (Punkt 20: "Secure API Backend"), erhaelt denselben Payload
function STTProvider.TranscribeCustomBackend(payload)
    if Utils.IsEmpty(Config.STT.customBackendUrl) then
        return nil, 'missing_custom_backend_url'
    end

    local result = Utils.HttpAwait(Config.STT.customBackendUrl, 'POST', Utils.SafeJsonEncode(payload), {
        ['Content-Type'] = 'application/json',
    })

    if not result or result.statusCode ~= 200 then
        return nil, 'stt_http_error_' .. tostring(result and result.statusCode or 'none')
    end

    local decoded = Utils.SafeJsonDecode(result.body, nil)
    if not decoded or Utils.IsEmpty(decoded.text) then
        return nil, 'stt_empty_response'
    end

    return Security.SanitizeSpeechText(decoded.text)
end

function STTProvider.Transcribe(payload)
    local provider = Config.STT.provider

    if provider == 'mock' then
        -- Ohne echten STT-Anbieter kann aus Audio kein Text erkannt werden.
        -- Fuer Entwicklung/Tests kann die NUI stattdessen direkt Text senden
        -- (web/js/app.js Debug-Eingabe), siehe README "Testen ohne API-Keys".
        if not Utils.IsEmpty(payload.debugText) then
            return Security.SanitizeSpeechText(payload.debugText)
        end
        return nil, 'mock_provider_requires_debug_text'
    end

    local ok, textOrErr, err = pcall(function()
        if provider == 'openai_whisper' then
            return STTProvider.TranscribeOpenAI(payload)
        elseif provider == 'custom_http' then
            return STTProvider.TranscribeCustomBackend(payload)
        end
        return nil, 'unknown_stt_provider'
    end)

    if not ok then
        if Config.Debug then print('[policevoiceai] STT Fehler: ' .. tostring(textOrErr)) end
        return nil, 'stt_exception'
    end

    return textOrErr, err
end
