// =========================================================
// POLICEVOICEAI - NUI (Phase 4/5/8/9/26)
// =========================================================
// Zustaendig fuer: Mikrofonaufnahme (getUserMedia/MediaRecorder), einfache
// RMS-basierte Voice-Activation-Erkennung und Audiowiedergabe mit
// GainNode/StereoPannerNode fuer die client-berechnete Pseudo-3D-Ortung
// (Lua liefert Lautstaerke/Pan, siehe client/voice_playback.lua). Enthaelt
// KEINE Spiellogik - alles Weitere passiert in Lua/Server.

const resourceName = (typeof GetParentResourceName === 'function') ? GetParentResourceName() : 'policevoiceai';

function fetchNui(name, data) {
    return fetch(`https://${resourceName}/${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify(data || {}),
    }).catch(() => {});
}

// =========================================================
// STATE
// =========================================================

let micStream = null;
let mediaRecorder = null;
let chunks = [];

let vadAudioCtx = null;
let analyser = null;

let mode = 'push_to_talk';
let vadThreshold = 0.035;
let silenceTimeoutMs = 700;
let maxRecordingMs = 12000;

let conversationActive = false;
let vadRecording = false;
let silenceTimer = null;
let maxRecTimer = null;

let playbackCtx = null;
let gainNode = null;
let pannerNode = null;
let currentSource = null;

let preferredMicDeviceId = null;
let micInitialized = false;

let micGain = 1.0; // Verstaerkungsfaktor auf das rohe Mikrofonsignal (0.3 - 3.0)
let micGainNode = null;
let processedMicStream = null; // gain-verarbeiteter Stream, der tatsaechlich aufgenommen/gesendet wird

// =========================================================
// MIKROFON / AUFNAHME
// =========================================================

function micConstraints(deviceId) {
    return { audio: deviceId ? { deviceId: { exact: deviceId } } : true };
}

function getUserMediaWithTimeout(timeoutMs, deviceId) {
    return Promise.race([
        navigator.mediaDevices.getUserMedia(micConstraints(deviceId)),
        new Promise((_, reject) => setTimeout(() => reject(new Error('getUserMedia timeout - keine Antwort/Berechtigungsdialog haengt')), timeoutMs)),
    ]);
}

function stopMicStream() {
    if (micStream) {
        micStream.getTracks().forEach((t) => t.stop());
        micStream = null;
    }
}

async function initMic() {
    try {
        micStream = await getUserMediaWithTimeout(8000, preferredMicDeviceId);
        setupVadAnalyser(); // baut u.a. processedMicStream (mit Gain) auf, muss vor setupRecorder laufen
        setupRecorder();
    } catch (e) {
        // Haengt am ehesten an einer fehlenden Mikrofon-Berechtigung, die einen
        // fokussierten Klick brauchte (siehe /policevoiceai_setupmic).
        fetchNui('micError', { message: String(e) });
    }
}

// Manueller Retry (siehe client/voice_capture.lua policevoiceai_setupmic):
// laeuft MIT NUI-Fokus, damit ein evtl. haengender Berechtigungsdialog klickbar ist.
async function retryMic() {
    try {
        if (!micStream) {
            micStream = await getUserMediaWithTimeout(15000, preferredMicDeviceId);
            setupVadAnalyser();
            setupRecorder();
        }
        fetchNui('micSetupDone', { ok: true });
    } catch (e) {
        fetchNui('micSetupDone', { ok: false, message: String(e) });
    }
}

// Wechselt das aktive Mikrofon-Geraet zur Laufzeit (Einstellungspanel), ohne
// dass die NUI neu geladen werden muss.
async function switchMicDevice(deviceId) {
    preferredMicDeviceId = deviceId || null;
    try {
        const newStream = await getUserMediaWithTimeout(8000, preferredMicDeviceId);
        stopMicStream();
        micStream = newStream;
        setupVadAnalyser();
        setupRecorder();
        return true;
    } catch (e) {
        fetchNui('micError', { message: String(e) });
        return false;
    }
}

// Setzt die Mikrofon-Verstaerkung live (Einstellungspanel-Regler) - wirkt sich
// direkt auf das tatsaechlich aufgenommene/an STT gesendete Signal aus, nicht
// nur auf eine Anzeige.
function setMicGain(value) {
    micGain = Math.max(0.3, Math.min(3.0, value || 1.0));
    if (micGainNode) micGainNode.gain.value = micGain;
    if (settingsTestGainNode) settingsTestGainNode.gain.value = micGain;
}

function setupRecorder() {
    const preferredType = 'audio/webm;codecs=opus';
    const mimeType = (window.MediaRecorder && MediaRecorder.isTypeSupported(preferredType)) ? preferredType : 'audio/webm';

    mediaRecorder = new MediaRecorder(processedMicStream || micStream, { mimeType });
    mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    mediaRecorder.onstop = async () => {
        if (chunks.length === 0) return;
        const blob = new Blob(chunks, { type: mediaRecorder.mimeType });
        chunks = [];
        const base64 = await blobToBase64(blob);
        fetchNui('speechRecorded', { audioBase64: base64, format: 'webm', mimeType: mediaRecorder.mimeType });
    };
}

function blobToBase64(blob) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result).split(',')[1] || '');
        reader.readAsDataURL(blob);
    });
}

function startRecording() {
    if (!mediaRecorder || mediaRecorder.state === 'recording') return;
    chunks = [];
    mediaRecorder.start();
    vadRecording = true;

    clearTimeout(maxRecTimer);
    maxRecTimer = setTimeout(() => stopRecording(), maxRecordingMs);
}

function stopRecording() {
    if (!mediaRecorder || mediaRecorder.state !== 'recording') return;
    mediaRecorder.stop();
    vadRecording = false;
    clearTimeout(silenceTimer);
    clearTimeout(maxRecTimer);
}

// =========================================================
// VOICE ACTIVATION (einfache RMS-Erkennung)
// =========================================================

let vadGeneration = 0;

function setupVadAnalyser() {
    // Vorherigen Context/Tick-Loop sauber beenden (z.B. bei Mikrofon-Geraetewechsel
    // aus dem Einstellungspanel), sonst liefen mehrere Analyser parallel weiter.
    vadGeneration += 1;
    const myGeneration = vadGeneration;
    if (vadAudioCtx) {
        try { vadAudioCtx.close(); } catch (e) { /* bereits geschlossen */ }
    }

    vadAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const sourceNode = vadAudioCtx.createMediaStreamSource(micStream);

    // Gain-Stufe zwischen Rohsignal und allem Weiteren (Analyse UND Aufnahme),
    // damit die Mikrofon-Lautstaerke aus dem Einstellungspanel tatsaechlich das
    // an STT gesendete Audio veraendert, nicht nur eine Anzeige.
    micGainNode = vadAudioCtx.createGain();
    micGainNode.gain.value = micGain;
    sourceNode.connect(micGainNode);

    analyser = vadAudioCtx.createAnalyser();
    analyser.fftSize = 512;
    micGainNode.connect(analyser);

    const destination = vadAudioCtx.createMediaStreamDestination();
    micGainNode.connect(destination);
    processedMicStream = destination.stream;

    const data = new Uint8Array(analyser.frequencyBinCount);

    function tick() {
        if (vadGeneration !== myGeneration) return; // abgeloest durch neueren Analyser
        requestAnimationFrame(tick);
        if (mode !== 'voice_activation' || !conversationActive) return;

        analyser.getByteTimeDomainData(data);
        let sumSquares = 0;
        for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sumSquares += v * v;
        }
        const rms = Math.sqrt(sumSquares / data.length);

        if (rms > vadThreshold) {
            if (!vadRecording) startRecording();
            resetSilenceTimer();
        }
    }
    tick();
}

function resetSilenceTimer() {
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
        if (vadRecording) stopRecording();
    }, silenceTimeoutMs);
}

// =========================================================
// WIEDERGABE (Phase 8/9)
// =========================================================

function ensurePlaybackCtx() {
    if (!playbackCtx) playbackCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
}

async function playAudio(base64, mimeType, volume, pan) {
    ensurePlaybackCtx();
    stopAudio();

    let audioBuffer;
    try {
        audioBuffer = await playbackCtx.decodeAudioData(base64ToArrayBuffer(base64));
    } catch (e) {
        fetchNui('playbackEnded', {});
        return;
    }

    currentSource = playbackCtx.createBufferSource();
    currentSource.buffer = audioBuffer;

    gainNode = playbackCtx.createGain();
    pannerNode = playbackCtx.createStereoPanner();
    gainNode.gain.value = volume != null ? volume : 1.0;
    pannerNode.pan.value = pan != null ? pan : 0.0;

    currentSource.connect(gainNode).connect(pannerNode).connect(playbackCtx.destination);
    currentSource.onended = () => fetchNui('playbackEnded', {});
    currentSource.start(0);
}

function updateAudioParams(volume, pan) {
    if (gainNode && volume != null) gainNode.gain.value = volume;
    if (pannerNode && pan != null) pannerNode.pan.value = pan;
}

function stopAudio() {
    if (currentSource) {
        try {
            currentSource.onended = null;
            currentSource.stop();
        } catch (e) { /* bereits gestoppt */ }
        currentSource = null;
    }
}

// =========================================================
// UI (Phase 26)
// =========================================================

const EMOTION_LABELS = {
    nervoes: 'nervös', aengstlich: 'ängstlich', wuetend: 'wütend', traurig: 'traurig',
    betrunken: 'betrunken', verwirrt: 'verwirrt', aggressiv: 'aggressiv',
    freundlich: 'freundlich', erleichtert: 'erleichtert',
};

let transcriptTimer = null;

function setConversationUI(active, name) {
    const hud = document.getElementById('hud');
    hud.hidden = !active;
    document.getElementById('npc-name').textContent = name || '';
    if (!active) {
        document.getElementById('transcript').hidden = true;
    }
}

function setListeningUI(listening) {
    document.getElementById('listening-indicator').hidden = !listening;
}

function setSpeakingUI(speaking, emotion) {
    document.getElementById('speaking-indicator').hidden = !speaking;
    document.getElementById('speaking-emotion').textContent = (speaking && emotion && EMOTION_LABELS[emotion])
        ? ` (${EMOTION_LABELS[emotion]})` : '';
}

function showTranscript(role, text) {
    const el = document.getElementById('transcript');
    el.textContent = (role === 'officer' ? 'Du: ' : '') + text;
    el.hidden = false;
    clearTimeout(transcriptTimer);
    transcriptTimer = setTimeout(() => { el.hidden = true; }, 6000);
}

// =========================================================
// DIALOGMENU-FALLBACK (Punkt 74/83)
// =========================================================

function openDialogMenu(questions, npcName) {
    const menu = document.getElementById('dialog-menu');
    document.getElementById('dialog-menu-title').textContent = npcName ? `Fragen an ${npcName}` : 'Fragen';
    document.getElementById('dialog-menu-close-hint').textContent = 'Schließen (ESC)';

    const list = document.getElementById('dialog-menu-list');
    list.innerHTML = '';

    (questions || []).forEach((q) => {
        const btn = document.createElement('div');
        btn.className = 'dialog-menu-item';
        btn.textContent = q.text;
        btn.addEventListener('click', () => {
            fetchNui('dialogQuestionSelected', { id: q.id, text: q.text });
        });
        list.appendChild(btn);
    });

    menu.hidden = false;
}

function closeDialogMenuUI() {
    document.getElementById('dialog-menu').hidden = true;
}

// =========================================================
// SPRACH-EINSTELLUNGEN (Mikrofon/Taste/Lautstaerke + Admin-Provider)
// =========================================================

let capturingKey = false;
let pendingCustomKeyCode = null;
let pendingCustomKeyLabel = null;
let isAdminSettings = false;

let settingsTestStream = null;
let settingsTestCtx = null;
let settingsTestAnalyser = null;
let settingsTestGainNode = null;
let settingsMeterRAF = null;

function describeKey(e) {
    const NAMED = { ' ': 'SPACE', Control: 'CTRL', Shift: 'SHIFT', Alt: 'ALT', Enter: 'ENTER', Tab: 'TAB', Escape: 'ESC' };
    if (NAMED[e.key]) return NAMED[e.key];
    if (e.key && e.key.length === 1) return e.key.toUpperCase();
    return (e.key || ('KEY_' + e.keyCode)).toUpperCase();
}

function fillSelect(id, options, current) {
    const el = document.getElementById(id);
    el.innerHTML = '';
    (options || []).forEach((value) => {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = value;
        if (value === current) opt.selected = true;
        el.appendChild(opt);
    });
}

async function populateMicDevices(selectedId) {
    const select = document.getElementById('set-mic-device');
    select.innerHTML = '<option value="">Standard-Mikrofon</option>';
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        devices.filter((d) => d.kind === 'audioinput').forEach((d, i) => {
            const opt = document.createElement('option');
            opt.value = d.deviceId;
            opt.textContent = d.label || ('Mikrofon ' + (i + 1));
            if (d.deviceId === selectedId) opt.selected = true;
            select.appendChild(opt);
        });
    } catch (e) { /* Geraeteliste nicht verfuegbar - Standard-Option bleibt */ }
}

function stopMicTest() {
    if (settingsMeterRAF) cancelAnimationFrame(settingsMeterRAF);
    settingsMeterRAF = null;
    settingsTestAnalyser = null;
    settingsTestGainNode = null;
    if (settingsTestStream) {
        settingsTestStream.getTracks().forEach((t) => t.stop());
        settingsTestStream = null;
    }
    if (settingsTestCtx) {
        try { settingsTestCtx.close(); } catch (e) { /* bereits geschlossen */ }
        settingsTestCtx = null;
    }
    document.getElementById('set-mic-meter-bar').style.width = '0%';
    document.getElementById('set-mic-test').textContent = 'Mikrofon testen';
}

async function startMicTest() {
    stopMicTest();
    const deviceId = document.getElementById('set-mic-device').value || null;

    try {
        settingsTestStream = await navigator.mediaDevices.getUserMedia(micConstraints(deviceId));
    } catch (e) {
        document.getElementById('settings-status').textContent = 'Mikrofon-Fehler: ' + e;
        return;
    }

    settingsTestCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = settingsTestCtx.createMediaStreamSource(settingsTestStream);

    settingsTestGainNode = settingsTestCtx.createGain();
    settingsTestGainNode.gain.value = micGain;
    source.connect(settingsTestGainNode);

    settingsTestAnalyser = settingsTestCtx.createAnalyser();
    settingsTestAnalyser.fftSize = 512;
    settingsTestGainNode.connect(settingsTestAnalyser);

    const data = new Uint8Array(settingsTestAnalyser.frequencyBinCount);
    const bar = document.getElementById('set-mic-meter-bar');

    function tick() {
        if (!settingsTestAnalyser) return;
        settingsTestAnalyser.getByteTimeDomainData(data);
        let sumSquares = 0;
        for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sumSquares += v * v;
        }
        const rms = Math.sqrt(sumSquares / data.length);
        bar.style.width = Math.min(100, rms * 400) + '%';
        settingsMeterRAF = requestAnimationFrame(tick);
    }
    tick();

    document.getElementById('set-mic-test').textContent = 'Test stoppen';
}

function openSettingsUI(payload) {
    const s = payload.playerSettings || {};

    document.getElementById('set-mode').value = s.mode || 'auto';

    pendingCustomKeyCode = s.customKeyCode || null;
    pendingCustomKeyLabel = s.customKeyLabel || null;
    document.getElementById('set-key-label').textContent = pendingCustomKeyLabel || 'FiveM-Tastenbelegung';

    document.getElementById('set-sensitivity').value = s.vadThreshold != null ? s.vadThreshold : vadThreshold;
    document.getElementById('set-npc-volume').value = s.npcVolume != null ? s.npcVolume : 1.0;

    const initialGain = s.micGain != null ? s.micGain : micGain;
    document.getElementById('set-mic-gain').value = initialGain;
    setMicGain(initialGain);

    populateMicDevices(s.micDeviceId);

    isAdminSettings = !!payload.isAdmin;
    const adminSection = document.getElementById('settings-admin-section');
    adminSection.hidden = !isAdminSettings;

    if (isAdminSettings && payload.options && payload.runtime) {
        fillSelect('set-ai-provider', payload.options.aiProviders, payload.runtime.aiProvider);
        fillSelect('set-stt-provider', payload.options.sttProviders, payload.runtime.sttProvider);
        fillSelect('set-tts-provider', payload.options.ttsProviders, payload.runtime.ttsProvider);
        fillSelect('set-default-voicemode', payload.options.voiceModes, payload.runtime.voiceMode);
        document.getElementById('set-conversation-distance').value = payload.runtime.conversationDistance;
        document.getElementById('set-approach-distance').value = payload.runtime.approachDistance;
    }

    document.getElementById('settings-status').textContent = payload.saved
        ? 'Gespeichert.'
        : (payload.error ? ('Fehler: ' + payload.error) : '');

    document.getElementById('settings-panel').hidden = false;
}

function closeSettingsUI() {
    stopMicTest();
    capturingKey = false;
    document.getElementById('settings-panel').hidden = true;
}

document.getElementById('set-key-capture').addEventListener('click', () => {
    capturingKey = true;
    document.getElementById('set-key-label').textContent = 'Taste drücken... (ESC zum Abbrechen)';
});

document.getElementById('set-key-reset').addEventListener('click', () => {
    pendingCustomKeyCode = null;
    pendingCustomKeyLabel = null;
    document.getElementById('set-key-label').textContent = 'FiveM-Tastenbelegung';
});

document.getElementById('set-mic-test').addEventListener('click', () => {
    if (settingsTestAnalyser) stopMicTest();
    else startMicTest();
});

document.getElementById('set-mic-device').addEventListener('change', () => {
    if (settingsTestAnalyser) startMicTest();
});

document.getElementById('set-mic-gain').addEventListener('input', (e) => {
    setMicGain(parseFloat(e.target.value));
});

document.getElementById('set-cancel').addEventListener('click', () => fetchNui('closeSettings', {}));

document.getElementById('set-save').addEventListener('click', async () => {
    const micDeviceId = document.getElementById('set-mic-device').value || null;

    const playerSettings = {
        mode: document.getElementById('set-mode').value,
        customKeyCode: pendingCustomKeyCode,
        customKeyLabel: pendingCustomKeyLabel,
        micDeviceId: micDeviceId,
        vadThreshold: parseFloat(document.getElementById('set-sensitivity').value),
        npcVolume: parseFloat(document.getElementById('set-npc-volume').value),
        micGain: parseFloat(document.getElementById('set-mic-gain').value),
    };

    const payload = { playerSettings };

    if (isAdminSettings) {
        payload.runtimeSettings = {
            aiProvider: document.getElementById('set-ai-provider').value,
            sttProvider: document.getElementById('set-stt-provider').value,
            ttsProvider: document.getElementById('set-tts-provider').value,
            voiceMode: document.getElementById('set-default-voicemode').value,
            conversationDistance: parseFloat(document.getElementById('set-conversation-distance').value),
            approachDistance: parseFloat(document.getElementById('set-approach-distance').value),
        };
    }

    // Gewaehltes Mikrofon direkt live uebernehmen, nicht erst beim naechsten NUI-Reload
    if (micDeviceId !== preferredMicDeviceId) {
        await switchMicDevice(micDeviceId);
    }

    fetchNui('saveSettings', payload);
});

document.addEventListener('keydown', (e) => {
    if (capturingKey) {
        e.preventDefault();
        capturingKey = false;
        if (e.key !== 'Escape') {
            pendingCustomKeyCode = e.keyCode;
            pendingCustomKeyLabel = describeKey(e);
        }
        document.getElementById('set-key-label').textContent = pendingCustomKeyLabel || 'FiveM-Tastenbelegung';
        return;
    }

    if (e.key !== 'Escape') return;

    const settingsPanel = document.getElementById('settings-panel');
    if (!settingsPanel.hidden) {
        fetchNui('closeSettings', {});
        return;
    }

    const dialogMenu = document.getElementById('dialog-menu');
    if (!dialogMenu.hidden) fetchNui('closeDialogMenu', {});
});

// =========================================================
// NACHRICHTEN VON LUA
// =========================================================

window.addEventListener('message', (event) => {
    const data = event.data || {};

    switch (data.action) {
        case 'setMode':
            mode = data.mode;
            vadThreshold = data.vadThreshold;
            silenceTimeoutMs = data.silenceTimeoutMs;
            maxRecordingMs = (data.maxRecordingSeconds || 12) * 1000;
            if (data.micDeviceId) preferredMicDeviceId = data.micDeviceId;
            if (data.micGain) micGain = data.micGain;
            // Erst hier (statt bei DOMContentLoaded) initialisieren, damit ein evtl.
            // gespeichertes bevorzugtes Mikrofon-Geraet/Gain schon gesetzt ist, bevor
            // getUserMedia zum ersten Mal aufgerufen wird.
            if (!micInitialized) {
                micInitialized = true;
                initMic();
            }
            break;

        case 'setConversationActive':
            conversationActive = !!data.active;
            setConversationUI(conversationActive, data.name);
            if (!conversationActive) stopRecording();
            break;

        case 'startRecording':
            startRecording();
            break;

        case 'stopRecording':
            stopRecording();
            break;

        case 'setListening':
            setListeningUI(!!data.listening);
            break;

        case 'setSpeaking':
            setSpeakingUI(!!data.speaking, data.emotion);
            break;

        case 'showTranscript':
            showTranscript(data.role, data.text);
            break;

        case 'playAudio':
            playAudio(data.audioBase64, data.mimeType, data.volume, data.pan);
            break;

        case 'updateAudioParams':
            updateAudioParams(data.volume, data.pan);
            break;

        case 'stopAudio':
            stopAudio();
            break;

        case 'openDialogMenu':
            openDialogMenu(data.questions, data.npcName);
            break;

        case 'closeDialogMenu':
            closeDialogMenuUI();
            break;

        case 'setupMic':
            retryMic();
            break;

        case 'openSettings':
            openSettingsUI(data);
            break;

        case 'closeSettings':
            closeSettingsUI();
            break;
    }
});

// =========================================================
// INIT
// =========================================================

window.addEventListener('DOMContentLoaded', () => {
    fetchNui('ready', {});
    // initMic() wird von der ersten 'setMode'-Nachricht ausgeloest (siehe oben),
    // damit ein evtl. gespeichertes Mikrofon-Geraet schon bekannt ist.
});
