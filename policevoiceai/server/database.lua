Database = {}

-- Alle Zugriffe laufen synchron ueber oxmysql (...Await()), analog zu Alarm24.
-- Es gibt keinen Loop, der die Datenbank periodisch abfragt - Zugriffe erfolgen
-- ausschliesslich als Reaktion auf ein Spieler-/KI-Event.

-- =========================================================
-- NPC CITIZENS (Punkt 8/9/19)
-- =========================================================

local function DecodeNPCRow(row)
    if not row then return nil end
    row.criminal_record = Utils.SafeJsonDecode(row.criminal_record, {})
    row.personality = Utils.SafeJsonDecode(row.personality, {})
    row.voice_profile = Utils.SafeJsonDecode(row.voice_profile, {})
    row.secrets = Utils.SafeJsonDecode(row.secrets, {})
    return row
end

function Database.GetNPC(npcId)
    local rows = MySQL.query.await(
        'SELECT * FROM policevoiceai_npc_citizens WHERE npc_id = ? LIMIT 1',
        { npcId }
    )
    return DecodeNPCRow(rows and rows[1] or nil)
end

function Database.CreateNPC(npc)
    MySQL.insert.await([[
        INSERT INTO policevoiceai_npc_citizens
            (npc_id, first_name, last_name, dob, occupation, address, license_status,
             vehicle_model, vehicle_plate, has_warrant, warrant_reason, criminal_record,
             persona_key, personality, voice_profile, secrets)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE npc_id = npc_id
    ]], {
        npc.npcId,
        npc.firstName,
        npc.lastName,
        npc.dob,
        npc.occupation,
        npc.address,
        npc.licenseStatus or 'valid',
        npc.vehicleModel,
        npc.vehiclePlate,
        npc.hasWarrant and 1 or 0,
        npc.warrantReason,
        Utils.SafeJsonEncode(npc.criminalRecord or {}),
        npc.personaKey,
        Utils.SafeJsonEncode(npc.personality or {}),
        Utils.SafeJsonEncode(npc.voiceProfile or {}),
        Utils.SafeJsonEncode(npc.secrets or {}),
    })
end

function Database.SetWarrant(npcId, hasWarrant, reason)
    MySQL.update.await(
        'UPDATE policevoiceai_npc_citizens SET has_warrant = ?, warrant_reason = ? WHERE npc_id = ?',
        { hasWarrant and 1 or 0, reason, npcId }
    )
end

function Database.GetAllNPCIds()
    local rows = MySQL.query.await('SELECT npc_id, first_name, last_name, persona_key FROM policevoiceai_npc_citizens') or {}
    return rows
end

function Database.DeleteNPC(npcId)
    MySQL.query.await('DELETE FROM policevoiceai_npc_citizens WHERE npc_id = ?', { npcId })
end

function Database.GetNPCByPlate(plate)
    local rows = MySQL.query.await(
        'SELECT * FROM policevoiceai_npc_citizens WHERE vehicle_plate = ? LIMIT 1',
        { plate }
    )
    return DecodeNPCRow(rows and rows[1] or nil)
end

-- =========================================================
-- CONVERSATIONS (Punkt 5/6/21)
-- =========================================================

function Database.CreateConversation(conversationId, npcId, playerIdentifier, situation, situationContext)
    MySQL.insert.await([[
        INSERT INTO policevoiceai_conversations
            (conversation_id, npc_id, player_identifier, situation, situation_context, status)
        VALUES (?, ?, ?, ?, ?, 'active')
    ]], {
        conversationId, npcId, playerIdentifier, situation or 'general',
        Utils.SafeJsonEncode(situationContext or {}),
    })
end

function Database.EndConversation(conversationId)
    MySQL.update.await([[
        UPDATE policevoiceai_conversations SET status = 'ended', ended_at = NOW()
        WHERE conversation_id = ?
    ]], { conversationId })
end

function Database.GetConversationRow(conversationId)
    local rows = MySQL.query.await(
        'SELECT * FROM policevoiceai_conversations WHERE conversation_id = ? LIMIT 1',
        { conversationId }
    )
    local row = rows and rows[1] or nil
    if row then
        row.situation_context = Utils.SafeJsonDecode(row.situation_context, {})
    end
    return row
end

function Database.AddMessage(conversationId, role, message, emotion)
    MySQL.insert.await([[
        INSERT INTO policevoiceai_conversation_messages (conversation_id, role, message, emotion)
        VALUES (?, ?, ?, ?)
    ]], { conversationId, role, message, emotion })
end

function Database.GetConversationMessages(conversationId, limit)
    limit = tonumber(limit) or 50
    local rows = MySQL.query.await([[
        SELECT role, message, emotion, created_at FROM policevoiceai_conversation_messages
        WHERE conversation_id = ? ORDER BY id ASC LIMIT ?
    ]], { conversationId, limit }) or {}
    return rows
end

-- =========================================================
-- AUDIT LOG
-- =========================================================

function Database.AddAuditLog(actor, action, details)
    MySQL.insert.await([[
        INSERT INTO policevoiceai_audit_log (actor, action, details)
        VALUES (?, ?, ?)
    ]], { actor, action, Utils.SafeJsonEncode(details) })
end
