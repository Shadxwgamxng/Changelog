Utils = {}

function Utils.IsEmpty(value)
    return value == nil or value == ''
end

function Utils.Distance(pos1, pos2)
    local dx = pos1.x - pos2.x
    local dy = pos1.y - pos2.y
    local dz = pos1.z - pos2.z
    return math.sqrt(dx * dx + dy * dy + dz * dz)
end

function Utils.Clamp(value, min, max)
    if value < min then return min end
    if value > max then return max end
    return value
end

function Utils.GenerateId(prefix)
    local time = os.time()
    local rand = math.random(10000, 99999)
    return ('%s_%d%d'):format(prefix or 'id', time, rand)
end

-- Kuerzt Text hart auf maxLen Zeichen (Schutz gegen ueberlange Client-Eingaben, Phase 20/28)
function Utils.Truncate(str, maxLen)
    if type(str) ~= 'string' then return '' end
    if #str <= maxLen then return str end
    return str:sub(1, maxLen)
end

-- Einfache Wahrscheinlichkeits-Wuerfelfunktion, chance in Prozent (0-100)
function Utils.RollChance(chancePercent)
    return math.random(1, 100) <= chancePercent
end

function Utils.SafeJsonDecode(str, default)
    if Utils.IsEmpty(str) then return default end
    local ok, result = pcall(json.decode, str)
    if ok and result ~= nil then return result end
    return default
end

function Utils.SafeJsonEncode(value)
    if value == nil then return nil end
    local ok, result = pcall(json.encode, value)
    if ok then return result end
    return nil
end

-- =========================================================
-- HTTP (Server): synchron nutzbarer Wrapper um PerformHttpRequest
-- =========================================================
-- Alle KI/STT/TTS-Provider laufen ausschliesslich serverseitig (Punkt 20).
-- PerformHttpRequest ist normalerweise asynchron (Callback) - dieser Wrapper
-- macht ihn ueber promise/await innerhalb eines Event-/Export-Handlers
-- sequenziell nutzbar, ohne einen Polling-Loop zu benoetigen.
function Utils.HttpAwait(url, method, body, headers, options)
    local p = promise.new()
    PerformHttpRequest(url, function(statusCode, responseBody, responseHeaders)
        p:resolve({
            statusCode = statusCode,
            body = responseBody,
            headers = responseHeaders,
        })
    end, method or 'GET', body or '', headers or {}, options or {})
    return Citizen.Await(p)
end

-- =========================================================
-- BASE64 (reines Lua, ohne externe Abhaengigkeit)
-- =========================================================

local B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function Utils.Base64Encode(data)
    return ((data:gsub('.', function(x)
        local r, b = '', x:byte()
        for i = 8, 1, -1 do r = r .. (b % 2 ^ i - b % 2 ^ (i - 1) > 0 and '1' or '0') end
        return r
    end) .. '0000'):gsub('%d%d%d?%d?%d?%d?', function(x)
        if #x < 6 then return '' end
        local c = 0
        for i = 1, 6 do c = c + (x:sub(i, i) == '1' and 2 ^ (6 - i) or 0) end
        return B64_CHARS:sub(c + 1, c + 1)
    end) .. ({ '', '==', '=' })[#data % 3 + 1])
end

function Utils.Base64Decode(data)
    data = data:gsub('[^' .. B64_CHARS .. '=]', '')
    return (data:gsub('.', function(x)
        if x == '=' then return '' end
        local r, f = '', (B64_CHARS:find(x) - 1)
        for i = 6, 1, -1 do r = r .. (f % 2 ^ i - f % 2 ^ (i - 1) > 0 and '1' or '0') end
        return r
    end):gsub('%d%d%d?%d?%d?%d?%d?%d?', function(x)
        if #x ~= 8 then return '' end
        local c = 0
        for i = 1, 8 do c = c + (x:sub(i, i) == '1' and 2 ^ (8 - i) or 0) end
        return string.char(c)
    end))
end
