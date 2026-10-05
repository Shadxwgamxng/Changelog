-- ===========================================================================================
-- Probenentnahme-Punkte je Fahrzeugmodell (lokale Fahrzeug-Offsets) – hier mit /offset ermittelte Werte eintragen.
-- Diese Datei enthält NUR deine Offsets; sie bleibt bei Updates der übrigen Konfiguration unverändert.
-- X = rechts(+)/links(-), Y = vorne(+)/hinten(-), Z = oben(+)/unten(-)
-- Einzelner Punkt (Set + Abgabe):   [`modell`] = vector3(0.423, -1.274, 1.182)
-- Getrennte Punkte:                 [`modell`] = { sample = vector3(...), storage = vector3(...) }
-- ===========================================================================================
Config.SamplePoints = {
    [`elwblaichach`] = {
        sample = vector3(-0.950, 0.158, 0.725),
        storage = vector3(-0.950, 0.158, 0.725)
    },
}
