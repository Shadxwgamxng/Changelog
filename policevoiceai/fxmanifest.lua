fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'policevoiceai'
author 'PoliceVoiceAI'
description 'FivePD Erweiterung: Voice-AI NPCs (Speech-to-Text, LLM, Text-to-Speech, 3D Voice) fuer echtes Polizei-Rollenspiel'
version '1.0.0'

shared_scripts {
    'config.lua',
    'shared/locales.lua',
    'shared/utils.lua',
    'shared/personas.lua'
}

client_scripts {
    'client/nui.lua',
    'client/voice_capture.lua',
    'client/voice_playback.lua',
    'client/animation.lua',
    'client/npc_interaction.lua',
    'client/fivepd_integration.lua',
    'client/main.lua'
}

server_scripts {
    '@oxmysql/lib/MySQL.lua',
    'server/security.lua',
    'server/database.lua',
    'server/personality.lua',
    'server/npc_manager.lua',
    'server/stt_provider.lua',
    'server/ai_provider.lua',
    'server/tts_provider.lua',
    'server/fallback.lua',
    'server/conversation_manager.lua',
    'server/mdt.lua',
    'server/callouts.lua',
    'integrations/fivepd.lua',
    'server/main.lua'
}

ui_page 'web/index.html'

files {
    'web/index.html',
    'web/css/style.css',
    'web/js/app.js'
}

dependencies {
    'oxmysql'
}
