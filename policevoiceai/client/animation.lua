Animation = {}

-- =========================================================
-- PHASE 10: ANIMATION / LIPSYNC
-- =========================================================
-- Nutzt ausschliesslich dokumentierte GTA V/FiveM-Natives (docs.fivem.net/natives).
-- Da es keine echte Viseme-basierte Lippensynchronisation gibt, wird der
-- "spricht"-Eindruck ueber TaskChatEvent (ambiente Redeanimation), Blickkontakt
-- (TaskLookAtEntity) und gelegentliche Gestik-Animationen erzeugt (Punkt 16).
-- Alle Native-Aufrufe sind pcall-abgesichert, damit ein falscher/fehlender
-- Animationsdatensatz (z.B. durch ein anderes DLC-Level) niemals den Client
-- zum Absturz bringt.

-- Bekannte, oft genutzte Gestik-Animationen (Standardspiel, kein DLC noetig).
-- Falls diese in einer bestimmten Spielversion nicht existieren, greift der pcall
-- einfach lautlos ins Leere - die Kernfunktion (Sprechen/Blickkontakt) bleibt erhalten.
local GESTURES = {
    { dict = 'gestures@m@standing@casual', name = 'gesture_hello' },
    { dict = 'gestures@m@standing@casual', name = 'gesture_shrug' },
    { dict = 'gestures@m@standing@casual', name = 'gesture_no' },
    { dict = 'gestures@m@standing@casual', name = 'gesture_disbelief' },
}

local function RequestDictWithTimeout(dict)
    if HasAnimDictLoaded(dict) then return true end
    RequestAnimDict(dict)
    local attempts = 0
    while not HasAnimDictLoaded(dict) and attempts < 100 do
        Wait(10)
        attempts = attempts + 1
    end
    return HasAnimDictLoaded(dict)
end

function Animation.PlayTalking(pedEntity, emotion, durationMs)
    if not Config.Animation.enabled then return end
    if not pedEntity or pedEntity == 0 or not DoesEntityExist(pedEntity) then return end

    pcall(TaskChatEvent, pedEntity, 15, 0.5, -1, 0, 0)

    if Config.Animation.lookAtPlayer then
        pcall(TaskLookAtEntity, pedEntity, PlayerPedId(), durationMs or 3000, 0, 2)
    end

    if Utils.RollChance(math.floor((Config.Animation.gestureChance or 0.35) * 100)) then
        CreateThread(function()
            local gesture = GESTURES[math.random(1, #GESTURES)]
            if RequestDictWithTimeout(gesture.dict) then
                pcall(TaskPlayAnim, pedEntity, gesture.dict, gesture.name, 8.0, -8.0, 1500, 48, 0, false, false, false)
            end
        end)
    end
end

function Animation.StopTalking(pedEntity)
    if not pedEntity or pedEntity == 0 or not DoesEntityExist(pedEntity) then return end
    pcall(ClearPedSecondaryTask, pedEntity)
end
