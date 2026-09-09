Fallback = {}

-- =========================================================
-- PHASE 27: FALLBACK-SYSTEM
-- =========================================================
-- Greift, wenn ein konfigurierter ECHTER Provider (STT/AI/TTS) zur Laufzeit
-- fehlschlaegt (z.B. API down, Timeout, kein Guthaben). Das Gespraech bricht
-- dadurch nicht ab, sondern faellt auf einen einfachen Standarddialog zurueck.
-- (Config.AI.provider = 'mock' nutzt ohnehin permanent denselben Mechanismus,
-- siehe server/ai_provider.lua AIProvider.GenerateMock.)

function Fallback.SttFailureReply()
    return { text = 'Wie bitte? Das habe ich nicht verstanden.', emotion = 'verwirrt' }
end

function Fallback.AiFailureReply(context)
    local ok, result = pcall(AIProvider.GenerateMock, context)
    if ok and result then return result end
    return { text = 'Entschuldigung, koennen Sie das nochmal sagen?', emotion = 'verwirrt' }
end
