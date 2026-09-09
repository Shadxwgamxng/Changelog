Personality = {}

-- =========================================================
-- PHASE 3 / PUNKT 6+7+8: PERSOENLICHKEIT & IDENTITAET
-- =========================================================
-- Erzeugt beim ersten Kontakt mit einem NPC eine vollstaendige, konsistente
-- Identitaet + Persoenlichkeit und persistiert sie (Punkt 9: die KI darf
-- spaeter NIEMALS Daten erfinden, die hier nicht existieren).

local FIRST_NAMES = {
    'Michael', 'James', 'Robert', 'David', 'John', 'Daniel', 'Kevin', 'Anthony',
    'Sarah', 'Jessica', 'Amanda', 'Ashley', 'Karen', 'Linda', 'Maria', 'Laura',
}

local LAST_NAMES = {
    'Anderson', 'Thompson', 'Martinez', 'Clarke', 'Robinson', 'Walker', 'Young',
    'King', 'Wright', 'Scott', 'Turner', 'Phillips', 'Campbell', 'Parker', 'Evans',
}

local OCCUPATIONS = {
    'Mechanic', 'Truck Driver', 'Bartender', 'Office Clerk', 'Construction Worker',
    'Cashier', 'Delivery Driver', 'Student', 'Unemployed', 'Taxi Driver', 'Cook',
}

local STREETS = {
    'Strawberry Ave', 'Vinewood Blvd', 'Innocence Blvd', 'El Rancho Blvd',
    'Los Santos Freeway', 'Alta Street', 'Popular Street', 'Grove Street',
}

local VEHICLE_MODELS = {
    'Albany Emperor', 'Bravado Buffalo', 'Declasse Asea', 'Vapid Stanier',
    'Karin Futo', 'Ubermacht Sentinel', 'Vulcar Ingot', 'Dundreary Regina',
}

local CHARGES = {
    'Ladendiebstahl', 'Ruhestoerung', 'Trunkenheit in der Oeffentlichkeit',
    'Fahren ohne Fuehrerschein', 'Koerperverletzung', 'Hausfriedensbruch',
}

local function RandomFrom(list)
    return list[math.random(1, #list)]
end

local function RandomPlate()
    local letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    local function randLetter() return letters:sub(math.random(1, #letters), math.random(1, #letters)) end
    return ('%02d%s%s%s%03d'):format(math.random(10, 99), randLetter(), randLetter(), randLetter(), math.random(100, 999))
end

local function RandomDob()
    local year = math.random(1955, 2005)
    local month = math.random(1, 12)
    local day = math.random(1, 28)
    return ('%04d-%02d-%02d'):format(year, month, day)
end

-- Wuerfelt Persoenlichkeitswerte innerhalb der fuer die Persona definierten Bandbreiten
function Personality.RollTraits(personaKey)
    local persona = Personas[personaKey] or Personas['friendly_citizen']
    local traits = {}
    for trait, range in pairs(persona.traits) do
        traits[trait] = math.random(range[1], range[2])
    end
    return traits
end

-- Erzeugt eine vollstaendige, plausible Identitaet fuer einen neuen NPC.
-- criminality/honesty beeinflussen, ob ueberhaupt ein Strafregister/Haftbefehl existiert.
function Personality.GenerateIdentity(npcId, personaKeyOverride)
    local personaKey = personaKeyOverride or Personas.GetRandomKey()
    local persona = Personas[personaKey]
    local traits = Personality.RollTraits(personaKey)

    local criminalRecord = {}
    local recordCount = 0
    if traits.criminality >= 70 then
        recordCount = math.random(1, 3)
    elseif traits.criminality >= 40 then
        recordCount = Utils.RollChance(40) and 1 or 0
    end
    for _ = 1, recordCount do
        criminalRecord[#criminalRecord + 1] = {
            charge = RandomFrom(CHARGES),
            date = RandomDob(),
        }
    end

    local hasWarrant = traits.criminality >= 80 and Utils.RollChance(25)

    local voiceProfile = {}
    for k, v in pairs(persona.voiceProfile) do voiceProfile[k] = v end
    -- kleine Streuung, damit nicht alle NPCs derselben Persona identisch klingen
    voiceProfile.speed = Utils.Clamp(voiceProfile.speed + (math.random(-10, 10) / 100), 0.7, 1.3)
    voiceProfile.pitch = Utils.Clamp(voiceProfile.pitch + (math.random(-10, 10) / 100), -1.0, 1.0)

    -- Verborgene Grundwahrheiten, unabhaengig davon was der NPC gleich erzaehlen wird (Punkt 18)
    local secrets = {
        was_at_scene = Utils.RollChance(20),
        owns_suspicious_item = Utils.RollChance(15) and traits.criminality >= 40,
        has_been_drinking = false,
    }
    if personaKey == 'drunk_citizen' then
        secrets.has_been_drinking = true
    end

    return {
        npcId = npcId,
        firstName = RandomFrom(FIRST_NAMES),
        lastName = RandomFrom(LAST_NAMES),
        dob = RandomDob(),
        occupation = RandomFrom(OCCUPATIONS),
        address = ('%d %s'):format(math.random(100, 9999), RandomFrom(STREETS)),
        licenseStatus = Utils.RollChance(85) and 'valid' or (Utils.RollChance(50) and 'suspended' or 'none'),
        vehicleModel = RandomFrom(VEHICLE_MODELS),
        vehiclePlate = RandomPlate(),
        hasWarrant = hasWarrant,
        warrantReason = hasWarrant and RandomFrom(CHARGES) or nil,
        criminalRecord = criminalRecord,
        personaKey = personaKey,
        personality = traits,
        voiceProfile = voiceProfile,
        secrets = secrets,
    }
end

-- Stellt sicher, dass fuer diese npcId ein Datensatz existiert und gibt ihn zurueck.
function Personality.GetOrCreateNPC(npcId, personaKeyOverride)
    local existing = Database.GetNPC(npcId)
    if existing then return existing end

    local generated = Personality.GenerateIdentity(npcId, personaKeyOverride)
    Database.CreateNPC(generated)
    return Database.GetNPC(npcId)
end

-- =========================================================
-- PUNKT 13: EMOTIONEN
-- =========================================================
-- Leitet aus Persoenlichkeit + Gespraechsverlauf eine plausible Emotion ab.
-- Wird an TTS (Stimmfaerbung) und Animation (Gestik) weitergereicht.

local EMOTIONS = {
    'nervoes', 'aengstlich', 'wuetend', 'traurig', 'betrunken',
    'verwirrt', 'aggressiv', 'freundlich', 'erleichtert',
}

function Personality.DeriveEmotion(npcRow, questionCount)
    local p = npcRow.personality or {}
    local persona = npcRow.persona_key or npcRow.personaKey

    if persona == 'drunk_citizen' then return 'betrunken' end

    if (p.aggression or 0) >= 70 then
        return Utils.RollChance(50) and 'wuetend' or 'aggressiv'
    end

    if (p.nervousness or 0) >= 65 then
        -- je laenger das Gespraech (mehr Fragen), desto eher aengstlich statt nur nervoes
        if (questionCount or 0) >= 3 and Utils.RollChance(40) then
            return 'aengstlich'
        end
        return 'nervoes'
    end

    if (p.intelligence or 50) <= 35 and Utils.RollChance(30) then
        return 'verwirrt'
    end

    if (p.cooperation or 50) >= 70 then
        return Utils.RollChance(60) and 'freundlich' or 'erleichtert'
    end

    return RandomFrom(EMOTIONS)
end
