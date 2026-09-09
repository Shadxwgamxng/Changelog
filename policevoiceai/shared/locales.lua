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
    speech_not_recognized = '🎙 Sprache konnte nicht erkannt werden.',

    -- Punkt 49/71: 3D-Indikator ueber dem NPC-Kopf
    indicator_approaching = '🚶 kommt her...',
    indicator_ready = '💬 bereit',
    indicator_listening = '🎙 Zuhören...',
    indicator_processing = '⏳ Verarbeiten...',
    indicator_speaking = '🔊 Spricht...',
    indicator_escalating = '⚠ wird ungeduldig...',

    -- Punkt 74: Dialogmenu-Fallback
    dialog_menu_title = 'Fragen an',
    dialog_menu_close = 'Schließen (ESC)',
}

function Locale(key, ...)
    local lang = Locales[Config.Locale] or Locales['de']
    local str = lang[key] or key
    if select('#', ...) > 0 then
        return string.format(str, ...)
    end
    return str
end
