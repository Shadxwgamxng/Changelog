Alarms = {}

-- =========================================================
-- WICHTIGSTE REGEL (siehe Punkt 31 der Spezifikation)
-- =========================================================
-- Diese Datei entscheidet NIEMALS selbststaendig, wer alarmiert wird.
-- Sie verarbeitet ausschliesslich bereits von EmergencyDispatch getroffene
-- Entscheidungen (siehe integrations/emergencydispatch.lua). Es gibt hier
-- keinerlei Logik, die anhand eines Einsatzstichworts eine Organisation
-- oder Personengruppe automatisch alarmiert.

-- =========================================================
-- EINGEHENDE ALARMIERUNG FUER EINE KONKRETE PERSON
-- =========================================================

--- canonicalData = {
---     operationId, identifier, keyword, description, location,
---     coordsX, coordsY, coordsZ, priority, alarmTime, organization, extra
--- }
--- Wird ausschliesslich von integrations/emergencydispatch.lua aufgerufen,
--- NIEMALS direkt vom Client oder aufgrund eines Einsatzstichworts.
function Alarms.CreateAlarmForRecipient(canonicalData)
    if Utils.IsEmpty(canonicalData.operationId) or Utils.IsEmpty(canonicalData.identifier) then
        if Config.Debug then
            print('[alarm24] Ungueltige Alarmierungsdaten empfangen (operationId/identifier fehlt) - verworfen.')
        end
        return false, 'invalid_data'
    end

    local identifier = canonicalData.identifier

    -- 1. Nur diese konkrete Person suchen - keine Namens-/Gruppen-/Stichwortlogik.
    local user = Users.FindUserByIdentifier(identifier)
    if not user then
        Database.AddAuditLog('EmergencyDispatch', 'alarm_rejected_unknown_user', {
            identifier = identifier,
            operationId = canonicalData.operationId,
        })
        if Config.Debug then
            print(('[alarm24] Kein Alarm24-Benutzer fuer Identifier %s hinterlegt - Alarm verworfen.'):format(identifier))
        end
        return false, 'unknown_user'
    end

    if not Users.IsUserActive(user) then
        Database.AddAuditLog('EmergencyDispatch', 'alarm_rejected_inactive_user', {
            identifier = identifier,
            operationId = canonicalData.operationId,
        })
        return false, 'inactive_user'
    end

    -- 2. Einsatz (Alarm) holen oder anlegen - der Einsatz selbst kommt 1:1 von
    --    EmergencyDispatch und wird von Alarm24 nicht veraendert/disponiert.
    local alarm = Database.GetAlarmByOperationId(canonicalData.operationId)
    local alarmId

    if alarm then
        alarmId = alarm.id
    else
        alarmId = Database.CreateAlarm(canonicalData)
    end

    -- 3. Duplikatsschutz: EmergencyDispatch-Einsatz-ID + FiveM-Identifier muss eindeutig sein.
    local dedupeKey = canonicalData.operationId .. ':' .. identifier

    if Database.DedupeKeyExists(dedupeKey) then
        if Config.Debug then
            print(('[alarm24] Doppelte Alarmierung erkannt und ignoriert: %s'):format(dedupeKey))
        end
        return false, 'duplicate'
    end

    local recipientId = Database.CreateRecipient(alarmId, identifier, user.id, dedupeKey)
    if not recipientId then
        -- Race condition mit dem Unique-Key - ebenfalls Duplikat.
        return false, 'duplicate'
    end

    Database.CreateResponse(recipientId, alarmId, identifier)

    -- 4. Genau diese Person benachrichtigen - niemand sonst.
    local payload = {
        alarmId = alarmId,
        recipientId = recipientId,
        operationId = canonicalData.operationId,
        keyword = canonicalData.keyword,
        description = canonicalData.description,
        location = canonicalData.location,
        coords = (canonicalData.coordsX and canonicalData.coordsY) and {
            x = canonicalData.coordsX,
            y = canonicalData.coordsY,
            z = canonicalData.coordsZ,
        } or nil,
        priority = canonicalData.priority,
        organization = canonicalData.organization,
        alarmTime = canonicalData.alarmTime or os.time(),
        extra = canonicalData.extra,
    }

    local targetSource = Users.GetSourceByIdentifier(identifier)

    if targetSource then
        Database.CreateNotification(identifier, alarmId, true)
        TriggerClientEvent('alarm24:receiveAlarm', targetSource, payload)
    elseif Config.OfflineAlarms then
        Database.CreateNotification(identifier, alarmId, false)
    end

    Database.AddAuditLog('EmergencyDispatch', 'alarm_created', {
        identifier = identifier,
        operationId = canonicalData.operationId,
        alarmId = alarmId,
        recipientId = recipientId,
        delivered = targetSource ~= nil,
    })

    return true, { alarmId = alarmId, recipientId = recipientId }
