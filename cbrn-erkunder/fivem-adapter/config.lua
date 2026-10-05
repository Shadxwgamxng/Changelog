Config = {
  -- Adresse der CBRN-Erkunder-Web-App (Backend + Oberfläche). Muss vom SPIELER-PC aus erreichbar sein
  -- (im Heimnetz z. B. die IP des Server-Rechners, öffentlich: Domain/Reverse-Proxy).
  WebUrl = 'http://127.0.0.1:3001',
  -- Adresse des Backends, wie der FiveM-SERVER sie erreicht (meist identisch/lokal).
  ApiUrl = 'http://127.0.0.1:3001',
  Token = 'dev-token',            -- = Umgebungsvariable FIVEM_TOKEN des Backends
  IntervalMs = 1000,              -- Telemetrie-Takt

  -- Spawnnamen der Fahrzeuge, in denen der Computer des CBRN-Erkunders verfügbar ist.
  -- Der Computer lässt sich NUR von den BEIFAHRERPLÄTZEN aus öffnen, nie vom Fahrersitz.
  -- Beispiel: Models = { 'firetruk', 'riot', 'mule' }
  Models = { 'firetruk' },
  Control = 38,                   -- Taste zum Öffnen: 38 = E (INPUT_CONTEXT)
  PromptText = 'Drücke ~INPUT_CONTEXT~ um den Computer des CBRN-Erkunders zu öffnen',

  -- GetWindDirection() liefert je nach Server-/Wettersystem die Richtung, in die der Wind WEHT.
  -- true  = Vektor zeigt in Windrichtung (wohin) -> "kommt aus" = +180°
  -- false = Vektor zeigt dorthin, woher der Wind kommt
  WindVectorIsTravelDirection = true,
  SendWeather = true,
}
