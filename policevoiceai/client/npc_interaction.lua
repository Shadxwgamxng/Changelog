NPCInteraction = {}

-- =========================================================
-- PHASE 1/4: NPC-TARGETING & GESPRAECHSSTATE (Client-Seite)
-- =========================================================
-- Kein Menue: der Spieler naehert sich einfach einem NPC und spricht ihn direkt
-- an (Punkt 31). Die eigentliche Autorisierung/Distanzpruefung passiert IMMER
-- zusaetzlich serverseitig (server/security.lua) - der Client dient hier nur
-- der Zielauswahl und dem UI-Feedback.

Client = Client or {}
Client.state = {
    conversationId = nil,
    pedNetId = nil,
    npcFirstName = nil,
    npcLastName = nil,
    voiceProfile = nil,
}

function NPCInteraction.IsInConversation()
    return Client.state.conversationId ~= nil
end

-- Sucht den naechsten, nicht von einem Spieler gesteuerten Ped in Reichweite (Punkt 4/17)
function NPCInteraction.FindNearestPed()
    local playerPed = PlayerPedId()
    local playerCoords = GetEntityCoords(playerPed)

    local closestPed, closestDist = nil, Config.NPCConversationDistance
    for _, ped in ipairs(GetGamePool('CPed')) do
        if ped ~= playerPed and not IsPedAPlayer(ped) and not IsEntityDead(ped) then
            local dist = Utils.Distance(playerCoords, GetEntityCoords(ped))
            if dist <= closestDist then
                closestPed, closestDist = ped, dist
            end
        end
    end

    if not closestPed then return nil end
    return NetworkGetNetworkIdFromEntity(closestPed)
end

function NPCInteraction.TryStartConversation(situationHint)
    if NPCInteraction.IsInConversation() then return end

    local pedNetId = NPCInteraction.FindNearestPed()
    if not pedNetId then
        BeginTextCommandThefeedPost('STRING')
        AddTextComponentSubstringPlayerName(Locale('no_target'))
        EndTextCommandThefeedPostTicker(false, false)
        return
    end

    Client.state.pendingPedNetId = pedNetId
    TriggerServerEvent('policevoiceai:server:startConversation', pedNetId, situationHint or { type = 'general' })
end

function NPCInteraction.EndConversation()
    if not NPCInteraction.IsInConversation() then return end
    TriggerServerEvent('policevoiceai:server:endConversation', Client.state.conversationId)
    NPCInteraction.ResetState()
end

function NPCInteraction.ResetState()
    Client.state.conversationId = nil
    Client.state.pedNetId = nil
    Client.state.npcFirstName = nil
    Client.state.npcLastName = nil
    Client.state.voiceProfile = nil

    if VoicePlayback then VoicePlayback.Stop() end

    NUI.Send({ action = 'setConversationActive', active = false })
    NUI.Send({ action = 'setListening', listening = false })
    NUI.Send({ action = 'setSpeaking', speaking = false })
end

RegisterNetEvent('policevoiceai:client:startResult', function(data)
    if not data.success then
        if data.reason == 'out_of_range' then
            BeginTextCommandThefeedPost('STRING')
            AddTextComponentSubstringPlayerName(Locale('out_of_range'))
            EndTextCommandThefeedPostTicker(false, false)
        elseif data.reason == 'already_in_conversation' then
            BeginTextCommandThefeedPost('STRING')
            AddTextComponentSubstringPlayerName(Locale('already_in_conversation'))
            EndTextCommandThefeedPostTicker(false, false)
        end
        return
    end

    Client.state.conversationId = data.conversationId
    Client.state.pedNetId = data.pedNetId
    Client.state.npcFirstName = data.firstName
    Client.state.npcLastName = data.lastName
    Client.state.voiceProfile = data.voiceProfile

    NUI.Send({
        action = 'setConversationActive',
        active = true,
        name = ('%s %s'):format(data.firstName or '', data.lastName or ''),
    })
end)

RegisterNetEvent('policevoiceai:client:conversationEnded', function()
    NPCInteraction.ResetState()
end)

-- =========================================================
-- PHASE 4: REICHWEITEN-UEBERWACHUNG
-- =========================================================
-- Leichter Client-Thread, der NUR laeuft solange ein Gespraech aktiv ist
-- (kein globaler Dauer-Loop, Phase 28).

CreateThread(function()
    while true do
        Wait(500)
        if NPCInteraction.IsInConversation() then
            local pedEntity = NetworkGetEntityFromNetworkId(Client.state.pedNetId)
            if pedEntity == 0 or not DoesEntityExist(pedEntity) then
                NPCInteraction.EndConversation()
            else
                local dist = Utils.Distance(GetEntityCoords(PlayerPedId()), GetEntityCoords(pedEntity))
                if dist > Config.NPCConversationDistance then
                    BeginTextCommandThefeedPost('STRING')
                    AddTextComponentSubstringPlayerName(Locale('out_of_range'))
                    EndTextCommandThefeedPostTicker(false, false)
                    NPCInteraction.EndConversation()
                end
            end
        end
    end
end)
