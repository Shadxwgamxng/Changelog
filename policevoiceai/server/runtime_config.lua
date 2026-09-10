RuntimeConfig = {}

-- =========================================================
-- ADMIN-EINSTELLUNGEN (Settings-Panel, Admin-Bereich)
-- =========================================================
-- Persistiert eine kleine, bewusst begrenzte Auswahl an Config-Werten in einer
-- JSON-Datei innerhalb der Resource (SaveResourceFile/LoadResourceFile - echte,
-- dokumentierte FiveM-Server-Natives), damit ein Admin z.B. den TTS-Provider
-- umstellen kann, OHNE config.lua zu bearbeiten oder den Server neu zu starten.
--
-- WICHTIG (Punkt 20 - Datenschutz/API-Sicherheit): API-KEYS sind hier bewusst
-- NICHT enthalten und werden NIEMALS ueber dieses System gesetzt/angezeigt -
-- die bleiben ausschliesslich Server-Convars (siehe README "Echte Provider
-- aktivieren"). Ohne einen gueltigen Convar-Key bewirkt eine Umstellung auf
-- z.B. 'openai_tts' hier nichts (der Provider meldet 'missing_api_key' und das
-- Fallback-System greift, siehe server/fallback.lua) - das Panel weist im
-- Admin-Bereich explizit darauf hin.

local FILE_NAME = 'runtime_config.json'

local function LoadOverrides()
    local raw = LoadResourceFile(GetCurrentResourceName(), FILE_NAME)
    if Utils.IsEmpty(raw) then return {} end
    return Utils.SafeJsonDecode(raw, {})
end

local function ApplyOverrides(overrides)
    if not overrides then return end

    if overrides.aiProvider then Config.AI.provider = overrides.aiProvider end
    if overrides.sttProvider then Config.STT.provider = overrides.sttProvider end
    if overrides.ttsProvider then Config.TTS.provider = overrides.ttsProvider end
    if overrides.voiceMode then Config.VoiceMode = overrides.voiceMode end
    if overrides.usePmaVoiceKey ~= nil then Config.Voice.UsePmaVoiceKey = overrides.usePmaVoiceKey end
    if overrides.conversationDistance then Config.NPCInteraction.ConversationDistance = tonumber(overrides.conversationDistance) end
    if overrides.approachDistance then Config.NPCInteraction.ApproachDistance = tonumber(overrides.approachDistance) end
end

CreateThread(function()
    local overrides = LoadOverrides()
    ApplyOverrides(overrides)
    if Config.Debug and next(overrides) then
        print('[policevoiceai] Runtime-Overrides aus runtime_config.json geladen.')
    end
end)

function RuntimeConfig.GetCurrent()
    return {
        aiProvider = Config.AI.provider,
        sttProvider = Config.STT.provider,
        ttsProvider = Config.TTS.provider,
        voiceMode = Config.VoiceMode,
        usePmaVoiceKey = Config.Voice.UsePmaVoiceKey,
        conversationDistance = Config.NPCInteraction.ConversationDistance,
        approachDistance = Config.NPCInteraction.ApproachDistance,
    }
end

-- Erlaubte Werte, damit ein Admin nicht versehentlich einen nicht existierenden
-- Provider-Namen eintraegt (das Settings-Panel zeigt ausschliesslich diese Liste an).
function RuntimeConfig.GetOptions()
    return {
        aiProviders = { 'mock', 'openai', 'custom_http' },
        sttProviders = { 'mock', 'openai_whisper', 'custom_http' },
        ttsProviders = { 'mock', 'openai_tts', 'elevenlabs', 'custom_http' },
        voiceModes = { 'push_to_talk', 'voice_activation' },
    }
end

local function IsAllowed(list, value)
    for _, v in ipairs(list) do
        if v == value then return true end
    end
    return false
end

function RuntimeConfig.Save(newValues, actor)
    if type(newValues) ~= 'table' then return nil, 'invalid_payload' end

    local options = RuntimeConfig.GetOptions()
    if newValues.aiProvider and not IsAllowed(options.aiProviders, newValues.aiProvider) then return nil, 'invalid_ai_provider' end
    if newValues.sttProvider and not IsAllowed(options.sttProviders, newValues.sttProvider) then return nil, 'invalid_stt_provider' end
    if newValues.ttsProvider and not IsAllowed(options.ttsProviders, newValues.ttsProvider) then return nil, 'invalid_tts_provider' end
    if newValues.voiceMode and not IsAllowed(options.voiceModes, newValues.voiceMode) then return nil, 'invalid_voice_mode' end

    if newValues.conversationDistance then
        newValues.conversationDistance = Utils.Clamp(tonumber(newValues.conversationDistance) or 4.0, 1.0, 15.0)
    end
    if newValues.approachDistance then
        newValues.approachDistance = Utils.Clamp(tonumber(newValues.approachDistance) or 15.0, 3.0, 30.0)
    end

    ApplyOverrides(newValues)
    local merged = RuntimeConfig.GetCurrent()

    SaveResourceFile(GetCurrentResourceName(), FILE_NAME, Utils.SafeJsonEncode(merged) or '{}', -1)
    Database.AddAuditLog(actor, 'update_runtime_config', newValues)

    return merged
end

exports('GetRuntimeConfig', RuntimeConfig.GetCurrent)
exports('SetRuntimeConfig', RuntimeConfig.Save)
