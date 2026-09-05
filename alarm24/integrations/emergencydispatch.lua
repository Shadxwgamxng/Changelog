-- =========================================================
-- ALARM24 <-> EMERGENCYDISPATCH INTEGRATION
-- =========================================================
--
-- LIES DIESEN KOMMENTARBLOCK VOLLSTAENDIG, BEVOR DU ETWAS AENDERST.
--
-- Alarm24 trifft NIEMALS selbst eine Alarmierungsentscheidung. Diese Datei
-- ist die EINZIGE Stelle, an der Alarm24 mit der EmergencyDispatch-Leitstelle
-- kommuniziert. Sie hat genau eine Aufgabe:
--
--   Wenn EmergencyDispatch meldet "Person X wurde alarmiert",
--   dann (und wirklich NUR dann) wird Person X ueber Alarm24 alarmiert.
--
-- Es gibt hier KEINE Logik wie "Einsatzstichwort -> Organisation alarmieren".
--
-- ---------------------------------------------------------------
-- ANPASSUNG AN DIE REALE EMERGENCYDISPATCH-VERSION
-- ---------------------------------------------------------------
-- Die konkreten Event-/Export-Namen und die Feldstruktur unterscheiden sich
-- je nach eingesetzter EmergencyDispatch-Version. Nichts davon wurde hier
-- "erfunden" - die Platzhalter in config.lua (Config.EmergencyDispatch)
-- muessen von euch anhand der Dokumentation/des Codes eurer tatsaechlichen
-- EmergencyDispatch-Installation ausgefuellt werden:
--
--   1. Config.EmergencyDispatch.incoming.eventName
--      -> Name des Events, das EmergencyDispatch feuert, sobald die
--         Leitstelle eine Person alarmiert hat.
--
--   2. Config.EmergencyDispatch.fieldMapping
--      -> Ordnet die von EmergencyDispatch gelieferten Feldnamen den von
--         Alarm24 intern genutzten kanonischen Feldern zu.
--
--   3. Config.EmergencyDispatch.recipientsListField (optional)
--      -> Falls EmergencyDispatch mehrere alarmierte Personen in EINEM
--         Payload buendelt (z.B. data.persons = {...}), hier den Feldnamen
--         dieser Liste eintragen. Jeder Listeneintrag wird dann als eigene,
--         individuelle Alarmierung verarbeitet (siehe Punkt 5 der Spezifikation).
--         Bleibt der Wert leer/nil, wird davon ausgegangen, dass jedes Event
--         bereits genau eine Person beschreibt.
--
--   4. Config.EmergencyDispatch.outgoing
--      -> NUR aktivieren, wenn EmergencyDispatch tatsaechlich eine
--         Schnittstelle fuer eingehende Rueckmeldungen anbietet. Ist das
--         nicht der Fall, bleibt outgoing.enabled = false und Rueckmeldungen
--         werden ausschliesslich in Alarm24 gespeichert (Punkt 10).
--
-- Falls die reale EmergencyDispatch-Version stattdessen ausschliesslich
-- Exports anbietet, kann EmergencyDispatch (oder ein Vermittler-Skript)
-- direkt den von Alarm24 bereitgestellten Export aufrufen:
--
--   exports['alarm24']:OnEmergencyDispatchAlarm(data)
--
-- Dieser Weg ist unabhaengig vom Eventnamen und daher der robusteste,
-- falls EmergencyDispatch keine passenden Events feuert.

EmergencyDispatchAdapter = {}

-- =========================================================
-- NORMALISIERUNG (Feldmapping anwenden)
-- =========================================================

local function ExtractField(data, mappingKey)
    local path = Config.EmergencyDispatch.fieldMapping[mappingKey]
    if Utils.IsEmpty(path) then return nil end
    return Utils.GetNested(data, path)
end

--- Wandelt ein rohes EmergencyDispatch-Datenpaket (unbekannte Feldnamen) in
--- die kanonische Alarm24-Struktur um, basierend auf Config.EmergencyDispatch.fieldMapping.
function EmergencyDispatchAdapter.NormalizeEntry(data)
    return {
        operationId  = ExtractField(data, 'operationId'),
        identifier   = ExtractField(data, 'identifier'),
        playerSource = ExtractField(data, 'playerSource'),
        keyword      = ExtractField(data, 'keyword') or '',
        description  = ExtractField(data, 'description'),
        location     = ExtractField(data, 'location'),
        coordsX      = tonumber(ExtractField(data, 'coordsX')),
        coordsY      = tonumber(ExtractField(data, 'coordsY')),
        coordsZ      = tonumber(ExtractField(data, 'coordsZ')),
        priority     = ExtractField(data, 'priority'),
        alarmTime    = tonumber(ExtractField(data, 'alarmTime')) or os.time(),
        organization = ExtractField(data, 'organization'),
        extra        = ExtractField(data, 'extra'),
    }
end

