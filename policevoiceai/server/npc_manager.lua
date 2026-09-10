NPCManager = {}

-- =========================================================
-- PHASE 1/4 / PUNKT 47-50/56/75-77: NPC-REGISTRIERUNG, STATE MACHINE,
-- "NUR EIN ZUHOERER" UND SOFT-LOCK-SCHUTZ
-- =========================================================
-- Ordnet jedem angesprochenen Ped eine stabile npcId zu und verwaltet einen
-- serverseitig AUTORITATIVEN Gespraechs-Zustand (NPC_STATES, siehe
-- shared/npc_states.lua). Jeder Zustandswechsel bekommt automatisch einen
-- Sicherheits-Timeout (Punkt 75: "kein Soft-Lock") und wird an nahe Clients
-- gemeldet (fuer den 3D-Indikator, Punkt 49-51, und den Debug-Modus, Punkt 73).

local pedRegistry = {}             -- [pedNetId] = { npcId, firstName, lastName, personality, personaKey }
local activeListenerOfPlayer = {}  -- [playerSource] = pedNetId
local activeSpeakerOfPed = {}      -- [pedNetId] = playerSource
local approachClaimedBy = {}       -- [pedNetId] = playerSource (Punkt 57-59, waehrend der Annaeherung reserviert)

local npcRuntime = {}              -- [pedNetId] = { state, stateChangedAt, stateToken, lastApproachRollAt }

local npcCounter = 0

-- Sicherheits-Timeouts pro Zustand (Punkt 75): wird dieser Zustand nicht
-- innerhalb der angegebenen Zeit aktiv verlassen, erzwingt der Server einen
-- Rueckfall auf WAITING_FOR_PLAYER - so kann ein NPC niemals dauerhaft in
-- "Listening"/"Speaking" haengen bleiben, selbst wenn ein Client-Event verloren geht.
local STATE_SAFETY_TIMEOUT_MS = {
    [NPC_STATES.LISTENING] = (Config.MaxRecordingSeconds + 5) * 1000,
    [NPC_STATES.PROCESSING] = 20000,
    [NPC_STATES.RESPONDING] = 45000,
    [NPC_STATES.APPROACHING] = Config.SocialAI.approachTimeoutMs + 3000,
}

local function NextNpcId()
    npcCounter = npcCounter + 1
    return ('CIV-%05d'):format(math.random(10000, 99999) + npcCounter % 1000)
end

local function GetRuntime(pedNetId)
    local runtime = npcRuntime[pedNetId]
    if not runtime then
        runtime = { state = NPC_STATES.IDLE, stateChangedAt = GetGameTimer(), stateToken = 0, lastApproachRollAt = 0 }
        npcRuntime[pedNetId] = runtime
    end
    return runtime
end

local function BroadcastToNearby(pedNetId, eventName, payload, radius)
    local pedEntity = NetworkGetEntityFromNetworkId(pedNetId)
    if not pedEntity or pedEntity == 0 then return end
    local pedCoords = GetEntityCoords(pedEntity)

    for _, playerIdStr in ipairs(GetPlayers()) do
        local playerId = tonumber(playerIdStr)
        local playerPed = GetPlayerPed(playerId)
        if playerPed and playerPed ~= 0 then
            if Utils.Distance(pedCoords, GetEntityCoords(playerPed)) <= (radius or 30.0) then
                TriggerClientEvent(eventName, playerId, payload)
            end
        end
    end
end

-- =========================================================
-- IDENTITAET
-- =========================================================

-- Gibt die npcId fuer einen Ped zurueck, erzeugt bei Bedarf eine neue Identitaet (Phase 2/3)
function NPCManager.GetOrRegisterNpcId(pedNetId, personaKeyOverride)
    local entry = pedRegistry[pedNetId]
    if entry then return entry.npcId end

    local npcId = NextNpcId()
    local npcRow = Personality.GetOrCreateNPC(npcId, personaKeyOverride)

    pedRegistry[pedNetId] = {
        npcId = npcId,
        firstName = npcRow.first_name,
        lastName = npcRow.last_name,
        personality = npcRow.personality,
        personaKey = npcRow.persona_key,
    }

    return npcId
