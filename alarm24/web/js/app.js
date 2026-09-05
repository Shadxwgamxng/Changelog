(function () {
    'use strict';

    const resourceName = (typeof GetParentResourceName === 'function') ? GetParentResourceName() : 'alarm24';

    function fetchNui(eventName, data) {
        return fetch(`https://${resourceName}/${eventName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            body: JSON.stringify(data || {}),
        }).catch(() => {});
    }

    // =========================================================
    // STATE
    // =========================================================

    const state = {
        registered: false,
        profile: null,
        history: [],
        currentAlarm: null, // Payload des aktuell angezeigten Alarms (fuer Antwort/Navigation)
        availability: 'READY',
    };

    const AVAIL_LABEL = {
        READY: '🟢 Einsatzbereit',
        LIMITED: '🟡 Eingeschränkt verfügbar',
        UNAVAILABLE: '🔴 Nicht verfügbar',
        REST: '🌙 Ruhezeit',
        AWAY: '✈️ Abwesend',
    };

    const AVAIL_BADGE = {
        READY: '🟢',
        LIMITED: '🟡',
        UNAVAILABLE: '🔴',
        REST: '🌙',
        AWAY: '✈️',
    };

    const STATUS_LABEL = {
        WAITING: 'Keine Antwort',
        ACCEPTED: 'Zugesagt',
        DECLINED: 'Abgesagt',
        LATER: 'Später',
        NO_RESPONSE: 'Keine Antwort',
        ALREADY_IN_OPERATION: 'Bereits im Einsatz',
        UNAVAILABLE: 'Nicht verfügbar',
    };

    // =========================================================
    // DOM SHORTCUTS
    // =========================================================

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => Array.from(document.querySelectorAll(sel));

    const appRoot = $('#app-root');
    const alarmOverlay = $('#alarm-overlay');
    const adminOverlay = $('#admin-overlay');
    const toastEl = $('#toast');
    const alarmAudio = $('#alarm-audio');

    // =========================================================
    // NAVIGATION ZWISCHEN VIEWS
    // =========================================================

    function switchView(viewName) {
        $$('.view').forEach((v) => v.classList.toggle('active', v.dataset.view === viewName));
        $$('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === viewName));
    }

    $$('.nav-btn').forEach((btn) => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    // =========================================================
    // UHRZEIT IN DER STATUSLEISTE
    // =========================================================

    function updateClock() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        $('#statusbar-time').textContent = `${h}:${m}`;
    }
    setInterval(updateClock, 15000);
    updateClock();

    // =========================================================
    // TOAST
    // =========================================================

    let toastTimer = null;
    function showToast(message) {
        if (!message) return;
        toastEl.textContent = message;
        toastEl.classList.remove('hidden');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.add('hidden'), 3500);
    }

    // =========================================================
    // OEFFNEN / SCHLIESSEN DER APP
    // =========================================================

    function openApp() {
        appRoot.classList.remove('hidden');
        fetchNui('ready');
    }

    function closeApp() {
        appRoot.classList.add('hidden');
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (!alarmOverlay.classList.contains('hidden')) return; // Alarm kann nicht per ESC weggeklickt werden
            if (!adminOverlay.classList.contains('hidden')) {
                adminOverlay.classList.add('hidden');
                fetchNui('closeAdmin');
                return;
            }
            if (!appRoot.classList.contains('hidden')) {
                closeApp();
                fetchNui('closeApp');
            }
        }
    });

    // =========================================================
    // RENDER: HOME / PROFIL / HISTORIE
    // =========================================================

    function formatDateTime(value) {
        if (!value) return '';
        let date;
        if (typeof value === 'number') {
            date = new Date(value * (value < 2e10 ? 1000 : 1));
        } else {
            date = new Date(String(value).replace(' ', 'T'));
        }
        if (isNaN(date.getTime())) return String(value);
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${dd}.${mm}.${yyyy} · ${hh}:${min}`;
    }

    function renderProfile() {
        const profile = state.profile;
        if (!profile) return;

        $('#home-name').textContent = (profile.name || '').split(' ')[0] || 'Einsatzkraft';
        $('#profile-name').textContent = profile.name || '–';
        $('#profile-org').textContent = profile.organization ? `Organisation: ${profile.organization}` : '';

        const avail = profile.availability || 'READY';
        state.availability = avail;
        $('#home-avail-badge').textContent = AVAIL_LABEL[avail] || AVAIL_LABEL.READY;
        $('#profile-status').textContent = AVAIL_LABEL[avail] || AVAIL_LABEL.READY;
        $('#statusbar-avail').textContent = AVAIL_BADGE[avail] || '🟢';

        $$('.avail-option').forEach((btn) => {
            btn.classList.toggle('selected', btn.dataset.value === avail);
        });

        const stats = profile.stats || {};
        $('#stat-total').textContent = stats.total || 0;
        $('#stat-accepted').textContent = stats.ACCEPTED || 0;
        $('#stat-declined').textContent = stats.DECLINED || 0;
        $('#stat-none').textContent = stats.NO_RESPONSE || 0;
    }

    function renderHistory() {
        const list = $('#alarms-list');
        const opsList = $('#operations-list');
        const history = state.history || [];

        if (history.length === 0) {
            list.innerHTML = '<div class="empty-hint">Noch keine Alarmierungen vorhanden.</div>';
            opsList.innerHTML = '<div class="empty-hint">Kein aktiver Einsatz.</div>';
            return;
        }

        list.innerHTML = history.map((item) => {
            const status = item.status || 'NO_RESPONSE';
            return `
                <div class="list-item">
                    <div class="list-item-top">
                        <span class="list-item-keyword">${escapeHtml(item.keyword || 'Einsatz')}</span>
                        <span class="list-item-date">${formatDateTime(item.alarm_time)}</span>
                    </div>
                    <div class="list-item-location">📍 ${escapeHtml(item.location || '–')}</div>
                    <span class="status-pill status-${status}">${STATUS_LABEL[status] || status}</span>
                </div>
            `;
        }).join('');

        opsList.innerHTML = history.slice(0, 10).map((item) => `
            <div class="list-item">
                <div class="list-item-top">
                    <span class="list-item-keyword">${escapeHtml(item.keyword || 'Einsatz')}</span>
                    <span class="list-item-date">${formatDateTime(item.alarm_time)}</span>
                </div>
                <div class="list-item-location">📍 ${escapeHtml(item.location || '–')}</div>
                ${escapeHtml(item.description || '')}
            </div>
        `).join('');

        const last = history[0];
        const lastCard = $('#home-last-alarm');
        if (last) {
            const status = last.status || 'NO_RESPONSE';
            lastCard.innerHTML = `
                <div class="card-label">Letzte Alarmierung</div>
                <div class="alarm-summary-keyword">🚨 ${escapeHtml(last.keyword || 'Einsatz')}</div>
                <div class="alarm-summary-location">📍 ${escapeHtml(last.location || '–')}</div>
                <div class="alarm-summary-time">${formatDateTime(last.alarm_time)}</div>
                <span class="status-pill status-${status}">${STATUS_LABEL[status] || status}</span>
            `;
        }
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str == null ? '' : String(str);
        return div.innerHTML;
    }

    // =========================================================
    // ALARM POPUP
    // =========================================================

    function showAlarmPopup(data) {
        state.currentAlarm = data;

        $('#alarm-keyword').textContent = data.keyword || 'EINSATZ';
        $('#alarm-location').textContent = data.location ? `📍 ${data.location}` : '📍 Kein Standort übermittelt';
        $('#alarm-description').textContent = data.description || '';
        $('#alarm-time').textContent = `🕐 ${formatDateTime(data.alarmTime).split('·')[1]?.trim() || formatDateTime(data.alarmTime)}`;

        const prioEl = $('#alarm-priority');
        prioEl.textContent = data.priority || '';

        const navBtn = $('#btn-alarm-nav');
        navBtn.hidden = !(data.coords && data.coords.x && data.coords.y);

        alarmOverlay.classList.remove('hidden');
    }

    function hideAlarmPopup() {
        alarmOverlay.classList.add('hidden');
        stopAlarmSound();
    }

    function sendResponse(status) {
        if (!state.currentAlarm) return;
        fetchNui('respond', { recipientId: state.currentAlarm.recipientId, status });
        hideAlarmPopup();
    }

    $('#btn-accept').addEventListener('click', () => sendResponse('ACCEPTED'));
    $('#btn-decline').addEventListener('click', () => sendResponse('DECLINED'));
    $('#btn-later').addEventListener('click', () => sendResponse('LATER'));

    $('#btn-alarm-nav').addEventListener('click', () => {
        if (state.currentAlarm && state.currentAlarm.coords) {
            fetchNui('setWaypoint', { x: state.currentAlarm.coords.x, y: state.currentAlarm.coords.y });
        }
    });

    // =========================================================
    // ALARMTON
    // =========================================================

    function playAlarmSound(opts) {
        try {
            alarmAudio.src = (opts && opts.file) ? opts.file : 'sounds/alarm.mp3';
            alarmAudio.loop = !!(opts && opts.loop);
            alarmAudio.volume = (opts && typeof opts.volume === 'number') ? opts.volume : 0.8;
            const playPromise = alarmAudio.play();
            if (playPromise && playPromise.catch) {
                playPromise.catch(() => {});
            }
        } catch (e) {
            // Datei fehlt evtl. (sounds/alarm.mp3 muss manuell hinterlegt werden) - App bleibt trotzdem funktionsfaehig.
        }

        if (opts && opts.vibration) {
            document.body.classList.add('vibrate');
            setTimeout(() => document.body.classList.remove('vibrate'), 600);
        }
    }

    function stopAlarmSound() {
        try {
            alarmAudio.pause();
            alarmAudio.currentTime = 0;
        } catch (e) { /* ignore */ }
    }

    // =========================================================
    // LIVE-RUECKMELDUNGEN
    // =========================================================

    const LIVE_ICON = { ACCEPTED: '🟢', DECLINED: '🔴', LATER: '🟡', NO_RESPONSE: '⚪' };

    function renderLiveSummary(summary) {
        const card = $('#home-live-card');
        const el = $('#home-live-summary');
        card.hidden = false;

        el.innerHTML = Object.keys(LIVE_ICON).map((key) => {
            const amount = summary[key] || 0;
            return `<span>${LIVE_ICON[key]} ${amount} ${STATUS_LABEL[key] || key}</span>`;
        }).join('');
    }

    // =========================================================
    // EINSTELLUNGEN / VERFUEGBARKEIT
    // =========================================================

    $$('.avail-option').forEach((btn) => {
        btn.addEventListener('click', () => {
            fetchNui('setAvailability', { availability: btn.dataset.value });
        });
    });

    // =========================================================
    // ADMINBEREICH
    // =========================================================

    $('#admin-close').addEventListener('click', () => {
        adminOverlay.classList.add('hidden');
        fetchNui('closeAdmin');
    });

    $$('.admin-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            $$('.admin-tab').forEach((t) => t.classList.toggle('active', t === tab));
            $$('.admin-panel').forEach((p) => p.classList.toggle('active', p.dataset.adminpanel === tab.dataset.admintab));
        });
    });

    $('#admin-add-user').addEventListener('click', () => {
        const identifier = $('#admin-input-identifier').value.trim();
        const name = $('#admin-input-name').value.trim();
        const organization = $('#admin-input-org').value.trim();

        if (!identifier) {
            showToast('Bitte einen FiveM-Identifier angeben.');
            return;
        }

        fetchNui('adminUpsertUser', { identifier, name, organization, active: true });

        $('#admin-input-identifier').value = '';
        $('#admin-input-name').value = '';
        $('#admin-input-org').value = '';
    });

    function renderAdminUsers(users) {
        const list = $('#admin-users-list');
        if (!users || users.length === 0) {
            list.innerHTML = '<div class="empty-hint">Keine Benutzer hinterlegt.</div>';
            return;
        }

        list.innerHTML = users.map((u) => `
            <div class="admin-list-item">
                <div class="admin-list-item-info">
                    <b>${escapeHtml(u.name || 'Unbenannt')}</b><br/>
                    ${escapeHtml(u.identifier)}<br/>
                    ${escapeHtml(u.organization || '–')} ${u.active == 1 ? '· Aktiv' : '· Inaktiv'}
                </div>
                <button class="admin-delete-btn" data-identifier="${escapeHtml(u.identifier)}">Entfernen</button>
            </div>
        `).join('');

        $$('.admin-delete-btn', list).forEach((btn) => {
            btn.addEventListener('click', () => {
                fetchNui('adminDeleteUser', { identifier: btn.dataset.identifier });
            });
        });
    }

    function renderAdminLogs(logs) {
        const list = $('#admin-logs-list');
        if (!logs || logs.length === 0) {
            list.innerHTML = '<div class="empty-hint">Keine Logs vorhanden.</div>';
            return;
        }

        list.innerHTML = logs.map((l) => `
            <div class="admin-log-item">
                <b>${escapeHtml(l.action)}</b> — ${escapeHtml(l.actor || 'system')}<br/>
                ${formatDateTime(l.created_at)}
            </div>
        `).join('');
    }

    // =========================================================
    // NACHRICHTEN VOM LUA-CLIENT
    // =========================================================

    window.addEventListener('message', (event) => {
        const { action, data } = event.data || {};
        if (!action) return;

        switch (action) {
            case 'openApp':
                openApp();
                break;

            case 'closeApp':
                closeApp();
                break;

            case 'openAdmin':
                adminOverlay.classList.remove('hidden');
                break;

            case 'closeAdmin':
                adminOverlay.classList.add('hidden');
                break;

            case 'newAlarm':
                showAlarmPopup(data);
                break;

            case 'playAlarmSound':
                playAlarmSound(data);
                break;

            case 'missedAlarm':
                showToast(`🚨 Verpasste Alarmierung: ${data.keyword || 'Einsatz'}`);
                break;

            case 'liveSummary':
                if (data && data.summary) renderLiveSummary(data.summary);
                break;

            case 'initialData':
                state.registered = !!data.registered;
                state.profile = data.profile;
                state.history = data.history || [];
                if (state.registered) {
                    renderProfile();
                    renderHistory();
                }
                break;

            case 'respondResult':
                if (data && data.success) {
                    showToast('Deine Rückmeldung wurde gespeichert.');
                    fetchNui('requestInitialData');
                } else if (data) {
                    showToast('Rückmeldung konnte nicht gespeichert werden.');
                }
                break;

            case 'availabilityResult':
                if (data && data.availability) {
                    state.availability = data.availability;
                    if (state.profile) state.profile.availability = data.availability;
                    renderProfile();
                    showToast('Verfügbarkeit aktualisiert.');
                }
                break;

            case 'notify':
                showToast(data && data.message);
                break;

            case 'adminUsers':
                renderAdminUsers(data);
                break;

            case 'adminLogs':
                renderAdminLogs(data);
                break;

            default:
                break;
        }
    });
})();
