Config = {
  ApiUrl = 'http://127.0.0.1:3001',   -- Adresse des CBRN-Erkunder-Backends
  Token = 'dev-token',                  -- = Umgebungsvariable FIVEM_TOKEN des Backends
  Vehicle = 'CBRN-01',                  -- Fahrzeugkennung in der Web-App
  IntervalMs = 1000,
  -- Fahrzeug-Modelle, die als CBRN-Erkunder gelten (Spawnnamen anpassen)
  Models = { 'cbrn', 'cbrnerk' },
  -- Optional: nur diese Befehlsfolge öffnet die NUI
  Command = 'cbrn',
}
