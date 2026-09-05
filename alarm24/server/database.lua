Database = {}

-- Alle Datenbankzugriffe laufen ausschliesslich ueber oxmysql und werden
-- synchron per ...Await() genutzt. Da Alarm24 rein eventbasiert arbeitet
-- (siehe integrations/emergencydispatch.lua), gibt es keine Loops die
-- die DB pollen wuerden.

-- =========================================================
-- USERS
-- =========================================================

function Database.GetUserByIdentifier(identifier)
    local rows = MySQL.query.await(
        'SELECT * FROM alarm24_users WHERE identifier = ? LIMIT 1',
        { identifier }
    )
    return rows and rows[1] or nil
end

function Database.UpsertUser(identifier, name, organization, active)
    MySQL.insert.await([[
        INSERT INTO alarm24_users (identifier, name, organization, active)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            organization = VALUES(organization),
            active = VALUES(active)
    ]], { identifier, name or '', organization or '', active and 1 or 0 })
end

function Database.SetUserAvailability(identifier, availability)
    MySQL.update.await(
        'UPDATE alarm24_users SET availability = ? WHERE identifier = ?',
        { availability, identifier }
    )
end

function Database.GetAllUsers()
    return MySQL.query.await('SELECT * FROM alarm24_users ORDER BY name ASC') or {}
end

function Database.DeleteUser(identifier)
    MySQL.query.await('DELETE FROM alarm24_users WHERE identifier = ?', { identifier })
end

-- =========================================================
-- ALARMS
-- =========================================================

function Database.GetAlarmByOperationId(operationId)
    local rows = MySQL.query.await(
        'SELECT * FROM alarm24_alarms WHERE operation_id = ? LIMIT 1',
        { operationId }
    )
    return rows and rows[1] or nil
end

