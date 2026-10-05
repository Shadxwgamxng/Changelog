fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'cbrn-erkunder'
description 'CBRN-Erkunder – Bordcomputer fuer den Erkundungswagen (Simulation): Einsatz, Messfahrt, Messgeraete, Stoffdatenbank'
version '1.0.0'

dependencies { 'ox_lib' }   -- optional zusätzlich: ox_inventory (Items)

shared_scripts { '@ox_lib/init.lua', 'config.lua', 'sample_config.lua' }
client_scripts { 'client.lua', 'client/interaction.lua', 'client/sample.lua', 'client/offset.lua', 'client/devices.lua' }
server_scripts { 'server/bridge.lua', 'server/main.js' }

ui_page 'web/index.html'
files {
  'web/index.html',
  'web/devices.js',
  'web/devices.css',
  'app/**',
  'config.json',
}
