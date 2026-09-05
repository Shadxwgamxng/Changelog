Utils = {}

-- =========================================================
-- STATUS KONSTANTEN
-- =========================================================

Alarm24Status = {
    WAITING              = 'WAITING',
    ACCEPTED             = 'ACCEPTED',
    DECLINED             = 'DECLINED',
    LATER                = 'LATER',
    NO_RESPONSE          = 'NO_RESPONSE',
    ALREADY_IN_OPERATION = 'ALREADY_IN_OPERATION',
    UNAVAILABLE          = 'UNAVAILABLE',
}

Alarm24Availability = {
    READY       = 'READY',
    LIMITED     = 'LIMITED',
    UNAVAILABLE = 'UNAVAILABLE',
    REST        = 'REST',
    AWAY        = 'AWAY',
}

-- =========================================================
-- TABLE / STRING HELPERS
-- =========================================================

--- Liest einen (ggf. verschachtelten) Wert aus einer Tabelle.
--- Beispiel: Utils.GetNested(data, "coords.x")
function Utils.GetNested(tbl, path)
    if type(tbl) ~= 'table' or type(path) ~= 'string' then
        return nil
    end

    local current = tbl
    for part in string.gmatch(path, '[^%.]+') do
        if type(current) ~= 'table' then
            return nil
        end
        current = current[part]
    end

    return current
end

function Utils.IsEmpty(value)
    return value == nil or value == '' or value == false
end

function Utils.GenerateId(prefix)
    prefix = prefix or 'A24'
    return string.format('%s-%d-%04d', prefix, os.time(), math.random(0, 9999))
end

function Utils.Trim(s)
    if type(s) ~= 'string' then return s end
    return s:match('^%s*(.-)%s*$')
end

-- =========================================================
-- GEO / DISTANZ
-- =========================================================

function Utils.GetDistance(x1, y1, z1, x2, y2, z2)
    z1 = z1 or 0.0
    z2 = z2 or 0.0
    local dx, dy, dz = x1 - x2, y1 - y2, z1 - z2
    return math.sqrt(dx * dx + dy * dy + dz * dz)
end

function Utils.FormatDistance(meters)
    if not meters then return 'N/A' end
    if meters >= 1000 then
        return string.format('%.1f km', meters / 1000)
    end
    return string.format('%d m', math.floor(meters))
end

-- =========================================================
-- ZEIT
-- =========================================================

function Utils.FormatTimestamp(ts)
    if not ts then return '' end
    return os.date('%d.%m.%Y · %H:%M', ts)
end

function Utils.FormatTime(ts)
    if not ts then return '' end
    return os.date('%H:%M', ts)
end

function Utils.FormatDate(ts)
    if not ts then return '' end
    return os.date('%d.%m.%Y', ts)
end
