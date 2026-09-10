NPCSocial = {}

-- =========================================================
-- PUNKT 57-63/67-70/78: NPC SOCIAL INTERACTION SYSTEM
-- =========================================================
-- Drei unabhaengige Bausteine:
--  1. Annaeherungs-Scan: meldet nahe, freie Peds periodisch dem Server, der
--     autoritativ entscheidet ob/wie reagiert wird (server/social_ai.lua).
--  2. Navigation: fuehrt eine vom Server genehmigte Annaeherung tatsaechlich aus
--     (Laufen, Stehenbleiben, Hinwenden), inkl. saubere Abbruchbedingungen (kein Soft-Lock).
--  3. Prioritaets-Override: haelt einen NPC waehrend eines AKTIVEN Gespraechs
--     beim Officer, statt dem normalen Ambient-GTA-Verhalten zu folgen.

-- =========================================================
-- 1. ANNAEHERUNGS-SCAN
-- =========================================================

local lastScanRequestAt = {} -- [pedNetId] = GetGameTimer(), verhindert Spam derselben Anfrage

local function IsNearActivePoliceScene(pedCoords)
    for _, vehicle in ipairs(GetGamePool('CVehicle')) do
        if GetVehicleClass(vehicle) == 18 and IsVehicleSirenOn(vehicle) then
            if Utils.Distance(pedCoords, GetEntityCoords(vehicle)) <= Config.SocialAI.policeVehicleAwarenessRadius then
                return vehicle
            end
        end
    end
    return nil
end

CreateThread(function()
    while true do
        Wait(Config.SocialAI.scanIntervalMs or 4000)

        if Config.SocialAI.enabled and Config.Voice.enabled and not NPCInteraction.IsInConversation() then
            local playerPed = PlayerPedId()
            local playerCoords = GetEntityCoords(playerPed)
            local now = GetGameTimer()
            local checked = 0

            for _, ped in ipairs(GetGamePool('CPed')) do
                -- Performance UND Punkt 65-Feedback ("zu viele Annaeherungen"): pro Tick nur
                -- eine kleine Auswahl bewerten, nicht jeden Ped im Umkreis auf einmal.
                if checked >= 4 then break end

                if ped ~= playerPed and not IsPedAPlayer(ped) and not IsEntityDead(ped) then
                    local pedCoords = GetEntityCoords(ped)
                    local dist = Utils.Distance(playerCoords, pedCoords)

                    if dist <= Config.NPCInteraction.ApproachDistance then
                        checked = checked + 1

                        -- Punkt 60/61: NPC beobachtet stattdessen laufenden Polizeieinsatz,
                        -- statt den Officer anzusprechen
                        local sceneVehicle = IsNearActivePoliceScene(pedCoords)
                        if sceneVehicle then
                            pcall(TaskLookAtEntity, ped, sceneVehicle, 3000, 0, 2)
                        else
                            local pedNetId = NetworkGetNetworkIdFromEntity(ped)
                            local lastRequest = lastScanRequestAt[pedNetId] or 0
                            if now - lastRequest > (Config.NPCInteraction.ApproachRerollCooldownSeconds * 1000) then
                                lastScanRequestAt[pedNetId] = now
                                TriggerServerEvent('policevoiceai:server:evaluateApproach', pedNetId)
                            end
                        end
                    end
                end
            end
        end
    end
end)

-- =========================================================
-- 2. NAVIGATION (Punkt 63: sicherer Weg, natuerliches Lauftempo, kein Teleport)
-- =========================================================

