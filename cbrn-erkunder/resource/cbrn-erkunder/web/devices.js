/* Handmessgeräte-UI. Reine Darstellung + Bedienung: Messwerte/Zustand liefert ausschließlich der Server (cbrn:dev:state).
   Jedes Gerät ist ein "Skin" (SKINS[ui]): Gerätebild, Displayfläche, Tasten (Klickflächen über dem Bild), eigene Bildschirmdarstellung.
   Neues Gerät: SKINS.<ui> = {...} ergänzen und in server/hdev/defs.ts mit gleicher ui-ID registrieren. */
(() => {
  'use strict';
  const res = typeof GetParentResourceName === 'function' ? GetParentResourceName() : 'cbrn-erkunder';
  const post = (n, b) => fetch(`https://${res}/${n}`, { method: 'POST', body: JSON.stringify(b || {}) }).catch(() => {});
  const act = (a, payload) => post('devAction', { act: a, payload });
  const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num = (v, d) => (v == null || !isFinite(v) ? '–' : Number(v).toFixed(d == null ? 2 : d).replace('.', ','));
  const IMG = '../app/devices/';

  // ---- Töne: echte Geräteaufnahmen (web/sounds/*.ogg) + neutrale WebAudio-Töne für Geräte ohne Aufnahme ----------------
  const BASE = (() => { try { return new URL('.', document.currentScript.src).href; } catch (e) { return ''; } })();
  const AU = (() => {
    let ctx = null; const get = () => { try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); } catch (e) { ctx = null; } return ctx; };
    const beep = (f, ms, type = 'square', vol = 0.05, at = 0) => { const c = get(); if (!c) return; const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + ms / 1000 + 0.02); };
    const files = {}; const file = (n) => { if (!files[n]) { const a = new Audio(BASE + 'sounds/' + n + '.ogg'); a.preload = 'auto'; files[n] = a; } return files[n]; };
    return { click: () => beep(1800, 25, 'square', 0.03), on: () => { beep(880, 90, 'sine'); beep(1320, 140, 'sine', 0.05, 0.1); }, off: () => { beep(660, 90, 'sine'); beep(440, 160, 'sine', 0.05, 0.1); },
      ready: () => beep(1180, 120, 'sine'), saved: () => { beep(1000, 70, 'sine'); beep(1500, 120, 'sine', 0.05, 0.09); }, warn: () => { beep(1500, 90); beep(1500, 90, 'square', 0.05, 0.16); }, alarm: () => { beep(2200, 160, 'square', 0.07); beep(1700, 160, 'square', 0.07, 0.2); }, error: () => beep(300, 320, 'sawtooth', 0.05),
      play: (n, loop, vol) => { try { const a = file(n); a.loop = !!loop; a.volume = vol == null ? 0.6 : vol; if (a.paused || a.ended) { a.currentTime = 0; a.play().catch(() => {}); } } catch (e) { /* ohne Ton weiter */ } },
      stop: (n) => { try { const a = files[n]; if (a) { a.pause(); a.currentTime = 0; } } catch (e) { /* */ } }, stopAll: () => Object.keys(files).forEach((n) => { try { files[n].pause(); files[n].currentTime = 0; } catch (e) { /* */ } }) };
  })();

  // ---- Skins -------------------------------------------------------------------------------------------------------
  // Tasten: btn(id, Beschriftung, Geometrie, Bedeutung im Hauptbild, Bedeutung im Menü). Bedeutungen: menu ok up down back info ack screen mode zero a b okack
  // Tastenbelegung nach Herstellerhandbüchern, soweit öffentlich belegt (Quelle je Gerät unter src); sonst Annahme (TODO).
  const circ = (cx, cy, r, W, H) => ({ x: (cx - r) / W, y: (cy - r) / H, w: (2 * r) / W, h: (2 * r) / H });
  const rect = (x, y, w, h, W, H) => ({ x: x / W, y: y / H, w: w / W, h: h / H });
  const btn = (id, label, g, main, menu) => ({ id, label, main, menu: menu || main, ...g });
  const SKINS = {
    dlm: { img: IMG + 'dlm.png', W: 435, H: 700, scr: rect(112, 167, 209, 170, 435, 700), css: { '--bg': '#b2bba2', '--fg': '#1a2418', '--off': '#8d958a' },
      // Handbuch RadEye PRD-ER4 (DB-117 E): EIN = On-Taste ≥ 1 s; Info wechselt die Anzeigen; Menü: Pfeile blättern, Menu-Taste wählt; Mute quittiert den Alarm; On/Screen kurz = Display-Beleuchtung (Annahme)
      pw: { id: 'onoff', onMs: 1000, offMs: 3000 }, views: ['RATE', 'DOSE', 'MAX', 'INFO'], snd: { alarm: { file: 'dlm_alarm', every: 20000 }, warn: { synth: 'warn', every: 6000 } },
      btns: [btn('menu', 'Menu (Menü öffnen / im Menü: Auswahl)', circ(125, 497, 43, 435, 700), 'menu', 'ok'), btn('info', 'Info ▲ (Anzeige wechseln / im Menü: auf)', circ(216, 466, 28, 435, 700), 'info', 'up'),
        btn('mute', 'Mute (Alarm quittieren / im Menü: zurück)', circ(308, 497, 43, 435, 700), 'ack', 'back'), btn('onoff', 'On / Screen ▼ (halten: Ein 1 s · Aus 3 s · kurz: Beleuchtung · im Menü: ab)', circ(216, 534, 28, 435, 700), 'screen', 'down')],
      screen: (c) => lcdSingle(c, { bar: 'log', dlm: true }) },
    como: { img: IMG + 'como.png', W: 327, H: 700, scr: rect(78, 53, 169, 109, 327, 700), css: { '--bg': '#cdd870', '--fg': '#232a05', '--off': '#a9b25c' },
      // Handbuch CoMo 170 ZS (Bedienungsanleitung): Taste oben links: kurz = Kurzmenü (u. a. Nulleffektmessung), lang = Aus; Taste oben rechts: Ton aus/quittieren; Pfeiltasten wählen im Menü, Enter öffnet
      pw: { id: 'ul', onMs: 0, offMs: 1500 }, snd: { alarm: { synth: 'alarm', every: 1200 }, warn: { synth: 'warn', every: 4000 } },
      btns: [btn('ul', 'Oben links (kurz: Kurzmenü · lang: Aus)', circ(77, 226, 16, 327, 700), 'menu', 'back'), btn('ur', 'Oben rechts (Ton aus / quittieren)', circ(249, 226, 16, 327, 700), 'ack', 'back'),
        btn('t1', 'Pfeil links (Kanal α/β-γ · im Menü: auf)', circ(106, 271, 17, 327, 700), 'mode', 'up'), btn('c', 'Enter (Messung Start/Stop · im Menü: Auswahl)', circ(163, 268, 17, 327, 700), 'ok', 'ok'), btn('t2', 'Pfeil rechts (Kanal α/β-γ · im Menü: ab)', circ(221, 271, 17, 327, 700), 'mode', 'down')],
      screen: (c) => lcdSingle(c, { bar: 'log2', both: true }) },
    pid: { img: IMG + 'pid.png', W: 205, H: 700, scr: rect(40, 217, 125, 90, 205, 700), css: { '--bg': '#b9cfa8', '--fg': '#1b2a14', '--off': '#8fa383' },
      // Handbuch TIGER: Tastenfeld = zwei Soft-Tasten A/B (frei belegbar), Auf/Ab, Esc, Enter/On/Off. EIN = Enter einmal drücken, AUS = Enter halten (3-s-Countdown). Zero = Soft-Taste
      pw: { id: 'en', onMs: 0, offMs: 3000 }, snd: { alarm: { synth: 'alarm', every: 1200 }, warn: { synth: 'warn', every: 4000 } },
      btns: [btn('a', 'A – Soft-Taste „Nullung“', circ(76, 372, 17, 205, 700), 'zero', 'back'), btn('b', 'B – Soft-Taste „Menü“', circ(131, 372, 17, 205, 700), 'menu', 'ok'), btn('up', '▲ (Anzeige wechseln / im Menü: auf)', circ(103, 398, 16, 205, 700), 'info', 'up'),
        btn('esc', 'Esc (abbrechen / zurück)', circ(92, 431, 13, 205, 700), 'back', 'back'), btn('en', 'Enter / On / Off (Start/Stop · Aus: halten)', circ(115, 450, 12, 205, 700), 'ok', 'ok'), btn('dn', '▼ (Anzeige wechseln / im Menü: ab)', circ(103, 484, 16, 205, 700), 'info', 'down')],
      screen: (c) => lcdSingle(c, { bar: 'log3', minmax: true }) },
    ims: { img: IMG + 'ims.png', W: 376, H: 700, scr: rect(100, 304, 191, 66, 376, 700), css: { '--bg': '#a9b39f', '--fg': '#1b2418', '--off': '#868f80' },
      // TODO: Bedienung des RAID-M 100 (Drehknopf) mit Herstellerhandbuch prüfen – hier: Knopf links/rechts = Auf/Ab, drücken = OK (halten: Ein/Aus)
      pw: { id: 'k2', onMs: 1000, offMs: 2500 }, snd: { alarm: { synth: 'alarm', every: 1200 }, warn: { synth: 'warn', every: 4000 } }, wheel: ['k1', 'k3', 'k2'],
      btns: [btn('k1', 'Drehknopf links (Menü / auf)', rect(36, 172, 18, 48, 376, 700), 'menu', 'up'), btn('k2', 'Drehknopf drücken (Start/Stop · halten: Ein/Aus · im Menü: Auswahl)', rect(54, 172, 16, 48, 376, 700), 'ok', 'ok'), btn('k3', 'Drehknopf rechts (Info / ab)', rect(70, 172, 18, 48, 376, 700), 'info', 'down')],
      leds: Array.from({ length: 8 }, (_, i) => ({ ...circ(138 + i * 17.3, 431, 7.5, 376, 700) })), screen: (c) => lcdIms(c) },
    mgmg: { img: IMG + 'mgmg.png', W: 284, H: 700, scr: rect(74, 338, 134, 154, 284, 700), css: { '--bg': '#bcd3a3', '--fg': '#17230f', '--off': '#8ea184' },
      // Dräger X-am 8000: Bedienung über drei Tasten ▼ OK ▲ (Produktinformation); die Symbole am unteren Displayrand gehören zu den Tasten. OK halten = Ein/Aus, OK kurz = Alarm quittieren / Detail (Annahme)
      pw: { id: 'ok', onMs: 1000, offMs: 3000 }, snd: { alarm: { file: 'mgmg_alarm', loop: true }, warn: { file: 'mgmg_alarm', every: 5000 } },
      btns: [btn('dn', '▼ Menü (im Menü: ab)', circ(77.5, 551, 21, 284, 700), 'menu', 'down'), btn('ok', 'OK (Alarm quittieren / Detail · im Menü: Auswahl · halten: Ein/Aus)', circ(141.5, 551, 21, 284, 700), 'okack', 'ok'), btn('up', '▲ Start / Stop (im Menü: auf)', circ(202, 551, 21, 284, 700), 'a', 'up')],
      screen: (c) => lcdGas(c) },
  };

  // ---- Bildschirminhalte -------------------------------------------------------------------------------------------
  const fmt = (st) => (st.value == null ? '– – –' : st.over ? 'OVER' : num(st.value, st.dec));
  const phaseName = { OFF: 'AUS', BOOTING: 'INITIALISIERUNG', SELF_TEST: 'SELBSTTEST', READY: 'BEREIT', MEASURING: 'MESSUNG', ERROR: 'FEHLER' };
  const batt = (st) => `<span class="ic">${st.batteryLow ? '! ' : ''}BAT ${st.battery}%</span>`;
  const pct = (p) => Math.round(p * 100);
  function common(c) { // Zustände außerhalb der Messanzeige: Boot, Selbsttest, Fehler, Nullung, Menü, Info
    const { st, def, ui } = c;
    if (st.phase === 'OFF') return `<div class="center sm" style="opacity:.0"></div>`;
    if (st.phase === 'BOOTING') return `<div class="in"><div class="lbl">${esc(def.short)}</div><div class="center"><div><div class="sm">INITIALISIERUNG</div><div class="bar" style="margin-top:4cqh"><i style="width:${pct(st.boot)}%"></i></div><div class="sm" style="margin-top:3cqh">${esc(def.model.split(' (')[0])}</div></div></div></div>`;
    if (st.phase === 'SELF_TEST') { const t = st.test || { items: [], ok: [] }; return `<div class="in"><div class="lbl">SELBSTTEST</div><div class="grow" style="margin-top:2cqh">${t.items.map((n, i) => `<div class="row sm"><span>${esc(n)}</span><span>${t.ok[i] ? 'OK' : '…'}</span></div>`).join('')}</div><div class="bar"><i style="width:${pct(t.p)}%"></i></div></div>`; }
    if (st.phase === 'ERROR') return `<div class="in"><div class="lbl inv" style="padding:1cqh 2cqw">FEHLER</div><div class="center sm">${esc(st.err || 'GERÄTEFEHLER')}<br><br>OK = Ausschalten</div></div>`;
    if (st.zero) return `<div class="in"><div class="lbl">${esc(st.zero.label)}</div><div class="center sm">Bitte nicht bewegen …</div><div class="bar"><i style="width:${pct(st.zero.p)}%"></i></div></div>`;
    if (ui.page === 'info') return infoScreen(c);
    if (ui.page === 'menu') { const items = c.menu(); const cur = Math.min(ui.cur, items.length - 1); const per = 5; const start = Math.max(0, Math.min(cur - 2, items.length - per)); return `<div class="in menu"><div class="lbl" style="margin-bottom:1cqh">MENÜ</div>${items.slice(start, start + per).map((it, k) => `<div class="it ${start + k === cur ? 'sel' : ''}">${esc(it.t)}</div>`).join('')}</div>`; }
    return null;
  }
  function infoScreen(c) {
    const { st, def } = c; const thr = Object.entries(def.thresholds || {}).filter(([k]) => k === st.mode).map(([, t]) => `${t.attention != null ? 'A ' + t.attention + ' ' : ''}${t.warning != null ? 'W ' + t.warning + ' ' : ''}${t.alarm != null ? 'AL ' + t.alarm : ''}`).join('');
    return `<div class="in"><div class="lbl">INFO</div><div class="sm" style="margin-top:2cqh">${esc(def.model.split(' (')[0])}</div><div class="sm">Akku ${st.battery} %</div><div class="sm">Bereich ${esc(def.range.min)}…${esc(def.range.max)} ${esc(def.range.unit)}</div>${thr ? `<div class="sm">${esc(thr)}</div>` : ''}<div class="sm">SIMULATION</div></div>`;
  }
  const flashOf = (st) => (st.flash ? `<div class="flash">${esc(st.flash)}</div>` : '');
  const lvl = (st) => (st.phase === 'MEASURING' || st.hasResult ? st.alert : 'NORMAL');
  const alTxt = { WARNUNG: 'WARNUNG', ALARM: 'ALARM', 'AUFFÄLLIG': 'AUFFÄLLIG' };
  function barHtml(v, kind) { // Balken: logarithmisch über den Messbereich
    const lo = kind === 'log' ? 0.01 : kind === 'log2' ? 0.5 : 0.01, hi = kind === 'log' ? 250 : kind === 'log2' ? 20000 : 20000;
    const f = v == null || v <= lo ? 0 : Math.min(1, Math.log10(v / lo) / Math.log10(hi / lo)); return `<div class="bar"><i style="width:${(f * 100).toFixed(1)}%"></i></div>`;
  }
  function lcdSingle(c, o) {
    const cm = common(c); if (cm) return cm + flashOf(c.st);
    const { st, def } = c; let mode = def.modes.find((m) => m.id === st.mode);
    const a = lvl(st); const meas = st.phase === 'MEASURING'; const acked = c.ui.ack && a !== 'NORMAL';
    const head = st.err ? 'FEHLER' : meas ? (a !== 'NORMAL' ? alTxt[a] : st.stable ? 'STABIL' : 'MESSUNG …') : st.hasResult ? 'GESTOPPT' : 'BEREIT';
    let val = fmt(st), unit = st.unit, stats = st.stats, label = mode ? mode.label : '';
    if (o.dlm) { // RadEye: Taste Info wechselt die Anzeige (Dosisleistung · Dosis · Maximum · Info)
      const v = c.ui.view || 'RATE';
      if (v === 'INFO') return infoScreen(c) + flashOf(st);
      if (v === 'DOSE') { val = st.dose == null ? '– – –' : num(st.dose, st.dose < 1 ? 3 : st.dose < 100 ? 2 : 1); unit = 'µSv'; label = 'Dosis'; }
      else if (v === 'MAX') { val = st.stats ? num(st.stats.max, st.dec) : '– – –'; label = 'Maximum'; }
    }
    const stat = stats ? `<div class="row sm"><span>MIN ${num(stats.min, st.dec)}</span><span>MAX ${num(stats.max, st.dec)}</span><span>Ø ${num(stats.avg, st.dec)}</span></div>` : '';
    return `<div class="in"><div class="row">${batt(st)}<span class="ic">${st.muted ? 'STUMM' : acked ? 'QUIT.' : 'TON'}</span><span class="ic ${a !== 'NORMAL' && !acked ? 'al-' + a : ''}">${head}</span></div>
      <div class="lbl" style="margin-top:1.5cqh">${esc(label)}</div>
      <div class="grow center"><div><div class="big ${(a === 'ALARM' || a === 'WARNUNG') && !acked ? 'al-' + a : ''}">${val}</div><div class="unit">${esc(unit)}</div></div></div>
      ${o.bar && !(o.dlm && c.ui.view === 'DOSE') ? barHtml(st.value, o.bar) : ''}${o.minmax || o.both ? stat : ''}</div>${flashOf(st)}`;
  }
  function lcdIms(c) {
    const cm = common(c); if (cm) return cm + flashOf(c.st);
    const { st } = c; const ch = st.channels || { G: 0, H: 0, T: 0 }; const a = lvl(st);
    const seg = (n) => `<div class="seg">${Array.from({ length: 8 }, (_, i) => `<b class="${i < n ? 'on' : ''}"></b>`).join('')}</div>`;
    const head = st.phase === 'MEASURING' ? (a !== 'NORMAL' ? alTxt[a] : 'DETEKTION') : st.hasResult ? 'GESTOPPT' : 'BEREIT';
    return `<div class="in" style="padding:3cqh 3cqw;--sh:17cqh;font-size:24cqh;line-height:1"><div class="row" style="font-size:19cqh"><span>BAT ${st.battery}%</span><span class="${a !== 'NORMAL' ? 'al-' + a : ''}">${head}</span></div>
      ${['G', 'H', 'T'].map((k) => `<div class="row" style="margin-top:2.5cqh"><span style="width:7cqw;font-weight:700">${k}</span><div style="flex:1">${seg(ch[k] || 0)}</div></div>`).join('')}
      <div style="margin-top:auto;text-align:center;font-size:17cqh">${st.aux && st.aux.code && Math.max(ch.G, ch.H, ch.T) >= 3 ? esc(st.aux.code) : '&nbsp;'}</div></div>${flashOf(st)}`;
  }
  const GASROWS = { iBut: ['iBut', 'ppm', 1], CO2: ['CO₂', 'Vol%', 2], CH4: ['ch₄', '%UEG', 0], O2: ['O₂', 'Vol%', 1], H2S: ['H₂S', 'ppm', 1], CO: ['CO', 'ppm', 0], SO2: ['SO₂', 'ppm', 1] };
  function lcdGas(c) {
    const cm = common(c); if (cm) return cm + flashOf(c.st);
    const { st, def } = c; const ch = st.channels; const a = lvl(st);
    const rows = (def.channels || []).map((d) => { const g = GASROWS[d.id]; const v = ch ? ch[d.id] : null; const bad = ch && judgeCh(d, v) !== 'NORMAL'; return `<div class="row ${bad ? 'inv' : ''}" style="padding:.4cqh 1cqw;font-size:8cqh"><span>${g[0]}</span><span style="font-weight:700">${v == null ? '–' : num(v, g[2])}</span><span style="width:19cqw;text-align:right">${g[1]}</span></div>`; }).join('');
    const stateTxt = st.phase === 'MEASURING' ? (a !== 'NORMAL' ? alTxt[a] : st.stable ? 'STABIL' : 'MESSUNG') : st.hasResult ? 'GESTOPPT' : 'BEREIT';
    return `<div class="in" style="padding:1.5cqh 2cqw"><div class="row sm" style="font-size:7cqh"><span>${batt(st)}</span><span class="${a !== 'NORMAL' ? 'al-' + a : ''}">${stateTxt}</span><span>${st.muted ? 'STUMM' : ''}</span></div>${rows}
      <div class="row sm" style="margin-top:auto;border-top:.4cqh solid var(--fg);padding-top:.8cqh"><span>Menü</span><span>OK</span><span>${st.phase === 'MEASURING' ? 'Stop' : 'Start'}</span></div></div>${flashOf(st)}`;
  }
  const RANK = { NORMAL: 0, 'AUFFÄLLIG': 1, WARNUNG: 2, ALARM: 3 };
  function judgeCh(d, v) { const t = d.thr; if (!t || v == null) return 'NORMAL'; if ((t.alarm != null && v >= t.alarm) || (t.lowAlarm != null && v <= t.lowAlarm)) return 'ALARM'; if ((t.warning != null && v >= t.warning) || (t.lowWarning != null && v <= t.lowWarning)) return 'WARNUNG'; if (t.attention != null && v >= t.attention) return 'AUFFÄLLIG'; return 'NORMAL'; }
  void RANK;

  // ---- Zustand / Aufbau --------------------------------------------------------------------------------------------
  const U = { def: null, sk: null, st: null, page: 'main', cur: 0, vis: true, mouse: false, save: false, samples: [], keys: {}, view: 'RATE', light: false, ack: false, hold: null };
  let root, box, scr, toastEl, savePanel, hintEl;
  const build = () => {
    if (root) root.remove();
    root = document.createElement('div'); root.id = 'dev'; document.body.appendChild(root);
    const sk = U.sk; root.style.setProperty('--ar', sk.W / sk.H);
    root.innerHTML = `<div class="dv-dim"></div><div class="dv-box"><img src="${sk.img}" alt="${esc(U.def.model)}" draggable="false"><div class="dv-scr off"></div><div class="dv-hint"></div></div><div class="dv-toast"></div><div class="dv-save"></div>`;
    box = root.querySelector('.dv-box'); scr = root.querySelector('.dv-scr'); toastEl = root.querySelector('.dv-toast'); savePanel = root.querySelector('.dv-save'); hintEl = root.querySelector('.dv-hint');
    for (const [k, v] of Object.entries(sk.css)) scr.style.setProperty(k, v);
    const place = (el, g) => { el.style.left = g.x * 100 + '%'; el.style.top = g.y * 100 + '%'; el.style.width = g.w * 100 + '%'; el.style.height = g.h * 100 + '%'; };
    place(scr, sk.scr);
    (sk.leds || []).forEach((g, i) => { const e = document.createElement('div'); e.className = 'led'; e.dataset.i = i; place(e, g); box.appendChild(e); });
    for (const b of sk.btns) {
      const e = document.createElement('button'); e.className = 'hs'; e.title = b.label; place(e, b); box.appendChild(e);
      const pw = sk.pw && sk.pw.id === b.id ? sk.pw : null; let t0 = 0, iv = 0, fired = false;
      const need = () => (!U.st ? 0 : U.st.phase === 'OFF' ? pw.onMs : pw.offMs);
      const stopHold = () => { clearInterval(iv); iv = 0; U.hold = null; if (U.st) render(); };
      e.addEventListener('pointerdown', (ev) => {
        ev.preventDefault(); e.classList.add('down'); t0 = Date.now(); fired = false;
        const n = pw ? need() : 0;
        if (pw && n > 0 && !(U.page === 'menu' && U.st && U.st.phase !== 'OFF')) iv = setInterval(() => { const p = (Date.now() - t0) / n; U.hold = { p: Math.min(1, p), off: U.st && U.st.phase !== 'OFF', left: Math.max(0, Math.ceil((n - (Date.now() - t0)) / 1000)) }; if (p >= 1 && !fired) { fired = true; clearInterval(iv); iv = 0; powerToggle(); U.hold = null; } render(); }, 100);
        else if (!pw) iv = setTimeout(() => { fired = true; handleSem(U.page === 'menu' ? 'back' : b.main, true); }, 1000);
      });
      const up = () => { e.classList.remove('down'); if (iv) { clearInterval(iv); clearTimeout(iv); iv = 0; } if (U.hold) stopHold(); if (fired) return; fired = true;
        if (pw && U.st && U.st.phase === 'OFF') { if (pw.onMs === 0) powerToggle(); else toast('Taste ' + Math.round(pw.onMs / 1000) + ' s halten zum Einschalten'); return; }
        handleBtn(b); };
      e.addEventListener('pointerup', up); e.addEventListener('pointerleave', () => { e.classList.remove('down'); if (iv) { clearInterval(iv); clearTimeout(iv); iv = 0; } U.hold = null; fired = true; });
      if (sk.wheel && sk.wheel.includes(b.id)) e.addEventListener('wheel', (ev) => { ev.preventDefault(); handleSem(ev.deltaY < 0 ? 'up' : 'down', false); }, { passive: false });
    }
    root.querySelector('.dv-dim').addEventListener('mousedown', () => setMouse(false));
    root.classList.toggle('debug', /debug=1/.test(location.search));
  };
  const setMouse = (on, typing) => { U.mouse = !!on; root && root.classList.toggle('mouse', U.mouse); post('devMouse', { on: !!on, typing: !!typing }); hint(); };
  const hint = () => { if (hintEl) hintEl.textContent = U.mouse ? 'Tasten anklicken · Pfeile/Enter · ´ oder ESC: Mauszeiger aus' : '´ Mauszeiger · Pfeile/Enter · Enter halten: Ein/Aus · ⌫ ausblenden'; };
  const toast = (t, bad) => { if (!toastEl) return; toastEl.textContent = t; toastEl.className = 'dv-toast on' + (bad ? ' bad' : ''); clearTimeout(toast._t); toast._t = setTimeout(() => toastEl.classList.remove('on'), 3200); };
  const powerToggle = () => { if (!U.st) return; act('power', { on: U.st.phase === 'OFF' }); };

  const ctx = () => ({ st: U.st, def: U.def, ui: U, menu: menuItems });
  function render() {
    if (!U.st || !scr) return;
    scr.classList.toggle('off', U.st.phase === 'OFF'); scr.classList.toggle('lit', U.light);
    let h = U.st.phase === 'OFF' ? '' : U.sk.screen(ctx());
    if (U.hold) h += `<div class="flash">${U.hold.off ? 'AUS' : 'EIN'} in ${U.hold.left} s … halten</div>`;
    scr.innerHTML = h;
    const leds = box.querySelectorAll('.led'); const ch = U.st.channels; const mx = ch ? Math.max(ch.G || 0, ch.H || 0, ch.T || 0) : 0;
    leds.forEach((l, i) => { l.className = 'led' + (U.st.phase === 'MEASURING' && i < mx ? ' on' : U.st.phase === 'READY' && i === 0 ? ' ok' : ''); });
  }
  function menuItems() {
    const st = U.st, d = U.def, it = [];
    const cyc = (arr, cur) => arr[(arr.indexOf(cur) + 1) % arr.length];
    const PR = { quick: 'schnell', normal: 'normal', precise: 'genau' };
    if (st.phase === 'READY') it.push({ t: 'Messung starten', f: () => act('start') });
    if (st.phase === 'MEASURING') it.push({ t: 'Messung stoppen', f: () => act('stop') });
    if (st.hasResult) it.push({ t: 'Messung speichern', f: openSave });
    if (st.phase === 'READY') {
      if (d.modes.length > 1) it.push({ t: 'Modus: ' + (d.modes.find((m) => m.id === st.mode) || {}).label, f: () => act('mode', { mode: cyc(d.modes.map((m) => m.id), st.mode) }), keep: true });
      it.push({ t: 'Messdauer: ' + PR[st.precision] + ` (${d.durations[st.precision] / 1000} s)`, f: () => act('precision', { precision: cyc(['quick', 'normal', 'precise'], st.precision) }), keep: true });
      if (d.zero) it.push({ t: d.zero.label, f: () => act('zero') });
    }
    it.push({ t: 'Ton: ' + (st.muted ? 'AUS' : 'EIN'), f: () => act('mute'), keep: true }, { t: 'Info', f: () => { U.page = 'info'; } }, { t: 'Ausschalten', f: () => act('power', { on: false }) });
    return it;
  }
  /** Taste gedrückt → Bedeutung je nach Seite (Hauptbild/Menü) laut Skin */
  function handleBtn(b) { AU.click(); handleSem(U.page === 'menu' ? b.menu : b.main, false); }
  /** Bedeutungen: up down ok back menu info ack screen mode zero a b okack */
  function handleSem(a, long) {
    const st = U.st; if (!st || U.save || !U.vis) return;
    if (st.phase === 'OFF') { if (a === 'ok' && U.sk.pw && U.sk.pw.onMs === 0) powerToggle(); return; }
    if (st.phase === 'BOOTING' || st.phase === 'SELF_TEST') return;
    if (st.phase === 'ERROR') { if (a === 'ok' || a === 'back') act('power', { on: false }); return; }
    if (a === 'ack') { ack(); return; }
    if (U.page === 'menu') {
      const it = menuItems(); const n = it.length;
      if (a === 'up') U.cur = (U.cur + n - 1) % n; else if (a === 'down') U.cur = (U.cur + 1) % n;
      else if (a === 'ok') { const s = it[Math.min(U.cur, n - 1)]; if (!s.keep) U.page = 'main'; s.f(); }
      else if (a === 'back' || a === 'menu') U.page = 'main';
      return render();
    }
    if (U.page === 'info') { U.page = 'main'; return render(); }
    switch (a) {
      case 'menu': U.page = 'menu'; U.cur = 0; break;
      case 'ok': case 'a': if (st.phase === 'READY') act('start'); else if (st.phase === 'MEASURING') act('stop'); break;
      case 'okack': if (st.alert !== 'NORMAL' && st.phase === 'MEASURING' && !U.ack) ack(); else U.page = 'info'; break;
      case 'b': if (st.hasResult) openSave(); else toast('Noch kein Messwert zum Speichern', true); break;
      case 'info': case 'up': case 'down':
        if (U.sk.views) { U.view = U.sk.views[(U.sk.views.indexOf(U.view) + 1) % U.sk.views.length]; } else U.page = 'info'; break;
      case 'screen': U.light = !U.light; break;
      case 'mode': if (st.phase === 'READY' && U.def.modes.length > 1) act('mode', { mode: U.def.modes[(U.def.modes.findIndex((m) => m.id === st.mode) + 1) % U.def.modes.length].id }); else if (U.def.modes.length > 1) toast('Kanalwechsel nur im Zustand BEREIT', true); break;
      case 'zero': if (U.def.zero) act('zero'); else toast('Dieses Gerät hat keine Nullung', true); break;
      case 'left': case 'back': break;
    }
    render();
  }
  /** Alarm quittieren (Ton aus bis der Wert wieder im Normalbereich ist) */
  function ack() { if (U.st && U.st.alert !== 'NORMAL') { U.ack = true; stopLoops(); toast('Alarm quittiert'); } else toast('Kein Alarm aktiv'); render(); }
  /** Tastatur: Pfeile/Enter. Enter lang = Ein/Aus wie die Gerätetaste. */
  function handleKey(k) {
    const st = U.st; if (!st) return; AU.click();
    if (k === 'enterlong') return powerToggle();
    if (st.phase === 'OFF') { if (k === 'enter') { if (U.sk.pw && U.sk.pw.onMs === 0) powerToggle(); else toast('Enter halten zum Einschalten'); } return; }
    const sem = U.page === 'menu' ? { up: 'up', down: 'down', left: 'back', right: 'ok', enter: 'ok', back: 'back' }[k] : { up: 'info', down: 'screen', left: 'back', right: 'menu', enter: 'ok', back: 'back' }[k];
    if (sem) handleSem(sem, false);
  }

  function openSave() {
    if (!U.st || !U.st.canSave) return toast('Messung zu kurz – Wert erst ansprechen lassen', true);
    U.save = true; U.page = 'main'; setMouse(true, true); post('devSamples');
    savePanel.innerHTML = `<h3>Messung speichern</h3><div class="sub">${esc(U.def.label)} · ${esc(fmtSt())}</div>
      <label>Messpunktbezeichnung</label><input id="dvl" maxlength="40" placeholder="MP-01"><label>Bemerkung</label><textarea id="dvn" maxlength="500" placeholder="z. B. erhöhter Wert am Fahrzeug"></textarea>
      <label>Verknüpfte Probe (optional)</label><select id="dvs"><option value="">– keine –</option></select>
      <div class="btns"><button id="dvc">Abbrechen</button><button class="pri" id="dvok">Speichern</button></div>`;
    savePanel.classList.add('on'); root.classList.add('mouse');
    savePanel.querySelector('#dvl').focus();
    savePanel.querySelector('#dvc').onclick = closeSave;
    savePanel.querySelector('#dvok').onclick = () => act('save', { label: savePanel.querySelector('#dvl').value, note: savePanel.querySelector('#dvn').value, sample_id: savePanel.querySelector('#dvs').value || null });
    savePanel.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeSave(); } });
  }
  const fmtSt = () => (U.st.channels && !U.st.value ? 'Mehrkanal-Messung' : `${fmt(U.st)} ${U.st.unit}`);
  function closeSave() { U.save = false; savePanel.classList.remove('on'); post('devMouse', { on: true, typing: false }); }

  // ---- Töne bei Zustandswechseln + Alarmschleifen (Aufnahmen des jeweiligen Geräts, sonst neutrale Töne) --------------
  function sounds(prev, st) {
    if (!prev) return; if (prev.phase === 'OFF' && st.phase !== 'OFF') AU.on(); if (prev.phase !== 'OFF' && st.phase === 'OFF') { AU.off(); stopLoops(); }
    if (prev.phase === 'SELF_TEST' && st.phase === 'READY') AU.ready(); if (st.phase === 'ERROR' && prev.phase !== 'ERROR') AU.error();
    if (st.flash && st.flash !== prev.flash && /GESPEICHERT/.test(st.flash)) AU.saved();
    if (st.alert === 'NORMAL' || st.phase !== 'MEASURING') { U.ack = false; stopLoops(); }
  }
  const last = {};
  function stopLoops() { const sn = U.sk && U.sk.snd; if (sn) [sn.alarm, sn.warn].forEach((x) => x && x.file && AU.stop(x.file)); }
  setInterval(() => { // zurückhaltend: Alarm nur solange nicht quittiert/stumm; Warnung selten
    const st = U.st, sn = U.sk && U.sk.snd; if (!st || !sn || st.muted || st.phase !== 'MEASURING' || U.ack) return; const n = Date.now();
    const cfg = st.alert === 'ALARM' ? sn.alarm : st.alert === 'WARNUNG' ? sn.warn : null; if (!cfg) return;
    if (cfg.file && cfg.loop) { AU.play(cfg.file, true, 0.7); return; }
    if (n - (last[st.alert] || 0) < (cfg.every || 4000)) return; last[st.alert] = n;
    if (cfg.file) AU.play(cfg.file, false, 0.7); else if (cfg.synth) AU[cfg.synth]();
  }, 300);
  setInterval(() => { if (U.st && U.st.phase === 'MEASURING' && !U.save) render(); }, 500);

  // ---- Eingang: Nachrichten vom Lua-Client ------------------------------------------------------------------------
  const on = (d) => {
    if (d.cmd === 'open') { U.def = d.def; U.sk = SKINS[d.def.ui] || SKINS.dlm; U.st = d.state; U.page = 'main'; U.cur = 0; U.vis = true; U.save = false; U.keys = d.keys || {}; U.view = 'RATE'; U.light = false; U.ack = false; build(); root.classList.add('on'); hint(); render(); }
    else if (d.cmd === 'state') { sounds(U.st, d.state); U.st = d.state; if (!root) return; if (U.st.phase === 'OFF') U.page = 'main'; render(); }
    else if (d.cmd === 'close') { if (root) root.classList.remove('on', 'mouse'); stopLoops(); U.st = null; U.save = false; }
    else if (d.cmd === 'visible') { U.vis = d.on; root && root.classList.toggle('hidden', !d.on); if (!d.on) stopLoops(); }
    else if (d.cmd === 'mouse') { U.mouse = d.on; root && root.classList.toggle('mouse', d.on); hint(); }
    else if (d.cmd === 'key') handleKey(d.key);
    else if (d.cmd === 'toast') toast(d.text, d.bad);
    else if (d.cmd === 'samples') { const s = savePanel && savePanel.querySelector('#dvs'); if (s) (d.list || []).forEach((x) => { const o = document.createElement('option'); o.value = x.id; o.textContent = `${x.id} · ${x.label}`; s.appendChild(o); }); }
    else if (d.cmd === 'saved') { if (d.ok) { if (U.save) closeSave(); toast(d.msg || 'Gespeichert'); } else toast(d.msg || 'Speichern nicht möglich', true); }
  };
  window.addEventListener('message', (e) => { const d = e.data || {}; if (d.type === 'dev') on(d); });
  // Tastatur im Maus-Modus (NUI hat den Fokus). Im HUD-Modus kommen die Tasten vom Lua-Client.
  let enterT = 0, enterFired = false;
  window.addEventListener('keydown', (e) => {
    if (!U.st || !U.mouse || U.save) return; const k = e.key;
    if (k === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); if (!enterT) { enterFired = false; enterT = setTimeout(() => { enterFired = true; handleKey('enterlong'); }, 1000); } return; }
    const m = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Backspace: 'back' }[k];
    if (m) { e.preventDefault(); e.stopImmediatePropagation(); handleKey(m); return; }
    if (e.code === 'Equal' || e.code === 'Backquote' || k === '´' || k === '`' || k === 'Dead' || k === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); setMouse(false); } // ´ schaltet den Mauszeiger wieder aus
  }, true);
  window.addEventListener('keyup', (e) => { if (e.key !== 'Enter' || !enterT) return; clearTimeout(enterT); enterT = 0; if (!enterFired && U.st && U.mouse && !U.save) handleKey('enter'); enterFired = false; }, true);
  // ---- Auswahlmenü (Messgerätefach / Ausrüstung): gleicher Stil wie die Probenentnahme-Karte (schwarz, orange Akzent) -------------
  const M = { el: null, items: [], sel: 0, open: false };
  const menuClose = (id) => { if (!M.open) return; M.open = false; M.el.classList.remove('on'); post(id ? 'menuPick' : 'menuClose', { id: id || null }); };
  const menuDraw = () => { M.el.querySelectorAll('.mi').forEach((e, i) => e.classList.toggle('sel', i === M.sel)); };
  function menuShow(d) {
    if (!M.el) { M.el = document.createElement('div'); M.el.id = 'dvmenu'; document.body.appendChild(M.el); }
    M.items = d.items || []; M.sel = Math.max(0, M.items.findIndex((i) => !i.disabled)); M.open = true;
    M.el.innerHTML = `<div class="mt">${esc(d.title || 'AUSWAHL')}</div>` + M.items.map((it, i) => `<div class="mi${it.disabled ? ' dis' : ''}" data-i="${i}"><span class="ml"><b>${esc(it.label)}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</span></div>`).join('');
    M.el.classList.add('on'); menuDraw();
    M.el.querySelectorAll('.mi').forEach((e) => { const i = +e.dataset.i; e.onmouseenter = () => { if (!M.items[i].disabled) { M.sel = i; menuDraw(); } }; e.onclick = () => { if (!M.items[i].disabled) menuClose(M.items[i].id); }; });
  }
  window.addEventListener('keydown', (e) => {
    if (!M.open) return; const k = e.key; e.preventDefault(); e.stopImmediatePropagation();
    const move = (dir) => { let i = M.sel; for (let n = 0; n < M.items.length; n++) { i = (i + dir + M.items.length) % M.items.length; if (!M.items[i].disabled) break; } M.sel = i; menuDraw(); };
    if (k === 'ArrowDown') move(1); else if (k === 'ArrowUp') move(-1); else if (k === 'Enter') { const it = M.items[M.sel]; if (it && !it.disabled) menuClose(it.id); } else if (k === 'Escape' || k === 'Backspace') menuClose(null);
  }, true);
  // Mausrad wählt den Eintrag (Rad nach unten = nächster, nach oben = vorheriger); Klick oder Enter bestätigt
  window.addEventListener('wheel', (e) => {
    if (!M.open) return; e.preventDefault(); const dir = e.deltaY > 0 ? 1 : -1; let i = M.sel;
    for (let n = 0; n < M.items.length; n++) { i = (i + dir + M.items.length) % M.items.length; if (!M.items[i].disabled) break; }
    M.sel = i; menuDraw(); const el = M.el.querySelectorAll('.mi')[i]; if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }, { passive: false });
  // Steuerung ohne Mauszeiger: der Lua-Client liest Mausrad/Enter/Rücktaste aus dem Spiel und schickt nav/pick/close
  window.addEventListener('message', (e) => {
    const d = e.data || {}; if (d.type === 'dev-menu') menuShow(d);
    else if (d.type === 'dev-menu-nav' && M.open) { const dir = d.dir === 'down' ? 1 : -1; let i = M.sel; for (let n = 0; n < M.items.length; n++) { i = (i + dir + M.items.length) % M.items.length; if (!M.items[i].disabled) break; } M.sel = i; menuDraw(); }
    else if (d.type === 'dev-menu-pick' && M.open) { const it = M.items[M.sel]; if (it && !it.disabled) menuClose(it.id); }
    else if (d.type === 'dev-menu-close' && M.open) menuClose(null);
  });
  window.CBRN_DEV = { on, U, SKINS, handleSem, handleKey };
})();
