-- Offset Finder (/offset): roter Marker relativ zum Fahrzeug, mit der Tastatur verschiebbar. Ergebnis: lokaler Fahrzeug-Offset als Config-Zeile.
-- Achsen (lokaler Fahrzeugraum): X = rechts(+)/links(-), Y = vorne(+)/hinten(-), Z = oben(+)/unten(-).
CBRN = CBRN or {}
local K = Config.Sample.OffsetKeys
local running = false

local function notify(t, d) lib.notify({ type = t, description = d, position = 'top' }) end

local function pickVehicle()
  local ped = PlayerPedId()
  local veh = GetVehiclePedIsIn(ped, false)
  if veh ~= 0 then return veh end
  local pc, best, bd = GetEntityCoords(ped), nil, nil
  for _, v in ipairs(GetGamePool('CVehicle')) do
    local d = #(pc - GetEntityCoords(v))
    if d < 6.0 and (not bd or d < bd) then best, bd = v, d end
  end
  return best
end

local function disableControls()
  for _, c in ipairs({ 172, 173, 174, 175, 10, 11, 191, 177, 21, 36, 59, 60, 61, 62, 63, 64, 71, 72, 75, 76, 22, 23, 200 }) do DisableControlAction(0, c, true) end
end

--- Eine Positionierung: gibt den lokalen Offset (vector3) zurück oder nil (abgebrochen).
local function runFinder(veh, title, start)
  local off = start
  local held = {}
  local function step()
    if IsDisabledControlPressed(0, K.fast) then return Config.OffsetStepFast end
    if IsDisabledControlPressed(0, K.slow) then return Config.OffsetStepSlow end
    return Config.OffsetStep
  end
  local function repeating(ctrl)
    if IsDisabledControlJustPressed(0, ctrl) then held[ctrl] = GetGameTimer() + 350; return true end
    if IsDisabledControlPressed(0, ctrl) and held[ctrl] and GetGameTimer() >= held[ctrl] then held[ctrl] = GetGameTimer() + 55; return true end
    if not IsDisabledControlPressed(0, ctrl) then held[ctrl] = nil end
    return false
  end
  while true do
    Wait(0)
    if not DoesEntityExist(veh) then notify('error', 'Fahrzeug nicht mehr vorhanden.'); return nil end
    disableControls()
    local st = step()
    local dx, dy, dz = 0.0, 0.0, 0.0
    if repeating(K.up) then dy = dy + st end
    if repeating(K.down) then dy = dy - st end
    if repeating(K.left) then dx = dx - st end
    if repeating(K.right) then dx = dx + st end
    if repeating(K.zUp) then dz = dz + st end
    if repeating(K.zDown) then dz = dz - st end
    off = vector3(off.x + dx, off.y + dy, off.z + dz)
    -- Marker folgt dem Fahrzeug (lokaler Offset -> Welt), auch bei Drehung
    local p = GetOffsetFromEntityInWorldCoords(veh, off.x, off.y, off.z)
    DrawMarker(28, p.x, p.y, p.z, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.06, 0.06, 0.06, 255, 0, 0, 230, false, false, 2, false, nil, nil, false)
    DrawLine(p.x, p.y, p.z, p.x, p.y, p.z + 0.9, 255, 0, 0, 255)
    DrawLine(p.x, p.y, p.z, p.x, p.y, p.z - 0.9, 255, 80, 80, 160)
    -- 2D-Punkt + Fadenkreuz auf dem Bildschirm: bleibt auch sichtbar, wenn der Punkt im Fahrzeug (hinter Blech) liegt
    local onScreen, sx, sy = GetScreenCoordFromWorldCoord(p.x, p.y, p.z)
    if onScreen then
      DrawRect(sx, sy, 0.0065, 0.0115, 255, 0, 0, 255)
      DrawRect(sx, sy, 0.030, 0.0012, 255, 255, 255, 190)
      DrawRect(sx, sy, 0.0007, 0.054, 255, 255, 255, 190)
    end
    CBRN.hud({ mode = 'offset', title = title, x = off.x, y = off.y, z = off.z, step = st })
    if IsDisabledControlJustPressed(0, K.save) then return off end
    if IsDisabledControlJustPressed(0, K.cancel) then return nil end
  end
end

local function modelName(model)
  local n = GetDisplayNameFromVehicleModel(model)
  if n and n ~= '' and n ~= 'CARNOTFOUND' then return '`' .. n:lower() .. '`' end
  return ('0x%08X'):format(CBRN.u32(model))
end

local function fmt(v) return ('vector3(%.3f, %.3f, %.3f)'):format(v.x, v.y, v.z) end

local function report(model, sample, storage)
  local key = modelName(model)
  local cfg
  if storage then
    cfg = ('Config.SamplePoints = {\n    [%s] = {\n        sample = %s,\n        storage = %s\n    }\n}'):format(key, fmt(sample), fmt(storage))
  else
    cfg = ('Config.SamplePoints = {\n    [%s] = %s\n}'):format(key, fmt(sample))
  end
  print('^2[cbrn] OFFSET GESPEICHERT^7\n' .. cfg)
  lib.setClipboard(cfg)
  TriggerServerEvent('cbrn:offset:report', cfg)
  lib.alertDialog({ header = 'OFFSET GESPEICHERT', centered = true, size = 'lg',
    content = ('**X:** %.3f  **Y:** %.3f  **Z:** %.3f\n\n**Code:**\n\n`%s`\n\n**Konfiguration:**\n\n```\n%s\n```\n\nIn die Zwischenablage kopiert und in der Server-Konsole ausgegeben.'):format(sample.x, sample.y, sample.z, fmt(sample), cfg) })
end

local function startFinder()
  if running then return end
  local veh = pickVehicle()
  if not veh then return notify('error', 'Kein Fahrzeug in der Nähe. Setze dich in das Fahrzeug oder stelle dich daneben.') end
  running = true
  local model = GetEntityModel(veh)
  FreezeEntityPosition(veh, true)
  local mn, mx = GetModelDimensions(model)
  local start = vector3((mn.x + mx.x) / 2.0, (mn.y + mx.y) / 2.0, (mn.z + mx.z) / 2.0) -- ungefähr Fahrzeugmitte
  local sample = runFinder(veh, 'CBRN OFFSET FINDER', start)
  local storage
  if sample then
    local c = lib.alertDialog({ header = 'Separaten Ablagepunkt festlegen?', content = 'Standardmäßig gilt der Entnahmepunkt auch als Ablagepunkt.\n\nSoll jetzt ein getrennter Ablagepunkt gesetzt werden?', centered = true, cancel = true })
    if c == 'confirm' then storage = runFinder(veh, 'ABLAGEPUNKT', sample) end
  end
  FreezeEntityPosition(veh, false)
  CBRN.hud({ mode = 'off' }); CBRN.refreshHud(true)
  running = false
  if sample then report(model, sample, storage) else notify('inform', 'Offset Finder abgebrochen.') end
end

RegisterNetEvent('cbrn:admin:grant', function(action) if action == 'offset' then CreateThread(startFinder) end end)
RegisterCommand('offset', function() CBRN.requestAdmin('offset') end, false)
RegisterCommand('cbrnoffset', function() CBRN.requestAdmin('offset') end, false) -- Alternative, falls ein anderes Skript /offset belegt

AddEventHandler('onResourceStop', function(res)
  if res ~= GetCurrentResourceName() or not running then return end
  local veh = pickVehicle(); if veh then FreezeEntityPosition(veh, false) end
  CBRN.hud({ mode = 'off' })
end)
