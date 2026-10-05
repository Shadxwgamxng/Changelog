-- ===========================================================================================
-- Probenentnahme-System: Konfiguration (wird von Client UND Server gelesen)
-- ===========================================================================================

-- Fahrzeugmodell -> lokaler Offset (X = rechts/links, Y = vorne/hinten, Z = oben/unten), ermittelt mit /offset.
-- Der Punkt am Fahrzeug ist die Ausgabe-/Abgabestelle: hier nimmt man das Probenentnahmeset und gibt entnommene Proben wieder ab.
-- Die Probe selbst wird beliebig im Gelände entnommen (J).
-- Einzelner Punkt:       [`modell`] = vector3(0.423, -1.274, 1.182)
-- Getrennte Punkte:      [`modell`] = { sample = vector3(...), storage = vector3(...) }
Config.SamplePoints = {
    [`elwblaichach`] = vector3(-0.950, 0.168, 0.785),
}

-- Weitere Punktarten je Fahrzeugmodell (alle mit /offset ermittelbar): sample, storage, device, computer, equipment
--   [`modell`] = { sample = vector3(..), storage = vector3(..), device = vector3(..), computer = vector3(..), equipment = vector3(..) }
-- Ohne eigenen 'device'-Punkt dient der Probenpunkt auch als Messgerätefach (ein Kreis, Auswahlmenü).
-- Messgerätefach getrennt vom Probenpunkt: Config.DevicePoints = { [`elwblaichach`] = vector3(x, y, z) }   (hier die Werte aus /offset eintragen)
Config.DevicePoints = {
    -- [`elwblaichach`] = vector3(0.0, 0.0, 0.0),
}

-- Handmessgeräte (Entnahme aus dem Fahrzeug, Bedienung per NUI)
Config.Devices = {
  MaxEquipped = 1,                -- so viele Messgeräte gleichzeitig pro Spieler (Config.MaxEquippedDevices / MaxActiveDevices)
  BatteryScale = 1.0,             -- Batterie-Verbrauch: 1.0 = Standard, 2.0 = doppelt so schnell
  ForceReturnOnVehicle = true,    -- Gerät wird automatisch ins Fahrzeug zurückgelegt, wenn man in ein Fahrzeug steigt
  Keys = { cursor = 'EQUALS', hide = 'BACK' },   -- cursor: Mauszeiger ein (EQUALS = Taste ´ auf deutscher Tastatur; jeder Spieler kann sie unter Einstellungen > Tastenbelegung > FiveM ändern) · Rücktaste: Gerät ein-/ausblenden · Pfeiltasten + Enter bedienen das Gerät (Enter halten: Ein/Aus)
  Anim = { dict = 'amb@code_human_in_bus_passenger_idles@female@tablet@base', clip = 'base', flag = 49 },   -- Haltepose (nil = keine Animation)
  Props = {},                     -- optional je Geraet: Props = { dlm = { model = 'prop_...', bone = 28422, pos = vec3(0,0,0), rot = vec3(0,0,0) } }
}

Config.OffsetStep = 0.01              -- Schrittweite des Offset Finders (Meter)
Config.OffsetStepFast = 0.10          -- SHIFT + Pfeiltaste
Config.OffsetStepSlow = 0.01          -- STRG + Pfeiltaste
Config.SampleCollectionDuration = 5000   -- Dauer der Probenentnahme (ms)
Config.SampleReturnDistance = 1.5        -- max. Abstand zum Ablagepunkt (m)
Config.MaxSamples = 20                   -- Kapazität des Probenlagers je Fahrzeug

-- Berechtigung für Jobs (nur bei vorhandenem Framework: qb-core / qbx_core / es_extended; sonst eigene Funktion unten)
Config.RequireJob = false
Config.AllowedJobs = { police = true, fire = true, ems = true }

Config.Sample = {
  Debug = false,
  InteractDistance = 2.0,             -- max. Abstand zum Entnahmepunkt (m)
  CircleRadius = 1.5,                 -- so nah musst du am Punkt stehen, um zu interagieren (m)
  CircleShowDistance = 2.8,           -- ab dieser Entfernung wird der Pin (Kreis mit Taste) angezeigt (m)
  HoldTime = 1000,                    -- so lange muss J im Kreis gehalten werden (ms)
  -- Wer darf /offset, /debugsample, /debugsamplepoint? Erlaubt ist, wer EINES davon erfüllt:
  --  1) ACE-Recht AdminAce:   add_ace group.admin cbrn.offset allow
  --  2) ACE 'command' (Standard-Admins: add_ace group.admin command allow)
  --  3) Eintrag in AdminIdentifiers, z. B. ['license:abc123...'] = true  (bei Ablehnung steht dein Identifier in der Server-Konsole)
  --  4) Framework-Admin (qb-core / qbx_core / es_extended)
  AdminAce = 'cbrn.offset',
  AdminIdentifiers = {},
  AllowWithoutIncident = true,        -- false: ohne aktiven Einsatz keine Probe; true: Rückfrage "Probe trotzdem erstellen?"
  UseInventory = true,                -- ox_inventory automatisch nutzen, falls gestartet (Items siehe README); sonst interne Verwaltung
  KitItem = 'sample_collection_kit',
  ContainerItem = 'sample_container',
  ContainerType = 'UNIVERSAL SAMPLE CONTAINER',
  Keys = { use = 'J', cancel = 'BACK' },   -- J: im Kreis halten (Set nehmen / Probe abgeben), im Gelände tippen (Probe entnehmen) · Rücktaste: Entnahme abbrechen (ESC öffnet das Pause-Menü und kann nicht belegt werden)
  Anim = { scenario = 'CODE_HUMAN_MEDIC_KNEEL' },   -- alternativ: { dict = '...', clip = '...' }
  ReturnAnim = { scenario = 'CODE_HUMAN_MEDIC_KNEEL' },
  ReturnDuration = 2000,
  -- Dauer der Analysen im CBRN-Computer (ms)
  AnalysisDurations = { CHEMICAL = 60000, RADIOLOGICAL = 45000, BIOLOGICAL = 120000, GENERAL = 30000 },
  -- Tasten des Offset Finders (GTA-Control-IDs)
  OffsetKeys = { up = 172, down = 173, left = 174, right = 175, zUp = 10, zDown = 11, save = 191, cancel = 177, fast = 21, slow = 36 },
  -- Eigene Berechtigungsprüfung (überschreibt die Framework-Erkennung): function(src) return true/false end
  CustomPermission = nil,
}

-- ------------------------------------------------------------------------------------------
-- Hilfsfunktionen (Client + Server)
-- ------------------------------------------------------------------------------------------
CBRN = CBRN or {}
local function u32(h) return h & 0xFFFFFFFF end
CBRN.u32 = u32
CBRN.Points = {}
for model, entry in pairs(Config.SamplePoints) do
  local sample, storage, device, computer, equipment
  if type(entry) == 'table' then sample = entry.sample or entry.storage; storage = entry.storage or entry.sample; device = entry.device; computer = entry.computer; equipment = entry.equipment
  else sample = entry; storage = entry end
  device = (Config.DevicePoints and Config.DevicePoints[model]) or device
  if sample then CBRN.Points[u32(model)] = { sample = sample, storage = storage or sample, device = device or sample, deviceShared = (device == nil), computer = computer, equipment = equipment } end
end
