// Laufzeit-Konfiguration (ohne Rebuild änderbar). In FiveM-NUI hier die API-Adresse setzen.
window.CBRN_CONFIG = {
  apiBase: '',                 // '' = gleicher Origin; z. B. 'http://127.0.0.1:3001' für NUI
  wsUrl: '',                   // '' = automatisch aus Origin; z. B. 'ws://127.0.0.1:3001/ws'
  // Optionale Raster-Hintergrundkarte. Leer lassen => komplett offline (nur Gitter/Sektoren).
  tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  tileAttribution: '© OpenStreetMap-Mitwirkende',
};
