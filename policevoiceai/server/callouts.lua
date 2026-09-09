Callouts = {}

-- =========================================================
-- PHASE 14/29: CALLOUTS + VOICE KOMBINIEREN
-- =========================================================
-- Beispiel "Domestic Disturbance": zwei NPCs vor einem Haus, jeder mit eigener
-- Identitaet, Persoenlichkeit UND eigener Sichtweise auf den Vorfall (Punkt 29).
-- Damit beide NPCs nicht exakt dieselbe Geschichte erzaehlen, bekommt jeder eine
-- eigene `role`, die in den KI-Context einfliesst (siehe server/ai_provider.lua).

local ROLE_POOLS = {
    domestic_disturbance = { 'beschuldigt', 'vermeintliches_opfer', 'zeuge' },
    burglary_suspects = { 'verdaechtiger', 'zeuge' },
    generic = { 'beteiligt', 'zeuge' },
}

local ROLE_DESCRIPTIONS = {
    beschuldigt = 'Dir wird vorgeworfen, der Aggressor in diesem Vorfall zu sein. Du verteidigst dich, ohne notwendigerweise alles zuzugeben.',
    vermeintliches_opfer = 'Du siehst dich als Geschaedigter/Geschaedigte dieses Vorfalls und schilderst deine Sicht der Ereignisse.',
    zeuge = 'Du hast den Vorfall nur teilweise mitbekommen und schilderst, was du tatsaechlich gesehen/gehoert hast - nicht mehr.',
    verdaechtiger = 'Du stehst im Verdacht, an diesem Vorfall beteiligt gewesen zu sein, bestreitest dies aber nach Moeglichkeit.',
    beteiligt = 'Du warst Teil dieses Vorfalls.',
}

local sceneContextForPed = {} -- [pedNetId] = { type, role, roleDescription, reason, location, officerUnit }

-- pedNetIds: Liste von Netzwerk-IDs der an diesem Callout beteiligten Peds
-- sharedContext: { reason, location, officerUnit }
function Callouts.RegisterScene(calloutType, pedNetIds, sharedContext)
    if not Config.Callouts.enabled then return false, 'callouts_disabled' end
    if #pedNetIds > Config.Callouts.maxSceneNPCs then return false, 'too_many_npcs' end

    local rolePool = ROLE_POOLS[calloutType] or ROLE_POOLS.generic

    for i, pedNetId in ipairs(pedNetIds) do
        local role = rolePool[((i - 1) % #rolePool) + 1]
        sceneContextForPed[pedNetId] = {
            type = calloutType,
            role = role,
            roleDescription = ROLE_DESCRIPTIONS[role],
            reason = sharedContext and sharedContext.reason,
            location = sharedContext and sharedContext.location,
            officerUnit = sharedContext and sharedContext.officerUnit,
        }
    end

    return true
end

function Callouts.ClearScene(pedNetIds)
    for _, pedNetId in ipairs(pedNetIds) do
        sceneContextForPed[pedNetId] = nil
    end
end

-- Wird von main.lua beim Start eines Gespraechs aufgerufen, um die Callout-Rolle
-- (falls vorhanden) in die Situation einzumischen.
function Callouts.BuildSituation(pedNetId, fallbackSituation)
    local sceneContext = sceneContextForPed[pedNetId]
    if not sceneContext then return fallbackSituation end

    return {
        type = sceneContext.type,
        reason = sceneContext.reason or (fallbackSituation and fallbackSituation.reason),
        location = sceneContext.location or (fallbackSituation and fallbackSituation.location),
        officerUnit = sceneContext.officerUnit or (fallbackSituation and fallbackSituation.officerUnit),
        role = sceneContext.role,
        roleDescription = sceneContext.roleDescription,
    }
end

exports('RegisterCalloutScene', Callouts.RegisterScene)
exports('ClearCalloutScene', Callouts.ClearScene)
