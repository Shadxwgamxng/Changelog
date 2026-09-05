Config = {}

-- =========================================================
-- ALLGEMEIN
-- =========================================================

-- "auto" versucht ESX / QBCore automatisch zu erkennen, sonst "standalone"
Config.Framework = 'auto'

Config.Locale = 'de'

Config.Debug = false

-- =========================================================
-- APP / NUI
-- =========================================================

-- Taste zum Oeffnen/Schliessen der Alarm24-App (siehe client/main.lua fuer Keybind-Registrierung)
Config.OpenKeyMapping = 'F6'

-- Command zum Oeffnen der App
Config.OpenCommand = 'alarm24'

-- =========================================================
-- EMERGENCYDISPATCH INTEGRATION
-- =========================================================
--
-- WICHTIG: Alarm24 trifft NIEMALS eine eigene Alarmierungsentscheidung.
-- Alarm24 wartet ausschliesslich auf ein Signal der EmergencyDispatch-Leitstelle,
-- dass eine KONKRETE Person alarmiert wurde.
--
-- Die folgenden Werte sind bewusst konfigurierbar/austauschbar, da die exakten
-- Event-/Export-/Callback-Namen von der tatsaechlich eingesetzten
-- EmergencyDispatch-Version abhaengen. Siehe integrations/emergencydispatch.lua
-- fuer die vollstaendige Erklaerung und die Stellen, die angepasst werden muessen.

Config.EmergencyDispatch = {
    enabled = true,

    -- Name der Resource, wie sie im Server-Manifest/Resourcen-Ordner heisst.
    -- Wird u.a. genutzt, um zu pruefen ob die Resource ueberhaupt laeuft.
    resourceName = 'EmergencyDispatch',

    -- ---------------------------------------------------------------
    -- EINGEHENDE ALARMIERUNG (EmergencyDispatch -> Alarm24)
    -- ---------------------------------------------------------------
    -- Alarm24 unterstuetzt zwei Wege, wie EmergencyDispatch eine Alarmierung
    -- an Alarm24 melden kann. Beide sind optional und koennen unabhaengig
    -- voneinander aktiviert werden. NUR aktivieren, wenn die entsprechende
    -- Schnittstelle in der real eingesetzten EmergencyDispatch-Version
    -- tatsaechlich existiert.

    incoming = {
        -- Variante A: EmergencyDispatch feuert ein Server-Event, sobald die
        -- Leitstelle eine Person alarmiert hat.
        -- PLATZHALTER-NAME: unbedingt an die reale EmergencyDispatch-Version anpassen!
        useEvent = true,
        eventName = 'EmergencyDispatch:volunteerAlarmed',

        -- Variante B: Alarm24 registriert einen Export, den EmergencyDispatch
        -- direkt aufrufen kann (z.B. exports['alarm24']:OnEmergencyDispatchAlarm(data)).
        -- Das ist der robusteste Weg, falls EmergencyDispatch sowas anbietet
        -- oder falls man die Integration serverseitig direkt verdrahten will.
        useExport = true,
    },

    -- Falls EmergencyDispatch mehrere alarmierte Personen in EINEM Payload
    -- buendelt (z.B. data.persons = { {identifier=...}, {identifier=...} }),
    -- hier den Feldnamen dieser Liste eintragen. Jeder Eintrag wird als
    -- eigene, unabhaengige Alarmierung verarbeitet. Leer lassen (nil), wenn
    -- jedes Event/jeder Export-Aufruf bereits genau eine Person beschreibt.
    recipientsListField = nil,

    -- ---------------------------------------------------------------
    -- DATENMAPPING
    -- ---------------------------------------------------------------
    -- EmergencyDispatch liefert ein Datenpaket in einer bestimmten Struktur.
    -- Da diese Struktur je nach Version unterschiedlich sein kann, wird sie
    -- hier NICHT hart im Code verdrahtet, sondern ueber Feldnamen gemappt.
    -- Passe die rechten Werte (Feldnamen bei EmergencyDispatch) an eure
    -- tatsaechliche Version an. Verschachtelte Felder koennen mit "." getrennt
    -- werden, z.B. "coords.x".
    fieldMapping = {
        operationId   = 'operationId',
        identifier    = 'identifier',
        playerSource  = 'source',
        keyword       = 'keyword',
        description   = 'description',
        location      = 'location',
        coordsX       = 'coords.x',
        coordsY       = 'coords.y',
        coordsZ       = 'coords.z',
        priority      = 'priority',
        alarmTime     = 'timestamp',
        organization  = 'organization',
        extra         = 'extra',
    },

    -- ---------------------------------------------------------------
    -- RUECKMELDUNG (Alarm24 -> EmergencyDispatch)
    -- ---------------------------------------------------------------
    -- Nur aktivieren, wenn EmergencyDispatch tatsaechlich eine Schnittstelle
    -- fuer eingehende Rueckmeldungen bereitstellt. Ist dies nicht der Fall,
    -- bleibt die Rueckmeldung ausschliesslich in Alarm24 gespeichert.
    outgoing = {
        enabled = false,

        -- Export, den EmergencyDispatch bereitstellen muesste, um Antworten
        -- entgegenzunehmen. Wird nur mit pcall aufgerufen; existiert der Export
        -- nicht, passiert einfach nichts (kein Fehler, kein Absturz).
        exportName = 'OnAlarm24Response',

        -- Alternativ: Event-Variante, falls EmergencyDispatch stattdessen
        -- ein Event zum Empfang von Rueckmeldungen anbietet.
        useEvent = false,
        eventName = 'EmergencyDispatch:volunteerResponse',
    },
}

-- =========================================================
-- ALARMTON / BENACHRICHTIGUNG
-- =========================================================

Config.AlarmSound = {
    enabled = true,
    volume = 0.8,
    file = 'sounds/alarm.mp3',
    loop = false,
    vibration = true, -- rein visuelle Simulation im NUI (kein echtes Controller-Rumble noetig)
}

-- =========================================================
-- NAVIGATION
-- =========================================================

Config.Navigation = true

-- =========================================================
-- OFFLINE / VERPASSTE ALARME
-- =========================================================

Config.OfflineAlarms = true

-- Wie viele Tage ein verpasster Alarm als "ungesehen" markiert bleibt/angezeigt wird
Config.MissedAlarmRetentionDays = 7

-- =========================================================
-- DOPPELTE ALARME
-- =========================================================

-- Zeitfenster (Sekunden), in dem eine identische Kombination aus
-- operationId + identifier als Duplikat erkannt und verworfen wird.
Config.DuplicateProtectionWindow = 300

-- =========================================================
-- BERECHTIGUNGEN
-- =========================================================

Config.Permissions = {
    -- ACE-Permission-String fuer den Adminbereich
    adminAce = 'alarm24.admin',
}

-- =========================================================
-- LIVE-RUECKMELDUNGEN
-- =========================================================

-- Wenn true, sehen alarmierte Empfaenger eine aggregierte Uebersicht
-- (zugesagt/abgesagt/spaeter/keine Antwort) der ANDEREN Empfaenger desselben Alarms.
Config.ShowLiveResponses = true
