-- =========================================================
-- PUNKT 76: CONVERSATION STATE MACHINE
-- =========================================================
-- Gemeinsame Zustands-Definition fuer Client (Indikator/Debug/Animation) und
-- Server (autoritative Zustandsverwaltung, siehe server/npc_manager.lua).
-- Klar definierte Zustaende + erzwungene Timeouts (server/npc_manager.lua)
-- verhindern die in Punkt 47/75 beschriebenen haengenden NPCs ("reagiert nicht",
-- "Listening bleibt haengen").

NPC_STATES = {
    IDLE = 1,
    APPROACHING = 2,
    WAITING_FOR_PLAYER = 3,
    LISTENING = 4,
    PROCESSING = 5,
    RESPONDING = 6,
    ESCALATING = 7,
    FLEEING = 8,
    LEAVING = 9,
}

NPC_STATE_NAMES = {}
for name, id in pairs(NPC_STATES) do
    NPC_STATE_NAMES[id] = name
end

-- Kurzlabel fuer die 3D-Indikator-Anzeige (Punkt 49/71), pro Locale in
-- shared/locales.lua ueberschreibbar.
NPC_STATE_INDICATOR_KEY = {
    [NPC_STATES.APPROACHING] = 'indicator_approaching',
    [NPC_STATES.WAITING_FOR_PLAYER] = 'indicator_ready',
    [NPC_STATES.LISTENING] = 'indicator_listening',
    [NPC_STATES.PROCESSING] = 'indicator_processing',
    [NPC_STATES.RESPONDING] = 'indicator_speaking',
    [NPC_STATES.ESCALATING] = 'indicator_escalating',
}
