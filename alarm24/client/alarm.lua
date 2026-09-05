Alarm = {}

-- =========================================================
-- EINGEHENDE ALARMIERUNG (ausschliesslich vom Server ausgeloest)
-- =========================================================
--
-- Der Client behauptet an keiner Stelle selbst "ich wurde alarmiert" - er
-- reagiert ausschliesslich auf das Event 'alarm24:receiveAlarm', das der
-- Server NUR feuert, nachdem die EmergencyDispatch-Integration eine echte
-- Alarmierung fuer genau diesen Spieler verarbeitet hat (server/alarms.lua).

function Alarm.ShowIncoming(data)
    -- Alarm ist prominent und unterbricht den aktuellen App-Zustand -
    -- vergleichbar mit einer Vollbild-Alarmierung wie bei DIVERA 24/7.
    SetNuiFocus(true, true)
    NUI.Send('newAlarm', data)

    if Config.AlarmSound.enabled then
        NUI.Send('playAlarmSound', {
            volume = Config.AlarmSound.volume,
            file = Config.AlarmSound.file,
            loop = Config.AlarmSound.loop,
            vibration = Config.AlarmSound.vibration,
        })
    end
end

function Alarm.ShowMissed(data)
    NUI.Send('missedAlarm', data)
end

function Alarm.ShowLiveSummary(data)
    NUI.Send('liveSummary', data)
end

-- =========================================================
-- NAVIGATION
-- =========================================================

function Alarm.SetWaypoint(x, y)
    if not Config.Navigation then return end
    if not x or not y then return end
    SetNewWaypoint(x + 0.0, y + 0.0)
end

function Alarm.GetDistanceToCoords(x, y, z)
    local ped = PlayerPedId()
    local coords = GetEntityCoords(ped)
    return Utils.GetDistance(coords.x, coords.y, coords.z, x, y, z or coords.z)
end
