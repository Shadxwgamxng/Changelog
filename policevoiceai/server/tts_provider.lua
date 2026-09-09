TTSProvider = {}

-- =========================================================
-- PHASE 8/14: TEXT-TO-SPEECH (austauschbare Schnittstelle)
-- =========================================================
-- Rueckgabe: { audioBase64, mimeType }  ODER  nil, errorReason
--
-- audioBase64 wird unveraendert bis in die NUI durchgereicht (web/js/app.js),
-- da Browser-Audio (Web Audio API) Base64/ArrayBuffer erwartet und JSON keine
-- rohen Binaerdaten transportieren kann.

local cacheOrder = {}
local cache = {} -- [cacheKey] = { audioBase64, mimeType }

local function CacheKey(text, voiceProfile)
    return (voiceProfile.providerVoiceId or voiceProfile.gender or 'default') .. '|' .. text
end

local function CacheGet(key)
    if not Config.TTS.cacheEnabled then return nil end
    return cache[key]
end

local function CacheSet(key, value)
    if not Config.TTS.cacheEnabled then return end
    if not cache[key] then
        cacheOrder[#cacheOrder + 1] = key
        if #cacheOrder > Config.TTS.cacheMaxEntries then
            local oldest = table.remove(cacheOrder, 1)
            cache[oldest] = nil
        end
    end
    cache[key] = value
end

-- OpenAI TTS - https://platform.openai.com/docs/api-reference/audio/createSpeech
-- Hinweis: die verfuegbaren "voice"-Namen aendern sich gelegentlich - vor Produktivbetrieb
-- gegen die aktuelle OpenAI-Dokumentation pruefen.
local OPENAI_VOICE_MAP = {
    male = 'onyx', female = 'nova', unspecified = 'alloy',
}

function TTSProvider.SynthesizeOpenAI(text, voiceProfile)
    local apiKey = GetConvar('policevoiceai_openai_key', '')
    if Utils.IsEmpty(apiKey) then
        return nil, 'missing_api_key'
    end

    local voice = OPENAI_VOICE_MAP[voiceProfile.gender] or OPENAI_VOICE_MAP.unspecified

    local body = Utils.SafeJsonEncode({
        model = Config.TTS.openai.model,
        voice = voice,
        input = text,
        speed = Utils.Clamp(voiceProfile.speed or 1.0, 0.5, 2.0),
    })

    local result = Utils.HttpAwait(Config.TTS.openai.endpoint, 'POST', body, {
        ['Authorization'] = 'Bearer ' .. apiKey,
        ['Content-Type'] = 'application/json',
    })

    if not result or result.statusCode ~= 200 then
        return nil, 'tts_http_error_' .. tostring(result and result.statusCode or 'none')
    end

    return { audioBase64 = Utils.Base64Encode(result.body), mimeType = 'audio/mpeg' }
end

-- ElevenLabs - https://elevenlabs.io/docs/api-reference/text-to-speech
function TTSProvider.SynthesizeElevenLabs(text, voiceProfile)
    local apiKey = GetConvar('policevoiceai_elevenlabs_key', '')
    if Utils.IsEmpty(apiKey) then
        return nil, 'missing_api_key'
    end
    if Utils.IsEmpty(voiceProfile.providerVoiceId) then
        return nil, 'missing_provider_voice_id'
    end

    local url = Config.TTS.elevenlabs.endpoint:format(voiceProfile.providerVoiceId)
    local body = Utils.SafeJsonEncode({
        text = text,
        model_id = 'eleven_multilingual_v2',
        voice_settings = { stability = 0.4, similarity_boost = 0.75 },
    })

    local result = Utils.HttpAwait(url, 'POST', body, {
        ['xi-api-key'] = apiKey,
        ['Content-Type'] = 'application/json',
        ['Accept'] = 'audio/mpeg',
    })

    if not result or result.statusCode ~= 200 then
        return nil, 'tts_http_error_' .. tostring(result and result.statusCode or 'none')
    end

    return { audioBase64 = Utils.Base64Encode(result.body), mimeType = 'audio/mpeg' }
end

-- Eigenes Backend (Punkt 20)
function TTSProvider.SynthesizeCustomBackend(text, voiceProfile)
    if Utils.IsEmpty(Config.TTS.customBackendUrl) then
        return nil, 'missing_custom_backend_url'
    end

    local result = Utils.HttpAwait(Config.TTS.customBackendUrl, 'POST', Utils.SafeJsonEncode({
        text = text, voiceProfile = voiceProfile,
    }), { ['Content-Type'] = 'application/json' })

    if not result or result.statusCode ~= 200 then
        return nil, 'tts_http_error_' .. tostring(result and result.statusCode or 'none')
    end

    local decoded = Utils.SafeJsonDecode(result.body, nil)
    if not decoded or Utils.IsEmpty(decoded.audioBase64) then
        return nil, 'tts_empty_response'
    end

    return { audioBase64 = decoded.audioBase64, mimeType = decoded.mimeType or 'audio/mpeg' }
end

function TTSProvider.Synthesize(text, voiceProfile, npcId)
    local provider = Config.TTS.provider
    voiceProfile = voiceProfile or {}

    if provider == 'mock' then
        -- Kein echter TTS-Anbieter konfiguriert: Antwort bleibt Text-only (siehe
        -- server/fallback.lua / conversation_manager.lua), 3D-Voice-Wiedergabe entfaellt,
        -- die NPC-Animation nutzt stattdessen eine textlaengen-basierte Sprechdauer.
        return nil, 'mock_provider_text_only'
    end

    local cacheKey = CacheKey(text, voiceProfile)
    local cached = CacheGet(cacheKey)
    if cached then return cached end

    local ok, resultOrErr, err = pcall(function()
        if provider == 'openai_tts' then
            return TTSProvider.SynthesizeOpenAI(text, voiceProfile)
        elseif provider == 'elevenlabs' then
            return TTSProvider.SynthesizeElevenLabs(text, voiceProfile)
        elseif provider == 'custom_http' then
            return TTSProvider.SynthesizeCustomBackend(text, voiceProfile)
        end
        return nil, 'unknown_tts_provider'
    end)

    if not ok then
        if Config.Debug then print('[policevoiceai] TTS Fehler: ' .. tostring(resultOrErr)) end
        return nil, 'tts_exception'
    end

    if resultOrErr then
        CacheSet(cacheKey, resultOrErr)
    end

    return resultOrErr, err
end
