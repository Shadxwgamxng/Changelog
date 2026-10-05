-- CBRN-Erkunder: Bordcomputer im Fahrzeug (nur Beifahrerplätze) + Telemetrie an den Server-Teil.
-- Es werden KEINE Messwerte erzeugt – die bleiben Simulation des Backends.
local open = false
local currentVehicle = nil -- Fahrzeug-ID aus der Anmeldung in der Web-App (z. B. FFW-11-71-01)
local WEATHER = { 'EXTRASUNNY', 'CLEAR', 'CLOUDS', 'SMOG', 'FOGGY', 'OVERCAST', 'RAIN', 'THUNDER', 'CLEARING', 'NEUTRAL', 'SNOW', 'BLIZZARD', 'SNOWLIGHT', 'XMAS', 'HALLOWEEN' }
local WEATHER_HASH = {}
for _, w in ipairs(WEATHER) do WEATHER_HASH[GetHashKey(w)] = w end

AddTextEntry('CBRN_PC_PROMPT', Config.PromptText)

local function modelAllowed(veh)
  local m = GetEntityModel(veh)
  for _, name in ipairs(Config.Models) do if m == GetHashKey(name) then return true end end
  return false
end

-- Fahrzeug, in dem ich auf einem BEIFAHRERPLATZ sitze und das einem konfigurierten Modell entspricht (sonst 0)
local function passengerVehicle()
  local ped = PlayerPedId()
  local veh = GetVehiclePedIsIn(ped, false)
  if veh == 0 or not modelAllowed(veh) then return 0 end
  if GetPedInVehicleSeat(veh, -1) == ped then return 0 end -- Fahrer: kein Zugriff
  return veh
end

local function windFrom()
  local v = GetWindDirection()
  local heading = math.deg(math.atan2(v.x, v.y)) % 360.0
  if Config.WindVectorIsTravelDirection then heading = (heading + 180.0) % 360.0 end
  return heading
end

local function weatherPayload()
  local w = WEATHER_HASH[GetNextWeatherTypeHashName()] or WEATHER_HASH[GetPrevWeatherTypeHashName()] or 'NEUTRAL'
  return { type = w, wind_speed = GetWindSpeed(), wind_from = windFrom(), hour = GetClockHours(), minute = GetClockMinutes() }
end

-- z_fire: Rauch in der Naehe erkennen (Export getSmokeInRange). Wir kennen nur die Anwesenheit -> mehrere Radien
-- abfragen; der kleinste Radius mit Rauch bestimmt die ungefaehre Entfernung zum Rauch.
local lastSmokeCheck = nil
local SMOKE_RINGS = { 100.0, 50.0, 25.0, 10.0 } -- grob -> fein: ohne Rauch genau EIN Aufruf
local function smokeHas(pos, r)
  local ok, found = pcall(function() return exports['z_fire']:getSmokeInRange(pos, r) end) -- keine Ausgabe, Fehler werden still ignoriert
  return ok and type(found) == 'table' and next(found) ~= nil
end
local function smokeRing(pos)
  if Config.UseZFire == false or GetResourceState('z_fire') ~= 'started' then return nil end
  if not smokeHas(pos, SMOKE_RINGS[1]) then return false end
  local ring = SMOKE_RINGS[1]
  for i = 2, #SMOKE_RINGS do if smokeHas(pos, SMOKE_RINGS[i]) then ring = SMOKE_RINGS[i] else break end end
  return ring
end

-- Telemetrie: erst nach Anmeldung am Computer (currentVehicle gesetzt) und nur aus einem konfigurierten Fahrzeug
CreateThread(function()
  local n = 0
  while true do
    n = n + 1
    local veh = GetVehiclePedIsIn(PlayerPedId(), false)
    if currentVehicle and veh ~= 0 and modelAllowed(veh) then
      local data = { vehicle = currentVehicle }
      local c = GetEntityCoords(veh)
      data.x, data.y = c.x, c.y
      data.speed_kmh = GetEntitySpeed(veh) * 3.6
      data.heading = GetEntityHeading(veh)
      data.in_vehicle = true
      local nowMs = GetGameTimer()
      if nowMs - (lastSmokeCheck or -999999) >= (Config.SmokeCheckMs or 20000) then
        lastSmokeCheck = nowMs
        local sr = smokeRing(c)
        if sr ~= nil then data.smoke_ring = sr end
      end -- false = z_fire aktiv, kein Rauch in 100 m
      if Config.SendWeather and (n % 3 == 1) then data.weather = weatherPayload() end
      TriggerServerEvent('cbrn:telemetry', data)
    end
    Wait(Config.IntervalMs)
  end
end)

local function setOpen(state)
  open = state
  SetNuiFocus(open, open)
  SendNUIMessage({ type = open and 'open' or 'close' })
end

-- Hinweis + Öffnen (nur Beifahrer); geöffnet wird mit Config.Control (E)
CreateThread(function()
  while true do
    if not open and passengerVehicle() ~= 0 then
      BeginTextCommandDisplayHelp('CBRN_PC_PROMPT')
      EndTextCommandDisplayHelp(0, false, false, -1)
      if IsControlJustPressed(0, Config.Control) then setOpen(true) end
      Wait(0)
    else
      Wait(open and 400 or 500)
      -- Computer schließt sich, wenn man aussteigt oder auf den Fahrersitz wechselt
      if open and passengerVehicle() == 0 then setOpen(false) end
    end
  end
end)

-- Bruecke NUI <-> Server-Skript: Anfragen der Oberflaeche laufen als Events zum Server, Antworten kommen in Teilen zurueck
local pending, parts = {}, {}
RegisterNUICallback('api', function(d, cb)
  local id = d.id
  pending[id] = cb
  TriggerServerEvent('cbrn:req', id, d.method, d.path, d.body, d.token)
end)
RegisterNetEvent('cbrn:resp', function(id, idx, total, status, chunk)
  local p = parts[id]
  if not p then p = { n = 0, t = {} }; parts[id] = p end
  p.t[idx + 1] = chunk; p.n = p.n + 1
  if p.n >= total then
    parts[id] = nil
    local cb = pending[id]; pending[id] = nil
    if cb then cb({ status = status, text = table.concat(p.t) }) end
  end
end)
-- Live-Ereignisse (Messwerte, Alarme, Wetter ...) an die Oberflaeche
RegisterNetEvent('cbrn:evt', function(json) SendNUIMessage({ type = 'evt', data = json }) end)

CBRN = CBRN or {}
RegisterNUICallback('setVehicle', function(d, cb)
  currentVehicle = d and d.vehicle or nil
  CBRN.session = currentVehicle and { vehicle = currentVehicle, name = d.name, funktion = d.funktion } or nil -- angemeldete Person (nur Anzeigename)
  cb('ok')
end)
RegisterNUICallback('close', function(_, cb) setOpen(false); cb('ok') end)
AddEventHandler('onResourceStop', function(res) if res == GetCurrentResourceName() and open then SetNuiFocus(false, false) end end)
