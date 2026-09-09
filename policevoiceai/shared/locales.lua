Locales = Locales or {}

Locales['de'] = {
    listening = 'Zuhören...',
    speaking_to = 'SPRICHT MIT',
    npc_speaking = 'spricht...',
    out_of_range = 'Der NPC hört Sie nicht (zu weit entfernt).',
    already_in_conversation = 'Dieser NPC spricht bereits mit jemand anderem.',
    conversation_started = 'Gespräch gestartet.',
    conversation_ended = 'Gespräch beendet.',
    ai_unavailable = '[Voice-AI nicht erreichbar - Standarddialog aktiv]',
    no_target = 'Kein Bürger in Reichweite zum Ansprechen gefunden.',
    press_to_talk = 'Halten zum Sprechen',
    recording_too_long = 'Aufnahme zu lang, bitte kürzer sprechen.',
}

function Locale(key, ...)
    local lang = Locales[Config.Locale] or Locales['de']
    local str = lang[key] or key
    if select('#', ...) > 0 then
        return string.format(str, ...)
    end
    return str
end
