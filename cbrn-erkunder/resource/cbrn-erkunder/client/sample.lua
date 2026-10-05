-- Probenentnahme: Set -> J am Punkt -> Entnahme (Animation + Fortschritt) -> Herkunft/Art -> Probe-ID -> Beschriften -> Ablegen (Einlagerung).
-- Der Client entscheidet NICHTS allein: alle Schritte werden vom Server bestätigt (Events cbrn:sample:*).
CBRN = CBRN or {}
local S = CBRN.State
local KEY_USE, KEY_CANCEL = Config.Sample.Keys.use, Config.Sample.Keys.cancel
local SAMPLE_TYPES = {
  { value = 'BODEN', label = 'Boden' }, { value = 'WASSER', label = 'Wasser' }, { value = 'LUFT', label = 'Luft' }, { value = 'FLUESSIGKEIT', label = 'Flüssigkeit' },
  { value = 'FESTSTOFF', label = 'Feststoff' }, { value = 'ABSTRICH', label = 'Abstrich' }, { value = 'SONSTIGE', label = 'Sonstige' },
}

local function notify(t, d) lib.notify({ type = t, description = d, position = 'top' }) end
local function hud(d) SendNUIMessage({ type = 'hud', data = d }) end
CBRN.hud = hud

local function dbg(...) if Config.Sample.Debug then print('[cbrn:sample]', ...) end end

-- ---- HUD (unten rechts, unabhängig vom Computer)
local lastHud = ''
local function refreshHud(force)
  local d
  if S.phase == 'collecting' then return end -- Fortschritt zeichnet die Entnahme selbst
  if S.phase == 'carrying' and S.sample then
    d = { mode = 'taken', id = S.sample.id, label = S.sample.label, atPoint = S.atStorage, key = KEY_USE }
  elseif S.kit then
    d = { mode = 'kit', atPoint = S.atSample, key = KEY_USE, cancelKey = KEY_CANCEL }
  else d = { mode = 'off' } end
  local sig = json.encode(d)
  if force or sig ~= lastHud then lastHud = sig; hud(d) end
end
CBRN.refreshHud = refreshHud

-- ---- Zustand beobachten (nur aktiv, solange Set oder Probe vorhanden – spart Leistung)
CreateThread(function()
  while true do
    if S.kit or S.phase == 'carrying' then
      local veh = CBRN.nearestVehicle(12.0)
      S.veh = veh; S.atSample, S.atStorage = false, false
      if veh then
        local ds, dt = CBRN.distanceTo(veh, 'sample'), CBRN.distanceTo(veh, 'storage')
        S.atSample = ds ~= nil and ds <= Config.Sample.InteractDistance
        S.atStorage = dt ~= nil and dt <= Config.SampleReturnDistance
      end
      refreshHud(false)
      Wait(200)
    else
      S.veh, S.atSample, S.atStorage = nil, false, false
      Wait(600)
    end
  end
end)

local function blocked()
  local ped = PlayerPedId()
  return IsPedInAnyVehicle(ped, false) or IsEntityDead(ped) or IsPedRagdoll(ped) or IsPedCuffed(ped) or IsPedFalling(ped) or IsPauseMenuActive()
end

local function playAnim(a)
  local ped = PlayerPedId()
  if a.dict then
    lib.requestAnimDict(a.dict)
    TaskPlayAnim(ped, a.dict, a.clip, 8.0, -8.0, -1, 1, 0.0, false, false, false)
  else TaskStartScenarioInPlace(ped, a.scenario, 0, true) end
end
local function stopAnim() ClearPedTasks(PlayerPedId()) end

-- ---- Beschriftung (Proben-ID ist unveränderlich)
local function labelFlow()
  if not S.sample then return false end
  local r = lib.inputDialog('PROBE BESCHRIFTEN', {
    { type = 'input', label = 'Proben-ID', default = S.sample.id, disabled = true },
    { type = 'input', label = 'Bezeichnung', description = 'z. B. Unbekannte Flüssigkeit', required = true, max = 60 },
    { type = 'input', label = 'Zusatzinformation', description = 'z. B. Probe vom Fahrbahnrand', max = 120 },
  })
  if not r then notify('inform', 'Die Probe muss beschriftet werden, bevor sie eingelagert werden kann.'); return false end
  TriggerServerEvent('cbrn:sample:label', S.sample.id, r[2], r[3] or '')
  return true
end

-- ---- Probenentnahme
local function collectionLoop(duration)
  S.phase = 'collecting'; S.cancel = false
  local ped = PlayerPedId()
  playAnim(Config.Sample.Anim)
  local t0 = GetGameTimer()
  while true do
    local el = GetGameTimer() - t0
    if el >= duration then break end
    local pct = math.floor(el / duration * 100)
    hud({ mode = 'progress', title = 'PROBENENTNAHME', text = 'Probe wird entnommen …', pct = pct, cancelKey = KEY_CANCEL })
    local veh, abort = S.veh, nil
    if S.cancel then abort = 'Probenentnahme abgebrochen.'
    elseif IsEntityDead(ped) or IsPedInAnyVehicle(ped, false) then abort = 'Probenentnahme unterbrochen.'
    elseif not veh or (CBRN.distanceTo(veh, 'sample') or 99) > Config.Sample.InteractDistance + 0.75 then abort = 'Du hast dich vom Entnahmepunkt entfernt.' end
    if abort then
      stopAnim(); TriggerServerEvent('cbrn:sample:cancelCollection'); S.phase = 'idle'; S.busy = false; refreshHud(true); notify('error', abort); return false
    end
    Wait(50)
  end
  stopAnim(); hud({ mode = 'progress', title = 'PROBENENTNAHME', text = 'Probe entnommen', pct = 100 })
  return true
