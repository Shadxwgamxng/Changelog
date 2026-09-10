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
        Utils.VoiceLogError('StartConversation failed for player %s, ped %s: %s', tostring(source), tostring(pedNetId), tostring(reason))
        TriggerClientEvent('policevoiceai:client:startResult', source, { success = false, reason = reason })
        return
    end

    Utils.VoiceLog('Conversation %s started for player %s, ped %s', conversationId, tostring(source), tostring(pedNetId))

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

    -- Punkt 59: hat der NPC den Officer selbst angesprochen (Social AI), liefert
    -- er jetzt direkt seine Einstiegszeile, ohne auf eine Officer-Frage zu warten.
    local openingLine = SocialAI.ConsumePendingOpeningLine(pedNetId, source)
    if openingLine then
        local reply = ConversationManager.RespondWithFallbackText(conversationId, openingLine.text, openingLine.emotion)
        if reply then BroadcastNpcReply(reply) end
    end
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

    -- Punkt 71: Indikator/State sofort auf "Verarbeiten..." setzen, noch bevor
    -- STT/KI ueberhaupt geantwortet haben.
    ConversationManager.SetProcessing(payload.conversationId)

    local text, sttErr

    -- Punkt 74: Dialogmenu-Fallback liefert bereits fertigen Text (Officer hat
    -- eine vorgefertigte Frage ausgewaehlt) - komplett ohne STT, funktioniert
    -- daher IMMER, egal ob/welcher STT-Provider konfiguriert ist.
    if not Utils.IsEmpty(payload.presetText) then
        text = Security.SanitizeSpeechText(payload.presetText)
        if not text then sttErr = 'empty_preset_text' end
    else
        Utils.VoiceLog('Sending audio to STT (provider: %s)', tostring(Config.STT.provider))
        text, sttErr = STTProvider.Transcribe({
            audioBase64 = payload.audioBase64,
            format = payload.format,
            mimeType = payload.mimeType,
            debugText = payload.debugText,
        })
    end

    if not text then
        Utils.VoiceLogError('STT request failed: %s', tostring(sttErr))
        if Config.Fallback.useOnSTTError then
            TriggerClientEvent('policevoiceai:client:speechError', source, { reason = 'speech_not_recognized' })
            local fallback = Fallback.SttFailureReply()
            local reply = ConversationManager.RespondWithFallbackText(payload.conversationId, fallback.text, fallback.emotion)
            if reply then BroadcastNpcReply(reply) end
        else
            TriggerClientEvent('policevoiceai:client:speechError', source, { reason = sttErr or 'stt_failed' })
            ConversationManager.SetVoiceListening(payload.conversationId, false)
        end
        return
    end

    Utils.VoiceLog('STT result: "%s"', text)

    local ok, processErr = ConversationManager.ProcessPlayerSpeech(payload.conversationId, source, text)
    if not ok then
        Utils.VoiceLogError('ProcessPlayerSpeech rejected: %s', tostring(processErr))
        TriggerClientEvent('policevoiceai:client:speechError', source, { reason = processErr })
        ConversationManager.SetVoiceListening(payload.conversationId, false) -- Punkt 75: kein 20s-Haengenbleiben bei ungueltiger Anfrage
        return
    end

    -- UI-Feedback: was hat die STT verstanden (Punkt 26 - dezente Anzeige)
    TriggerClientEvent('policevoiceai:client:transcript', source, { conversationId = payload.conversationId, text = text })

    Utils.VoiceLog('Sending text to NPC AI (provider: %s)', tostring(Config.AI.provider))
    local reply, replyErr = ConversationManager.GenerateNPCResponse(payload.conversationId)
    if not reply then
        TriggerClientEvent('policevoiceai:client:speechError', source, { reason = replyErr })
        ConversationManager.SetVoiceListening(payload.conversationId, false)
        return
    end

    BroadcastNpcReply(reply)
end)

-- =========================================================
-- PUNKT 55/71: SPRECHZUSTAND (PMA-Voice-Erkennung oder eigene PTT-Taste)
-- =========================================================

RegisterNetEvent('policevoiceai:server:voiceState', function(conversationId, listening)
    local source = source
    local state = ConversationManager.GetState(conversationId)
    if not state or state.playerSource ~= source then return end

    ConversationManager.SetVoiceListening(conversationId, listening == true)
end)

-- =========================================================
-- PUNKT 75: SAUBERES ENDE VON "RESPONDING" (TTS-Wiedergabe fertig)
-- =========================================================

RegisterNetEvent('policevoiceai:server:playbackFinished', function(conversationId)
    local source = source
    local state = ConversationManager.GetState(conversationId)
    if not state or state.playerSource ~= source then return end

    ConversationManager.OnPlaybackFinished(conversationId)
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
-- PUNKT 57-59: NPC-SEITIGE ANNAEHERUNG (Social AI)
-- =========================================================

RegisterNetEvent('policevoiceai:server:evaluateApproach', function(pedNetId)
    local source = source
    if type(pedNetId) ~= 'number' then return end

    local decision = SocialAI.EvaluateApproach(pedNetId, source)
    TriggerClientEvent('policevoiceai:client:npcApproachDecision', source, decision)
end)

RegisterNetEvent('policevoiceai:server:cancelApproach', function(pedNetId)
    local source = source
    if type(pedNetId) ~= 'number' then return end
    SocialAI.CancelApproach(pedNetId, source)
end)

-- =========================================================
-- WAFFE/TASER AUF NPC GERICHTET (Haende hoch / Flucht)
-- =========================================================

RegisterNetEvent('policevoiceai:server:evaluateThreat', function(pedNetId)
    local source = source
    if type(pedNetId) ~= 'number' then return end

    local decision = SocialAI.EvaluateThreat(pedNetId, source)
    if decision.action ~= 'none' then
        TriggerClientEvent('policevoiceai:client:npcThreatDecision', source, decision)
    end
end)

RegisterNetEvent('policevoiceai:server:clearThreat', function(pedNetId)
    local source = source
    if type(pedNetId) ~= 'number' then return end
    SocialAI.ClearThreat(pedNetId, source)
end)

-- =========================================================
-- ADMIN-KOMMANDOS (Konsole/ACE, siehe Config.Permissions.adminAce)
-- =========================================================

local function EnsureAdmin(source)
    if source == 0 then return true end -- Serverkonsole
    return IsPlayerAceAllowed(source, Config.Permissions.adminAce)
end

-- =========================================================
-- SPRACH-EINSTELLUNGEN-PANEL
-- =========================================================

RegisterNetEvent('policevoiceai:server:requestSettingsPanel', function()
    local source = source
    local isAdmin = EnsureAdmin(source)

    TriggerClientEvent('policevoiceai:client:settingsPanelData', source, {
        isAdmin = isAdmin,
        runtime = isAdmin and RuntimeConfig.GetCurrent() or nil,
        options = isAdmin and RuntimeConfig.GetOptions() or nil,
    })
end)

RegisterNetEvent('policevoiceai:server:saveRuntimeConfig', function(newValues)
    local source = source
    if not EnsureAdmin(source) then return end

    local merged, err = RuntimeConfig.Save(newValues, GetPlayerIdentifierByType(source, 'license2') or tostring(source))
    if not merged then
        TriggerClientEvent('policevoiceai:client:settingsPanelData', source, { isAdmin = true, error = err })
        return
    end

    TriggerClientEvent('policevoiceai:client:settingsPanelData', source, {
        isAdmin = true, runtime = merged, options = RuntimeConfig.GetOptions(), saved = true,
    })
end)

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
