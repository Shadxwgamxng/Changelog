MDT = {}

-- =========================================================
-- PHASE 13/30: MDT-INTEGRATION
-- =========================================================
-- Sobald sich ein NPC waehrend eines Gespraechs identifiziert (z.B. "Wie
-- heissen Sie?"), kennt der Server bereits die vollstaendige, echte Identitaet
-- (Punkt 9: die KI kennt/erfindet niemals mehr als das). Diese Exports geben
-- FivePDs MDT-Ressource (oder einer eigenen NUI) genau das, was ein Officer in
-- der Datenbank nachschlagen wuerde - inklusive Daten, ueber die der NPC im
-- Gespraech ggf. gelogen hat (Punkt 18: Luegen im Gespraech aendern nie die
-- tatsaechlichen Datenbank-Fakten).
--
-- WICHTIG: Das interne `secrets`-Feld (z.B. ob heute Alkohol getrunken wurde)
-- ist KEIN Datenbank-/Akten-Feld und wird hier bewusst NICHT ausgegeben - solche
-- Dinge muss der Officer weiterhin ingame verifizieren (Atemalkoholtest, Durchsuchung).

local function ToMdtRecord(npcRow)
    if not npcRow then return nil end
    return {
        npcId = npcRow.npc_id,
        firstName = npcRow.first_name,
        lastName = npcRow.last_name,
        dob = npcRow.dob,
        occupation = npcRow.occupation,
        address = npcRow.address,
        licenseStatus = npcRow.license_status,
        vehicleModel = npcRow.vehicle_model,
        vehiclePlate = npcRow.vehicle_plate,
        hasWarrant = npcRow.has_warrant == 1,
        warrantReason = npcRow.warrant_reason,
        criminalRecord = npcRow.criminal_record,
    }
end

function MDT.GetCitizenRecordByNpcId(npcId)
    return ToMdtRecord(Database.GetNPC(npcId))
end

function MDT.GetCitizenRecordByConversationId(conversationId)
    local state = ConversationManager.GetState(conversationId)
    local npcId = state and state.npcId
    if not npcId then
        local row = Database.GetConversationRow(conversationId)
        npcId = row and row.npc_id
    end
    if not npcId then return nil end
    return ToMdtRecord(Database.GetNPC(npcId))
end

function MDT.GetCitizenRecordByPlate(plate)
    return ToMdtRecord(Database.GetNPCByPlate(plate))
end

-- Wird z.B. von FivePDs Warrant-System aufgerufen, wenn ein Officer einen
-- Haftbefehl gegen einen per Voice-AI erzeugten NPC ausstellt (Phase 16).
function MDT.SetWarrant(npcId, hasWarrant, reason)
    Database.SetWarrant(npcId, hasWarrant, reason)
    Database.AddAuditLog('mdt', 'set_warrant', { npcId = npcId, hasWarrant = hasWarrant, reason = reason })
    return true
end

exports('GetCitizenRecordByNpcId', MDT.GetCitizenRecordByNpcId)
exports('GetCitizenRecordByConversationId', MDT.GetCitizenRecordByConversationId)
exports('GetCitizenRecordByPlate', MDT.GetCitizenRecordByPlate)
exports('SetWarrant', MDT.SetWarrant)
