-- =========================================================
-- PHASE 6 / PUNKT 21: CONVERSATION MANAGER
-- =========================================================
-- Implementiert die in der Spezifikation geforderte Schnittstelle:
--   StartConversation(player, npc)
--   ProcessPlayerSpeech(conversationId, speechText)
--   GenerateNPCResponse(conversationId)
--   EndConversation(conversationId)
--
-- Aus Sicherheitsgruenden (Punkt 20: Server ist autoritativ, niemals dem
-- Client vertrauen) benoetigen StartConversation/ProcessPlayerSpeech zusaetzlich
-- den Spieler-Source, um Distanz/Berechtigung serverseitig zu pruefen. Die
-- Kernlogik entspricht trotzdem 1:1 der geforderten API - siehe die exports
-- am Ende dieser Datei fuer die "reine" Aussenschnittstelle.

ConversationManager = {}

local conversations = {} -- [conversationId] = ConversationState

-- ConversationState (Punkt 5):
-- {
--   active, npcId, pedNetId, playerSource, conversationId, startedAt,
--   lastActivityAt (GetGameTimer(), fuer Idle-Timeout), history = { {role, message} },
--   situation, questionCount, pendingRequest
-- }

local function GetPlayerIdentifier(source)
    for _, idType in ipairs({ 'license2', 'license', 'fivem' }) do
        local id = GetPlayerIdentifierByType(source, idType)
        if id then return id end
    end
    return ('source:%d'):format(source)
end

-- =========================================================
-- PUNKT 19: KONTROLLIERTER CONTEXT
-- =========================================================
-- Statt der gesamten NPC-Datenbank wird pro Officer-Frage nur das erkannte,
-- relevante Fakten-Subset an die KI uebergeben.

local FACT_DEFINITIONS = {
    {
        key = 'address', label = 'Adresse', lieEligible = false,
        keywords = { 'wohn', 'adresse', 'zuhause' },
        getTrue = function(npc) return npc.address or 'unbekannt' end,
    },
    {
        key = 'occupation', label = 'Beruf', lieEligible = false,
        keywords = { 'arbeit', 'beruf', 'job' },
        getTrue = function(npc) return npc.occupation or 'unbekannt' end,
    },
    {
        key = 'vehicle', label = 'Fahrzeug', lieEligible = false,
        keywords = { 'fahrzeug', 'auto', 'wagen' },
        getTrue = function(npc) return ('%s (Kennzeichen %s)'):format(npc.vehicle_model or '?', npc.vehicle_plate or '?') end,
    },
    {
        key = 'license', label = 'Führerschein-Status', lieEligible = true,
        keywords = { 'führerschein', 'fuehrerschein', 'lizenz' },
        getTrue = function(npc) return npc.license_status end,
        isUnfavorable = function(npc) return npc.license_status ~= 'valid' end,
        lieValue = function() return 'valid (gültig)' end,
    },
    {
        key = 'warrant', label = 'Haftbefehl', lieEligible = true,
        keywords = { 'haftbefehl', 'fahndung', 'gesucht' },
        getTrue = function(npc) return npc.has_warrant == 1 and ('Ja, wegen ' .. (npc.warrant_reason or 'unbekannt')) or 'Nein' end,
        isUnfavorable = function(npc) return npc.has_warrant == 1 end,
        lieValue = function() return 'Nein, kein Haftbefehl' end,
    },
    {
        key = 'criminal_record', label = 'Vorstrafen', lieEligible = true,
        keywords = { 'vorstraf', 'straftat', 'verhaftet', 'probleme mit der polizei' },
        getTrue = function(npc)
            local n = #(npc.criminal_record or {})
            return n > 0 and (n .. ' Eintrag/Einträge im Strafregister') or 'keine Vorstrafen'
        end,
        isUnfavorable = function(npc) return #(npc.criminal_record or {}) > 0 end,
        lieValue = function() return 'keine Vorstrafen' end,
    },
    {
        key = 'alcohol', label = 'Alkohol-/Drogenkonsum heute', lieEligible = true,
        keywords = { 'alkohol', 'getrunken', 'bier', 'drogen', 'nüchtern' },
        getTrue = function(npc) return (npc.secrets.has_been_drinking) and 'Ja' or 'Nein' end,
        isUnfavorable = function(npc) return npc.secrets.has_been_drinking end,
        lieValue = function() return 'Nein, nichts getrunken' end,
    },
    {
        key = 'suspicious_item', label = 'Verdächtiger Gegenstand', lieEligible = true,
        keywords = { 'tasche', 'gehört ihnen', 'gehoert ihnen', 'gehört das' },
        getTrue = function(npc) return (npc.secrets.owns_suspicious_item) and 'Ja, gehört ihm/ihr' or 'Nein' end,
        isUnfavorable = function(npc) return npc.secrets.owns_suspicious_item end,
        lieValue = function() return 'Nein, kenne ich nicht' end,
    },
}