end

function NPCManager.GetNpcIdIfRegistered(pedNetId)
    local entry = pedRegistry[pedNetId]
    return entry and entry.npcId
end

function NPCManager.GetRegistryEntry(pedNetId)
    return pedRegistry[pedNetId]
end

-- =========================================================
-- PUNKT 76: STATE MACHINE
-- =========================================================

function NPCManager.GetState(pedNetId)
    return GetRuntime(pedNetId).state
end

function NPCManager.SetState(pedNetId, newState, extra)
    local runtime = GetRuntime(pedNetId)
    runtime.state = newState
    runtime.stateChangedAt = GetGameTimer()
    runtime.stateToken = runtime.stateToken + 1
    local token = runtime.stateToken

    local entry = pedRegistry[pedNetId]

    BroadcastToNearby(pedNetId, 'policevoiceai:client:npcStateChanged', {
        pedNetId = pedNetId,
        state = newState,
        stateName = NPC_STATE_NAMES[newState],
        npcId = entry and entry.npcId,
        firstName = entry and entry.firstName,
        lastName = entry and entry.lastName,
        personality = Config.Debug and entry and entry.personality or nil,
        debugTask = Config.Debug and extra and extra.task or nil,
        targetPlayer = activeSpeakerOfPed[pedNetId],
    })

    local timeoutMs = STATE_SAFETY_TIMEOUT_MS[newState]
    if timeoutMs then
        SetTimeout(timeoutMs, function()
            local current = npcRuntime[pedNetId]
            if not current or current.stateToken ~= token then return end -- laengst weitergeschaltet
            if current.state ~= newState then return end

            if Config.Debug then
                print(('[policevoiceai] Soft-Lock-Schutz ausgeloest: Ped %s haengte in Zustand %s fest, setze zurueck.')
                    :format(tostring(pedNetId), NPC_STATE_NAMES[newState]))
            end

            -- Sicherer Rueckfall: laeuft noch ein Gespraech, zurueck auf "bereit",
            -- sonst ganz zurueck auf IDLE (Annaeherung abgebrochen).
            if newState == NPC_STATES.APPROACHING then
                NPCManager.SetState(pedNetId, NPC_STATES.IDLE)
                NPCManager.ReleaseApproachClaim(pedNetId)
            else
                NPCManager.SetState(pedNetId, NPC_STATES.WAITING_FOR_PLAYER)
            end
        end)
    end
end

-- =========================================================
-- PUNKT 56: NUR EIN GESPRAECH PRO NPC / PUNKT 4: NUR EIN ZUHOERER PRO SPIELER
-- =========================================================

function NPCManager.TryClaimListener(source, pedNetId)
    if not Security.IsPlayerInRangeOfPed(source, pedNetId, Config.NPCInteraction.ConversationDistance) then
        return false, 'out_of_range'
    end

    local currentSpeaker = activeSpeakerOfPed[pedNetId]
    if currentSpeaker and currentSpeaker ~= source then
        return false, 'already_in_conversation'
    end

    -- Falls der Spieler vorher mit einem anderen NPC gesprochen hat, dessen
    -- Zuhoer-Anspruch freigeben (Punkt 4: nur EIN NPC hoert gleichzeitig zu).
    local previousPed = activeListenerOfPlayer[source]
    if previousPed and previousPed ~= pedNetId then
        if activeSpeakerOfPed[previousPed] == source then
            activeSpeakerOfPed[previousPed] = nil
            NPCManager.SetState(previousPed, NPC_STATES.IDLE)
        end
    end

    activeListenerOfPlayer[source] = pedNetId
    activeSpeakerOfPed[pedNetId] = source
    NPCManager.ReleaseApproachClaim(pedNetId)
    return true
end

function NPCManager.ReleaseListener(source)
    local pedNetId = activeListenerOfPlayer[source]
    if pedNetId and activeSpeakerOfPed[pedNetId] == source then
        activeSpeakerOfPed[pedNetId] = nil
        NPCManager.SetState(pedNetId, NPC_STATES.LEAVING)
        SetTimeout(2000, function()
            if GetRuntime(pedNetId).state == NPC_STATES.LEAVING then
                NPCManager.SetState(pedNetId, NPC_STATES.IDLE)
            end
        end)
    end
    activeListenerOfPlayer[source] = nil
