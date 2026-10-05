fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'cbrn-erkunder'
description 'CBRN-Erkunder – Bordcomputer fuer den Erkundungswagen (Simulation): Einsatz, Messfahrt, Messgeraete, Stoffdatenbank'
version '1.0.0'

shared_script 'config.lua'
client_script 'client.lua'
server_script 'server/main.js'

ui_page 'web/index.html'
files {
  'web/index.html',
  'web/monitor.png',
  'app/**',
  'config.json',
}
