Settings = {}

-- =========================================================
-- SPIELER-EINSTELLUNGEN FUER DIE SPRACHSTEUERUNG
-- =========================================================
-- Persistiert pro Spieler/Rechner ueber einen KVP (client-lokal, ueberlebt
-- Server-Neustarts). Betrifft ausschliesslich clientseitige Praeferenzen
-- (Mikrofon, Taste, Empfindlichkeit, NPC-Lautstaerke) - NIEMALS API-Keys oder
-- Server-Config (dafuer siehe server/runtime_config.lua + Admin-Bereich).

local KVP_KEY = 'policevoiceai_settings'

local DEFAULTS = {
    mode = 'auto', -- 'auto' | 'pma' | 'ptt' | 'voice_activation'
    customKeyCode = nil,
    customKeyLabel = nil,
    micDeviceId = nil,
    vadThreshold = nil, -- nil = Config.VoiceActivation.energyThreshold verwenden
    npcVolume = 1.0,
}

local current = nil

local function Load()
    if current then return current end

    local raw = GetResourceKvpString(KVP_KEY)
    local decoded = not Utils.IsEmpty(raw) and Utils.SafeJsonDecode(raw, nil) or nil
    current = decoded or {}

    for key, value in pairs(DEFAULTS) do
        if current[key] == nil then current[key] = value end
    end

    return current
end

function Settings.Get()
    return Load()
end

function Settings.Save(partial)
    local s = Load()
    for key, value in pairs(partial or {}) do
        s[key] = value
    end

    SetResourceKvp(KVP_KEY, Utils.SafeJsonEncode(s) or '{}')
    current = s
    return s
end

function Settings.Reset()
    SetResourceKvp(KVP_KEY, Utils.SafeJsonEncode(DEFAULTS) or '{}')
    current = nil
    return Load()
end

-- Beruecksichtigt Server-Standard (Config) + Spieler-Override.
-- Rueckgabe: 'pma' | 'ptt' | 'voice_activation'
function Settings.GetEffectiveMode()
    local s = Load()

    if s.mode == 'pma' then return 'pma' end
    if s.mode == 'ptt' then return 'ptt' end
    if s.mode == 'voice_activation' then return 'voice_activation' end

    -- 'auto': Server-Standardverhalten (siehe client/voice_capture.lua)
    if Config.Voice.UsePmaVoiceKey and PmaVoice and PmaVoice.IsAvailable() then return 'pma' end
    return Config.VoiceMode
end

function Settings.HasCustomKey()
    return Load().customKeyCode ~= nil
end

function Settings.GetEffectiveVadThreshold()
    local s = Load()
    return s.vadThreshold or Config.VoiceActivation.energyThreshold
end

function Settings.GetNpcVolumeMultiplier()
    return Utils.Clamp(Load().npcVolume or 1.0, 0.0, 1.5)
end

-- =========================================================
-- EINSTELLUNGS-PANEL (Mikrofon/Taste/Lautstaerke + Admin-Provider-Bereich)
-- =========================================================

local panelOpen = false

local function OpenPanel()
    if panelOpen then return end
    panelOpen = true
    SetNuiFocus(true, true)
    TriggerServerEvent('policevoiceai:server:requestSettingsPanel')
end

local function ClosePanel()
    if not panelOpen then return end
    panelOpen = false
    SetNuiFocus(false, false)
    NUI.Send({ action = 'closeSettings' })
end

-- Standalone-Einstiegspunkt (garantiert funktionierend, siehe README zum Thema
-- "Reiter im MDT" - ein Tab in einer fremden, unbekannten MDT-UI kann nicht
-- zuverlaessig injiziert werden, siehe integrations/fivepd.lua).
RegisterKeyMapping('policevoiceai_settings', 'PoliceVoiceAI: Spracheinstellungen öffnen', 'keyboard', 'F9')
RegisterCommand('policevoiceai_settings', OpenPanel, false)

exports('OpenSettingsPanel', OpenPanel)

RegisterNetEvent('policevoiceai:client:settingsPanelData', function(data)
    if not panelOpen then return end

    NUI.Send({
        action = 'openSettings',
        isAdmin = data.isAdmin,
        runtime = data.runtime,
        options = data.options,
        saved = data.saved,
        error = data.error,
        playerSettings = Settings.Get(),
    })
end)

RegisterNUICallback('saveSettings', function(data, cb)
    if data and data.playerSettings then
        Settings.Save(data.playerSettings)
        Utils.VoiceLog('Player voice settings saved')
    end

    if data and data.runtimeSettings then
        -- Panel bleibt offen, bis die Server-Bestaetigung (mit Erfolg/Fehler) eintrifft.
        TriggerServerEvent('policevoiceai:server:saveRuntimeConfig', data.runtimeSettings)
    else
        ClosePanel()
    end

    cb('ok')
end)

RegisterNUICallback('closeSettings', function(_, cb)
    ClosePanel()
    cb('ok')
end)
