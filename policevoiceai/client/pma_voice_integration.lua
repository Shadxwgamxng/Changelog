PmaVoice = {}

-- =========================================================
-- PUNKT 52-54: PMA-VOICE-INTEGRATION
-- =========================================================
-- FiveM bietet keine API, mit der ein Script zuverlaessig ausliest, welche
-- physische Taste ein Spieler in pma-voice als Push-to-Talk hinterlegt hat.
-- Dieses Script behauptet das deshalb bewusst NICHT (Punkt 54). Stattdessen
-- wird best-effort versucht, den tatsaechlichen SPRECHZUSTAND auszulesen -
-- mehrere bekannte Export-/State-Bag-Konventionen werden der Reihe nach
-- probiert (pcall-abgesichert, je nach pma-voice-Version/-Fork kann der Name
-- abweichen). Liefert KEINE davon ein Ergebnis, gibt IsPlayerTalking() nil
-- zurueck - der Aufrufer (client/voice_capture.lua) faellt dann automatisch
-- auf Config.Voice.FallbackKey als ganz normale, eigene PTT-Taste zurueck.
-- Es wird also niemals eine Taste "erfunden".

local warnedOnce = false

function PmaVoice.IsAvailable()
    return Config.Voice.Provider == 'pma-voice' and GetResourceState('pma-voice') == 'started'
end

local CANDIDATE_TALKING_CHECKS = {
    function() return exports['pma-voice']:isTalking() end,
    function() return exports['pma-voice']:playerTalking() end,
    function() return LocalPlayer.state.proximity_voice_talking end,
    function() return LocalPlayer.state.voiceTalking end,
}

function PmaVoice.IsPlayerTalking()
    if not PmaVoice.IsAvailable() then return nil end

    for _, check in ipairs(CANDIDATE_TALKING_CHECKS) do
        local ok, result = pcall(check)
        if ok and result ~= nil then return result end
    end

    if not warnedOnce then
        warnedOnce = true
        if Config.Debug then
            print('[policevoiceai] Konnte den Sprechzustand von pma-voice nicht auslesen (Version/Fork-Unterschied?). ' ..
                'Falle auf Config.Voice.FallbackKey zurueck. Siehe client/pma_voice_integration.lua zum Anpassen.')
        end
    end

    return nil
end
