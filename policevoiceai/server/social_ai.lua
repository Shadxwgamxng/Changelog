SocialAI = {}

-- =========================================================
-- PUNKT 57-59/65: NPCS SPRECHEN OFFICER SELBST AN
-- =========================================================
-- Der Client (client/npc_social.lua) meldet periodisch nahe Peds, die noch
-- nicht in einem Gespraech stecken. Der SERVER entscheidet autoritativ
-- (Persoenlichkeit + Distanz + Cooldown), ob/wie ein NPC reagiert - der Client
-- fuehrt danach nur noch die eigentliche Lauf-Animation aus.

local OPENING_LINE_POOLS = {
    question = {
        'Entschuldigen Sie, Officer. Können Sie mir kurz helfen?',
        'Entschuldigen Sie, wissen Sie zufällig, wo die nächste Polizeistation ist?',
        'Officer, haben Sie kurz eine Minute Zeit?',
    },
    witness = {
        'Officer! Warten Sie bitte! Ich glaube, ich habe gerade einen Unfall gesehen.',
        'Ich glaube, ich habe gerade gesehen, wie jemand dort hinten etwas gestohlen hat.',
        'Entschuldigung, ich war Zeuge von etwas, das Sie interessieren könnte.',
    },
    victim = {
        'Officer, bitte helfen Sie mir!',
        'Officer! Gott sei Dank, ich brauche wirklich Hilfe!',
    },
}

local pendingOpeningLine = {} -- [pedNetId] = { playerSource, text, emotion }

