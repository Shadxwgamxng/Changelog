-- Brücke Lua -> JavaScript-Server: stellt Konfiguration und Berechtigungen bereit (das Server-Skript main.js liest sie über exports).
local function vec(v) return { x = v.x + 0.0, y = v.y + 0.0, z = v.z + 0.0 } end

exports('getSampleConfig', function()
  local pts = {}
  for model, e in pairs(CBRN.Points) do pts[#pts + 1] = { model = model, sample = vec(e.sample), storage = vec(e.storage) } end
  local c = Config.Sample
  return {
    points = pts, interactDistance = c.InteractDistance, returnDistance = Config.SampleReturnDistance, collectionDuration = Config.SampleCollectionDuration,
    maxSamples = Config.MaxSamples, allowWithoutIncident = c.AllowWithoutIncident, useInventory = c.UseInventory, kitItem = c.KitItem, containerItem = c.ContainerItem,
    containerType = c.ContainerType, analysisDurations = c.AnalysisDurations, debug = c.Debug, requireJob = Config.RequireJob,
  }
end)

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

exports('isAdmin', function(src) return IsPlayerAceAllowed(src, Config.Sample.AdminAce) end)
