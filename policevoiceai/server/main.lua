-- =========================================================
-- POLICEVOICEAI - SERVER BOOTSTRAP
-- =========================================================
-- Verbindet die Voice-Pipeline (Client-Mikrofon -> STT -> Conversation Manager
-- -> KI -> TTS -> 3D-Voice beim Client) ueber Server-Events. Rein eventbasiert,
-- kein Loop der Spielerzustand pollt (Phase 28).

local function BroadcastNpcReply(replyPayload)
    local pedEntity = NetworkGetEntityFromNetworkId(replyPayload.pedNetId)
    if not pedEntity or pedEntity == 0 then return end
    local pedCoords = GetEntityCoords(pedEntity)

    for _, playerIdStr in ipairs(GetPlayers()) do
        local playerId = tonumber(playerIdStr)
        local playerPed = GetPlayerPed(playerId)
        if playerPed and playerPed ~= 0 then
            local dist = Utils.Distance(pedCoords, GetEntityCoords(playerPed))
            if dist <= Config.Voice3D.maxHearingDistance then
                TriggerClientEvent('policevoiceai:client:npcReply', playerId, replyPayload)
            end
        end
    end
end

-- =========================================================
-- PHASE 4/6: GESPRAECH STARTEN
-- =========================================================

RegisterNetEvent('policevoiceai:server:startConversation', function(pedNetId, situationHint)
    local source = source
    if type(pedNetId) ~= 'number' then return end

    local situation = Callouts.BuildSituation(pedNetId, type(situationHint) == 'table' and situationHint or { type = 'general' })
    local conversationId, reason = ConversationManager.StartConversation(source, pedNetId, situation)

    if not conversationId then
        TriggerClientEvent('policevoiceai:client:startResult', source, { success = false, reason = reason })
        return
    end

    local state = ConversationManager.GetState(conversationId)
    local npcRow = Database.GetNPC(state.npcId)

    TriggerClientEvent('policevoiceai:client:startResult', source, {
        success = true,
        conversationId = conversationId,
        npcId = state.npcId,
        pedNetId = pedNetId,
        firstName = npcRow.first_name,
        lastName = npcRow.last_name,
        voiceProfile = npcRow.voice_profile,
    })
end)

-- =========================================================
-- PHASE 5/6/7/8: SPRACHE VERARBEITEN -> ANTWORT ERZEUGEN
-- =========================================================

RegisterNetEvent('policevoiceai:server:speech', function(payload)
    local source = source
    if type(payload) ~= 'table' or type(payload.conversationId) ~= 'string' then return end

    local state = ConversationManager.GetState(payload.conversationId)
    if not state or state.playerSource ~= source then return end

    if payload.audioBase64 and not Security.IsAudioPayloadSizeOk(payload.audioBase64) then
        TriggerClientEvent('policevoiceai:client:speechError', source, { reason = 'audio_too_large' })
        return
    end

    local text, sttErr = STTProvider.Transcribe({
        audioBase64 = payload.audioBase64,
        format = payload.format,
        mimeType = payload.mimeType,
        debugText = payload.debugText,
    })

    if not text then
        if Config.Fallback.useOnSTTError then
            local fallback = Fallback.SttFailureReply()
            local reply = ConversationManager.RespondWithFallbackText(payload.conversationId, fallback.text, fallback.emotion)
            if reply then BroadcastNpcReply(reply) end
        else
            TriggerClientEvent('policevoiceai:client:speechError', source, { reason = sttErr or 'stt_failed' })
        end
        return
    end

    local ok, processErr = ConversationManager.ProcessPlayerSpeech(payload.conversationId, source, text)
    if not ok then
        TriggerClientEvent('policevoiceai:client:speechError', source, { reason = processErr })
        return
    end

    -- UI-Feedback: was hat die STT verstanden (Punkt 26 - dezente Anzeige)
    TriggerClientEvent('policevoiceai:client:transcript', source, { conversationId = payload.conversationId, text = text })

    local reply, replyErr = ConversationManager.GenerateNPCResponse(payload.conversationId)
    if not reply then
        TriggerClientEvent('policevoiceai:client:speechError', source, { reason = replyErr })
        return
    end

    BroadcastNpcReply(reply)
end)

-- =========================================================
-- GESPRAECH BEENDEN
-- =========================================================

RegisterNetEvent('policevoiceai:server:endConversation', function(conversationId)
    local source = source
    local state = ConversationManager.GetState(conversationId)
    if not state or state.playerSource ~= source then return end

    ConversationManager.EndConversation(conversationId, 'player_ended')
end)

-- =========================================================
-- ADMIN-KOMMANDOS (Konsole/ACE, siehe Config.Permissions.adminAce)
-- =========================================================

local function EnsureAdmin(source)
    if source == 0 then return true end -- Serverkonsole
    return IsPlayerAceAllowed(source, Config.Permissions.adminAce)
end

RegisterCommand('policevoiceai_npcinfo', function(source, args)
    if not EnsureAdmin(source) then return end
    local npcId = args[1]
    if Utils.IsEmpty(npcId) then
        print('Verwendung: policevoiceai_npcinfo <npcId>')
        return
    end
    local npc = Database.GetNPC(npcId)
    print(npc and json.encode(npc) or ('[policevoiceai] Kein NPC mit ID ' .. npcId .. ' gefunden.'))
end, true)

RegisterCommand('policevoiceai_setwarrant', function(source, args)
    if not EnsureAdmin(source) then return end
    local npcId, hasWarrant, reason = args[1], args[2], args[3]
    if Utils.IsEmpty(npcId) then
        print('Verwendung: policevoiceai_setwarrant <npcId> <true|false> <grund>')
        return
    end
    MDT.SetWarrant(npcId, hasWarrant == 'true', reason)
    print(('[policevoiceai] Haftbefehl fuer %s aktualisiert.'):format(npcId))
end, true)
