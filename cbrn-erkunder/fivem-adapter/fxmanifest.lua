fx_version 'cerulean'
game 'gta5'
lua54 'yes'

description 'CBRN Erkunder – optionaler FiveM-Adapter (Telemetrie + NUI). Die Web-App läuft auch ohne FiveM.'

server_script 'server.lua'
client_script 'client.lua'

-- Optional: gebaute Web-App (dist/) hier hineinkopieren und als NUI öffnen.
ui_page 'web/index.html'
files { 'web/**/*' }