function Database.CreateAlarm(data)
    local alarmId = MySQL.insert.await([[
        INSERT INTO alarm24_alarms
            (operation_id, keyword, description, location, coords_x, coords_y, coords_z,
             priority, organization, extra, alarm_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ]], {
        data.operationId,
        data.keyword or '',
        data.description,
        data.location,
        data.coordsX,
        data.coordsY,
        data.coordsZ,
        data.priority,
        data.organization,
        data.extra and json.encode(data.extra) or nil,
        data.alarmTime and os.date('%Y-%m-%d %H:%M:%S', data.alarmTime) or os.date('%Y-%m-%d %H:%M:%S'),
    })
    return alarmId
end

function Database.GetAlarmById(alarmId)
    local rows = MySQL.query.await('SELECT * FROM alarm24_alarms WHERE id = ? LIMIT 1', { alarmId })
    return rows and rows[1] or nil
end

-- =========================================================
-- RECIPIENTS / DEDUPLIZIERUNG
-- =========================================================

function Database.DedupeKeyExists(dedupeKey)
    local rows = MySQL.query.await(
        'SELECT id FROM alarm24_alarm_recipients WHERE dedupe_key = ? LIMIT 1',
        { dedupeKey }
    )
    return rows and rows[1] ~= nil
end

function Database.CreateRecipient(alarmId, identifier, userId, dedupeKey)
    local ok, recipientId = pcall(function()
        return MySQL.insert.await([[
            INSERT INTO alarm24_alarm_recipients (alarm_id, identifier, user_id, dedupe_key)
            VALUES (?, ?, ?, ?)
        ]], { alarmId, identifier, userId, dedupeKey })
    end)

    if not ok then
        -- Unique-Key-Verletzung -> Duplikat, kein neuer Alarm
        return nil
    end

    return recipientId
end

function Database.GetRecipientsForAlarm(alarmId)
    return MySQL.query.await(
        'SELECT * FROM alarm24_alarm_recipients WHERE alarm_id = ?',
        { alarmId }
    ) or {}
end

function Database.GetRecipientForUser(alarmId, identifier)
    local rows = MySQL.query.await(
        'SELECT * FROM alarm24_alarm_recipients WHERE alarm_id = ? AND identifier = ? LIMIT 1',
        { alarmId, identifier }
    )
    return rows and rows[1] or nil
end

function Database.MarkRecipientSeen(recipientId)
    MySQL.update.await('UPDATE alarm24_alarm_recipients SET seen = 1 WHERE id = ?', { recipientId })
end

-- =========================================================
-- RESPONSES
-- =========================================================

function Database.CreateResponse(recipientId, alarmId, identifier)
    return MySQL.insert.await([[
        INSERT INTO alarm24_alarm_responses (recipient_id, alarm_id, identifier, status)
        VALUES (?, ?, ?, ?)
    ]], { recipientId, alarmId, identifier, Alarm24Status.NO_RESPONSE })
end

function Database.UpdateResponse(recipientId, status)
    MySQL.update.await([[
        UPDATE alarm24_alarm_responses
        SET status = ?, responded_at = NOW()
        WHERE recipient_id = ?
    ]], { status, recipientId })
end

function Database.GetResponseByRecipient(recipientId)
    local rows = MySQL.query.await(
        'SELECT * FROM alarm24_alarm_responses WHERE recipient_id = ? LIMIT 1',
        { recipientId }
    )
    return rows and rows[1] or nil
end

function Database.GetResponsesForAlarm(alarmId)
    return MySQL.query.await(
        'SELECT * FROM alarm24_alarm_responses WHERE alarm_id = ?',
        { alarmId }
    ) or {}
end

function Database.GetResponseSummary(alarmId)
    local rows = MySQL.query.await([[
        SELECT status, COUNT(*) as amount
        FROM alarm24_alarm_responses
        WHERE alarm_id = ?
        GROUP BY status
    ]], { alarmId }) or {}

    local summary = {
        ACCEPTED = 0,
        DECLINED = 0,
        LATER = 0,
        NO_RESPONSE = 0,
        ALREADY_IN_OPERATION = 0,
        UNAVAILABLE = 0,
    }

    for _, row in ipairs(rows) do
        summary[row.status] = row.amount
    end

    return summary
end

-- =========================================================
-- NOTIFICATIONS (fuer Offline-User / verpasste Alarme)
-- =========================================================

function Database.CreateNotification(identifier, alarmId, delivered)
    return MySQL.insert.await([[
        INSERT INTO alarm24_notifications (identifier, alarm_id, delivered, delivered_at)
        VALUES (?, ?, ?, ?)
    ]], {
        identifier, alarmId, delivered and 1 or 0,
        delivered and os.date('%Y-%m-%d %H:%M:%S') or nil,
    })
end

function Database.GetUndeliveredNotifications(identifier)
    return MySQL.query.await([[
        SELECT n.*, a.keyword, a.description, a.location, a.priority, a.alarm_time,
               a.coords_x, a.coords_y, a.coords_z, a.organization
        FROM alarm24_notifications n
        INNER JOIN alarm24_alarms a ON a.id = n.alarm_id
        WHERE n.identifier = ? AND n.delivered = 0
        AND n.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        ORDER BY n.created_at ASC
    ]], { identifier, Config.MissedAlarmRetentionDays or 7 }) or {}
end

function Database.MarkNotificationDelivered(notificationId)
    MySQL.update.await([[
        UPDATE alarm24_notifications SET delivered = 1, delivered_at = NOW() WHERE id = ?
    ]], { notificationId })
end

-- =========================================================
-- SETTINGS
-- =========================================================

function Database.GetSetting(identifier, key)
    local rows = MySQL.query.await(
        'SELECT setting_value FROM alarm24_settings WHERE identifier = ? AND setting_key = ? LIMIT 1',
        { identifier, key }
    )
    return rows and rows[1] and rows[1].setting_value or nil
end

function Database.SetSetting(identifier, key, value)
    MySQL.insert.await([[
        INSERT INTO alarm24_settings (identifier, setting_key, setting_value)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    ]], { identifier, key, value })
end

-- =========================================================
-- HISTORIE
-- =========================================================

function Database.GetHistoryForUser(identifier, limit)
    limit = tonumber(limit) or 50
    return MySQL.query.await([[
        SELECT a.id as alarm_id, a.operation_id, a.keyword, a.description, a.location,
               a.priority, a.organization, a.alarm_time,
               r.id as recipient_id, resp.status, resp.responded_at
        FROM alarm24_alarm_recipients r
        INNER JOIN alarm24_alarms a ON a.id = r.alarm_id
        LEFT JOIN alarm24_alarm_responses resp ON resp.recipient_id = r.id
        WHERE r.identifier = ?
        ORDER BY a.alarm_time DESC
        LIMIT ?
    ]], { identifier, limit }) or {}
end

function Database.GetUserStats(identifier)
    local rows = MySQL.query.await([[
        SELECT resp.status, COUNT(*) as amount
        FROM alarm24_alarm_recipients r
        LEFT JOIN alarm24_alarm_responses resp ON resp.recipient_id = r.id
        WHERE r.identifier = ?
        GROUP BY resp.status
    ]], { identifier }) or {}

    local stats = { total = 0, ACCEPTED = 0, DECLINED = 0, LATER = 0, NO_RESPONSE = 0 }
    for _, row in ipairs(rows) do
        local status = row.status or 'NO_RESPONSE'
        stats[status] = (stats[status] or 0) + row.amount
        stats.total = stats.total + row.amount
    end

    return stats
end

-- =========================================================
-- AUDIT LOG
-- =========================================================

function Database.AddAuditLog(actor, action, details)
    MySQL.insert.await([[
        INSERT INTO alarm24_audit_logs (actor, action, details)
        VALUES (?, ?, ?)
    ]], { actor, action, details and (type(details) == 'table' and json.encode(details) or tostring(details)) or nil })
end

function Database.GetAuditLogs(limit)
    limit = tonumber(limit) or 100
    return MySQL.query.await(
        'SELECT * FROM alarm24_audit_logs ORDER BY created_at DESC LIMIT ?',
        { limit }
    ) or {}
end
