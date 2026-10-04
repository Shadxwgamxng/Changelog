-- Sendet Position/Geschwindigkeit/Heading des Spielerfahrzeugs an den Server-Teil.
-- Es werden KEINE Messwerte erzeugt – diese bleiben Simulation des Backends.
local open = false

CreateThread(function()
  while true do
    local ped = PlayerPedId()
    local veh = GetVehiclePedIsIn(ped, false)
    if veh ~= 0 then
      local model = GetEntityModel(veh)
      local ok = false
      for _, m in ipairs(Config.Models) do if model == GetHashKey(m) then ok = true end end
      if ok then
        local c = GetEntityCoords(veh)
        TriggerServerEvent('cbrn:telemetry', { x = c.x, y = c.y, speed_kmh = GetEntitySpeed(veh) * 3.6, heading = GetEntityHeading(veh) })
      end
    end
    Wait(Config.IntervalMs)
  end
end)

RegisterCommand(Config.Command, function()
  open = not open
  SetNuiFocus(open, open)
  SendNUIMessage({ type = 'toggle', open = open })
end, false)

RegisterNUICallback('close', function(_, cb) open = false; SetNuiFocus(false, false); cb('ok') end)
