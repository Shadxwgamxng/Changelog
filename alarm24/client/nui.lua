NUI = {}

local appOpen = false

function NUI.IsOpen()
    return appOpen
end

function NUI.Open()
    if appOpen then return end
    appOpen = true
    SetNuiFocus(true, true)
    SendNUIMessage({ action = 'openApp' })
end

function NUI.Close()
    if not appOpen then return end
    appOpen = false
    SetNuiFocus(false, false)
    SendNUIMessage({ action = 'closeApp' })
end

function NUI.Toggle()
    if appOpen then
        NUI.Close()
    else
        NUI.Open()
    end
end

local adminOpen = false

function NUI.OpenAdmin()
    adminOpen = true
    SetNuiFocus(true, true)
    SendNUIMessage({ action = 'openAdmin' })
    TriggerServerEvent('alarm24:server:admin:listUsers')
    TriggerServerEvent('alarm24:server:admin:getLogs')
end

function NUI.CloseAdmin()
    if not adminOpen then return end
    adminOpen = false
    if not appOpen then
        SetNuiFocus(false, false)
    end
    SendNUIMessage({ action = 'closeAdmin' })
end

--- Sendet eine Nachricht an die NUI, unabhaengig davon ob die App gerade
--- geoeffnet ist (z.B. fuer eingehende Alarme, die auch bei geschlossener
--- App als Popup ueber die NUI angezeigt werden sollen).
function NUI.Send(action, data)
    SendNUIMessage({ action = action, data = data })
end

-- =========================================================
-- NUI CALLBACKS (JS -> LUA)
-- =========================================================

RegisterNUICallback('closeApp', function(_, cb)
    NUI.Close()
    cb('ok')
end)

RegisterNUICallback('closeAdmin', function(_, cb)
    NUI.CloseAdmin()
    cb('ok')
end)

RegisterNUICallback('ready', function(_, cb)
    TriggerServerEvent('alarm24:server:ready')
    TriggerServerEvent('alarm24:server:requestInitialData')
    cb('ok')
end)

RegisterNUICallback('requestInitialData', function(_, cb)
    TriggerServerEvent('alarm24:server:requestInitialData')
    cb('ok')
end)

RegisterNUICallback('respond', function(data, cb)
    if type(data) == 'table' and data.recipientId and data.status then
        TriggerServerEvent('alarm24:server:respond', tonumber(data.recipientId), data.status)
    end
    cb('ok')
end)

RegisterNUICallback('setAvailability', function(data, cb)
    if type(data) == 'table' and data.availability then
        TriggerServerEvent('alarm24:server:setAvailability', data.availability)
    end
    cb('ok')
end)

RegisterNUICallback('requestLiveSummary', function(data, cb)
    if type(data) == 'table' and data.alarmId then
        TriggerServerEvent('alarm24:server:requestLiveSummary', tonumber(data.alarmId))
    end
    cb('ok')
end)

RegisterNUICallback('setWaypoint', function(data, cb)
    if Config.Navigation and type(data) == 'table' and data.x and data.y then
        SetNewWaypoint(tonumber(data.x), tonumber(data.y))
    end
    cb('ok')
end)

RegisterNUICallback('getDistance', function(data, cb)
    if type(data) ~= 'table' or not data.x or not data.y then
        cb({ distance = nil })
        return
    end

    local ped = PlayerPedId()
    local coords = GetEntityCoords(ped)
    local distance = Utils.GetDistance(coords.x, coords.y, coords.z, tonumber(data.x), tonumber(data.y), tonumber(data.z) or coords.z)

    cb({ distance = distance, formatted = Utils.FormatDistance(distance) })
end)

-- ---------------------------------------------------------
-- ADMINBEREICH (Server prueft ACE-Berechtigung erneut, siehe permissions.lua)
-- ---------------------------------------------------------

RegisterNUICallback('adminListUsers', function(_, cb)
    TriggerServerEvent('alarm24:server:admin:listUsers')
    cb('ok')
end)

RegisterNUICallback('adminUpsertUser', function(data, cb)
    TriggerServerEvent('alarm24:server:admin:upsertUser', data)
    cb('ok')
end)

RegisterNUICallback('adminDeleteUser', function(data, cb)
    if type(data) == 'table' and data.identifier then
        TriggerServerEvent('alarm24:server:admin:deleteUser', data.identifier)
    end
    cb('ok')
end)

RegisterNUICallback('adminGetLogs', function(_, cb)
    TriggerServerEvent('alarm24:server:admin:getLogs')
    cb('ok')
end)
