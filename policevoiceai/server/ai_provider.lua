AIProvider = {}

-- =========================================================
-- PHASE 7: AI / LLM INTEGRATION (austauschbare Schnittstelle)
-- =========================================================
-- Erwartet einen von conversation_manager.lua bereits aufgebauten,
-- KONTROLLIERTEN Context (Punkt 19 - niemals der komplette Rohdatensatz):
--
-- context = {
--     npc = { npcId, firstName, lastName, personaKey, personaLabel, speechStyle, personality = {...} },
--     situation = { type, reason, officerUnit, location, vehicleObserved },
--     facts = { { key, label, presentedValue, isLie }, ... },  -- NUR was gerade relevant ist
--     history = { { role = 'officer'|'npc', message = '...' }, ... },
--     latestOfficerMessage = '...',
--     questionCount = number,
-- }
--
-- WICHTIG: `facts[i].presentedValue` ist bereits die Version, die der NPC
-- erzaehlen DARF (kann bei einer Luege vom wahren Wert abweichen). Der wahre
-- Wert wird der KI absichtlich NICHT mitgegeben, damit sie ihn nicht versehentlich
-- verraet (Punkt 18 - konsistentes Luegen).
--
-- Rueckgabe: { text = '...', emotion = '...' }  ODER  nil, errorReason

local VALID_EMOTIONS = {
    nervoes = true, aengstlich = true, wuetend = true, traurig = true, betrunken = true,
    verwirrt = true, aggressiv = true, freundlich = true, erleichtert = true,
}