-- =========================================================
-- EINGEHEND: EMERGENCYDISPATCH ALARMIERT EINE ODER MEHRERE PERSONEN
-- =========================================================
--
-- Beispielaufruf, wie ihn EmergencyDispatch (oder ein Vermittler) ausloesen
-- wuerde, sobald die Leitstelle eine konkrete Person alarmiert:
--
--   TriggerEvent(Config.EmergencyDispatch.incoming.eventName, {
--       operationId = "ED-12345",
--       identifier  = "license:xxxxxxxx",
--       keyword     = "Wohnungsbrand",
--       ...
--   })
--
-- oder direkt:
--
--   exports['alarm24']:OnEmergencyDispatchAlarm({ ... })
--
function EmergencyDispatchAdapter.OnVolunteerAlarm(rawData)
    if not Config.EmergencyDispatch.enabled then
        return
    end

    if type(rawData) ~= 'table' then
        if Config.Debug then
            print('[alarm24] EmergencyDispatch-Payload ist keine Tabelle - ignoriert.')
        end
        return
    end

    local listField = Config.EmergencyDispatch.recipientsListField

    -- Fall A: EmergencyDispatch meldet mehrere alarmierte Personen in einem
    -- einzigen Payload -> jede Person bekommt ihre eigene, unabhaengige
    -- Alarmierung (Punkt 5 der Spezifikation). Antworten werden nicht vermischt,
    -- da jede Person ueber ihren eigenen recipientId/Response-Datensatz verfuegt.
    if not Utils.IsEmpty(listField) and type(rawData[listField]) == 'table' then
        for _, personEntry in ipairs(rawData[listField]) do
            local merged = {}
            for k, v in pairs(rawData) do merged[k] = v end
            for k, v in pairs(personEntry) do merged[k] = v end

            local canonical = EmergencyDispatchAdapter.NormalizeEntry(merged)
            Alarms.CreateAlarmForRecipient(canonical)
        end
        return
    end

    -- Fall B: Ein Event/Aufruf = genau eine alarmierte Person.
    local canonical = EmergencyDispatchAdapter.NormalizeEntry(rawData)
    Alarms.CreateAlarmForRecipient(canonical)
end

-- Registrierung des Event-Listeners (Variante A aus Config.EmergencyDispatch.incoming)
CreateThread(function()
    if not Config.EmergencyDispatch.enabled then return end

    if Config.EmergencyDispatch.incoming.useEvent and not Utils.IsEmpty(Config.EmergencyDispatch.incoming.eventName) then
        AddEventHandler(Config.EmergencyDispatch.incoming.eventName, function(data)
            EmergencyDispatchAdapter.OnVolunteerAlarm(data)
        end)

        if Config.Debug then
            print(('[alarm24] Warte auf EmergencyDispatch-Event "%s"'):format(Config.EmergencyDispatch.incoming.eventName))
        end
    end
end)

-- Registrierung des Exports (Variante B aus Config.EmergencyDispatch.incoming)
if Config.EmergencyDispatch.incoming.useExport then
    exports('OnEmergencyDispatchAlarm', function(data)
        EmergencyDispatchAdapter.OnVolunteerAlarm(data)
    end)
end

-- Komfort-Funktion, falls EmergencyDispatch (oder ein Vermittler-Skript) lieber
-- eine direkte Lua-Funktion statt Events/Exports aufrufen moechte, z.B. wenn
-- beide Resourcen im selben Serverprozess laufen und man sie manuell verdrahtet.
-- Entspricht funktional exakt EmergencyDispatchAdapter.OnVolunteerAlarm.
function AlarmUser(data)
    EmergencyDispatchAdapter.OnVolunteerAlarm(data)
end

-- =========================================================
-- AUSGEHEND: RUECKMELDUNG AN EMERGENCYDISPATCH (falls unterstuetzt)
-- =========================================================
--
-- Wird von server/alarms.lua (Alarms.HandleResponse) aufgerufen, nachdem eine
-- Einsatzkraft in Alarm24 geantwortet hat. Sendet die Rueckmeldung NUR dann an
-- EmergencyDispatch weiter, wenn Config.EmergencyDispatch.outgoing.enabled = true
-- UND die konfigurierte Schnittstelle tatsaechlich existiert. Schlaegt der
-- Aufruf fehl (Export/Event existiert nicht), wird dies abgefangen und die
-- Rueckmeldung bleibt trotzdem lokal in Alarm24 gespeichert.
function EmergencyDispatchAdapter.NotifyResponse(payload)
    local outgoing = Config.EmergencyDispatch.outgoing
    if not outgoing or not outgoing.enabled then
        return
    end

    if not Utils.IsEmpty(outgoing.exportName) then
        local resourceName = Config.EmergencyDispatch.resourceName
        if GetResourceState(resourceName) == 'started' then
            local ok, err = pcall(function()
                exports[resourceName][outgoing.exportName](exports[resourceName], payload)
            end)

            if not ok and Config.Debug then
                print(('[alarm24] Konnte Rueckmeldung nicht an EmergencyDispatch-Export "%s" senden: %s'):format(outgoing.exportName, tostring(err)))
            end
        elseif Config.Debug then
            print(('[alarm24] EmergencyDispatch-Resource "%s" laeuft nicht - Rueckmeldung bleibt lokal.'):format(resourceName))
        end
    end

    if outgoing.useEvent and not Utils.IsEmpty(outgoing.eventName) then
        local ok, err = pcall(TriggerEvent, outgoing.eventName, payload)
        if not ok and Config.Debug then
            print(('[alarm24] Konnte Rueckmeldung nicht ueber Event "%s" senden: %s'):format(outgoing.eventName, tostring(err)))
        end
    end
end
