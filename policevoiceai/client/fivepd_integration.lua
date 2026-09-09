FivePDClient = {}

-- =========================================================
-- PHASE 11-16: FIVEPD-INTEGRATION (Client-Seite)
-- =========================================================
-- Erlaubt anderen Ressourcen (z.B. einem eigenen Eintrag im FivePD-Ped-
-- Interaktionsmenu), gezielt ein Gespraech mit dem gerade naechsten NPC samt
-- Situationskontext (Traffic Stop, Callout, ...) zu starten, ohne die internen
-- Details von PoliceVoiceAI kennen zu muessen.
--
-- exports['policevoiceai']:StartConversationWithSituation({
--     type = 'traffic_stop', reason = 'Geschwindigkeitsueberschreitung',
--     officerUnit = 'Unit 247', location = 'Vinewood Blvd',
-- })

function FivePDClient.StartConversationWithSituation(situation)
    NPCInteraction.TryStartConversation(situation)
end

exports('StartConversationWithSituation', FivePDClient.StartConversationWithSituation)

-- Optionaler, best-effort Versuch, das Ped-Interaktionsmenu von FivePD (z.B. "/id")
-- um einen eigenen Menupunkt zu ergaenzen. Der tatsaechliche Event-/Export-Name
-- haengt von der eingesetzten FivePD-Version ab und wurde bewusst NICHT erfunden -
-- PLATZHALTER, siehe Config.FivePD.hookPedInteractMenu. Ganz ohne diesen Hook
-- funktioniert PoliceVoiceAI trotzdem vollstaendig: der Spieler muss nur die
-- Voice-Taste (Config.VoiceKey) in der Naehe eines NPCs benutzen (Punkt 31 - kein Menu noetig).
CreateThread(function()
    if not Config.FivePD.enabled or not Config.FivePD.hookPedInteractMenu then return end
    if GetResourceState(Config.FivePD.resourceName) ~= 'started' then return end

    pcall(function()
        RegisterNetEvent('fivepd:pedInteractionMenuOpened', function(pedNetId)
            if Config.Debug then
                print('[policevoiceai] FivePD Ped-Interaktionsmenu erkannt fuer Ped ' .. tostring(pedNetId))
            end
        end)
    end)
end)
