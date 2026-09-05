Locales = Locales or {}

Locales['de'] = {
    -- Status
    ['status_waiting']              = 'Keine Antwort',
    ['status_accepted']             = 'Zugesagt',
    ['status_declined']             = 'Abgesagt',
    ['status_later']                = 'Später',
    ['status_no_response']          = 'Keine Antwort',
    ['status_already_in_operation'] = 'Bereits im Einsatz',
    ['status_unavailable']          = 'Nicht verfügbar',

    -- Verfügbarkeit
    ['availability_ready']       = 'Einsatzbereit',
    ['availability_limited']     = 'Eingeschränkt verfügbar',
    ['availability_unavailable'] = 'Nicht verfügbar',
    ['availability_rest']        = 'Ruhezeit',
    ['availability_away']        = 'Abwesend',

    -- Notifications
    ['notify_new_alarm_title']  = 'NEUER EINSATZ',
    ['notify_open_now']         = 'Jetzt reagieren',
    ['notify_missed_alarm']     = 'Du hast eine verpasste Alarmierung.',
    ['notify_response_saved']   = 'Deine Rückmeldung wurde gespeichert.',
    ['notify_not_authorized']   = 'Du bist nicht berechtigt.',
    ['notify_no_permission']    = 'Keine Berechtigung.',

    -- App
    ['app_title']         = 'ALARM24',
    ['app_home']          = 'Start',
    ['app_alarms']        = 'Alarmierungen',
    ['app_operations']    = 'Einsätze',
    ['app_profile']       = 'Profil',
    ['app_settings']      = 'Einstellungen',

    ['btn_accept']  = 'ZUSAGEN',
    ['btn_decline'] = 'ABSAGEN',
    ['btn_later']   = 'SPÄTER',
    ['btn_navigation_start'] = 'NAVIGATION STARTEN',
}

Locale = Locales[Config.Locale] or Locales['de']

function _U(key)
    return Locale[key] or key
end
