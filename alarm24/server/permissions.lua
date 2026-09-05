Permissions = {}

--- Prueft ob ein Spieler die Admin-ACE-Permission fuer Alarm24 besitzt.
--- Wird ausschliesslich fuer den Verwaltungsbereich benoetigt (siehe Punkt 21/22
--- der Spezifikation) - NICHT fuer die Alarmierung selbst, da diese ausschliesslich
--- von der vertrauenswuerdigen EmergencyDispatch-Integration ausgeloest wird.
function Permissions.IsAdmin(source)
    if source == 0 then
        -- Konsole / Serverkontext
        return true
    end

    return IsPlayerAceAllowed(source, Config.Permissions.adminAce) == true
end

function Permissions.EnsureAdmin(source)
    if not Permissions.IsAdmin(source) then
        TriggerClientEvent('alarm24:notify', source, {
            type = 'error',
            message = _U('notify_no_permission'),
        })
        return false
    end
    return true
end
