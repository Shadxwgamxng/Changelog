NPCManager = {}

-- =========================================================
-- PHASE 1/4: NPC-REGISTRIERUNG & "NUR EIN ZUHOERER"
-- =========================================================
-- Ordnet jedem angesprochenen Ped eine stabile npcId zu (fuer die Dauer seiner
-- Lebenszeit) und stellt sicher, dass:
--  a) nur der tatsaechlich angesprochene NPC auf einen Spieler reagiert, selbst
--     wenn mehrere NPCs in Reichweite stehen (Punkt 4), und
--  b) ein NPC nicht gleichzeitig mit zwei Officers "spricht" (Punkt 4/6).

local pedToNpcId = {}          -- [pedNetId] = npcId
local activeListenerOfPlayer = {}  -- [playerSource] = pedNetId
local activeSpeakerOfPed = {}      -- [pedNetId] = playerSource

local npcCounter = 0

local function NextNpcId()
    npcCounter = npcCounter + 1
    return ('CIV-%05d'):format(math.random(10000, 99999) + npcCounter % 1000)
end

-- Gibt die npcId fuer einen Ped zurueck, erzeugt bei Bedarf eine neue Identitaet (Phase 2/3)
function NPCManager.GetOrRegisterNpcId(pedNetId, personaKeyOverride)
    local npcId = pedToNpcId[pedNetId]
    if npcId then return npcId end

    npcId = NextNpcId()
    pedToNpcId[pedNetId] = npcId
    Personality.GetOrCreateNPC(npcId, personaKeyOverride)
    return npcId
end

function NPCManager.GetNpcIdIfRegistered(pedNetId)
    return pedToNpcId[pedNetId]
end

-- Versucht, dass `source` das Gespraech mit `pedNetId` beginnt / fortsetzt.
-- Gibt (true) oder (false, reasonKey) zurueck.
function NPCManager.TryClaimListener(source, pedNetId)
    if not Security.IsPlayerInRangeOfPed(source, pedNetId) then
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
        end
    end

    activeListenerOfPlayer[source] = pedNetId
    activeSpeakerOfPed[pedNetId] = source
    return true
end

function NPCManager.ReleaseListener(source)
    local pedNetId = activeListenerOfPlayer[source]
    if pedNetId and activeSpeakerOfPed[pedNetId] == source then
        activeSpeakerOfPed[pedNetId] = nil
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
    return Security.IsPlayerInRangeOfPed(source, pedNetId)
end

AddEventHandler('playerDropped', function()
    local source = source
    NPCManager.ReleaseListener(source)
    Security.ClearPlayer(source)
end)
