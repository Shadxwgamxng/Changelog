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

// =========================================================
// MIKROFON / AUFNAHME
// =========================================================

function getUserMediaWithTimeout(timeoutMs) {
    return Promise.race([
        navigator.mediaDevices.getUserMedia({ audio: true }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('getUserMedia timeout - keine Antwort/Berechtigungsdialog haengt')), timeoutMs)),
    ]);
}

async function initMic() {
    try {
        micStream = await getUserMediaWithTimeout(8000);
        setupRecorder();
        setupVadAnalyser();
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
            micStream = await getUserMediaWithTimeout(15000);
            setupRecorder();
            setupVadAnalyser();
        }
        fetchNui('micSetupDone', { ok: true });
    } catch (e) {
        fetchNui('micSetupDone', { ok: false, message: String(e) });
    }
}

function setupRecorder() {
    const preferredType = 'audio/webm;codecs=opus';
    const mimeType = (window.MediaRecorder && MediaRecorder.isTypeSupported(preferredType)) ? preferredType : 'audio/webm';

    mediaRecorder = new MediaRecorder(micStream, { mimeType });
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

function setupVadAnalyser() {
    vadAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const sourceNode = vadAudioCtx.createMediaStreamSource(micStream);
    analyser = vadAudioCtx.createAnalyser();
    analyser.fftSize = 512;
    sourceNode.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);

    function tick() {
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

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const menu = document.getElementById('dialog-menu');
        if (!menu.hidden) fetchNui('closeDialogMenu', {});
    }
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
    }
});

// =========================================================
// INIT
// =========================================================

window.addEventListener('DOMContentLoaded', () => {
    fetchNui('ready', {});
    initMic();
});
