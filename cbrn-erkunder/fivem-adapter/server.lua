RegisterNetEvent('cbrn:telemetry', function(d)
  local src = source
  if type(d) ~= 'table' then return end
  if type(d.vehicle) ~= 'string' then return end -- Fahrzeug kommt aus der Anmeldung am Computer
  d.player = GetPlayerName(src)
  PerformHttpRequest(Config.ApiUrl .. '/api/adapter/fivem/telemetry', function() end, 'POST',
    json.encode(d), { ['Content-Type'] = 'application/json', ['x-adapter-token'] = Config.Token })
end)
