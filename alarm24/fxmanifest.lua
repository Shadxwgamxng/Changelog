fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'alarm24'
author 'Alarm24'
description 'Alarm24 - Digitale Alarmierungs-App fuer ehrenamtliche Einsatzkraefte (EmergencyDispatch Integration)'
version '1.0.0'

shared_scripts {
    'config.lua',
    'shared/locales.lua',
    'shared/utils.lua'
}

client_scripts {
    'client/nui.lua',
    'client/alarm.lua',
    'client/main.lua'
}

server_scripts {
    '@oxmysql/lib/MySQL.lua',
    'server/database.lua',
    'server/permissions.lua',
    'server/users.lua',
    'server/alarms.lua',
    'integrations/emergencydispatch.lua',
    'server/main.lua'
}

ui_page 'web/index.html'

files {
    'web/index.html',
    'web/css/style.css',
    'web/js/app.js',
    'web/assets/*.png',
    'web/assets/*.svg',
    'web/sounds/*.mp3',
    'web/sounds/*.ogg'
}

dependencies {
    'oxmysql'
}
