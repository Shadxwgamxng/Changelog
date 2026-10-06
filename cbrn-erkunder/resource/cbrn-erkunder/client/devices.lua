-- Handmessgeräte: aus dem Fahrzeug nehmen (Messgerätefach), Geräte-UI (NUI), Tasten, Zurücklegen.
-- Der Client entscheidet NICHTS: Bestand, Gerätezustand, Messwerte, Speichern und Alarme kommen vom Server (cbrn:dev:*).
CBRN = CBRN or {}
local D = { held = false, def = nil, visible = true, mouse = false, typing = false, anim = false, prop = nil }
CBRN.Dev = D
local DC = Config.Devices
local function notify(t, d) lib.notify({ type = t, description = d, position = 'top' }) end
local function nui(m) SendNUIMessage(m) end

-- ---- Aktion am Messgerätefach (wird vom Interaktions-Kreis aufgerufen)
function CBRN.deviceAction(veh)
  if D.held then return { text = 'Messgerät zurücklegen', run = function() TriggerServerEvent('cbrn:dev:return', VehToNet(veh)) end } end
  return { text = 'Messgerät entnehmen', run = function() D.veh = VehToNet(veh); TriggerServerEvent('cbrn:dev:inventory', D.veh) end }
end

-- Auswahlmenü im Stil der Probenentnahme-Karte (NUI, unten rechts, OHNE Mauszeiger). Bedienung über das Spiel:
-- Mausrad wählt, Enter oder Linksklick bestätigt, Rücktaste schließt (auch automatisch beim Entfernen/Einsteigen).
-- items = { {id, label, sub, disabled} }, cb(id)
local menuCb, menuOpen
function CBRN.choose(title, items, cb)
  menuCb, menuOpen = cb, true
  nui({ type = 'dev-menu', title = title, items = items })
  local p0 = GetEntityCoords(PlayerPedId())
  CreateThread(function()
    local t0 = GetGameTimer()
    while menuOpen do
      for _, c in ipairs({ 14, 15, 16, 17, 99, 100, 180, 181, 241, 242, 24, 25, 37, 140, 141, 142, 257 }) do DisableControlAction(0, c, true) end -- kein Waffenrad/Schlagen/Waffenwechsel
      -- Mausrad: je nach Spielzustand kommt es als andere Control-ID an -> alle gängigen prüfen; Pfeiltasten ↑ ↓ funktionieren immer als Reserve
      local down = IsDisabledControlJustPressed(0, 14) or IsDisabledControlJustPressed(0, 16) or IsDisabledControlJustPressed(0, 99) or IsDisabledControlJustPressed(0, 242) or IsDisabledControlJustPressed(0, 180) or IsDisabledControlJustPressed(0, 173)
      local up = IsDisabledControlJustPressed(0, 15) or IsDisabledControlJustPressed(0, 17) or IsDisabledControlJustPressed(0, 100) or IsDisabledControlJustPressed(0, 241) or IsDisabledControlJustPressed(0, 181) or IsDisabledControlJustPressed(0, 172)
      if Config.Devices.MenuInvertScroll then down, up = up, down end
      if down and not up then nui({ type = 'dev-menu-nav', dir = 'down' }) elseif up and not down then nui({ type = 'dev-menu-nav', dir = 'up' }) end
      if GetGameTimer() - t0 > 300 and (IsDisabledControlJustPressed(0, 191) or IsDisabledControlJustPressed(0, 201) or IsDisabledControlJustPressed(0, 24)) then nui({ type = 'dev-menu-pick' }) end
      if IsControlJustPressed(0, 177) or IsPedInAnyVehicle(PlayerPedId(), false) or #(GetEntityCoords(PlayerPedId()) - p0) > 4.0 or IsEntityDead(PlayerPedId()) then nui({ type = 'dev-menu-close' }) end
      Wait(0)
    end
  end)
end
function CBRN.menuIsOpen() return menuOpen end
local function menuDone(id)
  menuOpen = false
  local f = menuCb; menuCb = nil
  if f and id then f(id) end
end
RegisterNUICallback('menuPick', function(d, cb) menuDone(d and d.id); cb('ok') end)
RegisterNUICallback('menuClose', function(_, cb) menuDone(nil); cb('ok') end)

