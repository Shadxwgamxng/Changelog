-- =========================================================
-- PUNKT 49-51/71-73: 3D-INDIKATOR UEBER DEM NPC-KOPF + DEBUG-OVERLAY
-- =========================================================
-- Zeigt Name/Sprechstatus ausschliesslich fuer NPCs an, fuer die der Server
-- gerade tatsaechlich einen Zustandswechsel gemeldet hat (siehe
-- server/npc_manager.lua NPCManager.SetState -> BroadcastToNearby). Dadurch
-- zeigen niemals mehrere NPCs gleichzeitig "Zuhören..." an - nur der wirklich
-- aktive Gespraechspartner (pro Officer).

local ActiveIndicators = {} -- [pedNetId] = { state, stateName, npcId, firstName, lastName, personality, debugTask, targetPlayer, updatedAt }

RegisterNetEvent('policevoiceai:client:npcStateChanged', function(data)
    if not data or not data.pedNetId then return end

    if data.state == NPC_STATES.IDLE then
        ActiveIndicators[data.pedNetId] = nil
        return
    end

    ActiveIndicators[data.pedNetId] = {
        state = data.state,
        stateName = data.stateName,
        npcId = data.npcId,
        firstName = data.firstName,
        lastName = data.lastName,
        personality = data.personality,
        debugTask = data.debugTask,
        targetPlayer = data.targetPlayer,
        updatedAt = GetGameTimer(),
    }
end)

local function DrawText3D(coords, text, scale, r, g, b, a)
    local onScreen, x, y = GetScreenCoordFromWorldCoord(coords.x, coords.y, coords.z)
    if not onScreen then return end

    SetTextScale(scale or 0.32, scale or 0.32)
    SetTextFont(4)
    SetTextProportional(true)
    SetTextColour(r or 255, g or 255, b or 255, a or 215)
    SetTextEntry('STRING')
    SetTextCentre(true)
    AddTextComponentString(text)
    DrawText(x, y)
end

local function DrawIndicatorForPed(pedEntity, info, dist)
    local headCoords = GetEntityCoords(pedEntity) + vector3(0.0, 0.0, 1.05)

    local indicatorKey = NPC_STATE_INDICATOR_KEY[info.state]
    if indicatorKey then
        DrawText3D(headCoords + vector3(0.0, 0.0, 0.16), Locale(indicatorKey), 0.30, 255, 255, 255, 220)
    end

    local showName = Config.NPCNameDisplay == 'always'
        or (Config.NPCNameDisplay == 'conversation_only' and indicatorKey ~= nil)

    if showName and info.firstName then
        DrawText3D(headCoords + vector3(0.0, 0.0, 0.06), ('%s %s'):format(info.firstName, info.lastName or ''), 0.32)
    end

    -- Punkt 73: Debug-Modus - hilft genau die in Punkt 47 beschriebenen
    -- "NPC reagiert nicht"-Faelle zu diagnostizieren.
    if Config.Debug then
        local lines = {
            ('NPC: %s'):format(info.npcId or '?'),
            ('State: %s'):format(info.stateName or '?'),
            ('Task: %s'):format(info.debugTask or '-'),
            ('Target: %s'):format(info.targetPlayer and ('Player ' .. tostring(info.targetPlayer)) or '-'),
            ('Dist: %.1fm'):format(dist),
        }
        if info.personality then
            lines[#lines + 1] = ('Coop:%d Aggr:%d Honest:%d'):format(
                info.personality.cooperation or 0, info.personality.aggression or 0, info.personality.honesty or 0)
        end

        for i, line in ipairs(lines) do
            DrawText3D(headCoords - vector3(0.0, 0.0, 0.05 + i * 0.05), line, 0.24, 255, 220, 120, 220)
        end
    end
end

CreateThread(function()
    while true do
        Wait(0)
        local now = GetGameTimer()
        local anyActive = false

        for pedNetId, info in pairs(ActiveIndicators) do
            anyActive = true

            if now - info.updatedAt > 60000 then
                -- Punkt 75: falls jemals ein IDLE-Broadcast verpasst wurde (z.B. weil
                -- der Client kurzzeitig ausserhalb der Broadcast-Reichweite war),
                -- verschwindet der Indikator trotzdem spaetestens nach 60s von selbst.
                ActiveIndicators[pedNetId] = nil
            else
                local pedEntity = NetworkGetEntityFromNetworkId(pedNetId)
                if pedEntity == 0 or not DoesEntityExist(pedEntity) then
                    ActiveIndicators[pedNetId] = nil
                else
                    local dist = Utils.Distance(GetEntityCoords(PlayerPedId()), GetEntityCoords(pedEntity))
                    if dist <= 20.0 then
                        DrawIndicatorForPed(pedEntity, info, dist)
                    end
                end
            end
        end

        if not anyActive then Wait(200) end
    end
end)
