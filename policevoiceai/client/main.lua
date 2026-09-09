-- =========================================================
-- POLICEVOICEAI - CLIENT BOOTSTRAP
-- =========================================================

CreateThread(function()
    if Config.Debug then
        print('[policevoiceai] Client geladen. Modus: ' .. Config.VoiceMode)
    end
end)

-- Testkommando ohne Mikrofon/echten STT-Anbieter (siehe README "Testen ohne API-Keys"):
-- funktioniert nur, solange Config.STT.provider = 'mock' ist.
RegisterCommand('pvoice', function(_, args)
    if Config.STT.provider ~= 'mock' then
        if Config.Debug then print('[policevoiceai] /pvoice ist nur mit Config.STT.provider = "mock" nutzbar.') end
        return
    end
    if not NPCInteraction.IsInConversation() then
        BeginTextCommandThefeedPost('STRING')
        AddTextComponentSubstringPlayerName(Locale('no_target'))
        EndTextCommandThefeedPostTicker(false, false)
        return
    end

    local text = table.concat(args, ' ')
    if text == '' then return end

    VoiceCapture.OnSpeechRecorded({ debugText = text })
end, false)

AddEventHandler('onResourceStop', function(resourceName)
    if GetCurrentResourceName() ~= resourceName then return end
    if NPCInteraction and NPCInteraction.IsInConversation() then
        NPCInteraction.ResetState()
    end
end)
