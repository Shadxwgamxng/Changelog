DialogMenu = {}

-- =========================================================
-- PUNKT 74/83 (TEST 2 + TEST 7): DIALOGMENU-FALLBACK
-- =========================================================
-- Funktioniert IMMER, unabhaengig davon ob Voice/STT/KI/TTS gerade verfuegbar
-- sind - jede ausgewaehlte Frage wird 1:1 wie eine transkribierte
-- Officer-Aeusserung durch den kompletten Conversation Manager/KI/Persoenlichkeits-
-- Stack verarbeitet (siehe server/main.lua, payload.presetText), nur die
-- Spracherkennung entfaellt. Reine Klick-Bedienung, deshalb hier (und nur hier)
-- kurzzeitig SetNuiFocus.

local isOpen = false

RegisterKeyMapping('policevoiceai_dialogmenu', 'PoliceVoiceAI: Dialogmenü öffnen', 'keyboard', Config.NPCInteraction.DialogMenuKey)

local function CloseMenu()
    if not isOpen then return end
    isOpen = false
    SetNuiFocus(false, false)
    NUI.Send({ action = 'closeDialogMenu' })
end

RegisterCommand('policevoiceai_dialogmenu', function()
    if isOpen then
        CloseMenu()
        return
    end

    if not NPCInteraction.IsInConversation() then
        BeginTextCommandThefeedPost('STRING')
        AddTextComponentSubstringPlayerName(Locale('no_target'))
        EndTextCommandThefeedPostTicker(false, false)
        return
    end

    isOpen = true
    SetNuiFocus(true, true)
    NUI.Send({
        action = 'openDialogMenu',
        questions = Config.DialogQuestions,
        npcName = ('%s %s'):format(Client.state.npcFirstName or '', Client.state.npcLastName or ''),
    })
end, false)

RegisterNUICallback('dialogQuestionSelected', function(data, cb)
    CloseMenu()

    if NPCInteraction.IsInConversation() and data and data.text then
        TriggerServerEvent('policevoiceai:server:speech', {
            conversationId = Client.state.conversationId,
            presetText = data.text,
        })
    end

    cb('ok')
end)

RegisterNUICallback('closeDialogMenu', function(_, cb)
    CloseMenu()
    cb('ok')
end)

RegisterNetEvent('policevoiceai:client:conversationEnded', function()
    CloseMenu()
end)
