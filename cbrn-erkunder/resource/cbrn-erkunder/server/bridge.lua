-- Brücke Lua -> JavaScript-Server: Konfiguration über lokale Events (kein Export nötig), Berechtigungen für /offset & Debug in reinem Lua.
local function vec(v) return { x = v.x + 0.0, y = v.y + 0.0, z = v.z + 0.0 } end

local function buildConfig()
  local pts = {}
  for model, e in pairs(CBRN.Points) do pts[#pts + 1] = { model = model, sample = vec(e.sample), storage = vec(e.storage) } end
  local c = Config.Sample
  return {
    points = pts, interactDistance = c.InteractDistance, returnDistance = Config.SampleReturnDistance, collectionDuration = Config.SampleCollectionDuration,
    maxSamples = Config.MaxSamples, allowWithoutIncident = c.AllowWithoutIncident, useInventory = c.UseInventory, kitItem = c.KitItem, containerItem = c.ContainerItem,
    containerType = c.ContainerType, analysisDurations = c.AnalysisDurations, debug = c.Debug, requireJob = Config.RequireJob,
  }
end
exports('getSampleConfig', buildConfig)
-- Das JS-Serverskript fordert die Konfiguration an (nach seinem Start) – zusätzlich senden wir sie nach dem Start einmal selbst.
local function sendConfig() TriggerEvent('cbrn:sampleConfig', buildConfig()) end
AddEventHandler('cbrn:cfg:request', sendConfig)
CreateThread(function() Wait(2500); sendConfig() end)

-- Job-Prüfung: nur relevant, wenn Config.RequireJob = true
local function jobName(src)
  if GetResourceState('qbx_core') == 'started' then
    local p = exports.qbx_core:GetPlayer(src); return p and p.PlayerData and p.PlayerData.job and p.PlayerData.job.name
  elseif GetResourceState('qb-core') == 'started' then
    local QB = exports['qb-core']:GetCoreObject(); local p = QB.Functions.GetPlayer(src); return p and p.PlayerData and p.PlayerData.job and p.PlayerData.job.name
  elseif GetResourceState('es_extended') == 'started' then
    local ESX = exports['es_extended']:getSharedObject(); local p = ESX.GetPlayerFromId(src); return p and p.job and p.job.name
  end
  return nil
end

exports('jobAllowed', function(src)
  if Config.Sample.CustomPermission then return Config.Sample.CustomPermission(src) and true or false end
  if not Config.RequireJob then return true end
  local job = jobName(src)
  if not job then return false end -- kein unterstütztes Framework gefunden -> sicherheitshalber verweigern
  return Config.AllowedJobs[job] == true
end)

local function frameworkAdmin(src)
  if GetResourceState('qbx_core') == 'started' then return exports.qbx_core:HasPermission(src, 'admin') and true or false
  elseif GetResourceState('qb-core') == 'started' then local QB = exports['qb-core']:GetCoreObject(); return QB.Functions.HasPermission(src, 'admin') and true or false
  elseif GetResourceState('es_extended') == 'started' then
    local ESX = exports['es_extended']:getSharedObject(); local p = ESX.GetPlayerFromId(src); local g = p and p.getGroup and p.getGroup()
    return g == 'admin' or g == 'superadmin'
  end
  return false
end

local function isAdmin(src)
  if IsPlayerAceAllowed(src, Config.Sample.AdminAce) or IsPlayerAceAllowed(src, 'command') then return true end
  for i = 0, GetNumPlayerIdentifiers(src) - 1 do
    if Config.Sample.AdminIdentifiers[GetPlayerIdentifier(src, i)] then return true end
  end
  local ok, res = pcall(frameworkAdmin, src)
  return ok and res or false
end
exports('isAdmin', isAdmin)

-- /offset, /debugsample, /debugsamplepoint: Berechtigung prüfen (reines Lua) und dem Client freigeben
RegisterNetEvent('cbrn:admin:request', function(action)
  local src = source
  if isAdmin(src) then
    TriggerClientEvent('cbrn:admin:grant', src, action)
    return
  end
  local ids = {}
  for i = 0, GetNumPlayerIdentifiers(src) - 1 do ids[#ids + 1] = GetPlayerIdentifier(src, i) end
  print(('^3[cbrn] %s (ID %d) hat "%s" versucht – keine Berechtigung.^7\n  Freigeben mit:  add_ace group.admin %s allow   ODER   Config.Sample.AdminIdentifiers[\'%s\'] = true'):format(GetPlayerName(src) or '?', src, action, Config.Sample.AdminAce, ids[1] or 'license:...'))
  TriggerClientEvent('cbrn:admin:deny', src, ('Keine Berechtigung (ACE "%s"). Die Details stehen in der Server-Konsole.'):format(Config.Sample.AdminAce))
end)

RegisterNetEvent('cbrn:offset:report', function(text)
  if not isAdmin(source) then return end
  print(('\n^2[cbrn] OFFSET ermittelt von %s – in sample_config.lua eintragen:^7\n\n%s\n'):format(GetPlayerName(source) or '?', tostring(text):sub(1, 800)))
end)