local ICON = { dlm = 'radiation', como = 'hand-holding-droplet', pid = 'wind', ims = 'flask', mgmg = 'gauge-high' }
RegisterNetEvent('cbrn:dev:inv', function(inv)
  local items = {}
  for _, d in ipairs(inv.devices or {}) do
    items[#items + 1] = { id = d.type, label = d.label, sub = ('%s · Akku %d %%%s'):format(d.status, d.battery, d.holder and (' · ' .. d.holder) or ''), disabled = d.status ~= 'VERFÜGBAR' }
  end
  CBRN.choose('MESSGERÄTE', items, function(id) TriggerServerEvent('cbrn:dev:take', D.veh, id) end)
end)

-- ---- Halten (Animation + optionales Prop) -----------------------------------------------------------
local function startHold(type)
  local a = DC.Anim
  if a and a.dict then
    RequestAnimDict(a.dict); local t = GetGameTimer(); while not HasAnimDictLoaded(a.dict) and GetGameTimer() - t < 2000 do Wait(10) end
    if HasAnimDictLoaded(a.dict) then D.anim = true end
  end
  local pr = DC.Props and DC.Props[type]
  if pr and pr.model then -- ohne Prop-Modell funktioniert die UI trotzdem
    local m = GetHashKey(pr.model); RequestModel(m); local t = GetGameTimer(); while not HasModelLoaded(m) and GetGameTimer() - t < 2000 do Wait(10) end
    if HasModelLoaded(m) then
      local ped = PlayerPedId(); local o = CreateObject(m, 0.0, 0.0, 0.0, true, true, false)
      AttachEntityToEntity(o, ped, GetPedBoneIndex(ped, pr.bone or 28422), pr.pos and pr.pos.x or 0.0, pr.pos and pr.pos.y or 0.0, pr.pos and pr.pos.z or 0.0, pr.rot and pr.rot.x or 0.0, pr.rot and pr.rot.y or 0.0, pr.rot and pr.rot.z or 0.0, true, true, false, true, 1, true)
      D.prop = o
    end
  end
end
local function stopHold()
  local a = DC.Anim
  if D.anim and a and a.dict then StopAnimTask(PlayerPedId(), a.dict, a.clip or 'base', 1.0) end
  D.anim = false
  if D.prop and DoesEntityExist(D.prop) then DeleteEntity(D.prop) end
  D.prop = nil
end

local function setMouse(on, typing)
  on = on and D.held and true or false; typing = on and typing or false
  if on == D.mouse and typing == D.typing then return end
  if D.mouse and not on then D.mouseOffAt = GetGameTimer() end
  D.mouse, D.typing = on, typing
  SetNuiFocus(on, on); SetNuiFocusKeepInput(false) -- Mauszeiger an = volle Bedienung der Oberfläche (kein Laufen), aus = Spiel hat wieder Eingabe
  nui({ type = 'dev', cmd = 'mouse', on = on })
end

-- Mauszeiger freischalten: Taste ´ (auf deutscher Tastatur rechts neben ß; FiveM-Name EQUALS). Ausschalten übernimmt die Oberfläche (gleiche Taste oder ESC).
RegisterCommand('cbrn_dev_cursor', function()
  if not D.held or not D.visible or D.mouse then return end
  if D.mouseOffAt and GetGameTimer() - D.mouseOffAt < 400 then return end
  setMouse(true, false)
end, false)
RegisterKeyMapping('cbrn_dev_cursor', 'CBRN Messgerät: Mauszeiger ein/aus', 'keyboard', (DC.Keys and DC.Keys.cursor) or 'EQUALS')

local function closeUi()
  D.held, D.def = false, nil
  setMouse(false); stopHold(); nui({ type = 'dev', cmd = 'close' })
end

-- ---- Antworten/Zustand vom Server
RegisterNetEvent('cbrn:dev:res', function(r)
  if r.ev == 'take' then
    if not r.ok then return notify('error', r.msg or 'Nicht möglich.') end
    D.held, D.def, D.visible = true, r.def, true
    startHold(r.def.id); nui({ type = 'dev', cmd = 'open', def = r.def, state = r.state, keys = DC.Keys })
    if not r.resume then notify('success', r.msg or 'Messgerät entnommen.') end
  elseif r.ev == 'return' then
    if not r.ok then return notify('error', r.msg or 'Nicht möglich.') end
    closeUi(); notify('success', r.msg or 'Messgerät zurückgelegt.')
  elseif r.ev == 'save' then
    nui({ type = 'dev', cmd = 'saved', id = r.id, ok = r.ok, msg = r.msg })
  elseif r.ev == 'action' then
    if not r.ok then nui({ type = 'dev', cmd = 'toast', text = r.msg or 'Nicht möglich.', bad = true }) end
  elseif r.ev == 'source' or r.ev == 'debug' then
    if r.lines then for _, l in ipairs(r.lines) do print('[cbrn:debug] ' .. l) end; notify('inform', table.concat(r.lines, '\n')) else notify(r.ok and 'success' or 'error', r.msg or '') end
  elseif not r.ok then notify('error', r.msg or 'Nicht möglich.') end
end)
RegisterNetEvent('cbrn:dev:state', function(s)
  if s.released then if D.held then closeUi(); notify('inform', 'Das Messgerät wurde ins Fahrzeug zurückgelegt.') end return end
  if D.held then nui({ type = 'dev', cmd = 'state', state = s }) end
end)
RegisterNetEvent('cbrn:dev:sampleList', function(l) nui({ type = 'dev', cmd = 'samples', list = l }) end)

-- ---- NUI -> Client -> Server (nur Aktionen, keine Werte)
RegisterNUICallback('devAction', function(d, cb) if D.held and d and type(d.act) == 'string' then TriggerServerEvent('cbrn:dev:action', d.act, d.payload) end cb('ok') end)
RegisterNUICallback('devMouse', function(d, cb) setMouse(d and d.on, d and d.typing); cb('ok') end)
RegisterNUICallback('devSamples', function(_, cb) TriggerServerEvent('cbrn:dev:samples'); cb('ok') end)

-- ---- Eingaben: nur solange ein Gerät in der Hand ist (spart Leistung) -------------------------------------------
local KEYS = { [172] = 'up', [173] = 'down', [174] = 'left', [175] = 'right', [191] = 'enter', [201] = 'enter' }
CreateThread(function()
  local lastCheck = 0
  while true do
    if D.held then
      local ped = PlayerPedId()
      if D.anim and DC.Anim and not IsEntityPlayingAnim(ped, DC.Anim.dict, DC.Anim.clip or 'base', 3) and not IsPedInAnyVehicle(ped, false) and not IsPedRagdoll(ped) and not IsPedSwimming(ped) then
        TaskPlayAnim(ped, DC.Anim.dict, DC.Anim.clip or 'base', 2.0, 2.0, -1, DC.Anim.flag or 49, 0.0, false, false, false)
      end
      if GetGameTimer() - lastCheck > 1000 then -- Tod/Fahrzeug: der Server entscheidet, ob das Gerät ins Fahrzeug zurückgelegt wird
        lastCheck = GetGameTimer()
        if IsEntityDead(ped) or (DC.ForceReturnOnVehicle and IsPedInAnyVehicle(ped, false)) then TriggerServerEvent('cbrn:dev:forceReturn') end
      end
      if D.mouse then
        for _, c in ipairs({ 1, 2, 24, 25, 69, 70, 92, 140, 141, 142, 257 }) do DisableControlAction(0, c, true) end -- kein Umsehen/Schlagen mit dem Mauszeiger
      elseif D.visible then
        for c, k in pairs(KEYS) do
          if c ~= 191 and c ~= 201 and IsControlJustPressed(0, c) then nui({ type = 'dev', cmd = 'key', key = k }) end
        end
        -- Enter: kurz = Enter, ≥ 1 s halten = Ein/Aus (wie die Gerätetaste)
        if IsControlJustPressed(0, 191) or IsControlJustPressed(0, 201) then D.enterAt, D.enterFired = GetGameTimer(), false end
        if D.enterAt and not D.enterFired and (IsControlPressed(0, 191) or IsControlPressed(0, 201)) and GetGameTimer() - D.enterAt >= 1000 then D.enterFired = true; nui({ type = 'dev', cmd = 'key', key = 'enterlong' }) end
        if D.enterAt and (IsControlJustReleased(0, 191) or IsControlJustReleased(0, 201)) then
          if not D.enterFired then nui({ type = 'dev', cmd = 'key', key = 'enter' }) end
          D.enterAt = nil
        end
      end
      if IsControlJustPressed(0, 177) and not D.mouse then D.visible = not D.visible; nui({ type = 'dev', cmd = 'visible', on = D.visible }) end -- Rücktaste: ein-/ausblenden
      Wait(0)
    else Wait(500) end
  end
end)

AddEventHandler('onResourceStop', function(res)
  if res ~= GetCurrentResourceName() then return end
  if D.held then SetNuiFocus(false, false); stopHold() end
end)

-- ---- Admin / Entwickler: Messquellen erstellen, Debug ---------------------------------------------------------
RegisterNetEvent('cbrn:source:options', function(o)
  local subs, nucs = { { value = '', label = '(zufällig / keiner)' } }, { { value = '', label = '(keiner)' } }
  for _, s in ipairs(o.substances or {}) do subs[#subs + 1] = { value = s.id, label = s.name } end
  for _, s in ipairs(o.nuclides or {}) do nucs[#nucs + 1] = { value = s.id, label = s.name } end
  local r = lib.inputDialog('Messquelle erstellen (an deiner Position)', {
    { type = 'select', label = 'Typ', required = true, default = 'RADIOLOGICAL', options = { { value = 'RADIOLOGICAL', label = 'Radiologisch (µSv/h in 1 m)' }, { value = 'CHEMICAL', label = 'Chemisch (ppm im Kern)' } } },
    { type = 'select', label = 'Stoff (chemisch)', options = subs, searchable = true, default = '' },
    { type = 'select', label = 'Nuklid (radiologisch)', options = nucs, searchable = true, default = '' },
    { type = 'number', label = 'Intensität', description = ('Standard: radiologisch %s, chemisch %s'):format(o.defaults.RADIOLOGICAL.intensity, o.defaults.CHEMICAL.intensity), min = 0.001 },
    { type = 'number', label = 'Radius (m)', description = ('Standard: radiologisch %s, chemisch %s'):format(o.defaults.RADIOLOGICAL.radius, o.defaults.CHEMICAL.radius), min = 1 },
  })
  if not r then return end
  local sub = r[1] == 'CHEMICAL' and r[2] or r[3]
  TriggerServerEvent('cbrn:source:create', { type = r[1], substance_id = (sub ~= '' and sub or nil), intensity = r[4], radius = r[5] })
end)
RegisterNetEvent('cbrn:admin:grant', function(action)
  if action == 'source' then TriggerServerEvent('cbrn:source:options')
  elseif action == 'clearsources' then TriggerServerEvent('cbrn:source:clear')
  elseif action == 'debugdevice' then TriggerServerEvent('cbrn:dev:debug', 'device')
  elseif action == 'debugmeasurement' then TriggerServerEvent('cbrn:dev:debug', 'measurement')
  elseif action == 'deviceerror' then TriggerServerEvent('cbrn:dev:debug', 'error') end
end)
RegisterCommand('createcbrnsource', function() CBRN.requestAdmin('source') end, false)
RegisterCommand('clearcbrnsources', function() CBRN.requestAdmin('clearsources') end, false)
RegisterCommand('debugdevice', function() CBRN.requestAdmin('debugdevice') end, false)
RegisterCommand('debugmeasurement', function() CBRN.requestAdmin('debugmeasurement') end, false)
RegisterCommand('cbrndeviceerror', function() CBRN.requestAdmin('deviceerror') end, false)

-- Diagnose: /cbrnscrolltest – 10 s lang Mausrad drehen; zeigt, welche Control-IDs ankommen (falls das Rad im Menü nicht in beide Richtungen wählt)
RegisterCommand('cbrnscrolltest', function()
  notify('inform', 'Drehe 10 Sekunden das Mausrad hoch und runter (Ausgabe in F8).')
  CreateThread(function()
    local t0 = GetGameTimer()
    while GetGameTimer() - t0 < 10000 do
      for _, c in ipairs({ 14, 15, 16, 17, 99, 100, 180, 181, 241, 242 }) do
        DisableControlAction(0, c, true)
        if IsDisabledControlJustPressed(0, c) then print(('[cbrn] Mausrad-Control %d'):format(c)) end
      end
      Wait(0)
    end
  end)
end, false)
