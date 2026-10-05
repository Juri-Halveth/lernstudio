(function (root) {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;
  const icons = () => root.lucide?.createIcons();
  const read = key => { try { return localStorage.getItem(key); } catch (_) { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, value); return true; } catch (_) { return false; } };
  const sessionProgress = new Map();
  const unsavedProgress = new Set();
  let music = null, playing = false, starting = false, playVersion = 0, volume = .7, hiddenPause = false;
  const storedVolume = Number(read('lernstudio_journey_volume') || .7);
  if (Number.isFinite(storedVolume)) volume = Math.max(0, Math.min(1, storedVolume));
  const motionQuery = root.matchMedia?.('(prefers-reduced-motion: reduce)');
  const motionPaused = () => motionQuery?.matches || read('lernstudio_journey_motion') === 'paused';
  function updateSound(message = '') {
    document.querySelectorAll('[data-journey-sound]').forEach(button => {
      button.innerHTML = icon(playing ? 'volume-2' : 'volume-x');
      button.title = button.ariaLabel = playing ? 'Musik ausschalten' : 'Musik einschalten';
      button.setAttribute('aria-pressed', String(playing));
    });
    document.querySelectorAll('[data-sound-status]').forEach(node => { node.textContent = message; });
    icons();
  }
  async function toggleSound() {
    const version = ++playVersion;
    if (playing || starting) { playing = false; starting = false; hiddenPause = false; music?.pause(); updateSound(); return; }
    if (!music) {
      music = new Audio('lernreise-mobile-v3.mp3');
      music.loop = true; music.preload = 'none';
    }
    music.volume = volume; starting = true;
    try {
      await music.play();
      if (version !== playVersion) return;
      starting = false; playing = true;
      if (document.hidden) { music.pause(); hiddenPause = true; }
      updateSound();
    } catch (_) { if (version !== playVersion) return; starting = false; playing = false; updateSound('Musik konnte nicht starten. Erneut versuchen.'); }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && playing) { music?.pause(); hiddenPause = true; }
    else if (!document.hidden && hiddenPause && playing) {
      hiddenPause = false;
      music?.play().catch(() => { playing = false; updateSound('Musik pausiert.'); });
    }
  });
  function soundButton() {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'journey-icon'; button.dataset.journeySound = '';
    button.title = button.ariaLabel = playing ? 'Musik ausschalten' : 'Musik einschalten';
    button.setAttribute('aria-pressed', String(playing));
    button.innerHTML = icon(playing ? 'volume-2' : 'volume-x');
    button.onclick = toggleSound;
    return button;
  }
  function menu(trigger, ctx) {
    const dialog = document.createElement('dialog'); dialog.className = 'journey-menu'; dialog.dataset.journeyMenu = ''; dialog.setAttribute('aria-labelledby', 'journeyMenuTitle');
    dialog.innerHTML = `<header><h2 id="journeyMenuTitle">Dein Lernstudio</h2><button class="journey-icon" aria-label="Menü schließen">${icon('x')}</button></header>
      <nav aria-label="Orte im Lernstudio"><a href="#home">${icon('orbit')}Zur Bucht</a><a href="#map">${icon('map')}Lernkarte</a><a href="#lab">${icon('code-2')}Code-Werkstatt</a><a href="#connections">${icon('network')}Verbindungen</a><a href="#bridge">${icon('waypoints')}Wissensbrücke</a><a href="#reference">${icon('book-open')}Nachschlagen</a><a href="community.html">${icon('messages-square')}Gemeinschaft</a></nav>
      <fieldset><legend>Dein Tempo</legend><label class="menu-toggle"><span>Ruhige Spielwelt</span><input id="journeyMotion" type="checkbox" ${motionPaused() ? 'checked' : ''} ${motionQuery?.matches ? 'disabled' : ''}></label><label class="volume-label" for="journeyVolume">Musiklautstärke</label><input id="journeyVolume" type="range" min="0" max="100" value="${Math.round(volume * 100)}"><button class="text-button" id="journeyTheme">${icon('sun-moon')}Hell / Dunkel</button></fieldset>
      <a class="journey-revisit" href="#expedition">Die drei Signale erneut erkunden</a>
      <footer><a href="impressum.html">Impressum</a><a href="datenschutz.html">Datenschutz</a><a href="quellcode.html">Quellcode</a></footer>`;
    document.body.appendChild(dialog); icons(); dialog.showModal();
    dialog.querySelector('header button').onclick = () => dialog.close();
    dialog.querySelectorAll('nav a,.journey-revisit').forEach(link => link.addEventListener('click', () => dialog.close()));
    dialog.querySelector('#journeyTheme').onclick = ctx.onTheme;
    dialog.querySelector('#journeyMotion').onchange = event => {
      write('lernstudio_journey_motion', event.target.checked ? 'paused' : 'moving');
      root.dispatchEvent(new Event('lernstudio-motion'));
    };
    dialog.querySelector('#journeyVolume').oninput = event => {
      volume = Number(event.target.value) / 100; if (music) music.volume = volume;
      write('lernstudio_journey_volume', String(volume));
    };
    dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } });
    dialog.addEventListener('close', () => { dialog.remove(); if (trigger.isConnected) trigger.focus(); }, {once:true});
  }
  function header(ctx) {
    const node = document.createElement('header'); node.className = 'journey-header';
    node.innerHTML = `<button class="journey-brand" type="button" aria-label="Lernstudio, zur Bucht"><img src="icon-192.png" width="34" height="34" alt=""><span>Lernstudio<small>Sternenbucht</small></span></button><span class="journey-header-space"></span><span class="journey-header-note" data-sound-status role="status"></span><button class="journey-icon account" id="acctBtn" type="button" aria-label="Lernprofil öffnen" title="Lernprofil öffnen">${icon('user-round')}</button><button class="journey-icon" id="journeyMenu" type="button" aria-label="Lernstudio-Menü öffnen" title="Karte, Werkstatt und Einstellungen">${icon('menu')}</button>`;
    node.querySelector('.journey-brand').onclick = () => ctx.go('home');
    node.querySelector('#acctBtn').onclick = ctx.onProfile;
    const trigger = node.querySelector('#journeyMenu'); trigger.onclick = () => menu(trigger, ctx);
    node.insertBefore(soundButton(), node.querySelector('#acctBtn'));
    return node;
  }
  function mount(main, ctx) {
    const engine = root.LernExpedition;
    if (!engine) { main.innerHTML = '<p>Die Bucht konnte nicht geladen werden. <a href="#map">Zur Lernkarte</a></p>'; return () => {}; }
    const key = 'lernstudio_expedition_v1:' + ctx.namespace;
    let solved = [...(sessionProgress.get(key) || [])], index = 0, disposed = false, handle = null;
    try {
      const saved = JSON.parse(read(key) || 'null');
      if (!unsavedProgress.has(key) && saved?.version === 1 && Array.isArray(saved.solved) && saved.solved.every(id => engine.stations.some(s => s.id === id))) solved = [...new Set(saved.solved)];
    } catch (_) {}
    if (ctx.forceIntro) solved = [];
    index = engine.stations.findIndex(station => !solved.includes(station.id));
    const resumed = !ctx.forceIntro && !!ctx.state.lastLesson;
    main.innerHTML = `<section class="journey-screen" aria-label="Deine Lernmission"><div class="bay-viewport" aria-hidden="true"></div><div class="journey-location"><span class="location-line"></span><span>STERNENBUCHT / ANKUNFT</span></div><div class="mission-deck"><div class="mission-content"></div></div><div class="journey-bottom"><span>Wissen gehört allen.</span><a href="eltern/" lang="ru">Для родителей и старших</a><a href="#bridge">${icon('waypoints')}Wissensbrücke</a><a href="#map">${icon('map')}Karte</a></div></section>`;
    const host = main.querySelector('.bay-viewport'), content = main.querySelector('.mission-content');
    let phase = resumed || index < 0 ? 2 : index;
    const updateMotion = () => handle?.setReducedMotion(motionPaused());
    root.addEventListener('lernstudio-motion', updateMotion);
    motionQuery?.addEventListener?.('change', updateMotion);
    if (root.LernBay) {
      Promise.resolve().then(() => disposed ? null : root.LernBay.mount(host, {phase, reducedMotion:motionPaused()})).then(value => {
        if (disposed) { value?.dispose(); return; } handle = value; handle?.setPhase(phase); updateMotion();
      }).catch(() => { host.dataset.renderState = 'fallback'; });
    } else host.dataset.renderState = 'fallback';
    function setPhase(value) { phase = value; handle?.setPhase(value); }
    function progress() { return `<ol class="mission-progress" aria-label="Drei Ankunftssignale">${engine.stations.map((s, i) => `<li class="${solved.includes(s.id) ? 'done' : i === index ? 'current' : ''}" ${i === index ? 'aria-current="step"' : ''}><span>${solved.includes(s.id) ? icon('check') : i + 1}</span><span class="sr-only">${esc(s.title)}</span></li>`).join('')}</ol>`; }
    function recommendation() {
      const next = engine.nextLesson(ctx.curriculum, ctx.state, ctx.state.lastLesson);
      setPhase(2);
      const count = Object.values(ctx.state.done || {}).filter(Boolean).length;
      content.innerHTML = `<p class="mission-kicker">${count ? 'DEINE REISE GEHT WEITER' : 'DEINE BUCHT IST VERBUNDEN'}</p><h1>${next ? esc(next.title) : 'Alle Lernpfade erkundet.'}</h1><p class="mission-prompt">${next ? esc(next.trackTitle) + '. Ein Gedanke, den du jetzt ausprobieren kannst.' : 'Du kannst eine Lektion erneut besuchen oder in der Werkstatt etwas Eigenes bauen.'}</p><button class="mission-next" id="missionContinue" type="button">${icon('arrow-right')}${next ? 'Weiterlernen' : 'Zur Werkstatt'}</button><p class="mission-note">${count} Lektionen abgeschlossen · Dein eigener Rhythmus.</p>`;
      content.querySelector('#missionContinue').onclick = () => ctx.go(next ? 'lesson' : 'lab', next?.id);
      content.querySelector('h1').tabIndex = -1;
      icons();
    }
    function showStation() {
      if (index < 0 || index >= engine.stations.length) { recommendation(); return; }
      const station = engine.stations[index]; setPhase(station.scenePhase ?? index);
      content.innerHTML = `${progress()}<p class="mission-kicker">${esc(station.kicker)}</p><h1>${esc(station.title)}</h1><p class="mission-prompt">${esc(station.prompt)}</p><div class="mission-choices" role="group" aria-label="Deine Antwort">${station.choices.map((choice, i) => `<button type="button" data-choice="${esc(choice.id)}"><span class="choice-number" aria-hidden="true">${i + 1}</span><span>${esc(choice.label)}</span>${icon('arrow-up-right')}</button>`).join('')}</div><p class="mission-feedback" role="status" aria-live="polite"></p>`;
      content.querySelectorAll('[data-choice]').forEach(button => button.onclick = () => {
        const result = engine.evaluate(station.id, button.dataset.choice);
        handle?.pulse(result.correct);
        const feedback = content.querySelector('.mission-feedback'); feedback.textContent = result.feedback;
        feedback.dataset.result = result.correct ? 'correct' : 'retry';
        if (!result.correct) { button.dataset.tried = 'true'; return; }
        if (!solved.includes(station.id)) solved.push(station.id);
        sessionProgress.set(key, [...solved]);
        const persisted = write(key, JSON.stringify({version:1,solved}));
        if (persisted) unsavedProgress.delete(key); else unsavedProgress.add(key);
        content.querySelector('.mission-choices').hidden = true;
        content.querySelector('.mission-progress').outerHTML = progress();
        const next = document.createElement('button'); next.type = 'button'; next.id = 'missionNext'; next.className = 'mission-next';
        next.innerHTML = icon('arrow-right') + (index === engine.stations.length - 1 ? 'Meine Lernreise beginnen' : 'Zum nächsten Signal');
        next.onclick = () => { index++; showStation(); content.querySelector('h1')?.focus({preventScroll:true}); };
        content.appendChild(next);
        if (!persisted) { const note = document.createElement('p'); note.className = 'mission-note'; note.textContent = 'Dieser Spielstand bleibt nur in der geöffneten Sitzung.'; content.appendChild(note); }
        setPhase(Math.min(2, index + 1)); icons(); next.focus({preventScroll:true});
      });
      const title = content.querySelector('h1'); title.tabIndex = -1; icons();
    }
    if (resumed || index < 0) recommendation(); else showStation();
    return () => { disposed = true; handle?.dispose(); root.removeEventListener('lernstudio-motion', updateMotion); motionQuery?.removeEventListener?.('change', updateMotion); };
  }
  function mountBridge(main, ctx) {
    const knownIds = ctx.curriculum.tracks.flatMap(t => t.stages.flatMap(s => s.lessons.map(l => l.id)));
    const box = document.createElement('section'); box.className = 'knowledge-bridge';
    box.innerHTML = `<a class="bridge-back" href="#home">${icon('arrow-left')}Zur Bucht</a><p class="mission-kicker">WISSENSBRÜCKE</p><h1>Welchen Gedanken bringst du mit?</h1><p class="bridge-intro">Eine Beobachtung aus deiner eigenen Übung. Ein neuer Zusammenhang. Ein privater Lernentwurf.</p><div class="packet-entry"><button class="mission-next" type="button" id="packetOpen">${icon('file-up')}Lernnotiz öffnen</button><input type="file" id="packetFile" accept=".json,application/json" hidden><p id="packetStatus" role="status"></p></div><div id="packetPreview" hidden></div><details class="bridge-access"><summary>Für Browser, PowerShell und Agenten</summary><nav><a href="#connections">Verbindungskarte</a><a href="api/space.json">Agenten-Übersicht</a><a href="api/manifest.json">Öffentlicher Einstieg</a><a href="api/lessons.json">Lektionsadressen</a><a href="api/example-learning-packet.json" download>Beispielnotiz</a><a href="https://github.com/Juri-Halveth/lernstudio/blob/main/AGENT_LEARNING.md">Vertrag und Werkzeuge</a></nav><p>Hier geöffnete Notizen bleiben in diesem Tab. Ein öffentlicher Beitrag ist ein gesondert geprüfter Pull Request.</p></details>`;
    main.appendChild(box); icons();
    const fileInput = box.querySelector('#packetFile'), status = box.querySelector('#packetStatus'), preview = box.querySelector('#packetPreview');
    let readVersion = 0;
    box.querySelector('#packetOpen').onclick = () => fileInput.click();
    fileInput.onchange = async () => {
      const version = ++readVersion, file = fileInput.files?.[0]; if (!file) return;
      preview.hidden = true; preview.replaceChildren(); status.textContent = '';
      try {
        if (file.size > 131072) throw new Error('Die Notiz darf höchstens 128 KiB groß sein.');
        const bytes = await file.arrayBuffer();
        const text = new TextDecoder('utf-8', {fatal:true, ignoreBOM:true}).decode(bytes);
        if (version !== readVersion || !box.isConnected) return;
        const packet = root.LernPackets.parse(text, knownIds);
        const title = document.createElement('h2'); title.textContent = packet.title;
        const note = document.createElement('p'); note.className = 'packet-observation'; note.textContent = packet.observation;
        const question = document.createElement('p'); question.className = 'packet-question'; question.textContent = packet.question;
        const stateLabel = document.createElement('p'); stateLabel.className = 'packet-state'; stateLabel.textContent = 'Privater Entwurf · ' + packet.source.kind;
        const action = document.createElement('button'); action.type = 'button'; action.className = 'mission-next'; action.innerHTML = icon('arrow-right') + 'Den Gedanken weiterverfolgen';
        const next = packet.lessonId || root.LernExpedition.nextLesson(ctx.curriculum, ctx.state)?.id;
        action.onclick = () => ctx.go(next ? 'lesson' : 'home', next);
        preview.append(stateLabel, title, note, question, action); preview.hidden = false;
        status.textContent = 'Notiz geöffnet. Inhalt nicht ausgeführt oder übertragen.'; icons();
      } catch (error) { status.textContent = error.message || 'Die Notiz passt nicht zum Lernvertrag.'; }
    };
    return () => { readVersion++; };
  }
  root.LernJourney = Object.freeze({header, mount, mountBridge, soundButton, motionPaused});
})(window);
