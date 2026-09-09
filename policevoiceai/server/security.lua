Security = {}

-- =========================================================
-- PHASE 18/20/28: RATE LIMITING, VALIDIERUNG, EINGABE-HAERTUNG
-- =========================================================
-- Rein eventbasiert, kein Polling-Loop: Zeitstempel werden nur beim
-- tatsaechlichen Eintreffen einer Anfrage verglichen.

local lastRequestAt = {} -- [playerSource] = GetGameTimer() beim letzten Request

-- Verhindert, dass ein Spieler die KI/STT/TTS-Provider mit Anfragen flutet.
function Security.CanMakeRequest(source)
    local now = GetGameTimer()
    local last = lastRequestAt[source]
    if last and (now - last) < Config.Conversation.cooldownBetweenRequestsMs then
        return false
    end
    lastRequestAt[source] = now
    return true
end

function Security.ClearPlayer(source)
    lastRequestAt[source] = nil
end

-- Serverseitige, autoritative Distanzpruefung (Punkt 20: niemals dem Client vertrauen)
function Security.IsPlayerInRangeOfPed(source, pedNetId, maxDistance)
    if not Config.Security.validateDistanceServerSide then return true end

    local playerPed = GetPlayerPed(source)
    if not playerPed or playerPed == 0 then return false end

    local targetPed = NetworkGetEntityFromNetworkId(pedNetId)
    if not targetPed or targetPed == 0 then return false end

    local playerCoords = GetEntityCoords(playerPed)
    local targetCoords = GetEntityCoords(targetPed)

    return Utils.Distance(playerCoords, targetCoords) <= (maxDistance or Config.NPCConversationDistance)
end

-- Haertet vom Client gemeldeten (bereits transkribierten) Text ab, bevor er an
-- Conversation Manager / KI weitergereicht wird.
function Security.SanitizeSpeechText(text)
    if type(text) ~= 'string' then return nil end
    text = text:gsub('[%c]', '') -- Steuerzeichen entfernen
    text = Utils.Truncate(text, Config.Security.maxSpeechCharsFromClient)
    text = text:gsub('^%s+', ''):gsub('%s+$', '')
    if text == '' then return nil end
    return text
end

-- Grobe Groessenpruefung fuer Base64-Audio-Uploads, bevor sie an einen STT-Provider gehen
function Security.IsAudioPayloadSizeOk(base64Data)
    if type(base64Data) ~= 'string' then return false end
    local approxBytes = math.floor(#base64Data * 0.75)
    return approxBytes <= Config.Security.maxAudioPayloadBytes
end
