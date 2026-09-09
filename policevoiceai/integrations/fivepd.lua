FivePDIntegration = {}

-- =========================================================
-- PHASE 11-16: FIVEPD-INTEGRATION
-- =========================================================
-- Analog zu Alarm24s EmergencyDispatch-Integration: die tatsaechlichen Export-/
-- Event-Namen haengen von der konkret eingesetzten FivePD-Version ab und werden
-- deshalb NICHT hart verdrahtet. PoliceVoiceAI funktioniert vollstaendig
-- eigenstaendig (eigene NPC-Datenbank, eigenes MDT-Export-Interface siehe
-- server/mdt.lua) und nutzt FivePD-Exports nur als OPTIONALE Ergaenzung, wenn
-- sie tatsaechlich existieren.

function FivePDIntegration.IsRunning()
    return Config.FivePD.enabled and GetResourceState(Config.FivePD.resourceName) == 'started'
end

CreateThread(function()
    if Config.FivePD.enabled and not FivePDIntegration.IsRunning() then
        print(('[policevoiceai] Hinweis: Resource "%s" wurde nicht gefunden/gestartet. PoliceVoiceAI arbeitet mit seiner eigenen NPC-Datenbank unabhaengig davon weiter.'):format(Config.FivePD.resourceName))
    end
end)

-- Versucht (best effort, pcall), eine identifizierte Person direkt in FivePDs
-- eigener Citizen-Record-UI anzuzeigen. Schlaegt lautlos fehl, wenn der Export
-- nicht existiert - server/mdt.lua bleibt die primaere, garantiert funktionierende
-- Schnittstelle.
function FivePDIntegration.TryOpenNativeCitizenRecord(source, record)
    if not FivePDIntegration.IsRunning() or Utils.IsEmpty(Config.FivePD.openCitizenRecordExport) then
        return false
    end

    local ok = pcall(function()
        exports[Config.FivePD.resourceName][Config.FivePD.openCitizenRecordExport](source, record)
    end)
    return ok
end

-- Optionale native Halter-/Fahrzeugabfrage von FivePD (z.B. bei einem Kennzeichen-Scan
-- ausserhalb einer Voice-Konversation). Nur aktivieren, wenn der Export tatsaechlich existiert.
function FivePDIntegration.TryNativeCitizenLookup(plate)
    if not Config.FivePD.useNativeCitizenLookup or not FivePDIntegration.IsRunning() then
        return nil
    end

    local ok, result = pcall(function()
        return exports[Config.FivePD.resourceName][Config.FivePD.nativeCitizenLookupExport](plate)
    end)
    if ok then return result end
    return nil
end
