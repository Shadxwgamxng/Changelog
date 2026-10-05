-- Interaktion am Fahrzeug: sichtbarer Kreis am (Offset-)Punkt. Im Kreis J gedrückt halten:
--   kein Set  -> Probenentnahmeset nehmen · Set vorhanden -> Set zurückgeben · Probe getragen -> Probe abgeben.
-- Der Punkt wird IMMER aus Fahrzeugposition + Rotation + lokalem Offset berechnet (keine Weltkoordinaten).
CBRN = CBRN or {}
CBRN.State = CBRN.State or { kit = false, phase = 'idle', busy = false, sample = nil, veh = nil, atSample = false, atStorage = false, inCircle = false, holdPct = 0 }
local S = CBRN.State

local function modelOf(veh) return CBRN.u32(GetEntityModel(veh)) end

--- Weltposition des Entnahme-/Ablagepunkts ('sample' | 'storage') für ein Fahrzeug; nil, wenn für das Modell nichts konfiguriert ist.
function CBRN.worldPoint(veh, which)
  local e = CBRN.Points[modelOf(veh)]
  if not e then return nil end
  local off = e[which or 'sample']
  return GetOffsetFromEntityInWorldCoords(veh, off.x, off.y, off.z), off
end

function CBRN.distanceTo(veh, which)
  local p = CBRN.worldPoint(veh, which)
  if not p then return nil end
  return #(GetEntityCoords(PlayerPedId()) - p)
end

--- Nächstes konfiguriertes CBRN-Fahrzeug in Reichweite (nur bei Bedarf aufrufen – GetGamePool ist nicht billig).
function CBRN.nearestVehicle(maxDist)
  local pc = GetEntityCoords(PlayerPedId()); local best, bestD
  for _, veh in ipairs(GetGamePool('CVehicle')) do
    if CBRN.Points[modelOf(veh)] then
      local d = #(pc - GetEntityCoords(veh))
      if d <= maxDist and (not bestD or d < bestD) then best, bestD = veh, d end
    end
  end
  return best
end

local function onFoot() local ped = PlayerPedId(); return not IsPedInAnyVehicle(ped, false) and not IsEntityDead(ped) end

function CBRN.takeKit(veh)
  if S.kit then return lib.notify({ type = 'inform', description = 'Du hast bereits ein Probenentnahmeset.' }) end
  if not CBRN.Points[modelOf(veh)] then return lib.notify({ type = 'error', description = 'Kein Probenentnahmepunkt für dieses Fahrzeug konfiguriert.' }) end
  TriggerServerEvent('cbrn:sample:takeKit', VehToNet(veh))
end

--- Was kann im Kreis gerade getan werden? (nil = nichts, z. B. während der Entnahme)
local function circleAction(veh)
  if S.busy or S.phase == 'collecting' then return nil end
  if S.phase == 'carrying' then return { text = 'Probe abgeben', run = function() CreateThread(CBRN.returnSample) end } end
  if S.kit then return { text = 'Probenentnahmeset zurückgeben', run = function() TriggerServerEvent('cbrn:sample:returnKit', VehToNet(veh)) end } end
  return { text = 'Probenentnahmeset nehmen', run = function() CBRN.takeKit(veh) end }
end

local function ring(p, r, inside)
  local found, gz = GetGroundZFor_3dCoord(p.x, p.y, p.z + 0.5, false)
  local z = (found and gz or (p.z - 1.0)) + 0.04
  local c = inside and { 80, 220, 120 } or { 240, 80, 10 }
  DrawMarker(25, p.x, p.y, z, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, r * 2.0, r * 2.0, 1.0, c[1], c[2], c[3], 200, false, false, 2, false, nil, nil, false)
  DrawMarker(1, p.x, p.y, z - 0.02, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, r * 2.0, r * 2.0, 0.03, c[1], c[2], c[3], 55, false, false, 2, false, nil, nil, false)
  return z
end

-- Kreis zeichnen und Halte-Aktion auswerten. Die Fahrzeugsuche läuft nur ca. 2x pro Sekunde; gezeichnet wird nur in der Nähe.
CreateThread(function()
  local holdStart, lastSend = nil, 0
  while true do
    local wait = 500
    local veh = (onFoot() and next(CBRN.Points) ~= nil) and CBRN.nearestVehicle(Config.Sample.CircleShowDistance) or nil
    if not veh then
      if S.inCircle then S.inCircle, S.circleVeh, S.holdPct = false, nil, 0; if CBRN.refreshHud then CBRN.refreshHud(false) end end
    else
      while DoesEntityExist(veh) and onFoot() do
        local p = CBRN.worldPoint(veh, 'sample')
        local pc = GetEntityCoords(PlayerPedId())
        local d = #(vector3(pc.x, pc.y, 0.0) - vector3(p.x, p.y, 0.0)) -- waagerechter Abstand zum Punkt
        if d > Config.Sample.CircleShowDistance + 3.0 then break end
        local inside = d <= Config.Sample.CircleRadius and math.abs(pc.z - p.z) < 3.0
        ring(p, Config.Sample.CircleRadius, inside)
        local act = inside and circleAction(veh) or nil
        local changed = (inside ~= S.inCircle)
        S.inCircle, S.circleVeh, S.circleAction = inside, inside and veh or nil, act
        if act and CBRN.use and CBRN.use.isPressed then
          holdStart = holdStart or GetGameTimer()
          S.holdPct = math.min(1.0, (GetGameTimer() - holdStart) / Config.Sample.HoldTime)
          if S.holdPct >= 1.0 then
            holdStart, S.holdPct = nil, 0
            act.run()
            while CBRN.use.isPressed do Wait(0) end -- erst nach dem Loslassen weiter
          end
        else holdStart = nil; if S.holdPct ~= 0 then S.holdPct = 0; changed = true end end
        if CBRN.refreshHud and (changed or (S.holdPct > 0 and GetGameTimer() - lastSend > 60)) then lastSend = GetGameTimer(); CBRN.refreshHud(false) end
        Wait(0)
      end
      if S.inCircle then S.inCircle, S.circleVeh, S.holdPct = false, nil, 0; if CBRN.refreshHud then CBRN.refreshHud(false) end end
    end
    Wait(wait)
  end
end)