local function DetectRelevantFacts(npcRow, message)
    local lowerMessage = message:lower()
    local facts = {}
    local honesty = (npcRow.personality and npcRow.personality.honesty) or 50
    local lieChance = Utils.Clamp(100 - honesty, 5, 90)

    for _, def in ipairs(FACT_DEFINITIONS) do
        local matched = false
        for _, keyword in ipairs(def.keywords) do
            if lowerMessage:find(keyword, 1, true) then matched = true break end
        end

        if matched then
            local trueValue = def.getTrue(npcRow)
            local isLie = false
            local presentedValue = trueValue

            if def.lieEligible and def.isUnfavorable and def.isUnfavorable(npcRow) then
                if Utils.RollChance(lieChance) then
                    isLie = true
                    presentedValue = def.lieValue(npcRow)
                end
            end

            facts[#facts + 1] = {
                key = def.key, label = def.label,
                presentedValue = presentedValue, isLie = isLie,
            }
        end
    end

    return facts
end

-- =========================================================
-- STARTCONVERSATION
-- =========================================================

function ConversationManager.StartConversation(playerSource, pedNetId, situation)
    local claimed, reason = NPCManager.TryClaimListener(playerSource, pedNetId)
    if not claimed then return nil, reason end

    -- Real angesteuerte Spieler (Phase 17) bekommen keine Voice-AI - das ist
    -- ein echter Mensch, der selbst antwortet.
    local targetEntity = NetworkGetEntityFromNetworkId(pedNetId)
    if targetEntity ~= 0 and IsPedAPlayer(targetEntity) then
        NPCManager.ReleaseListener(playerSource)
        return nil, 'target_is_player'
    end

    local npcId = NPCManager.GetOrRegisterNpcId(pedNetId)
    local conversationId = Utils.GenerateId('conv')

    local state = {
        active = true,
        npcId = npcId,
        pedNetId = pedNetId,
        playerSource = playerSource,
        conversationId = conversationId,
        startedAt = os.time(),
        lastActivityAt = GetGameTimer(),
        history = {},
        situation = situation or { type = 'general' },
        questionCount = 0,
        pendingRequest = false,
    }
    conversations[conversationId] = state

    Database.CreateConversation(conversationId, npcId, GetPlayerIdentifier(playerSource), state.situation.type, state.situation)
    ConversationManager.ScheduleIdleCheck(conversationId)

    -- Punkt 48: der NPC ist ab jetzt eindeutig "Active Conversation Target"
    NPCManager.SetState(pedNetId, NPC_STATES.WAITING_FOR_PLAYER)

    return conversationId
end

-- =========================================================
-- IDLE TIMEOUT (Phase 28: kein Polling-Loop, nur ein einziger geplanter Timer)
-- =========================================================

function ConversationManager.ScheduleIdleCheck(conversationId)
    local thresholdMs = Config.Conversation.idleTimeoutSeconds * 1000

    SetTimeout(thresholdMs, function()
        local state = conversations[conversationId]
        if not state or not state.active then return end

        local idleMs = GetGameTimer() - state.lastActivityAt
        if idleMs >= thresholdMs then
            ConversationManager.EndConversation(conversationId, 'idle_timeout')
        else
            SetTimeout(thresholdMs - idleMs, function()
                ConversationManager.ScheduleIdleCheck(conversationId)
            end)
        end
    end)
end

-- =========================================================
-- PROCESSPLAYERSPEECH
-- =========================================================

