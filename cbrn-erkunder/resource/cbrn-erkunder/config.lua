Config = {
  -- Spawnnamen der Fahrzeuge, in denen der Computer des CBRN-Erkunders verfuegbar ist.
  -- Der Computer laesst sich NUR von den BEIFAHRERPLAETZEN aus oeffnen, nie vom Fahrersitz.
  -- Beispiel: Models = { 'ELWBlaichach', 'zweitesFahrzeug' }
  Models = { 'ELWBlaichach' },
  Control = 38,                   -- Taste zum Oeffnen: 38 = E (INPUT_CONTEXT)
  PromptText = 'Dr\195\188cke ~INPUT_CONTEXT~ um den Computer des CBRN-Erkunders zu \195\182ffnen',
  IntervalMs = 1000,              -- Telemetrie-Takt (Position/Kurs/Speed/Wetter)

  -- GetWindDirection() liefert je nach Server-/Wettersystem die Richtung, in die der Wind WEHT.
  -- true  = Vektor zeigt in Windrichtung (wohin) -> "kommt aus" = +180 Grad
  -- false = Vektor zeigt dorthin, woher der Wind kommt
  WindVectorIsTravelDirection = true,
  SendWeather = true,
  SmokeCheckMs = 15000,           -- Abstand der z_fire-Rauchabfrage (ms)
  UseZFire = true,                -- Rauch von z_fire (Export getSmokeInRange) fuer die Rauchgasmessung nutzen
}
