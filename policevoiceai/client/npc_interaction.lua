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

    local closestPed, closestDist = nil, Config.NPCInteraction.ConversationDistance
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
        Utils.VoiceLog('Kein gueltiges Ziel in Reichweite gefunden')
        BeginTextCommandThefeedPost('STRING')
        AddTextComponentSubstringPlayerName(Locale('no_target'))
        EndTextCommandThefeedPostTicker(false, false)
        return
    end

    Client.state.pendingPedNetId = pedNetId
    Utils.VoiceLog('Requesting conversation start, target ped netId: %s', tostring(pedNetId))
    TriggerServerEvent('policevoiceai:server:startConversation', pedNetId, situationHint or { type = 'general' })
end

function NPCInteraction.EndConversation(reason)
    if not NPCInteraction.IsInConversation() then return end
    Utils.VoiceLog('Conversation ended (%s)', tostring(reason or 'player_ended'))
    TriggerServerEvent('policevoiceai:server:endConversation', Client.state.conversationId)
    NPCInteraction.ResetState()
end

function NPCInteraction.ResetState()
    local previousPedNetId = Client.state.pedNetId

    Client.state.conversationId = nil
    Client.state.pedNetId = nil
    Client.state.npcFirstName = nil
    Client.state.npcLastName = nil
    Client.state.voiceProfile = nil

    if VoicePlayback then VoicePlayback.Stop() end
    if NPCSocial and previousPedNetId then NPCSocial.StopPriorityOverride(previousPedNetId) end

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

    Utils.VoiceLog('Conversation started. Target NPC: %s (%s %s)', tostring(data.npcId), tostring(data.firstName), tostring(data.lastName))

    if NPCSocial then NPCSocial.StartPriorityOverride(data.pedNetId) end

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
-- PUNKT 9: AUTOMATISCHES GESPRAECHSENDE
-- =========================================================
-- Leichter Client-Thread, der NUR laeuft solange ein Gespraech aktiv ist
-- (kein globaler Dauer-Loop, Phase 28). Deckt: Distanz, toter/verschwundener
-- NPC und Fahrzeugeinstieg des Spielers ab.

CreateThread(function()
    while true do
        Wait(500)
        if NPCInteraction.IsInConversation() then
            local pedEntity = NetworkGetEntityFromNetworkId(Client.state.pedNetId)

            if pedEntity == 0 or not DoesEntityExist(pedEntity) then
                Utils.VoiceLog('Target ped no longer exists')
                NPCInteraction.EndConversation('target_missing')
            elseif IsEntityDead(pedEntity) then
                Utils.VoiceLog('Target ped died')
                NPCInteraction.EndConversation('target_dead')
            elseif IsPedInAnyVehicle(PlayerPedId(), false) then
                Utils.VoiceLog('Player entered a vehicle')
                NPCInteraction.EndConversation('player_entered_vehicle')
            else
                local dist = Utils.Distance(GetEntityCoords(PlayerPedId()), GetEntityCoords(pedEntity))
                if dist > Config.NPCInteraction.ConversationDistance then
                    BeginTextCommandThefeedPost('STRING')
                    AddTextComponentSubstringPlayerName(Locale('out_of_range'))
                    EndTextCommandThefeedPostTicker(false, false)
                    Utils.VoiceLog('Player moved out of range (%.1fm)', dist)
                    NPCInteraction.EndConversation('out_of_range')
                end
            end
        end
    end
end)

-- =========================================================
-- PUNKT 9: ESC BEENDET DAS GESPRAECH
-- =========================================================
-- Eigener, schnell taktender Thread (nur waehrend eines aktiven Gespraechs),
-- da INPUT_FRONTEND_PAUSE (ESC) nur fuer einen einzelnen Frame "just pressed"
-- ist - ein 500ms-Loop wuerde den Tastendruck fast immer verpassen.

CreateThread(function()
    while true do
        if NPCInteraction.IsInConversation() then
            Wait(0)
            DisableControlAction(0, 200, true) -- INPUT_FRONTEND_PAUSE
            if IsDisabledControlJustPressed(0, 200) then
                Utils.VoiceLog('ESC pressed')
                NPCInteraction.EndConversation('esc_pressed')
            end
        else
            Wait(250)
        end
    end
end)