end

local function askOrigin(token)
  while true do
    local r = lib.inputDialog('PROBENHERKUNFT', {
      { type = 'input', label = 'Woher stammt die Probe?', description = 'z. B. Boden, Wasser, Luft, Fahrzeug, Gebäude, unbekannte Flüssigkeit, unbekanntes Material', required = true, min = 2, max = 120 },
      { type = 'select', label = 'Probenart', options = SAMPLE_TYPES, required = true, default = 'SONSTIGE' },
      { type = 'textarea', label = 'Beschreibung (optional)', description = 'z. B. Dunkle Flüssigkeit auf Asphalt neben dem beschädigten Fahrzeug.', autosize = true, max = 300 },
    })
    if r then TriggerServerEvent('cbrn:sample:create', token, r[1], r[2], r[3] or ''); return end
    notify('inform', 'Die Probe wurde bereits entnommen – bitte Herkunft und Probenart angeben.')
  end
end

function CBRN.startCollection(confirmed)
  if S.busy then return end
  if not S.veh or not S.atSample then return notify('error', 'Du befindest dich nicht an einem Probenentnahmepunkt.') end
  S.busy = true
  TriggerServerEvent('cbrn:sample:startCollection', VehToNet(S.veh), confirmed == true, CBRN.session and CBRN.session.name or nil)
end

function CBRN.returnSample()
  if S.busy or not S.sample then return end
  if not S.veh or not S.atStorage then return notify('error', 'Du befindest dich nicht am vorgesehenen Probenablagepunkt.') end
  if not S.sample.labeled then
    S.busy = true
    if not labelFlow() then S.busy = false; return end
    local t = GetGameTimer() + 4000
    while S.busy and not S.sample.labeled and GetGameTimer() < t do Wait(50) end -- Server bestätigt die Beschriftung
    S.busy = false
    if not S.sample.labeled then return end
  end
  S.busy = true
  playAnim(Config.Sample.ReturnAnim)
  local dur, t0 = Config.Sample.ReturnDuration, GetGameTimer()
  while GetGameTimer() - t0 < dur do hud({ mode = 'progress', title = 'PROBE ABLEGEN', text = 'Probe wird eingelagert …', pct = math.floor((GetGameTimer() - t0) / dur * 100) }); Wait(50) end
  stopAnim()
  TriggerServerEvent('cbrn:sample:return', VehToNet(S.veh))
end

-- ---- Tasten (ox_lib): nur wirksam, wenn Set/Probe vorhanden – blockieren nichts dauerhaft
lib.addKeybind({ name = 'cbrn_sample_use', description = 'CBRN: Probe entnehmen / ablegen', defaultMapper = 'keyboard', defaultKey = KEY_USE,
  onPressed = function()
    if S.busy or blocked() then return end
    if S.phase == 'carrying' then return CreateThread(CBRN.returnSample) end -- eigener Thread: enthält Wartezeiten/Animation
    if S.kit and S.phase == 'idle' then
      if not S.atSample then return notify('inform', 'Stelle dich an den Probenentnahmepunkt am Fahrzeug.') end
      CBRN.startCollection(false)
    end
  end })
lib.addKeybind({ name = 'cbrn_sample_cancel', description = 'CBRN: Probenentnahme abbrechen', defaultMapper = 'keyboard', defaultKey = KEY_CANCEL,
  onPressed = function()
    if S.phase == 'collecting' then S.cancel = true
    elseif S.phase == 'carrying' then notify('inform', 'Eine entnommene Probe kann nicht abgebrochen werden – lege sie am Fahrzeug ab.')
    elseif S.kit and not S.busy then TriggerServerEvent('cbrn:sample:returnKit') end
  end })

-- ---- Antworten des Servers
local H = {}
H.kit = function(r) S.kit = r.kit and true or false; if not S.kit then S.phase = 'idle'; end; refreshHud(true); if r.msg then notify('success', r.msg) end end
H.start = function(r)
  if r.needConfirm then
    S.busy = false
    local c = lib.alertDialog({ header = 'Keine aktive Einsatznummer', content = 'Es ist kein Einsatz aktiv.\n\nProbe trotzdem erstellen?', centered = true, cancel = true })
    if c == 'confirm' then CBRN.startCollection(true) end
    return
  end
  CreateThread(function()
    if collectionLoop(r.duration) then askOrigin(r.token) end
  end)
