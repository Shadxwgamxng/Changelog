-- =========================================================
-- PHASE 3 / PUNKT 7: NPC-PERSONAS
-- =========================================================
-- Jede Persona definiert Wertebereiche fuer Personality (Punkt 6), einen
-- Sprechstil fuer den System-Prompt der KI (Punkt 25: "kein Roboter-Verhalten")
-- und ein Standard-Stimmprofil (Punkt 14). Beim Erzeugen eines NPCs
-- (server/personality.lua) wird innerhalb dieser Bereiche gewuerfelt, damit
-- selbst zwei NPCs derselben Persona nicht identisch wirken.

Personas = {}

-- traits: { min, max } je Eigenschaft, 0-100
-- speechStyle: wird woertlich in den KI-System-Prompt uebernommen
-- interruptChance: Wahrscheinlichkeit (%) den Officer beim Sprechen zu unterbrechen (Punkt 12)
-- askQuestionChance: Wahrscheinlichkeit (%) selbst eine Gegenfrage zu stellen (Punkt 17)

Personas['friendly_citizen'] = {
    label = 'Freundlicher Bürger',
    traits = {
        cooperation = { 65, 95 }, aggression = { 0, 15 }, honesty = { 60, 90 },
        nervousness = { 5, 30 }, intelligence = { 40, 80 }, criminality = { 0, 10 }, confidence = { 50, 80 },
    },
    speechStyle = 'Spricht höflich, direkt und hilfsbereit. Beantwortet Fragen ohne Umschweife. Wirkt entspannt.',
    interruptChance = 5,
    askQuestionChance = 15,
    voiceProfile = { gender = 'male', age = 'adult', accent = 'american', speed = 1.0, pitch = 0.0 },
}

Personas['nervous_citizen'] = {
    label = 'Nervöser Bürger',
    traits = {
        cooperation = { 50, 80 }, aggression = { 0, 20 }, honesty = { 40, 80 },
        nervousness = { 65, 95 }, intelligence = { 30, 70 }, criminality = { 0, 30 }, confidence = { 10, 35 },
    },
    speechStyle = 'Spricht stockend, unsicher, mit Füllwörtern wie "äh" und "also". Wiederholt sich manchmal. Wirkt schnell eingeschüchtert.',
    interruptChance = 20,
    askQuestionChance = 10,
    voiceProfile = { gender = 'female', age = 'adult', accent = 'american', speed = 1.1, pitch = 0.1 },
}

Personas['drunk_citizen'] = {
    label = 'Betrunkener Bürger',
    traits = {
        cooperation = { 30, 70 }, aggression = { 10, 40 }, honesty = { 50, 90 },
        nervousness = { 20, 50 }, intelligence = { 20, 50 }, criminality = { 0, 20 }, confidence = { 40, 80 },
    },
    speechStyle = 'Spricht undeutlich, lallend, manchmal unzusammenhängend. Versteht Fragen gelegentlich falsch oder antwortet neben dem Thema. Wechselt unvermittelt die Stimmung.',
    interruptChance = 25,
    askQuestionChance = 20,
    voiceProfile = { gender = 'male', age = 'adult', accent = 'american', speed = 0.85, pitch = -0.1 },
}

Personas['aggressive_citizen'] = {
    label = 'Aggressiver Bürger',
    traits = {
        cooperation = { 5, 30 }, aggression = { 65, 95 }, honesty = { 30, 70 },
        nervousness = { 10, 30 }, intelligence = { 30, 70 }, criminality = { 10, 50 }, confidence = { 70, 95 },
    },
    speechStyle = 'Spricht laut, konfrontativ, diskutiert jede Anweisung. Stellt die Autorität des Officers infrage. Kurze, schroffe Sätze.',
    interruptChance = 45,
    askQuestionChance = 30,
    voiceProfile = { gender = 'male', age = 'adult', accent = 'american', speed = 1.15, pitch = -0.05 },
}

