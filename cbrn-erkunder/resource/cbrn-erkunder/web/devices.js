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

  // ---- Töne (WebAudio, kein Dateizugriff): neutral und kurz ----------------------------------------------------------
  const AU = (() => {
    let ctx = null; const get = () => { try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); } catch (e) { ctx = null; } return ctx; };
    const beep = (f, ms, type = 'square', vol = 0.05, at = 0) => { const c = get(); if (!c) return; const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + ms / 1000 + 0.02); };
    return { click: () => beep(1800, 25, 'square', 0.03), on: () => { beep(880, 90, 'sine'); beep(1320, 140, 'sine', 0.05, 0.1); }, off: () => { beep(660, 90, 'sine'); beep(440, 160, 'sine', 0.05, 0.1); },
      ready: () => beep(1180, 120, 'sine'), saved: () => { beep(1000, 70, 'sine'); beep(1500, 120, 'sine', 0.05, 0.09); }, warn: () => { beep(1500, 90); beep(1500, 90, 'square', 0.05, 0.16); }, alarm: () => { beep(2200, 160, 'square', 0.07); beep(1700, 160, 'square', 0.07, 0.2); }, error: () => beep(300, 320, 'sawtooth', 0.05), tick: () => beep(2600, 12, 'square', 0.02) };
  })();

  // ---- Skins -------------------------------------------------------------------------------------------------------
  const circ = (cx, cy, r, W, H) => ({ x: (cx - r) / W, y: (cy - r) / H, w: (2 * r) / W, h: (2 * r) / H });
  const rect = (x, y, w, h, W, H) => ({ x: x / W, y: y / H, w: w / W, h: h / H });
  const btn = (id, act, label, g) => ({ id, act, label, ...g });
  const SKINS = {
    dlm: { img: IMG + 'dlm.png', W: 435, H: 700, scr: rect(112, 167, 209, 170, 435, 700), css: { '--bg': '#b2bba2', '--fg': '#1a2418', '--off': '#8d958a' }, power: ['down'], menuOnUp: false,
      btns: [btn('menu', 'menu', 'Menu', circ(125, 497, 43, 435, 700)), btn('info', 'up', 'Info / ▲', circ(216, 466, 28, 435, 700)), btn('mute', 'mute', 'Mute', circ(308, 497, 43, 435, 700)), btn('onoff', 'down', 'On / Screen / ▼', circ(216, 534, 28, 435, 700))],
      screen: (c) => lcdSingle(c, { bar: 'log' }) },
    como: { img: IMG + 'como.png', W: 327, H: 700, scr: rect(78, 53, 169, 109, 327, 700), css: { '--bg': '#cdd870', '--fg': '#232a05', '--off': '#a9b25c' }, power: ['ok'], menuOnUp: false,
      btns: [btn('b1', 'menu', 'Menü', circ(77, 226, 16, 327, 700)), btn('b2', 'b', 'Speichern', circ(249, 226, 16, 327, 700)), btn('t1', 'up', '▲', circ(106, 271, 17, 327, 700)), btn('c', 'ok', 'Start / Stop · Ein', circ(163, 268, 17, 327, 700)), btn('t2', 'down', '▼', circ(221, 271, 17, 327, 700))],
      screen: (c) => lcdSingle(c, { bar: 'log2', both: true }) },
    pid: { img: IMG + 'pid.png', W: 205, H: 700, scr: rect(40, 217, 125, 90, 205, 700), css: { '--bg': '#b9cfa8', '--fg': '#1b2a14', '--off': '#8fa383' }, power: ['ok', 'back'], menuOnUp: false,
      btns: [btn('a', 'menu', 'A – Menü', circ(76, 372, 17, 205, 700)), btn('b', 'ok', 'B – Start / Stop · Ein', circ(131, 372, 17, 205, 700)), btn('up', 'up', '▲', circ(103, 398, 16, 205, 700)), btn('esc', 'back', 'Esc (lang: Aus)', circ(97, 437, 21, 205, 700)), btn('dn', 'down', '▼', circ(103, 484, 16, 205, 700))],
      screen: (c) => lcdSingle(c, { bar: 'log3', minmax: true }) },
    ims: { img: IMG + 'ims.png', W: 376, H: 700, scr: rect(100, 304, 191, 66, 376, 700), css: { '--bg': '#a9b39f', '--fg': '#1b2418', '--off': '#868f80' }, power: ['ok'], menuOnUp: true,
      btns: [btn('k1', 'up', 'Drehknopf links (▲)', rect(36, 172, 18, 48, 376, 700)), btn('k2', 'ok', 'Drehknopf drücken (OK · lang: Aus)', rect(54, 172, 16, 48, 376, 700)), btn('k3', 'down', 'Drehknopf rechts (▼)', rect(70, 172, 18, 48, 376, 700))],
      leds: Array.from({ length: 8 }, (_, i) => ({ ...circ(138 + i * 17.3, 431, 7.5, 376, 700) })), wheel: ['k1', 'k3'], screen: (c) => lcdIms(c) },
    mgmg: { img: IMG + 'mgmg.png', W: 284, H: 700, scr: rect(68, 336, 156, 158, 284, 700), css: { '--bg': '#bcd3a3', '--fg': '#17230f', '--off': '#8ea184' }, power: ['ok'], menuOnUp: true,
      btns: [btn('dn', 'down', '▼ (Info)', circ(85, 578, 24, 284, 700)), btn('ok', 'ok', 'OK – Start / Stop · Ein (lang: Aus)', circ(140, 578, 24, 284, 700)), btn('up', 'up', '▲ (Menü)', circ(197, 578, 24, 284, 700))],
      screen: (c) => lcdGas(c) },
  };

  // ---- Bildschirminhalte -------------------------------------------------------------------------------------------
  const fmt = (st) => (st.value == null ? '– – –' : st.over ? 'OVER' : num(st.value, st.dec));
  const phaseName = { OFF: 'AUS', BOOTING: 'INITIALISIERUNG', SELF_TEST: 'SELBSTTEST', READY: 'BEREIT', MEASURING: 'MESSUNG', ERROR: 'FEHLER' };
  const batt = (st) => `<span class="ic">${st.batteryLow ? '⚠ ' : ''}BAT ${st.battery}%</span>`;
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
  const alTxt = { WARNUNG: '⚠ WARNUNG', ALARM: 'ALARM', 'AUFFÄLLIG': 'AUFFÄLLIG' };
  function barHtml(v, kind) { // Balken: logarithmisch über den Messbereich
    const lo = kind === 'log' ? 0.01 : kind === 'log2' ? 0.5 : 0.01, hi = kind === 'log' ? 250 : kind === 'log2' ? 20000 : 20000;
    const f = v == null || v <= lo ? 0 : Math.min(1, Math.log10(v / lo) / Math.log10(hi / lo)); return `<div class="bar"><i style="width:${(f * 100).toFixed(1)}%"></i></div>`;
  }
  function lcdSingle(c, o) {
    const cm = common(c); if (cm) return cm + flashOf(c.st);
    const { st, def } = c; const mode = def.modes.find((m) => m.id === st.mode);
    const a = lvl(st); const meas = st.phase === 'MEASURING'; const head = st.err ? 'FEHLER' : meas ? (a !== 'NORMAL' ? alTxt[a] : st.stable ? 'STABIL' : 'MESSUNG …') : st.hasResult ? 'GESTOPPT' : 'BEREIT';
    const stat = st.stats ? `<div class="row sm"><span>MIN ${num(st.stats.min, st.dec)}</span><span>MAX ${num(st.stats.max, st.dec)}</span><span>Ø ${num(st.stats.avg, st.dec)}</span></div>` : '';
    return `<div class="in"><div class="row">${batt(st)}<span class="ic">${st.muted ? '🔇' : '🔊'}</span><span class="ic ${a !== 'NORMAL' ? 'al-' + a : ''}">${head}</span></div>
      <div class="lbl" style="margin-top:1.5cqh">${esc(mode ? mode.label : '')}</div>
      <div class="grow center"><div><div class="big ${a === 'ALARM' || a === 'WARNUNG' ? 'al-' + a : ''}">${fmt(st)}</div><div class="unit">${esc(st.unit)}</div></div></div>
      ${o.bar ? barHtml(st.value, o.bar) : ''}${o.minmax || o.both ? stat : ''}</div>${flashOf(st)}`;
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
    const rows = (def.channels || []).map((d) => { const g = GASROWS[d.id]; const v = ch ? ch[d.id] : null; const bad = ch && judgeCh(d, v) !== 'NORMAL'; return `<div class="row ${bad ? 'inv' : ''}" style="padding:.4cqh 1cqw;font-size:8.4cqh"><span>${g[0]}</span><span style="font-weight:700">${v == null ? '–' : num(v, g[2])}</span><span style="width:19cqw;text-align:right">${g[1]}</span></div>`; }).join('');
    const stateTxt = st.phase === 'MEASURING' ? (a !== 'NORMAL' ? alTxt[a] : st.stable ? 'STABIL' : 'MESSUNG') : st.hasResult ? 'GESTOPPT' : 'BEREIT';
    return `<div class="in" style="padding:1.5cqh 2cqw"><div class="row sm"><span>${batt(st)}</span><span class="${a !== 'NORMAL' ? 'al-' + a : ''}">${stateTxt}</span><span>${st.muted ? '🔇' : ''}</span></div>${rows}
      <div class="row sm" style="margin-top:auto;border-top:.4cqh solid var(--fg);padding-top:.8cqh"><span>☰ Menü</span><span>🔍 Info</span><span>★ ${st.phase === 'MEASURING' ? 'Stop' : 'Start'}</span></div></div>${flashOf(st)}`;
  }
  const RANK = { NORMAL: 0, 'AUFFÄLLIG': 1, WARNUNG: 2, ALARM: 3 };
  function judgeCh(d, v) { const t = d.thr; if (!t || v == null) return 'NORMAL'; if ((t.alarm != null && v >= t.alarm) || (t.lowAlarm != null && v <= t.lowAlarm)) return 'ALARM'; if ((t.warning != null && v >= t.warning) || (t.lowWarning != null && v <= t.lowWarning)) return 'WARNUNG'; if (t.attention != null && v >= t.attention) return 'AUFFÄLLIG'; return 'NORMAL'; }
  void RANK;

  // ---- Zustand / Aufbau --------------------------------------------------------------------------------------------
  const U = { def: null, sk: null, st: null, page: 'main', cur: 0, vis: true, mouse: false, save: false, samples: [], keys: {}, prev: null };
  let root, box, scr, toastEl, savePanel, hintEl, timerAlert = 0;
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
      const e = document.createElement('button'); e.className = 'hs' + (b.sq ? ' sq' : ''); e.title = b.label; place(e, b); box.appendChild(e);
      let t = 0, long = false;
      e.addEventListener('pointerdown', (ev) => { ev.preventDefault(); e.classList.add('down'); long = false; t = setTimeout(() => { long = true; handle(b.act, true); }, 900); });
      const up = () => { e.classList.remove('down'); if (t) { clearTimeout(t); t = 0; if (!long) handle(b.act, false); } };
      e.addEventListener('pointerup', up); e.addEventListener('pointerleave', () => { e.classList.remove('down'); if (t) { clearTimeout(t); t = 0; } });
      if (sk.wheel && sk.wheel.includes(b.id) || b.id === 'k2') e.addEventListener('wheel', (ev) => { ev.preventDefault(); handle(ev.deltaY < 0 ? 'up' : 'down', false); }, { passive: false });
    }
    root.querySelector('.dv-dim').addEventListener('mousedown', () => setMouse(false));
    root.classList.toggle('debug', /debug=1/.test(location.search));
  };
  const setMouse = (on, typing) => { U.mouse = !!on; root && root.classList.toggle('mouse', U.mouse); post('devMouse', { on: !!on, typing: !!typing }); hint(); };
  const hint = () => { if (hintEl) hintEl.textContent = U.mouse ? 'Tasten anklicken · ↑ ↓ ← → Enter · ESC / E zurück' : 'E bedienen · ↑ ↓ ← → Enter · ⌫ ausblenden'; };
  const toast = (t, bad) => { if (!toastEl) return; toastEl.textContent = t; toastEl.className = 'dv-toast on' + (bad ? ' bad' : ''); clearTimeout(toast._t); toast._t = setTimeout(() => toastEl.classList.remove('on'), 3200); };

  const ctx = () => ({ st: U.st, def: U.def, ui: U, menu: menuItems });
  function render() {
    if (!U.st || !scr) return;
    scr.classList.toggle('off', U.st.phase === 'OFF'); scr.innerHTML = U.st.phase === 'OFF' ? '' : U.sk.screen(ctx());
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
  function handle(a, long) {
    const st = U.st; if (!st || U.save || !U.vis) return; AU.click();
    const pw = U.sk.power.includes(a);
    if (st.phase === 'OFF') { if (pw) act('power', { on: true }); return render(); }
    if (st.phase === 'BOOTING' || st.phase === 'SELF_TEST') return;
    if (st.phase === 'ERROR') { if (a === 'ok' || a === 'back' || pw) act('power', { on: false }); return; }
    if (long && pw) { act('power', { on: false }); return; }
    if (a === 'mute') { act('mute'); return; }
    if (U.page === 'menu') {
      const it = menuItems(); const n = it.length;
      if (a === 'up') U.cur = (U.cur + n - 1) % n; else if (a === 'down') U.cur = (U.cur + 1) % n;
      else if (a === 'ok' || a === 'right') { const s = it[Math.min(U.cur, n - 1)]; if (!s.keep) U.page = 'main'; s.f(); }
      else if (a === 'back' || a === 'menu' || a === 'left') U.page = 'main';
      return render();
    }
    if (U.page === 'info') { U.page = 'main'; return render(); }
    if (a === 'menu' || a === 'right' || (a === 'up' && U.sk.menuOnUp)) { U.page = 'menu'; U.cur = 0; return render(); }
    if (a === 'ok') { if (st.phase === 'READY') act('start'); else if (st.phase === 'MEASURING') act('stop'); return; }
    if (a === 'b') { if (st.hasResult) openSave(); else toast('Noch kein Messwert zum Speichern', true); return; }
    if (a === 'up' || (a === 'down' && U.sk.menuOnUp)) { U.page = 'info'; return render(); }
    if (a === 'down' && U.def.modes.length > 1 && st.phase === 'READY') { act('mode', { mode: U.def.modes[(U.def.modes.findIndex((m) => m.id === st.mode) + 1) % U.def.modes.length].id }); }
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

  // ---- Töne bei Zustandswechseln -----------------------------------------------------------------------------------
  function sounds(prev, st) {
    if (!prev) return; if (prev.phase === 'OFF' && st.phase !== 'OFF') AU.on(); if (prev.phase !== 'OFF' && st.phase === 'OFF') AU.off();
    if (prev.phase === 'SELF_TEST' && st.phase === 'READY') AU.ready(); if (st.phase === 'ERROR' && prev.phase !== 'ERROR') AU.error();
    if (st.flash && st.flash !== prev.flash && /GESPEICHERT/.test(st.flash)) AU.saved();
  }
  setInterval(() => { // Warn-/Alarmton – zurückhaltend, mit Stummschaltung
    const st = U.st; if (!st || st.muted || st.phase !== 'MEASURING') return; const n = Date.now();
    if (st.alert === 'ALARM' && n - timerAlert > 1200) { timerAlert = n; AU.alarm(); } else if (st.alert === 'WARNUNG' && n - timerAlert > 4000) { timerAlert = n; AU.warn(); }
  }, 300);
  setInterval(() => { if (U.st && U.st.phase === 'MEASURING' && !U.save) render(); }, 500);

  // ---- Eingang: Nachrichten vom Lua-Client ------------------------------------------------------------------------
  const on = (d) => {
    if (d.cmd === 'open') { U.def = d.def; U.sk = SKINS[d.def.ui] || SKINS.dlm; U.st = d.state; U.page = 'main'; U.cur = 0; U.vis = true; U.save = false; U.keys = d.keys || {}; build(); root.classList.add('on'); hint(); render(); }
    else if (d.cmd === 'state') { sounds(U.st, d.state); U.st = d.state; if (!root) return; if (U.st.phase === 'OFF') U.page = 'main'; render(); }
    else if (d.cmd === 'close') { if (root) root.classList.remove('on', 'mouse'); U.st = null; U.save = false; }
    else if (d.cmd === 'visible') { U.vis = d.on; root && root.classList.toggle('hidden', !d.on); }
    else if (d.cmd === 'mouse') { U.mouse = d.on; root && root.classList.toggle('mouse', d.on); hint(); }
    else if (d.cmd === 'key') handle(d.key === 'left' ? 'back' : d.key === 'enter' ? 'ok' : d.key, false);
    else if (d.cmd === 'toast') toast(d.text, d.bad);
    else if (d.cmd === 'samples') { const s = savePanel && savePanel.querySelector('#dvs'); if (s) (d.list || []).forEach((x) => { const o = document.createElement('option'); o.value = x.id; o.textContent = `${x.id} · ${x.label}`; s.appendChild(o); }); }
    else if (d.cmd === 'saved') { if (d.ok) { if (U.save) closeSave(); toast(d.msg || 'Gespeichert'); } else toast(d.msg || 'Speichern nicht möglich', true); }
  };
  window.addEventListener('message', (e) => { const d = e.data || {}; if (d.type === 'dev') on(d); });
  // Tastatur im Maus-Modus (NUI hat den Fokus). Im HUD-Modus kommen die Tasten vom Lua-Client.
  window.addEventListener('keydown', (e) => {
    if (!U.st || !U.mouse || U.save) return; const k = e.key;
    const m = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'back', ArrowRight: 'right', Enter: 'ok', Backspace: 'back', m: 'menu', M: 'menu', s: 'b', S: 'b' }[k];
    if (m) { e.preventDefault(); e.stopImmediatePropagation(); handle(m, false); return; }
    if (k === 'e' || k === 'E' || k === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); setMouse(false); }
  }, true);
  window.CBRN_DEV = { on, U, SKINS, handle };
})();