end
H.create = function(r)
  S.sample = { id = r.sample.id, labeled = false }; S.phase = 'carrying'; S.busy = false
  notify('success', ('Probe %s wurde entnommen.'):format(r.sample.id)); refreshHud(true)
  CreateThread(function() Wait(300); labelFlow() end)
end
H.label = function(r) S.sample.labeled = true; S.sample.label = r.sample.label; S.busy = false; notify('success', 'Probe erfolgreich beschriftet.'); refreshHud(true) end
H['return'] = function(r)
  stopAnim(); S.busy = false; S.sample = nil; S.phase = 'idle'; refreshHud(true)
  notify('success', ('Probe %s wurde eingelagert.'):format(r.sample.id))
end
H.sync = function(r)
  S.kit = r.kit and true or false
  if r.carrying then S.sample = { id = r.carrying.id, labeled = r.carrying.labeled, label = r.carrying.label }; S.phase = 'carrying' else S.sample = nil; if S.phase == 'carrying' then S.phase = 'idle' end end
  refreshHud(true)
end
H.debug = function(r) print('[cbrn:sample] Server-Zustand:', json.encode(r.state)) end

RegisterNetEvent('cbrn:sample:res', function(r)
  dbg('res', json.encode(r))
  if not r.ok then
    if r.ev == 'start' or r.ev == 'create' or r.ev == 'label' or r.ev == 'return' then S.busy = false end
    if r.ev == 'start' then S.phase = S.phase == 'collecting' and 'idle' or S.phase end
    if r.ev == 'return' then stopAnim() end
    if r.ev == 'create' then S.phase = S.sample and 'carrying' or 'idle'; refreshHud(true) end
    notify('error', r.msg or 'Aktion fehlgeschlagen.')
    refreshHud(true); return
  end
  if H[r.ev] then H[r.ev](r) end
end)

-- Nach dem Laden: Zustand vom Server holen (Set im Inventar, getragene Probe nach Reconnect)
CreateThread(function()
  while not NetworkIsPlayerActive(PlayerId()) do Wait(500) end
  Wait(2500); TriggerServerEvent('cbrn:sample:sync')
end)

AddEventHandler('onResourceStop', function(res)
  if res ~= GetCurrentResourceName() then return end
  if S.phase == 'collecting' then ClearPedTasks(PlayerPedId()) end
  hud({ mode = 'off' })
end)

-- ---- Admin-Befehle (/offset, /debugsample, /debugsamplepoint): Berechtigung beim Server anfragen, mit sichtbarer Rückmeldung
local adminWait
function CBRN.requestAdmin(action)
  local t = GetGameTimer(); adminWait = t
  notify('inform', 'Prüfe Berechtigung …')
  TriggerServerEvent('cbrn:admin:request', action)
  CreateThread(function()
    Wait(4000)
    if adminWait == t then
      adminWait = nil
      notify('error', 'Keine Antwort vom Server. Läuft die Ressource "cbrn-erkunder" (Server-Konsole prüfen)?')
    end
  end)
end
RegisterNetEvent('cbrn:admin:deny', function(msg) adminWait = nil; notify('error', msg) end)

-- ---- Debug
RegisterNetEvent('cbrn:admin:grant', function(action)
  adminWait = nil
  if action == 'debugsample' then
    print('[cbrn:sample] Client:', json.encode({ kit = S.kit, phase = S.phase, busy = S.busy, sample = S.sample, atSample = S.atSample, atStorage = S.atStorage }))
    TriggerServerEvent('cbrn:sample:debug')
  elseif action == 'debugsamplepoint' then CBRN.togglePointDebug() end
end)
RegisterCommand('debugsample', function() CBRN.requestAdmin('debugsample') end, false)
RegisterCommand('debugsamplepoint', function() CBRN.requestAdmin('debugsamplepoint') end, false)

local drawing = false
function CBRN.togglePointDebug()
  drawing = not drawing
  if not drawing then return notify('inform', 'Punkt-Anzeige aus.') end
  CreateThread(function()
    while drawing do
      local veh = CBRN.nearestVehicle(25.0)
      if veh then
        local s, off = CBRN.worldPoint(veh, 'sample'); local st = CBRN.worldPoint(veh, 'storage')
        DrawMarker(28, s.x, s.y, s.z, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.08, 0.08, 0.08, 255, 0, 0, 200, false, false, 2, false, nil, nil, false)
        DrawMarker(28, st.x, st.y, st.z, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.08, 0.08, 0.08, 0, 120, 255, 200, false, false, 2, false, nil, nil, false)
        if not CBRN._dbgPrinted or CBRN._dbgPrinted ~= veh then
          CBRN._dbgPrinted = veh
          print(('[cbrn:sample] Vehicle: %s\nOffset: X %.3f Y %.3f Z %.3f\nWorld: %.3f %.3f %.3f'):format(GetDisplayNameFromVehicleModel(GetEntityModel(veh)), off.x, off.y, off.z, s.x, s.y, s.z))
        end
        Wait(0)
      else Wait(500) end
    end
    CBRN._dbgPrinted = nil
  end)
  notify('inform', 'Punkt-Anzeige an: rot = Entnahme, blau = Ablage.')
end
