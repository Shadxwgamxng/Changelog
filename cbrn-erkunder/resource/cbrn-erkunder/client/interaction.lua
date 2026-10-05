-- Interaktion am Fahrzeug: kleiner Pin (Kreis mit Taste) genau am (Offset-)Punkt. In Reichweite J gedrückt halten:
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

--- Probenaktion im Kreis (nil = nichts, z. B. während der Entnahme)
local function sampleAction(veh)
  if S.busy or S.phase == 'collecting' then return nil end
  if S.phase == 'carrying' then return { text = 'Probe abgeben', run = function() CreateThread(CBRN.returnSample) end } end
  if S.kit then return { text = 'Probenentnahmeset zurückgeben', run = function() TriggerServerEvent('cbrn:sample:returnKit', VehToNet(veh)) end } end
  return { text = 'Probenentnahmeset nehmen', run = function() CBRN.takeKit(veh) end }
end

--- Was kann am Punkt gerade getan werden? which = 'sample' | 'device'.
--- Ohne eigenen Messgerätepunkt (deviceShared) teilen sich Probenset und Messgeräte einen Kreis: dann öffnet sich ein kleines Auswahlmenü.
local function circleAction(veh, which)
  if S.busy or S.phase == 'collecting' then return nil end
  if which == 'device' then return CBRN.deviceAction and CBRN.deviceAction(veh) or nil end
  local sa = sampleAction(veh)
  local e = CBRN.Points[modelOf(veh)]
  if e and e.deviceShared and CBRN.deviceAction then
    local da = CBRN.deviceAction(veh)
    if da and sa then
      return { text = 'Ausrüstung', run = function()
        lib.registerContext({ id = 'cbrn_equipment', title = 'AUSRÜSTUNG', options = {
          { title = sa.text, icon = 'vial', onSelect = function() sa.run() end },
          { title = da.text, icon = 'gauge', onSelect = function() da.run() end },
        } })
        lib.showContext('cbrn_equipment')
      end }
    end
    return da or sa
  end
  return sa
end

-- Interaktions-Pin (wie bei "Ansehen"-Prompts): kleiner Kreis mit der Taste genau am Punkt, in Reichweite mit Textschild und Halte-Fortschritt.
-- Wird als Overlay in der NUI gezeichnet (Bildschirmposition des Weltpunkts) – immer gut lesbar, nicht im Blech versunken.
local pinShown, pinSig = false, ''
local function sendPin(x, y, near, text, pct)
  local sig = ('%.4f|%.4f|%s|%s|%d'):format(x, y, tostring(near), text or '', pct or 0)
  if sig == pinSig then return end
  pinSig = sig; pinShown = true
  SendNUIMessage({ type = 'pin', data = { show = true, x = x, y = y, key = Config.Sample.Keys.use, near = near, text = text, pct = pct or 0 } })
end
local function hidePin()
  if not pinShown then return end
  pinShown, pinSig = false, ''
  SendNUIMessage({ type = 'pin', data = { show = false } })
end

-- Kreis zeichnen und Halte-Aktion auswerten. Die Fahrzeugsuche läuft nur ca. 2x pro Sekunde; gezeichnet wird nur in der Nähe.
CreateThread(function()
  local holdStart, lastSend = nil, 0
  while true do
    local wait = 500
    local veh = (onFoot() and next(CBRN.Points) ~= nil) and CBRN.nearestVehicle(Config.Sample.CircleShowDistance) or nil
    if not veh then
      hidePin()
      if S.inCircle then S.inCircle, S.circleVeh, S.holdPct = false, nil, 0; if CBRN.refreshHud then CBRN.refreshHud(false) end end
    else
      while DoesEntityExist(veh) and onFoot() do
        local pc = GetEntityCoords(PlayerPedId())
        local which, p, d = 'sample', CBRN.worldPoint(veh, 'sample'), nil
        d = #(pc - p) -- Abstand zum Punkt (3D)
        local pe = CBRN.Points[modelOf(veh)]
        if pe and not pe.deviceShared then -- eigener Messgerätepunkt: der nähere Punkt gewinnt
          local pd = CBRN.worldPoint(veh, 'device'); local dd = #(pc - pd)
          if dd < d then which, p, d = 'device', pd, dd end
        end
        if d > Config.Sample.CircleShowDistance + 3.0 then break end
        local inside = d <= Config.Sample.CircleRadius
        local onScreen, sx, sy = GetScreenCoordFromWorldCoord(p.x, p.y, p.z)
        local act = inside and circleAction(veh, which) or nil
        if onScreen and d <= Config.Sample.CircleShowDistance then sendPin(sx, sy, inside, act and act.text or nil, math.floor((S.holdPct or 0) * 100)) else hidePin() end -- Pin nur in unmittelbarer Nähe
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
      hidePin()
      if S.inCircle then S.inCircle, S.circleVeh, S.holdPct = false, nil, 0; if CBRN.refreshHud then CBRN.refreshHud(false) end end
    end
    Wait(wait)
  end
end)