function ConversationManager.ProcessPlayerSpeech(conversationId, playerSource, speechText)
    local state = conversations[conversationId]
    if not state or not state.active then return false, 'no_active_conversation' end
    if state.playerSource ~= playerSource then return false, 'not_owner' end
    if not NPCManager.IsAuthorizedPair(playerSource, state.pedNetId) then
        return false, 'out_of_range'
    end
    if not Security.CanMakeRequest(playerSource) then return false, 'rate_limited' end
    if state.pendingRequest then return false, 'request_in_progress' end

    local sanitized = Security.SanitizeSpeechText(speechText)
    if not sanitized then return false, 'empty_speech' end

    state.lastActivityAt = GetGameTimer()
    state.questionCount = state.questionCount + 1

    table.insert(state.history, { role = 'officer', message = sanitized })
    while #state.history > Config.Conversation.maxHistoryMessages do
        table.remove(state.history, 1)
    end

    Database.AddMessage(conversationId, 'officer', sanitized, nil)

    return true
end

-- =========================================================
-- GENERATENPCRESPONSE
-- =========================================================

function ConversationManager.GenerateNPCResponse(conversationId)
    local state = conversations[conversationId]
    if not state or not state.active then return nil, 'no_active_conversation' end
    if state.pendingRequest then return nil, 'request_in_progress' end

    local lastOfficerMessage = nil
    for i = #state.history, 1, -1 do
        if state.history[i].role == 'officer' then
            lastOfficerMessage = state.history[i].message
            break
        end
    end
    if not lastOfficerMessage then return nil, 'nothing_to_respond_to' end

    state.pendingRequest = true

    local npcRow = Database.GetNPC(state.npcId)
    if not npcRow then
        state.pendingRequest = false
        return nil, 'npc_not_found'
    end

    local persona = Personas[npcRow.persona_key] or Personas['friendly_citizen']
    local facts = DetectRelevantFacts(npcRow, lastOfficerMessage)

    -- Nur die letzten N Zeichen an History mitgeben (Kostenschutz, Punkt 28)
    local trimmedHistory = {}
    local charBudget = Config.Conversation.maxHistoryCharsSentToAI
    for i = #state.history, 1, -1 do
        local entry = state.history[i]
        charBudget = charBudget - #entry.message
        if charBudget < 0 then break end
        table.insert(trimmedHistory, 1, entry)
    end
    -- Letzte Officer-Nachricht separat uebergeben, nicht doppelt in history
    if #trimmedHistory > 0 and trimmedHistory[#trimmedHistory].role == 'officer' then
        table.remove(trimmedHistory, #trimmedHistory)
    end

    local context = {
        npc = {
            npcId = npcRow.npc_id,
            firstName = npcRow.first_name,
            lastName = npcRow.last_name,
            personaKey = npcRow.persona_key,
            personaLabel = persona.label,
            speechStyle = persona.speechStyle,
            personality = npcRow.personality,
            askQuestionChance = persona.askQuestionChance,
        },
        situation = state.situation,
        facts = facts,
        history = trimmedHistory,
        latestOfficerMessage = lastOfficerMessage,
        questionCount = state.questionCount,
    }

    local reply, err = AIProvider.Generate(context)
    if not reply and Config.Fallback.useOnAIError then
        Utils.VoiceLogError('AI request failed (%s), using fallback reply', tostring(err))
        reply = Fallback.AiFailureReply(context)
        err = nil
    end

    state.pendingRequest = false

    if not reply then
        Utils.VoiceLogError('AI request failed: %s', tostring(err))
        return nil, err or 'ai_failed'
    end

    Utils.VoiceLog('AI response received: "%s" (emotion: %s)', reply.text, tostring(reply.emotion))

    return ConversationManager.FinalizeReply(conversationId, state, npcRow, reply)
end

-- Haengt eine bereits fertige NPC-Antwort an den Verlauf, persistiert sie und
-- erzeugt bei Bedarf die TTS-Ausgabe. Wird sowohl vom normalen KI-Pfad als auch
-- von Phase 27 (z.B. STT-Fallback: "Wie bitte?") genutzt.
function ConversationManager.FinalizeReply(conversationId, state, npcRow, reply)
    state.lastActivityAt = GetGameTimer()
    table.insert(state.history, { role = 'npc', message = reply.text })
    while #state.history > Config.Conversation.maxHistoryMessages do
        table.remove(state.history, 1)
    end

    Database.AddMessage(conversationId, 'npc', reply.text, reply.emotion)

    -- Punkt 71: Indikator/Debug muss synchron mit der tatsaechlichen Antwort sein
    NPCManager.SetState(state.pedNetId, NPC_STATES.RESPONDING)

    -- Phase 8/27: TTS ist best-effort. Schlaegt es fehl, bleibt die Antwort text-only,
    -- das Gespraech bricht dadurch NICHT ab.
    Utils.VoiceLog('Sending response to TTS (provider: %s)', tostring(Config.TTS.provider))
    local audio, ttsErr = TTSProvider.Synthesize(reply.text, npcRow.voice_profile, npcRow.npc_id)
    if not audio and ttsErr ~= 'mock_provider_text_only' then
        Utils.VoiceLogError('TTS request failed (%s), reply stays text-only', tostring(ttsErr))
    end
    Utils.VoiceLog('NPC speaking (%s)', audio and 'audio' or 'text-only')

    return {
        conversationId = conversationId,
        npcId = npcRow.npc_id,
        pedNetId = state.pedNetId,
        text = reply.text,
        emotion = reply.emotion,
        audioBase64 = audio and audio.audioBase64 or nil,
        mimeType = audio and audio.mimeType or nil,
        voiceProfile = npcRow.voice_profile,
    }
end

-- Fuer Phase 27 (STT nicht erreichbar): keine Officer-Nachricht wurde erkannt,
-- der NPC reagiert trotzdem (z.B. "Wie bitte?"), damit das Gespraech nicht einfach haengt.
function ConversationManager.RespondWithFallbackText(conversationId, text, emotion)
    local state = conversations[conversationId]
    if not state or not state.active then return nil, 'no_active_conversation' end

    local npcRow = Database.GetNPC(state.npcId)
    if not npcRow then return nil, 'npc_not_found' end

    return ConversationManager.FinalizeReply(conversationId, state, npcRow, { text = text, emotion = emotion })
end

-- =========================================================
-- ENDCONVERSATION
-- =========================================================

function ConversationManager.EndConversation(conversationId, reason)
    local state = conversations[conversationId]
    if not state then return false end

    state.active = false
    if state.playerSource and NPCManager.GetActivePed(state.playerSource) == state.pedNetId then
        NPCManager.ReleaseListener(state.playerSource)
    end

    Database.EndConversation(conversationId)

    if state.playerSource then
        TriggerClientEvent('policevoiceai:client:conversationEnded', state.playerSource, {
            conversationId = conversationId, reason = reason or 'ended',
        })
    end

    conversations[conversationId] = nil
    return true
end

function ConversationManager.GetState(conversationId)
    return conversations[conversationId]
end

-- Punkt 55/71: wird ausgeloest, sobald der Client tatsaechlich zu sprechen beginnt/
-- aufhoert (PMA-Voice-Erkennung oder eigene PTT-Taste), synchronisiert den
-- Indikator/State bereits VOR dem Eintreffen des fertigen Sprachtexts.
function ConversationManager.SetVoiceListening(conversationId, listening)
    local state = conversations[conversationId]
    if not state or not state.active then return end

    state.lastActivityAt = GetGameTimer()
    NPCManager.SetState(state.pedNetId, listening and NPC_STATES.LISTENING or NPC_STATES.WAITING_FOR_PLAYER)
end

function ConversationManager.SetProcessing(conversationId)
    local state = conversations[conversationId]
    if not state or not state.active then return end
    NPCManager.SetState(state.pedNetId, NPC_STATES.PROCESSING)
end

-- Punkt 75: sauberer Rueckweg aus RESPONDING, sobald der Client die
-- Wiedergabe (Audio ODER text-only Fallback) tatsaechlich beendet hat.
function ConversationManager.OnPlaybackFinished(conversationId)
    local state = conversations[conversationId]
    if not state or not state.active then return end
    NPCManager.SetState(state.pedNetId, NPC_STATES.WAITING_FOR_PLAYER)
end

-- =========================================================
-- PUNKT 21: OEFFENTLICHE EXPORTS
-- =========================================================

exports('StartConversation', ConversationManager.StartConversation)
exports('ProcessPlayerSpeech', ConversationManager.ProcessPlayerSpeech)
exports('GenerateNPCResponse', ConversationManager.GenerateNPCResponse)
exports('EndConversation', ConversationManager.EndConversation)
