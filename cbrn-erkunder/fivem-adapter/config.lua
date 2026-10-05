Config = {
  -- Adresse der CBRN-Erkunder-Web-App (Backend + Oberfläche). Muss vom SPIELER-PC aus erreichbar sein
  -- (im Heimnetz z. B. die IP des Server-Rechners, öffentlich: Domain/Reverse-Proxy).
  WebUrl = 'http://127.0.0.1:3001',
  -- Adresse des Backends, wie der FiveM-SERVER sie erreicht (meist identisch/lokal).
  ApiUrl = 'http://127.0.0.1:3001',
  Token = 'dev-token',            -- = Umgebungsvariable FIVEM_TOKEN des Backends
  Vehicle = 'FFW-11-71-01',            -- Fahrzeugkennung in der Web-App
  IntervalMs = 1000,              -- Telemetrie-Takt
  -- Spawnnamen der Fahrzeuge, die als CBRN-Erkunder gelten. Leer = JEDES Fahrzeug (zum Testen).
  Models = {},
  Command = 'cbrn',               -- öffnet/schließt das Fenster
  Key = 'F7',                     -- Standard-Taste (änderbar in den GTA-Tastenbelegungen)
  -- GetWindDirection() liefert je nach Server-/Wettersystem die Richtung, in die der Wind WEHT.
  -- true  = Vektor zeigt in Windrichtung (wohin) -> "kommt aus" = +180°
  -- false = Vektor zeigt dorthin, woher der Wind kommt
  WindVectorIsTravelDirection = true,
  SendWeather = true,
}