end

function NPCManager.GetActivePed(source)
    return activeListenerOfPlayer[source]
end

-- Prueft ob genau dieses Spieler/Ped-Paar gerade als aktives Gespraech gilt,
-- inkl. serverseitiger Distanzpruefung (wird vor jeder KI-Anfrage erneut geprueft).
function NPCManager.IsAuthorizedPair(source, pedNetId)
    if activeListenerOfPlayer[source] ~= pedNetId then return false end
    return Security.IsPlayerInRangeOfPed(source, pedNetId, Config.NPCInteraction.ConversationDistance)
end

-- =========================================================
-- PUNKT 57-59: ANNAEHERUNGS-RESERVIERUNG (bevor ein echtes Gespraech existiert)
-- =========================================================

function NPCManager.CanConsiderApproach(pedNetId)
    if activeSpeakerOfPed[pedNetId] or approachClaimedBy[pedNetId] then return false end
    if NPCManager.GetThreatState(pedNetId) then return false end -- Punkt: haende-hoch/Flucht hat Vorrang

    local runtime = GetRuntime(pedNetId)
    if runtime.state ~= NPC_STATES.IDLE then return false end

    local cooldownMs = (Config.NPCInteraction.ApproachRerollCooldownSeconds or 20) * 1000
    if GetGameTimer() - runtime.lastApproachRollAt < cooldownMs then return false end

    return true
end

function NPCManager.TryClaimForApproach(pedNetId, playerSource)
    if not NPCManager.CanConsiderApproach(pedNetId) then return false end

    approachClaimedBy[pedNetId] = playerSource
    GetRuntime(pedNetId).lastApproachRollAt = GetGameTimer()
    return true
end

function NPCManager.ReleaseApproachClaim(pedNetId)
    approachClaimedBy[pedNetId] = nil
end

function NPCManager.IsApproachClaimedBy(pedNetId, playerSource)
    return approachClaimedBy[pedNetId] == playerSource
end

-- =========================================================
-- WAFFE/TASER AUF NPC GERICHTET (Haende hoch / Flucht)
-- =========================================================
-- Eigene, leichte Zustandsablage statt der vollen Conversation-State-Machine
-- (das ist keine Unterhaltung) - blockiert aber Annaeherungs-Wuerfe waehrend
-- der Reaktion und bekommt denselben Soft-Lock-Schutz (Token + Timeout).

local threatState = {}       -- [pedNetId] = { reaction = 'comply'|'fleeing', token }
local threatTokenCounter = {} -- [pedNetId] = number

function NPCManager.GetThreatState(pedNetId)
    local entry = threatState[pedNetId]
    return entry and entry.reaction or nil
end

-- reaction: 'comply' | 'fleeing' | nil (nil = Reaktion aufheben)
function NPCManager.SetThreatState(pedNetId, reaction)
    threatTokenCounter[pedNetId] = (threatTokenCounter[pedNetId] or 0) + 1
    local token = threatTokenCounter[pedNetId]

    if not reaction then
        threatState[pedNetId] = nil
        return
    end

    threatState[pedNetId] = { reaction = reaction, token = token }

    SetTimeout(Config.ThreatAI.autoReleaseMs, function()
        local current = threatState[pedNetId]
        if not current or current.token ~= token then return end -- laengst weitergeschaltet/aufgehoben
        if Config.Debug then
            print(('[policevoiceai] Threat-Soft-Lock-Schutz: Ped %s haengte in "%s" fest, setze zurueck.')
                :format(tostring(pedNetId), reaction))
        end
        threatState[pedNetId] = nil
        TriggerClientEvent('policevoiceai:client:npcThreatCleared', -1, pedNetId)
    end)
end

AddEventHandler('playerDropped', function()
    local source = source
    NPCManager.ReleaseListener(source)
    Security.ClearPlayer(source)

    for pedNetId, claimant in pairs(approachClaimedBy) do
        if claimant == source then approachClaimedBy[pedNetId] = nil end
    end
end)