local function NavigateToOfficer(pedEntity, pedNetId)
    CreateThread(function()
        local playerPedNow = PlayerPedId()

        -- Steht der NPC ohnehin schon nah genug (innerhalb StartDistance), muss
        -- er nicht extra hinlaufen - er spricht den Officer direkt an.
        if Utils.Distance(GetEntityCoords(pedEntity), GetEntityCoords(playerPedNow)) <= Config.NPCInteraction.StartDistance then
            pcall(TaskTurnPedToFaceEntity, pedEntity, playerPedNow, 2000)
            Wait(400)
            TriggerServerEvent('policevoiceai:server:startConversation', pedNetId, { type = 'social_approach' })
            return
        end

        local startedAt = GetGameTimer()
        local lastTaskAt = 0

        while true do
            Wait(250)

            local playerPed = PlayerPedId()
            if not DoesEntityExist(pedEntity) or not DoesEntityExist(playerPed) then
                TriggerServerEvent('policevoiceai:server:cancelApproach', pedNetId)
                return
            end

            local pedCoords, playerCoords = GetEntityCoords(pedEntity), GetEntityCoords(playerPed)
            local dist = Utils.Distance(pedCoords, playerCoords)

            if dist <= Config.NPCInteraction.StopDistance + 0.3 then
                ClearPedTasksImmediately(pedEntity)
                pcall(TaskTurnPedToFaceEntity, pedEntity, playerPed, 2000)
                Wait(400)
                -- Punkt 58/59: der NPC spricht den Officer jetzt aktiv an
                TriggerServerEvent('policevoiceai:server:startConversation', pedNetId, { type = 'social_approach' })
                return
            end

            -- Punkt 75 (analog): kein Soft-Lock - Timeout oder Spieler zu weit weg -> sauber abbrechen
            if dist > Config.NPCInteraction.ApproachDistance or (GetGameTimer() - startedAt) > Config.SocialAI.approachTimeoutMs then
                ClearPedTasksImmediately(pedEntity)
                TriggerServerEvent('policevoiceai:server:cancelApproach', pedNetId)
                return
            end

            if GetGameTimer() - lastTaskAt > 1200 then
                lastTaskAt = GetGameTimer()
                local dx, dy = playerCoords.x - pedCoords.x, playerCoords.y - pedCoords.y
                local planarDist = math.sqrt(dx * dx + dy * dy)
                if planarDist > 0.1 then
                    local stop = Config.NPCInteraction.StopDistance
                    local targetX = playerCoords.x - (dx / planarDist) * stop
                    local targetY = playerCoords.y - (dy / planarDist) * stop
                    pcall(TaskGoStraightToCoord, pedEntity, targetX, targetY, pedCoords.z, 1.0, 5000, 0.0, 0.0)
                end
            end
        end
    end)
end

RegisterNetEvent('policevoiceai:client:npcApproachDecision', function(decision)
    if not decision or decision.action == 'none' or not decision.pedNetId then return end

    local pedEntity = NetworkGetEntityFromNetworkId(decision.pedNetId)
    if pedEntity == 0 or not DoesEntityExist(pedEntity) then return end

    if decision.action == 'flee' then
        -- Punkt 65/78: kriminelle NPCs koennen den Officer stattdessen meiden
        pcall(TaskSmartFleePed, pedEntity, PlayerPedId(), 30.0, -1, false, false)
        return
    end

    if decision.action == 'approach' then
        NavigateToOfficer(pedEntity, decision.pedNetId)
    end
end)

-- =========================================================
-- 3. PRIORITAETS-OVERRIDE (Punkt 62/67/69/77)
-- =========================================================
-- Waehrend eines aktiven Gespraechs hat "beim Officer bleiben" Prioritaet vor
-- normalem Ambient-GTA-Verhalten. Erkennung ueber Drift von der Position bei
-- Gespraechsbeginn (statt jeden Tick hart einzugreifen), damit eigene
-- Sprechanimationen (client/animation.lua) NICHT gestoert werden.

local overrideActive = false

function NPCSocial.StartPriorityOverride(pedNetId)
    overrideActive = true

    CreateThread(function()
        local anchorCoords = nil

        while overrideActive and Client.state.pedNetId == pedNetId do
            local pedEntity = NetworkGetEntityFromNetworkId(pedNetId)
            if pedEntity == 0 or not DoesEntityExist(pedEntity) then break end

            SetBlockingOfNonTemporaryEvents(pedEntity, true)
            SetPedKeepTask(pedEntity, true)

            if not anchorCoords then anchorCoords = GetEntityCoords(pedEntity) end

            if IsPedInAnyVehicle(pedEntity, false) then
                pcall(TaskLeaveVehicle, pedEntity, GetVehiclePedIsIn(pedEntity, false), 0)
            elseif Utils.Distance(GetEntityCoords(pedEntity), anchorCoords) > 0.6 then
                -- Punkt 67: NPC darf waehrend eines Gespraechs nicht einfach weglaufen
                pcall(TaskStandStill, pedEntity, 3000)
            end

            Wait(1500)
        end
    end)
end

-- Punkt 68: nach Gespraechsende geht der NPC wieder seiner normalen Taetigkeit nach
function NPCSocial.StopPriorityOverride(pedNetId)
    overrideActive = false

    local pedEntity = pedNetId and NetworkGetEntityFromNetworkId(pedNetId)
    if pedEntity and pedEntity ~= 0 and DoesEntityExist(pedEntity) then
        SetBlockingOfNonTemporaryEvents(pedEntity, false)
        SetPedKeepTask(pedEntity, false)
        ClearPedTasks(pedEntity)
    end
end
