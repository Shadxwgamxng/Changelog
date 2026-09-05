-- =========================================================
-- ALARM24 - CLIENT BOOTSTRAP
-- =========================================================
-- Kein Idle-Loop: die App reagiert ausschliesslich auf Tastendruck/Command
-- (Oeffnen der App) und auf vom Server ausgeloeste Events (Alarmierung,
-- Rueckmeldungsergebnis, Live-Uebersicht, Adminbereich).

RegisterKeyMapping(Config.OpenCommand, 'Alarm24 App oeffnen/schliessen', 'keyboard', Config.OpenKeyMapping)

RegisterCommand(Config.OpenCommand, function()
    NUI.Toggle()
end, false)

-- Server prueft die ACE-Berechtigung bei jeder einzelnen Admin-Aktion erneut
-- (server/permissions.lua) - dieser Command oeffnet lediglich die Oberflaeche.
RegisterCommand(Config.OpenCommand .. 'admin', function()
    NUI.OpenAdmin()
end, false)

-- =========================================================
-- EINGEHENDE ALARMIERUNG
-- =========================================================

RegisterNetEvent('alarm24:receiveAlarm', function(data)
    Alarm.ShowIncoming(data)
end)

RegisterNetEvent('alarm24:missedAlarm', function(data)
    Alarm.ShowMissed(data)
end)

RegisterNetEvent('alarm24:liveSummary', function(data)
    Alarm.ShowLiveSummary(data)
end)

RegisterNetEvent('alarm24:notify', function(data)
    NUI.Send('notify', data)
end)

-- =========================================================
-- NUI-DATENANTWORTEN
-- =========================================================

RegisterNetEvent('alarm24:client:initialData', function(data)
    NUI.Send('initialData', data)
end)

RegisterNetEvent('alarm24:client:respondResult', function(data)
    NUI.Send('respondResult', data)
end)

RegisterNetEvent('alarm24:client:availabilityResult', function(data)
    NUI.Send('availabilityResult', data)
end)

-- =========================================================
-- ADMINBEREICH
-- =========================================================

RegisterNetEvent('alarm24:client:admin:users', function(data)
    NUI.Send('adminUsers', data)
end)

RegisterNetEvent('alarm24:client:admin:logs', function(data)
    NUI.Send('adminLogs', data)
end)
