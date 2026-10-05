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
  CircleRadius = 1.2,                 -- Radius des sichtbaren Kreises am Fahrzeugpunkt (m)
  CircleShowDistance = 12.0,          -- ab dieser Entfernung wird der Kreis angezeigt (m)
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
  local sample, storage
  if type(entry) == 'table' then sample = entry.sample or entry.storage; storage = entry.storage or entry.sample
  else sample = entry; storage = entry end
  if sample then CBRN.Points[u32(model)] = { sample = sample, storage = storage or sample } end
end
