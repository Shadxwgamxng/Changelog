fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'cbrn-erkunder'
description 'CBRN-Erkunder – FiveM-Adapter: Messfahrt-Position, GTA-Wetter und NUI-Fenster (Web-App läuft eigenständig)'
version '0.2.0'

shared_script 'config.lua'
server_script 'server.lua'
client_script 'client.lua'

ui_page 'web/index.html'
files { 'web/index.html' }