end

-- =========================================================
-- RUECKMELDUNG DER EINSATZKRAFT
-- =========================================================

local VALID_STATUSES = {
    [Alarm24Status.ACCEPTED] = true,
    [Alarm24Status.DECLINED] = true,
    [Alarm24Status.LATER] = true,
    [Alarm24Status.ALREADY_IN_OPERATION] = true,
    [Alarm24Status.UNAVAILABLE] = true,
}

--- Wird ausschliesslich serverseitig nach Validierung des Spielers ausgeloest.
--- Der Client kann NIEMALS behaupten alarmiert worden zu sein - er kann nur auf
--- eine bereits serverseitig existierende Alarmierung (recipientId) reagieren.
function Alarms.HandleResponse(source, recipientId, status)
    if not VALID_STATUSES[status] then
        return false, 'invalid_status'
    end

    local identifier = Users.GetIdentifier(source)
    if not identifier then
        return false, 'no_identifier'
    end

    -- Direkter Lookup ueber die Recipient-ID, danach Eigentuemerpruefung:
    local recipientRow = Database.GetResponseByRecipient(recipientId)
    if not recipientRow then
        return false, 'not_found'
    end

    if recipientRow.identifier ~= identifier then
        -- Sicherheitsregel: Ein Spieler darf ausschliesslich auf SEINE EIGENE
        -- Alarmierung antworten, niemals fuer andere.
        Database.AddAuditLog(identifier, 'response_rejected_ownership_mismatch', {
            recipientId = recipientId,
        })
        return false, 'forbidden'
    end

    Database.UpdateResponse(recipientId, status)
    Database.MarkRecipientSeen(recipientId)
    Database.AddAuditLog(identifier, 'response_recorded', {
        recipientId = recipientId,
        alarmId = recipientRow.alarm_id,
        status = status,
    })

    -- Live-Rueckmeldungen an andere Empfaenger desselben Einsatzes pushen.
    if Config.ShowLiveResponses then
        Alarms.BroadcastLiveSummary(recipientRow.alarm_id)
    end

    -- Rueckmeldung optional an EmergencyDispatch weiterreichen (siehe Integration).
    if EmergencyDispatchAdapter and EmergencyDispatchAdapter.NotifyResponse then
        local alarm = Database.GetAlarmById(recipientRow.alarm_id)
        pcall(EmergencyDispatchAdapter.NotifyResponse, {
            operationId = alarm and alarm.operation_id or nil,
            identifier = identifier,
            status = status,
        })
    end

    return true
end

-- =========================================================
-- LIVE-UEBERSICHT
-- =========================================================

function Alarms.GetLiveSummary(alarmId)
    return Database.GetResponseSummary(alarmId)
end

function Alarms.BroadcastLiveSummary(alarmId)
    local summary = Alarms.GetLiveSummary(alarmId)
    local recipients = Database.GetRecipientsForAlarm(alarmId)

    for _, recipient in ipairs(recipients) do
        local src = Users.GetSourceByIdentifier(recipient.identifier)
        if src then
            TriggerClientEvent('alarm24:liveSummary', src, {
                alarmId = alarmId,
                summary = summary,
            })
        end
    end
end

-- =========================================================
-- HISTORIE / PROFIL
-- =========================================================

function Alarms.GetHistory(identifier)
    return Database.GetHistoryForUser(identifier)
end

function Alarms.GetProfile(identifier)
    local user = Users.FindUserByIdentifier(identifier)
    if not user then return nil end

    local stats = Database.GetUserStats(identifier)

    return {
        name = user.name,
        organization = user.organization,
        availability = user.availability,
        stats = stats,
    }
end

-- =========================================================
-- OFFLINE / VERPASSTE ALARME
-- =========================================================

function Alarms.DeliverMissedAlarms(source)
    if not Config.OfflineAlarms then return end

    local identifier = Users.GetIdentifier(source)
    if not identifier then return end

    local notifications = Database.GetUndeliveredNotifications(identifier)
    if #notifications == 0 then return end

    for _, notif in ipairs(notifications) do
        TriggerClientEvent('alarm24:missedAlarm', source, {
            alarmId = notif.alarm_id,
            keyword = notif.keyword,
            description = notif.description,
            location = notif.location,
            priority = notif.priority,
            organization = notif.organization,
            coords = (notif.coords_x and notif.coords_y) and {
                x = notif.coords_x, y = notif.coords_y, z = notif.coords_z,
            } or nil,
            alarmTime = notif.alarm_time,
        })
        Database.MarkNotificationDelivered(notif.id)
    end
end
