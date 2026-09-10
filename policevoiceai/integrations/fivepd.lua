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

-- =========================================================
-- "REITER IM MDT" - WARUM ES DAS NICHT GIBT
-- =========================================================
-- FivePDs MDT ist eine eigene NUI mit eigenem, unbekanntem Tab-/Plugin-System
-- (Framework, Routing, Rechteverwaltung - alles versionsabhaengig). Ohne
-- Einsicht in dessen Quellcode gibt es KEINE zuverlaessige Moeglichkeit, von
-- aussen einen echten neuen Tab in diese fremde UI einzuhaengen - ein Versuch,
-- das zu erfinden, wuerde bei der naechsten FivePD-Version einfach nichts tun
-- oder die MDT-UI zerschiessen.
--
-- Stattdessen bietet PoliceVoiceAI ein EIGENES, garantiert funktionierendes
-- Einstellungspanel (Mikrofon/Taste/Empfindlichkeit/Lautstaerke + Admin-Provider-
-- Bereich), siehe client/settings.lua:
--   - Taste (Standard F9, ueber FiveM-Tastenbelegung "PoliceVoiceAI:
--     Spracheinstellungen öffnen" frei umbelegbar)
--   - Befehl: /policevoiceai_settings
--   - Export fuer andere Ressourcen (z.B. einen eigenen FivePD-MDT-Menuepunkt,
--     falls dessen Tab-System bekannt ist): exports['policevoiceai']:OpenSettingsPanel()
--
-- Sollte die eigene FivePD-Version tatsaechlich ein bekanntes Plugin-/Tab-
-- Registrierungs-Export bereitstellen, kann hier (pcall-abgesichert, wie beim
-- Rest dieser Datei) ein Aufruf ergaenzt werden, der beim Start versucht einen
-- Tab/Menuepunkt zu registrieren, der intern exports['policevoiceai']:OpenSettingsPanel()
-- aufruft. Ohne einen bekannten, dokumentierten Exportnamen wird hier bewusst
-- nichts geraten.
