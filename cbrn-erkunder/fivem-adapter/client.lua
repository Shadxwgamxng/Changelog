-- Sendet Position/Geschwindigkeit/Heading und GTA-Wetter an den Server-Teil.
-- Es werden KEINE Messwerte erzeugt – die bleiben Simulation des Backends.
local open = false
local WEATHER = { 'EXTRASUNNY', 'CLEAR', 'CLOUDS', 'SMOG', 'FOGGY', 'OVERCAST', 'RAIN', 'THUNDER', 'CLEARING', 'NEUTRAL', 'SNOW', 'BLIZZARD', 'SNOWLIGHT', 'XMAS', 'HALLOWEEN' }
local WEATHER_HASH = {}
for _, w in ipairs(WEATHER) do WEATHER_HASH[GetHashKey(w)] = w end

local function modelAllowed(veh)
  if #Config.Models == 0 then return true end
  local m = GetEntityModel(veh)
  for _, name in ipairs(Config.Models) do if m == GetHashKey(name) then return true end end
  return false
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

CreateThread(function()
  local n = 0
  while true do
    n = n + 1
    local ped = PlayerPedId()
    local veh = GetVehiclePedIsIn(ped, false)
    local data = {}
    if veh ~= 0 and modelAllowed(veh) then
      local c = GetEntityCoords(veh)
      data.x, data.y = c.x, c.y
      data.speed_kmh = GetEntitySpeed(veh) * 3.6
      data.heading = GetEntityHeading(veh)
      data.in_vehicle = true
    end
    if Config.SendWeather and (n % 3 == 1) then data.weather = weatherPayload() end
    data.vehicle = currentVehicle
    if data.x or data.weather then TriggerServerEvent('cbrn:telemetry', data) end
    Wait(Config.IntervalMs)
  end
end)

local function setOpen(state)
  open = state
  SetNuiFocus(open, open)
  SendNUIMessage({ type = open and 'open' or 'close', url = Config.WebUrl })
end

RegisterCommand(Config.Command, function() setOpen(not open) end, false)
RegisterKeyMapping(Config.Command, 'CBRN-Erkunder öffnen/schließen', 'keyboard', Config.Key)
local currentVehicle = nil
RegisterNUICallback('setVehicle', function(d, cb) currentVehicle = d and d.vehicle or nil; cb('ok') end)
RegisterNUICallback('close', function(_, cb) setOpen(false); cb('ok') end)
AddEventHandler('onResourceStop', function(res) if res == GetCurrentResourceName() and open then SetNuiFocus(false, false) end end)
