-- Interaktion am Fahrzeug: Probenentnahmeset nehmen. Bevorzugt ox_target; ohne ox_target Fallback mit ox_lib-TextUI + E.
-- Der Punkt wird IMMER aus Fahrzeugposition + Rotation + lokalem Offset berechnet (keine Weltkoordinaten).
CBRN = CBRN or {}
CBRN.State = CBRN.State or { kit = false, phase = 'idle', busy = false, sample = nil, veh = nil, atSample = false, atStorage = false }
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

--- Darf an diesem Fahrzeug jetzt das Set genommen werden? (außerhalb des Fahrzeugs, nah genug am Punkt, noch kein Set)
function CBRN.canTakeKit(veh)
  if S.kit or not onFoot() then return false end
  local d = CBRN.distanceTo(veh, 'sample')
  return d ~= nil and d <= Config.Sample.InteractDistance
end

function CBRN.takeKit(veh)
  if S.kit then return lib.notify({ type = 'inform', description = 'Du hast bereits ein Probenentnahmeset.' }) end
  if not CBRN.Points[modelOf(veh)] then return lib.notify({ type = 'error', description = 'Kein Probenentnahmepunkt für dieses Fahrzeug konfiguriert.' }) end
  TriggerServerEvent('cbrn:sample:takeKit', VehToNet(veh))
end

-- ---- ox_target (bevorzugt)
local usingTarget = false
CreateThread(function()
  Wait(1000)
  if GetResourceState('ox_target') ~= 'started' then return end
  local models = {}
  for m in pairs(CBRN.Points) do models[#models + 1] = m end
  for _, name in ipairs(Config.Models or {}) do models[#models + 1] = CBRN.u32(GetHashKey(name)) end
  if #models == 0 then return end
  usingTarget = true
  exports.ox_target:addModel(models, {
    { name = 'cbrn_sample_kit', icon = 'fa-solid fa-vial', label = 'Probenentnahmeset nehmen', distance = Config.Sample.TargetDistance,
      canInteract = function(entity) return CBRN.Points[modelOf(entity)] ~= nil and CBRN.canTakeKit(entity) end,
      onSelect = function(data) CBRN.takeKit(data.entity) end },
    { name = 'cbrn_sample_kit_return', icon = 'fa-solid fa-rotate-left', label = 'Probenentnahmeset zurückgeben', distance = Config.Sample.TargetDistance,
      canInteract = function(entity) return S.kit and S.phase == 'idle' and not S.busy and CBRN.Points[modelOf(entity)] ~= nil and (CBRN.distanceTo(entity, 'sample') or 99) <= Config.Sample.InteractDistance end,
      onSelect = function() TriggerServerEvent('cbrn:sample:returnKit') end },
  })
end)

-- ---- Fallback ohne ox_target: TextUI + E in der Nähe des Entnahmepunkts (nur aktiv, wenn ein Fahrzeug nahe ist)
CreateThread(function()
  Wait(2000)
  if usingTarget or next(CBRN.Points) == nil then return end
  local shown = false
  while true do
    local wait = 700
    local veh = (onFoot() and not S.kit) and CBRN.nearestVehicle(8.0) or nil
    if veh and CBRN.canTakeKit(veh) then
      wait = 0
      if not shown then lib.showTextUI('[E] Probenentnahmeset nehmen'); shown = true end
      if IsControlJustReleased(0, 38) then CBRN.takeKit(veh) end
    elseif shown then lib.hideTextUI(); shown = false end
    Wait(wait)
  end
end)
