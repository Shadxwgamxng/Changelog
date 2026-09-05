Users = {}

local detectedFramework = nil

-- =========================================================
-- FRAMEWORK ERKENNUNG (nur fuer Anzeigenamen, NICHT fuer Identifier-Logik)
-- =========================================================

local function DetectFramework()
    if Config.Framework ~= 'auto' then
        return Config.Framework
    end

    if GetResourceState('es_extended') == 'started' then
        return 'esx'
    elseif GetResourceState('qb-core') == 'started' then
        return 'qbcore'
    elseif GetResourceState('qbx_core') == 'started' then
        return 'qbcore'
    end

    return 'standalone'
end

CreateThread(function()
    detectedFramework = DetectFramework()
    if Config.Debug then
        print(('[alarm24] Framework erkannt: %s'):format(detectedFramework))
    end
end)

-- =========================================================
-- IDENTIFIER HELPERS
-- =========================================================

--- Liefert den primaeren Identifier (license) eines Online-Spielers.
function Users.GetIdentifier(source)
    if not source or source == 0 then return nil end

    local identifiers = GetPlayerIdentifiers(source)
    for _, id in ipairs(identifiers) do
        if string.find(id, 'license:') == 1 then
            return id
        end
    end

    return identifiers[1]
end

--- Findet die Server-ID eines Online-Spielers anhand seines Identifiers.
--- Gibt nil zurueck, wenn der Spieler nicht online ist -> Offline-Alarm-Pfad.
function Users.GetSourceByIdentifier(identifier)
    if not identifier then return nil end

    for _, playerId in ipairs(GetPlayers()) do
        local src = tonumber(playerId)
        local identifiers = GetPlayerIdentifiers(src)
        for _, id in ipairs(identifiers) do
            if id == identifier then
                return src
            end
        end
    end

    return nil
end

function Users.GetDisplayName(source)
    if not source or source == 0 then return 'Unbekannt' end

    if detectedFramework == 'esx' then
        local ok, xPlayer = pcall(function()
            return exports['es_extended']:GetPlayerFromId(source)
        end)
        if ok and xPlayer then
            local ok2, name = pcall(function()
                return ('%s %s'):format(xPlayer.get('firstName') or '', xPlayer.get('lastName') or '')
            end)
            if ok2 and Utils.Trim(name) ~= '' then
                return Utils.Trim(name)
            end
        end
    elseif detectedFramework == 'qbcore' then
        local ok, Player = pcall(function()
            local QBCore = exports['qb-core']:GetCoreObject()
            return QBCore.Functions.GetPlayer(source)
        end)
        if ok and Player and Player.PlayerData and Player.PlayerData.charinfo then
            local info = Player.PlayerData.charinfo
            return ('%s %s'):format(info.firstname or '', info.lastname or '')
        end
    end

    return GetPlayerName(source) or 'Unbekannt'
end

-- =========================================================
-- ALARM24 USER LOOKUP (Admin-gepflegte Zuordnung, siehe Punkt 22)
-- =========================================================

--- Sucht den von EmergencyDispatch gemeldeten Benutzer ausschliesslich anhand
--- des FiveM-Identifiers. Es findet KEINE Namenssuche/-heuristik statt, da
--- Identifier eindeutig sind und Namen es nicht sind.
function Users.FindUserByIdentifier(identifier)
    if Utils.IsEmpty(identifier) then
        return nil
    end

    local user = Database.GetUserByIdentifier(identifier)
    return user
end

function Users.IsUserActive(user)
    return user and tonumber(user.active) == 1
end

function Users.CreateOrUpdate(identifier, name, organization, active)
    Database.UpsertUser(identifier, name, organization, active)
end

function Users.Delete(identifier)
    Database.DeleteUser(identifier)
end

function Users.SetAvailability(identifier, availability)
    if not Alarm24Availability[availability] and not (function()
        for _, v in pairs(Alarm24Availability) do
            if v == availability then return true end
        end
        return false
    end)() then
        return false
    end

    Database.SetUserAvailability(identifier, availability)
    return true
end
