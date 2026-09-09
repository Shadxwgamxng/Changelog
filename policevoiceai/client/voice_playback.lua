VoicePlayback = {}

-- =========================================================
-- PHASE 9: 3D VOICE (client-berechnete Lautstaerke/Panning)
-- =========================================================
-- Echtes 3D-Audio in einer NUI (Browser) gibt es nicht "automatisch" wie bei
-- In-Game-Sound-Emittern. Stattdessen berechnet der Client kontinuierlich
-- Distanz (-> Lautstaerke) und Winkel relativ zur Blickrichtung (-> Stereo-Pan)
-- und schickt das an die NUI, die per Web Audio API (GainNode + StereoPannerNode)
-- entsprechend abspielt (siehe web/js/app.js).

local playing = false
local currentPedNetId = nil

local function ComputeVolumeAndPan(listenerPed, targetCoords)
    local listenerCoords = GetEntityCoords(listenerPed)
    local dist = Utils.Distance(listenerCoords, targetCoords)
    local maxDist = Config.Voice3D.maxHearingDistance
    local volume = Utils.Clamp(1.0 - (dist / maxDist), 0.0, 1.0)

    local forward = GetEntityForwardVector(listenerPed)
    local right = vector3(forward.y, -forward.x, 0.0)
    local toTargetX, toTargetY = targetCoords.x - listenerCoords.x, targetCoords.y - listenerCoords.y
    local len = math.sqrt(toTargetX * toTargetX + toTargetY * toTargetY)

    local pan = 0.0
    if len > 0.01 then
        pan = Utils.Clamp((toTargetX * right.x + toTargetY * right.y) / len, -1.0, 1.0)
    end

    return volume, pan, dist
end

local function StartPanLoop(pedNetId)
    currentPedNetId = pedNetId
    playing = true

    CreateThread(function()
        while playing and currentPedNetId == pedNetId do
            local pedEntity = NetworkGetEntityFromNetworkId(pedNetId)
            if pedEntity == 0 or not DoesEntityExist(pedEntity) then break end

            local volume, pan = ComputeVolumeAndPan(PlayerPedId(), GetEntityCoords(pedEntity))
            NUI.Send({ action = 'updateAudioParams', volume = volume, pan = pan })
            Wait(Config.Voice3D.updateIntervalMs)
        end
    end)
end

function VoicePlayback.Stop()
    playing = false
    currentPedNetId = nil
    NUI.Send({ action = 'stopAudio' })
end

function VoicePlayback.OnPlaybackEnded()
    local pedNetId = currentPedNetId
    playing = false
    currentPedNetId = nil

    NUI.Send({ action = 'setSpeaking', speaking = false })

    local pedEntity = pedNetId and NetworkGetEntityFromNetworkId(pedNetId)
    if pedEntity and pedEntity ~= 0 then Animation.StopTalking(pedEntity) end

    -- Punkt 75: Server sauber aus RESPONDING zurueckholen, sobald die Wiedergabe
    -- (Audio ODER text-only Fallback) tatsaechlich beendet ist.
    if Client.state.conversationId then
        TriggerServerEvent('policevoiceai:server:playbackFinished', Client.state.conversationId)
    end
end

RegisterNetEvent('policevoiceai:client:npcReply', function(data)
    if Client.state.conversationId ~= data.conversationId then return end

    local pedEntity = NetworkGetEntityFromNetworkId(data.pedNetId)

    NUI.Send({ action = 'setSpeaking', speaking = true, emotion = data.emotion })
    NUI.Send({ action = 'showTranscript', role = 'npc', text = data.text })

    -- Grobe Sprechdauer-Schaetzung fuer die Animation/das text-only Fallback (~70ms/Zeichen)
    local estimatedMs = math.max(1500, #data.text * 70)

    if pedEntity ~= 0 then
        Animation.PlayTalking(pedEntity, data.emotion, estimatedMs)
    end

    if data.audioBase64 then
        local volume, pan = 1.0, 0.0
        if pedEntity ~= 0 then
            volume, pan = ComputeVolumeAndPan(PlayerPedId(), GetEntityCoords(pedEntity))
        end

        NUI.Send({
            action = 'playAudio',
            audioBase64 = data.audioBase64,
            mimeType = data.mimeType,
            volume = volume,
            pan = pan,
        })
        StartPanLoop(data.pedNetId)
    else
        -- Phase 27: kein Audio (Mock/Fallback) - Antwort bleibt text-only, Gespraech laeuft weiter
        SetTimeout(estimatedMs, function()
            VoicePlayback.OnPlaybackEnded()
        end)
    end
end)