local function TraitDescription(personality)
    local parts = {}
    for _, trait in ipairs({ 'cooperation', 'aggression', 'honesty', 'nervousness', 'intelligence', 'criminality', 'confidence' }) do
        parts[#parts + 1] = ('%s=%d'):format(trait, personality[trait] or 50)
    end
    return table.concat(parts, ', ')
end

local function BuildSystemPrompt(context)
    local npc = context.npc
    local situation = context.situation or {}

    local roleLine = nil
    if situation.role then
        roleLine = ('Deine Rolle in diesem Vorfall: %s. %s'):format(situation.role, situation.roleDescription or '')
    end

    local factLines = {}
    for _, fact in ipairs(context.facts or {}) do
        factLines[#factLines + 1] = ('- %s: %s'):format(fact.label, fact.presentedValue)
    end
    if #factLines == 0 then
        factLines[1] = '- (aktuell keine spezifischen Fakten relevant - bleib allgemein, erfinde nichts)'
    end

    local lines = {
        ('Du spielst die Rolle von %s %s, einem NPC in einem Polizei-Rollenspiel (FiveM/GTA V).'):format(npc.firstName, npc.lastName),
        ('Beruf: %s. Persona: %s.'):format(npc.occupation or 'unbekannt', npc.personaLabel or npc.personaKey),
        ('Sprechstil: %s'):format(npc.speechStyle or ''),
        ('Persoenlichkeitswerte (0-100): %s'):format(TraitDescription(npc.personality or {})),
        ('Situation: %s. Grund: %s. Ort: %s. Officer-Einheit: %s.'):format(
            situation.type or 'Kontrolle', situation.reason or 'unbekannt',
            situation.location or 'unbekannt', situation.officerUnit or 'unbekannt'
        ),
    }

    if roleLine then lines[#lines + 1] = roleLine end

    lines[#lines + 1] = 'Fakten, die du bei passender Frage erwaehnen DARFST (nur wenn danach gefragt wird, dränge sie nicht ungefragt auf):'
    lines[#lines + 1] = table.concat(factLines, '\n')
    lines[#lines + 1] = 'WICHTIG: Erfinde KEINE Fakten ausserhalb der obigen Liste. Wenn nach etwas gefragt wird, das nicht in der Liste steht, weiche glaubwuerdig aus oder sage ehrlich dass du dazu nichts weisst - erfinde niemals Details wie Waffenscheine, Adressen o.ae.'
    lines[#lines + 1] = 'Antworte kurz (1-3 Saetze) wie in einem echten, gesprochenen Gespraech. Kein Roboterverhalten, keine zwei Antworten sollen identisch klingen.'
    lines[#lines + 1] = 'Antworte AUSSCHLIESSLICH als valides JSON-Objekt in der Form {"reply": "...", "emotion": "..."}.'
    lines[#lines + 1] = 'emotion muss GENAU einer dieser Werte sein: nervoes, aengstlich, wuetend, traurig, betrunken, verwirrt, aggressiv, freundlich, erleichtert.'

    return table.concat(lines, '\n')
end

local function BuildMessages(context)
    local messages = { { role = 'system', content = BuildSystemPrompt(context) } }

    for _, entry in ipairs(context.history or {}) do
        messages[#messages + 1] = {
            role = entry.role == 'officer' and 'user' or 'assistant',
            content = entry.message,
        }
    end

    messages[#messages + 1] = { role = 'user', content = context.latestOfficerMessage }
    return messages
end

local function ParseModelReply(rawContent, context)
    local decoded = Utils.SafeJsonDecode(rawContent, nil)
    if decoded and not Utils.IsEmpty(decoded.reply) then
        local emotion = decoded.emotion
        if not VALID_EMOTIONS[emotion] then
            emotion = Personality.DeriveEmotion({ personality = context.npc.personality, persona_key = context.npc.personaKey }, context.questionCount)
        end
        return { text = Utils.Truncate(decoded.reply, 600), emotion = emotion }
    end

    -- Model hat kein valides JSON geliefert -> Rohtext als Antwort verwenden, Emotion ableiten
    if not Utils.IsEmpty(rawContent) then
        return {
            text = Utils.Truncate(rawContent, 600),
            emotion = Personality.DeriveEmotion({ personality = context.npc.personality, persona_key = context.npc.personaKey }, context.questionCount),
        }
    end

    return nil
end

-- OpenAI Chat Completions - https://platform.openai.com/docs/api-reference/chat
function AIProvider.GenerateOpenAI(context)
    local apiKey = GetConvar('policevoiceai_openai_key', '')
    if Utils.IsEmpty(apiKey) then
        return nil, 'missing_api_key'
    end

    local body = Utils.SafeJsonEncode({
        model = Config.AI.model,
        temperature = Config.AI.temperature,
        max_tokens = Config.AI.maxTokens,
        messages = BuildMessages(context),
        response_format = { type = 'json_object' },
    })

    local result = Utils.HttpAwait(Config.AI.endpoint, 'POST', body, {
        ['Authorization'] = 'Bearer ' .. apiKey,
        ['Content-Type'] = 'application/json',
    })

    if not result or result.statusCode ~= 200 then
        return nil, 'ai_http_error_' .. tostring(result and result.statusCode or 'none')
    end

    local decoded = Utils.SafeJsonDecode(result.body, nil)
    local content = decoded and decoded.choices and decoded.choices[1] and decoded.choices[1].message
        and decoded.choices[1].message.content

    if Utils.IsEmpty(content) then
        return nil, 'ai_empty_response'
    end

    local parsed = ParseModelReply(content, context)
    if not parsed then return nil, 'ai_unparseable_response' end
    return parsed
end

-- Eigenes Backend (Punkt 20), erhaelt denselben Context als JSON
function AIProvider.GenerateCustomBackend(context)
    if Utils.IsEmpty(Config.AI.customBackendUrl) then
        return nil, 'missing_custom_backend_url'
    end

    local headers = { ['Content-Type'] = 'application/json' }
    if not Utils.IsEmpty(Config.AI.customBackendAuthHeader) then
        headers['Authorization'] = Config.AI.customBackendAuthHeader
    end

    local result = Utils.HttpAwait(Config.AI.customBackendUrl, 'POST', Utils.SafeJsonEncode(context), headers)

    if not result or result.statusCode ~= 200 then
        return nil, 'ai_http_error_' .. tostring(result and result.statusCode or 'none')
    end

    local decoded = Utils.SafeJsonDecode(result.body, nil)
    if not decoded or Utils.IsEmpty(decoded.reply) then
        return nil, 'ai_empty_response'
    end

    local emotion = VALID_EMOTIONS[decoded.emotion] and decoded.emotion
        or Personality.DeriveEmotion({ personality = context.npc.personality, persona_key = context.npc.personaKey }, context.questionCount)

    return { text = Utils.Truncate(decoded.reply, 600), emotion = emotion }
end

-- =========================================================
-- MOCK-PROVIDER (Phase 7 Standard - funktioniert ohne API-Key)
-- =========================================================
-- Regelbasiert, aber bewusst mit Variation (Punkt 25: kein Roboter-Verhalten).
-- Nutzt dieselben `facts` wie die echten Provider, damit Verhalten konsistent bleibt.

local FILLER = { 'Also...', 'Ähm,', 'Naja,', 'Okay,', 'Hm...', '' }
local COOP_ACK = { 'kein Problem.', 'klar, gerne.', 'natürlich.', 'gerne, Officer.' }

local function RandomFrom(list)
    return list[math.random(1, #list)]
end

local function MockReplyForFact(fact, npc)
    local filler = (npc.personality.nervousness or 0) >= 60 and RandomFrom(FILLER) or ''
    return ('%s %s ist %s.'):format(filler, fact.label, fact.presentedValue):gsub('^%s+', '')
end

function AIProvider.GenerateMock(context)
    local npc = context.npc
    local personality = npc.personality or {}
    local facts = context.facts or {}

    local replyParts = {}

    if #facts > 0 and Utils.RollChance(80) then
        for _, fact in ipairs(facts) do
            replyParts[#replyParts + 1] = MockReplyForFact(fact, npc)
        end
    else
        if (personality.cooperation or 50) >= 60 then
            replyParts[1] = RandomFrom({ 'Ja, ' .. RandomFrom(COOP_ACK), 'Verstehe, ' .. RandomFrom(COOP_ACK), 'Alles klar.' })
        elseif (personality.aggression or 0) >= 60 then
            replyParts[1] = RandomFrom({ 'Wieso fragen Sie das ueberhaupt?', 'Muss das sein?', 'Ich hab doch nichts gemacht!' })
        else
            replyParts[1] = RandomFrom({ 'Ich bin mir nicht sicher, was Sie meinen.', 'Koennen Sie das genauer erklaeren?', 'Okay...' })
        end
    end

    if (personality.confidence or 50) >= 60 and Utils.RollChance((npc.askQuestionChance or 20)) then
        replyParts[#replyParts + 1] = RandomFrom({ 'Gibt es ein Problem?', 'Warum fragen Sie?', 'Habe ich etwas falsch gemacht?' })
    end

    local text = table.concat(replyParts, ' ')
    local emotion = Personality.DeriveEmotion({ personality = personality, persona_key = npc.personaKey }, context.questionCount)

    return { text = Utils.Truncate(text, 400), emotion = emotion }
end

-- =========================================================
-- EINSTIEGSPUNKT
-- =========================================================

function AIProvider.Generate(context)
    local provider = Config.AI.provider

    if provider == 'mock' then
        return AIProvider.GenerateMock(context)
    end

    local ok, resultOrErr, err = pcall(function()
        if provider == 'openai' then
            return AIProvider.GenerateOpenAI(context)
        elseif provider == 'custom_http' then
            return AIProvider.GenerateCustomBackend(context)
        end
        return nil, 'unknown_ai_provider'
    end)

    if not ok then
        if Config.Debug then print('[policevoiceai] AI Fehler: ' .. tostring(resultOrErr)) end
        return nil, 'ai_exception'
    end

    return resultOrErr, err
end
