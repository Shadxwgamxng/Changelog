RegisterNetEvent('cbrn:telemetry', function(d)
  local src = source
  d.vehicle = Config.Vehicle
  d.player = GetPlayerName(src)
  PerformHttpRequest(Config.ApiUrl .. '/api/adapter/fivem/telemetry', function() end, 'POST',
    json.encode(d), { ['Content-Type'] = 'application/json', ['x-adapter-token'] = Config.Token })
end)