local function PickOpeningLine(personality)
    local roll = math.random(1, 100)
    local roleKey
    if roll <= 15 then
        roleKey = 'victim'
    elseif roll <= 50 then
        roleKey = 'witness'
    else
        roleKey = 'question'
    end

    local pool = OPENING_LINE_POOLS[roleKey]
    local text = pool[math.random(1, #pool)]
    local emotion = Personality.DeriveEmotion({ personality = personality }, 0)
    return text, emotion
end

-- Wird vom Server-Event 'policevoiceai:server:evaluateApproach' aufgerufen
-- (siehe server/main.lua), NICHT direkt vom Client-Timer.
function SocialAI.EvaluateApproach(pedNetId, playerSource)
    if not Config.SocialAI.enabled then return { action = 'none' } end

    if not Security.IsPlayerInRangeOfPed(playerSource, pedNetId, Config.NPCInteraction.ApproachDistance) then
        return { action = 'none' }
    end

    if not NPCManager.CanConsiderApproach(pedNetId) then
        return { action = 'none' }
    end

    -- Identitaet sicherstellen (persistiert eine echte Persoenlichkeit fuer diesen Ped)
    NPCManager.GetOrRegisterNpcId(pedNetId)
    local entry = NPCManager.GetRegistryEntry(pedNetId)
    if not entry then return { action = 'none' } end

    local personality = entry.personality or {}

    -- Punkt 65: kriminelle NPCs meiden den Officer eventuell komplett
    if (personality.criminality or 0) >= 60 and Utils.RollChance(40) then
        if not NPCManager.TryClaimForApproach(pedNetId, playerSource) then return { action = 'none' } end
        NPCManager.SetState(pedNetId, NPC_STATES.FLEEING)
        SetTimeout(8000, function()
            if NPCManager.GetState(pedNetId) == NPC_STATES.FLEEING then
                NPCManager.SetState(pedNetId, NPC_STATES.IDLE)
            end
            NPCManager.ReleaseApproachClaim(pedNetId)
        end)
        return { action = 'flee', pedNetId = pedNetId }
    end

    -- Punkt 65: Annaeherungs-Wahrscheinlichkeit haengt von der Persoenlichkeit ab.
    -- Multiplikatoren bewusst klein gehalten, damit selbst ein sehr extrovertierter
    -- NPC nicht staendig ansprechen will (siehe Config.SocialAI.baseApproachChance).
    local chance = Config.SocialAI.baseApproachChance
    chance = chance + ((personality.confidence or 50) - 50) * 0.15
    chance = chance + ((personality.cooperation or 50) - 50) * 0.1
    chance = chance - ((personality.nervousness or 50) - 50) * 0.1
    chance = Utils.Clamp(chance, 1, 15)

    if not Utils.RollChance(chance) then
        return { action = 'none' }
    end

    if not NPCManager.TryClaimForApproach(pedNetId, playerSource) then
        return { action = 'none' }
    end

    NPCManager.SetState(pedNetId, NPC_STATES.APPROACHING)

    local text, emotion = PickOpeningLine(personality)
    pendingOpeningLine[pedNetId] = { playerSource = playerSource, text = text, emotion = emotion }

    return {
        action = 'approach',
        pedNetId = pedNetId,
        npcFirstName = entry.firstName,
        npcLastName = entry.lastName,
    }
end

-- Wird beim erfolgreichen StartConversation abgerufen (server/main.lua), damit
-- der NPC direkt seine Einstiegszeile sagt, statt auf eine Officer-Frage zu warten.
function SocialAI.ConsumePendingOpeningLine(pedNetId, playerSource)
    local pending = pendingOpeningLine[pedNetId]
    if not pending or pending.playerSource ~= playerSource then return nil end
    pendingOpeningLine[pedNetId] = nil
    return { text = pending.text, emotion = pending.emotion }
end

-- Wird aufgerufen, wenn die Annaeherung clientseitig fehlschlaegt/abgebrochen
-- wird (Ped blieb stecken, Spieler ist weggegangen, Timeout) - gibt die
-- Reservierung sauber frei, damit der NPC spaeter erneut wuerfeln kann.
function SocialAI.CancelApproach(pedNetId, playerSource)
    if not NPCManager.IsApproachClaimedBy(pedNetId, playerSource) then return end
    pendingOpeningLine[pedNetId] = nil
    NPCManager.ReleaseApproachClaim(pedNetId)
    if NPCManager.GetState(pedNetId) == NPC_STATES.APPROACHING then
        NPCManager.SetState(pedNetId, NPC_STATES.IDLE)
    end
end

-- =========================================================
-- WAFFE/TASER AUF NPC GERICHTET: HAENDE HOCH ODER FLUCHT
-- =========================================================
-- Wird vom Server-Event 'policevoiceai:server:evaluateThreat' aufgerufen
-- (siehe server/main.lua und client/npc_threat.lua). Persoenlichkeitsbasiert,
-- server-autoritativ, mit Soft-Lock-Schutz (siehe NPCManager.SetThreatState).

function SocialAI.EvaluateThreat(pedNetId, playerSource)
    if not Config.ThreatAI.enabled then return { action = 'none' } end

    if not Security.IsPlayerInRangeOfPed(playerSource, pedNetId, Config.ThreatAI.reactionDistance) then
        return { action = 'none' }
    end

    -- Bereits eine Reaktion aktiv? Dieselbe Entscheidung erneut liefern statt
    -- neu zu wuerfeln (kein Geflacker zwischen "Haende hoch" und "Flucht").
    local existing = NPCManager.GetThreatState(pedNetId)
    if existing then
        return { action = existing, pedNetId = pedNetId }
    end

    -- Echte Spieler reagieren nicht auf dieses System (Phase 17)
    local pedEntity = NetworkGetEntityFromNetworkId(pedNetId)
    if pedEntity == 0 or IsPedAPlayer(pedEntity) then return { action = 'none' } end

    NPCManager.GetOrRegisterNpcId(pedNetId)
    local entry = NPCManager.GetRegistryEntry(pedNetId)
    if not entry then return { action = 'none' } end

    local personality = entry.personality or {}
    local reaction

    if (personality.criminality or 0) >= Config.ThreatAI.criminalityFleeThreshold
        and Utils.RollChance(Config.ThreatAI.fleeChancePercent) then
        reaction = 'fleeing'
    else
        reaction = 'comply'
    end

    NPCManager.SetThreatState(pedNetId, reaction)

    return {
        action = reaction,
        pedNetId = pedNetId,
        npcFirstName = entry.firstName,
        npcLastName = entry.lastName,
    }
end

-- Der Officer hat weggezielt/die Waffe weggesteckt - Reaktion aufheben, damit
-- der NPC (falls er die Haende oben hatte) seiner normalen Taetigkeit nachgeht.
function SocialAI.ClearThreat(pedNetId, playerSource)
    if not Security.IsPlayerInRangeOfPed(playerSource, pedNetId, Config.ThreatAI.reactionDistance * 1.5) then
        return
    end
    NPCManager.SetThreatState(pedNetId, nil)
end
