-- =========================================================
-- ALARM24 - SERVER BOOTSTRAP
-- =========================================================
-- Rein eventbasiert: es existiert kein Loop, der Alarme oder die Datenbank
-- pollt. Der einzige "aktive" Code laeuft, wenn tatsaechlich ein Event
-- (Spielerverbindung, NUI-Callback, EmergencyDispatch-Signal) eintritt.

CreateThread(function()
    if GetResourceState(Config.EmergencyDispatch.resourceName) ~= 'started' and Config.EmergencyDispatch.enabled then
        print(('[alarm24] WARNUNG: Resource "%s" wurde nicht gefunden/gestartet. Alarm24 wartet trotzdem auf Events/Exports, sobald sie verfuegbar sind.'):format(Config.EmergencyDispatch.resourceName))
    end
end)

-- =========================================================
-- SPIELER-VERBINDUNG -> VERPASSTE ALARME
-- =========================================================

-- Wird vom Client ausgeloest, sobald die NUI-App bereit ist (nicht sofort bei
-- Connect, damit der Spieler tatsaechlich eingeloggt/geladen ist).
RegisterNetEvent('alarm24:server:ready', function()
    local source = source
    Alarms.DeliverMissedAlarms(source)
end)

-- =========================================================
-- NUI: INITIALDATEN (Profil, Historie, Verfuegbarkeit)
-- =========================================================

RegisterNetEvent('alarm24:server:requestInitialData', function()
    local source = source
    local identifier = Users.GetIdentifier(source)
    if not identifier then return end

    local user = Users.FindUserByIdentifier(identifier)
    local profile = Alarms.GetProfile(identifier)
    local history = Alarms.GetHistory(identifier)

    TriggerClientEvent('alarm24:client:initialData', source, {
        registered = user ~= nil,
        profile = profile,
        history = history,
    })
end)

-- =========================================================
-- NUI: RUECKMELDUNG AUF ALARM
-- =========================================================

RegisterNetEvent('alarm24:server:respond', function(recipientId, status)
    local source = source

    if type(recipientId) ~= 'number' or type(status) ~= 'string' then
        return
    end

    local ok, err = Alarms.HandleResponse(source, recipientId, status)

    TriggerClientEvent('alarm24:client:respondResult', source, {
        success = ok,
        error = not ok and err or nil,
        recipientId = recipientId,
        status = status,
    })
end)

-- =========================================================
-- NUI: VERFUEGBARKEIT SETZEN
-- =========================================================

RegisterNetEvent('alarm24:server:setAvailability', function(availability)
    local source = source
    local identifier = Users.GetIdentifier(source)
    if not identifier then return end

    local user = Users.FindUserByIdentifier(identifier)
    if not user then return end

    local ok = Users.SetAvailability(identifier, availability)

    TriggerClientEvent('alarm24:client:availabilityResult', source, {
        success = ok,
        availability = ok and availability or user.availability,
    })
end)

-- =========================================================
-- NUI: LIVE-UEBERSICHT FUER EINEN EINSATZ ABRUFEN
-- =========================================================

RegisterNetEvent('alarm24:server:requestLiveSummary', function(alarmId)
    local source = source
    if not Config.ShowLiveResponses then return end

    local identifier = Users.GetIdentifier(source)
    if not identifier then return end

    -- Nur anzeigen, wenn der Spieler selbst Empfaenger dieses Alarms ist.
    local recipient = Database.GetRecipientForUser(alarmId, identifier)
    if not recipient then return end

    TriggerClientEvent('alarm24:liveSummary', source, {
        alarmId = alarmId,
        summary = Alarms.GetLiveSummary(alarmId),
    })
end)

-- =========================================================
-- ADMINBEREICH (Verwaltung, KEINE Einsatzdisposition - siehe Punkt 21)
-- =========================================================

RegisterNetEvent('alarm24:server:admin:listUsers', function()
    local source = source
    if not Permissions.EnsureAdmin(source) then return end

    TriggerClientEvent('alarm24:client:admin:users', source, Database.GetAllUsers())
end)

RegisterNetEvent('alarm24:server:admin:upsertUser', function(data)
    local source = source
    if not Permissions.EnsureAdmin(source) then return end

    if type(data) ~= 'table' or Utils.IsEmpty(data.identifier) then
        return
    end

    Users.CreateOrUpdate(data.identifier, data.name, data.organization, data.active ~= false)

    Database.AddAuditLog(Users.GetIdentifier(source), 'admin_upsert_user', {
        identifier = data.identifier,
        name = data.name,
        organization = data.organization,
        active = data.active,
    })

    TriggerClientEvent('alarm24:client:admin:users', source, Database.GetAllUsers())
end)

RegisterNetEvent('alarm24:server:admin:deleteUser', function(identifier)
    local source = source
    if not Permissions.EnsureAdmin(source) then return end
    if Utils.IsEmpty(identifier) then return end

    Users.Delete(identifier)

    Database.AddAuditLog(Users.GetIdentifier(source), 'admin_delete_user', {
        identifier = identifier,
    })

    TriggerClientEvent('alarm24:client:admin:users', source, Database.GetAllUsers())
end)

RegisterNetEvent('alarm24:server:admin:getLogs', function()
    local source = source
    if not Permissions.EnsureAdmin(source) then return end

    TriggerClientEvent('alarm24:client:admin:logs', source, Database.GetAuditLogs(200))
end)

-- =========================================================
-- KONSOLEN-COMMAND (Server-Konsole / Admin-ACE) ALS FALLBACK
-- ZUR NUI-BENUTZERVERWALTUNG
-- =========================================================

RegisterCommand('alarm24adduser', function(source, args)
    if not Permissions.EnsureAdmin(source) then return end

    local identifier, name, organization = args[1], args[2], args[3]
    if Utils.IsEmpty(identifier) then
        print('Verwendung: alarm24adduser <identifier> <name> <organisation>')
        return
    end

    Users.CreateOrUpdate(identifier, name or '', organization or '', true)
    Database.AddAuditLog(source == 0 and 'console' or Users.GetIdentifier(source), 'admin_upsert_user', {
        identifier = identifier, name = name, organization = organization,
    })

    print(('[alarm24] Benutzer %s (%s) hinzugefuegt/aktualisiert.'):format(name or identifier, identifier))
end, true)

RegisterCommand('alarm24removeuser', function(source, args)
    if not Permissions.EnsureAdmin(source) then return end

    local identifier = args[1]
    if Utils.IsEmpty(identifier) then
        print('Verwendung: alarm24removeuser <identifier>')
        return
    end

    Users.Delete(identifier)
    Database.AddAuditLog(source == 0 and 'console' or Users.GetIdentifier(source), 'admin_delete_user', {
        identifier = identifier,
    })

    print(('[alarm24] Benutzer %s entfernt.'):format(identifier))
end, true)