Personas['suspicious_person'] = {
    label = 'Verdächtiger',
    traits = {
        cooperation = { 20, 45 }, aggression = { 15, 40 }, honesty = { 15, 45 },
        nervousness = { 40, 70 }, intelligence = { 50, 85 }, criminality = { 30, 70 }, confidence = { 40, 70 },
    },
    speechStyle = 'Weicht Fragen aus, antwortet vage oder mit Gegenfragen. Vermeidet konkrete Details. Wirkt bemüht ruhig zu bleiben.',
    interruptChance = 15,
    askQuestionChance = 35,
    voiceProfile = { gender = 'male', age = 'adult', accent = 'american', speed = 0.95, pitch = 0.0 },
}

Personas['criminal'] = {
    label = 'Krimineller',
    traits = {
        cooperation = { 5, 25 }, aggression = { 30, 70 }, honesty = { 5, 25 },
        nervousness = { 30, 60 }, intelligence = { 55, 90 }, criminality = { 70, 100 }, confidence = { 55, 90 },
    },
    speechStyle = 'Lügt gezielt und selbstsicher, wenn es die eigene Lage verbessert. Streitet Vorwürfe ab. Kann unter Druck Widersprüche liefern.',
    interruptChance = 20,
    askQuestionChance = 20,
    voiceProfile = { gender = 'male', age = 'adult', accent = 'american', speed = 1.0, pitch = -0.1 },
}

Personas['innocent_citizen'] = {
    label = 'Unschuldiger Bürger',
    traits = {
        cooperation = { 70, 95 }, aggression = { 0, 15 }, honesty = { 75, 100 },
        nervousness = { 30, 60 }, intelligence = { 40, 80 }, criminality = { 0, 5 }, confidence = { 40, 70 },
    },
    speechStyle = 'Wirkt überrascht und verwirrt, warum er kontrolliert wird. Fragt nach Gründen. Kooperiert vollständig.',
    interruptChance = 10,
    askQuestionChance = 40,
    voiceProfile = { gender = 'female', age = 'adult', accent = 'american', speed = 1.0, pitch = 0.05 },
}

Personas['elderly_citizen'] = {
    label = 'Älterer Bürger',
    traits = {
        cooperation = { 60, 90 }, aggression = { 0, 20 }, honesty = { 65, 95 },
        nervousness = { 15, 40 }, intelligence = { 45, 85 }, criminality = { 0, 10 }, confidence = { 45, 75 },
    },
    speechStyle = 'Spricht langsam, ausführlich, oft mit kleinen Anekdoten oder Rückfragen zum Verständnis. Formell und respektvoll.',
    interruptChance = 5,
    askQuestionChance = 25,
    voiceProfile = { gender = 'male', age = 'senior', accent = 'american', speed = 0.85, pitch = -0.05 },
}

Personas['teenager'] = {
    label = 'Jugendlicher',
    traits = {
        cooperation = { 30, 70 }, aggression = { 20, 50 }, honesty = { 30, 70 },
        nervousness = { 30, 60 }, intelligence = { 40, 80 }, criminality = { 5, 30 }, confidence = { 40, 80 },
    },
    speechStyle = 'Verwendet lockere, jugendliche Ausdrucksweise, kurze Sätze, wirkt teils gelangweilt oder genervt, teils eingeschüchtert.',
    interruptChance = 25,
    askQuestionChance = 20,
    voiceProfile = { gender = 'male', age = 'young', accent = 'american', speed = 1.1, pitch = 0.1 },
}

-- Liefert eine flache Liste aller Persona-Keys, z.B. fuer Zufallsauswahl beim NPC-Spawn
function Personas.GetRandomKey()
    local keys = {}
    for key in pairs(Personas) do
        if type(Personas[key]) == 'table' then
            keys[#keys + 1] = key
        end
    end
    return keys[math.random(1, #keys)]
end
