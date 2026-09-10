NPCThreat = {}

-- =========================================================
-- WAFFE/TASER AUF NPC GERICHTET: HAENDE HOCH ODER FLUCHT
-- =========================================================
-- Erkennt, wenn der Spieler mit einer gezogenen Waffe auf einen NPC zielt
-- (GetEntityPlayerIsFreeAimingAt - dokumentiertes FiveM-Native), und laesst
-- den Server (persoenlichkeitsbasiert, siehe server/social_ai.lua) autoritativ
-- entscheiden, ob der NPC die Haende hebt und stehen bleibt oder flieht.

local WEAPON_UNARMED_HASH = GetHashKey('WEAPON_UNARMED')

local activeReactions = {}        -- [pedNetId] = { reaction = 'comply'|'fleeing', lastAimedAt }
local lastEvaluateRequestAt = {}  -- [pedNetId] = GetGameTimer(), verhindert Anfrage-Spam

local function IsPlayerArmed(playerPed)
    local weapon = GetSelectedPedWeapon(playerPed)
    return weapon ~= WEAPON_UNARMED_HASH and weapon ~= 0
end

local function ReleaseReaction(pedNetId, skipServerNotify)
    local reaction = activeReactions[pedNetId]
    activeReactions[pedNetId] = nil
    if not reaction then return end

    Utils.VoiceLog('NPC %s Bedrohungsreaktion aufgehoben (%s)', tostring(pedNetId), reaction.reaction)

    local pedEntity = NetworkGetEntityFromNetworkId(pedNetId)
    if pedEntity ~= 0 and DoesEntityExist(pedEntity) and reaction.reaction == 'comply' then
        ClearPedTasksImmediately(pedEntity)
        SetBlockingOfNonTemporaryEvents(pedEntity, false)
    end

    if not skipServerNotify then
        TriggerServerEvent('policevoiceai:server:clearThreat', pedNetId)
    end
end

-- =========================================================
-- SCAN (laeuft nur "teuer", solange der Spieler tatsaechlich bewaffnet ist)
-- =========================================================

CreateThread(function()
    while true do
        local playerPed = PlayerPedId()

        if Config.ThreatAI.enabled and IsPlayerArmed(playerPed) then
            Wait(Config.ThreatAI.scanIntervalMs)

            local aiming, targetEntity = GetEntityPlayerIsFreeAimingAt(PlayerId())

            if aiming and targetEntity and targetEntity ~= 0 and DoesEntityExist(targetEntity)
                and IsEntityAPed(targetEntity) and not IsPedAPlayer(targetEntity) then

                local dist = Utils.Distance(GetEntityCoords(playerPed), GetEntityCoords(targetEntity))
                if dist <= Config.ThreatAI.reactionDistance then
                    local pedNetId = NetworkGetNetworkIdFromEntity(targetEntity)
                    local existing = activeReactions[pedNetId]

                    if existing then
                        existing.lastAimedAt = GetGameTimer()
                    else
                        local now = GetGameTimer()
                        if now - (lastEvaluateRequestAt[pedNetId] or 0) > 1000 then
                            lastEvaluateRequestAt[pedNetId] = now
                            TriggerServerEvent('policevoiceai:server:evaluateThreat', pedNetId)
                        end
                    end
                end
            end
        else
            Wait(400)
        end

        -- Entwarnung: "Haende hoch"-NPCs, auf die eine Weile nicht mehr gezielt wurde,
        -- nehmen die Haende wieder runter (Punkt: kein dauerhaftes Festhaengen)
        local now = GetGameTimer()
        for pedNetId, reaction in pairs(activeReactions) do
            if reaction.reaction == 'comply' and now - reaction.lastAimedAt > Config.ThreatAI.releaseGraceMs then
                ReleaseReaction(pedNetId)
            end
        end
    end
end)

-- =========================================================
-- SERVER-ENTSCHEIDUNG AUSFUEHREN
-- =========================================================

RegisterNetEvent('policevoiceai:client:npcThreatDecision', function(decision)
    if not decision or decision.action == 'none' or not decision.pedNetId then return end

    local pedEntity = NetworkGetEntityFromNetworkId(decision.pedNetId)
    if pedEntity == 0 or not DoesEntityExist(pedEntity) then return end

    if activeReactions[decision.pedNetId] then
        activeReactions[decision.pedNetId].lastAimedAt = GetGameTimer()
        return
    end

    activeReactions[decision.pedNetId] = { reaction = decision.action, lastAimedAt = GetGameTimer() }

    if decision.action == 'comply' then
        Utils.VoiceLog('NPC %s ergibt sich (Haende hoch)', tostring(decision.pedNetId))
        SetBlockingOfNonTemporaryEvents(pedEntity, true)
        pcall(TaskHandsUp, pedEntity, -1, PlayerPedId(), -1, 0)
    elseif decision.action == 'fleeing' then
        Utils.VoiceLog('NPC %s flieht vor der Bedrohung', tostring(decision.pedNetId))
        pcall(TaskSmartFleePed, pedEntity, PlayerPedId(), 100.0, -1, false, false)

        -- Laeuft der Officer gerade ein Gespraech mit genau diesem NPC, endet es hier sauber
        if NPCInteraction and NPCInteraction.IsInConversation() and Client.state.pedNetId == decision.pedNetId then
            NPCInteraction.EndConversation('target_fled_threat')
        end
    end
end)

-- Server hat eine Reaktion serverseitig aufgehoben (z.B. Soft-Lock-Schutz nach
-- Config.ThreatAI.autoReleaseMs) - lokal synchron nachziehen.
RegisterNetEvent('policevoiceai:client:npcThreatCleared', function(pedNetId)
    ReleaseReaction(pedNetId, true)
end)
