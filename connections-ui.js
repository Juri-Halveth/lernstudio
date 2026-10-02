(function (root) {
  'use strict';

  const trackIcons = Object.freeze({
    einstieg: 'compass', ki: 'sparkles', machine: 'cpu', html: 'panels-top-left',
    python: 'code', js: 'braces', sec: 'shield-check', math: 'sigma',
    mktg: 'megaphone', seo: 'search', proj: 'blocks', srv: 'terminal',
    matheanfassen: 'chart-spline'
  });
  const tones = ['mint', 'violet', 'coral', 'gold'];
  let sequence = 0;

  function mount(main, { curriculum, state = {}, go } = {}) {
    if (!main?.ownerDocument || typeof main.appendChild !== 'function') {
      throw new TypeError('LernConnections.mount needs a DOM host.');
    }
    if (!Array.isArray(curriculum?.tracks) || typeof go !== 'function') {
      throw new TypeError('LernConnections.mount needs curriculum.tracks and go.');
    }
    const doc = main.ownerDocument;
    const tracks = curriculum.tracks.map(track => ({
      track,
      stages: track.stages.map(stage => ({ stage, lessons: stage.lessons })),
      lessons: track.stages.flatMap(stage => stage.lessons)
    }));
    const allLessons = tracks.flatMap(entry => entry.lessons);
    const id = 'lern-connections-' + ++sequence;
    let disposed = false;
    let selected = Math.max(0, tracks.findIndex(entry =>
      entry.lessons.some(lesson => lesson.id === state.lastLesson)));

    const element = (tag, className, text) => {
      const node = doc.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = String(text);
      return node;
    };
    const icon = name => {
      const node = element('i');
      node.setAttribute('data-lucide', name);
      node.setAttribute('aria-hidden', 'true');
      return node;
    };
    const link = (href, text, symbol) => {
      const node = element('a', 'connections-link');
      node.setAttribute('href', href);
      node.append(icon(symbol), element('span', '', text));
      return node;
    };
    const done = lesson => Object.prototype.hasOwnProperty.call(state.done || {}, lesson.id) && state.done[lesson.id] === true;
    const completed = lessons => lessons.filter(done).length;
    const nextLesson = entry => entry.lessons.find(lesson => !done(lesson)) || entry.lessons[0];

    const section = element('section', 'connections-view');
    section.setAttribute('aria-labelledby', id + '-title');
    section.dataset.trackCount = String(tracks.length);
    section.dataset.lessonCount = String(allLessons.length);
    section.dataset.relation = 'curriculum-membership';
    const header = element('header', 'connections-heading');
    const heading = element('h1', '', 'Pulsar');
    heading.id = id + '-title';
    header.append(heading, link('#home', 'Zur Bucht', 'arrow-left'));

    const layout = element('div', 'connections-layout');
    const figure = element('figure', 'connections-figure');
    const radial = element('div', 'connections-radial');
    const spokes = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    spokes.setAttribute('class', 'connections-spokes');
    spokes.setAttribute('viewBox', '0 0 100 100');
    spokes.setAttribute('preserveAspectRatio', 'none');
    spokes.setAttribute('aria-hidden', 'true');
    spokes.setAttribute('focusable', 'false');
    const hub = element('div', 'connections-hub');
    const total = element('strong', 'connections-total', allLessons.length);
    hub.append(element('span', '', 'Lernstudio'), total, element('span', '', 'Lektionen'));
    const ports = element('ul', 'connections-ports');
    ports.setAttribute('aria-label', 'Lernpfade im Lernraum');
    const tooltip = element('span', 'connections-tooltip');
    tooltip.setAttribute('role', 'tooltip');
    tooltip.id = id + '-tooltip';
    tooltip.hidden = true;
    const buttons = [];
    const edges = [];

    // Spokes encode only curriculum membership, never prerequisites or subject dependencies.
    tracks.forEach((entry, index) => {
      const angle = -Math.PI / 2 + index * Math.PI * 2 / tracks.length;
      const x = 50 + Math.cos(angle) * 39;
      const y = 50 + Math.sin(angle) * 39;
      const item = element('li', 'connections-port');
      item.style.left = x + '%';
      item.style.top = y + '%';
      item.dataset.tone = tones[index % tones.length];
      const button = element('button', 'connections-track');
      button.type = 'button';
      button.dataset.trackId = entry.track.id;
      button.setAttribute('aria-label', String(entry.track.name));
      button.setAttribute('aria-controls', id + '-detail');
      button.setAttribute('aria-pressed', 'false');
      const number = element('span', 'connections-number', String(index + 1).padStart(2, '0'));
      number.setAttribute('aria-hidden', 'true');
      button.append(icon(trackIcons[entry.track.id] || 'book-open'), number);
      item.appendChild(button);
      ports.appendChild(item);
      buttons.push(button);
      const edge = doc.createElementNS('http://www.w3.org/2000/svg', 'line');
      edge.setAttribute('class', 'connections-spoke');
      edge.setAttribute('x1', '50');
      edge.setAttribute('y1', '50');
      edge.setAttribute('x2', String(x));
      edge.setAttribute('y2', String(y));
      spokes.appendChild(edge);
      edges.push(edge);
    });
    const caption = element('figcaption', 'connections-caption');
    caption.append(element('span', '', tracks.length + ' Lernpfade im Lernraum'));
    const progressSummary = element('span');
    caption.appendChild(progressSummary);
    const tooltipSlot = element('div', 'connections-tooltip-slot');
    tooltipSlot.appendChild(tooltip);
    radial.append(spokes, hub, ports);
    figure.append(radial, tooltipSlot, caption);

    const detail = element('section', 'connections-detail');
    detail.id = id + '-detail';
    detail.setAttribute('aria-labelledby', id + '-track');
    const trackLabel = element('p', 'connections-kicker');
    const trackTitle = element('h2');
    trackTitle.id = id + '-track';
    const counts = element('p', 'connections-counts');
    const progress = element('progress', 'connections-progress');
    const next = element('div', 'connections-next');
    const nextLabel = element('p', 'connections-kicker');
    const lessonTitle = element('h3', 'connections-lesson');
    const action = element('button', 'connections-continue');
    action.type = 'button';
    const actionText = element('span', '', 'Weiterlernen');
    action.append(icon('arrow-right'), actionText);
    next.append(nextLabel, lessonTitle, action);
    const stagesTitle = element('h3', 'connections-stages-title', 'Stufen');
    stagesTitle.id = id + '-stages';
    const stages = element('ol', 'connections-stages');
    stages.setAttribute('aria-labelledby', stagesTitle.id);
    const contextLink = link('api/space.json', 'Lernpfad-Kontext (JSON)', 'file-json');
    contextLink.classList.add('connections-context');
    detail.append(trackLabel, trackTitle, counts, progress, next, stagesTitle, stages, contextLink);
    layout.append(figure, detail);

    const access = element('nav', 'connections-access');
    access.setAttribute('aria-label', 'Leseschnittstellen und Agentenleitfaden');
    access.append(
      link('api/space.json', 'api/space.json', 'network'),
      link('https://github.com/Juri-Halveth/lernstudio/blob/main/AGENT_LEARNING.md', 'AGENT_LEARNING', 'book-open')
    );
    const status = element('p', 'connections-sr', '');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
    section.append(header, layout, access, status);

    function renderSelection(announce) {
      const entry = tracks[selected];
      progressSummary.textContent = completed(allLessons) + ' abgeschlossen';
      if (!entry) {
        trackTitle.textContent = 'Noch keine Lernpfade';
        counts.textContent = '0 Lektionen';
        progress.hidden = next.hidden = stagesTitle.hidden = contextLink.hidden = true;
        return;
      }
      const count = completed(entry.lessons);
      const lesson = nextLesson(entry);
      const finished = entry.lessons.length > 0 && count === entry.lessons.length;
      section.dataset.selectedTrack = entry.track.id;
      buttons.forEach((button, index) => {
        button.setAttribute('aria-pressed', String(index === selected));
        edges[index].classList.toggle('is-selected', index === selected);
      });
      trackLabel.textContent = 'Lernpfad ' + String(selected + 1).padStart(2, '0');
      trackTitle.textContent = entry.track.name;
      counts.textContent = entry.lessons.length + ' Lektionen / ' + entry.stages.length + ' Stufen / ' + count + ' abgeschlossen';
      progress.max = entry.lessons.length || 1;
      progress.value = count;
      progress.setAttribute('aria-label', count + ' von ' + entry.lessons.length + ' Lektionen abgeschlossen');
      next.hidden = !lesson;
      nextLabel.textContent = finished ? 'Lernpfad abgeschlossen' : 'Dein n\u00e4chster Gedanke';
      lessonTitle.textContent = lesson?.title || '';
      actionText.textContent = finished ? 'Erneut lernen' : 'Weiterlernen';
      action.setAttribute('aria-label', actionText.textContent + ': ' + (lesson?.title || ''));
      action.dataset.lessonId = lesson?.id || '';
      contextLink.setAttribute('href', 'api/contexts/' + encodeURIComponent(entry.track.id) + '.json');
      stages.replaceChildren();
      entry.stages.forEach(({ stage, lessons }, index) => {
        const row = element('li');
        row.dataset.stageId = stage.id;
        const number = element('span', 'connections-stage-number', String(index + 1).padStart(2, '0'));
        number.setAttribute('aria-hidden', 'true');
        const title = element('span', 'connections-stage-name', stage.title);
        const amount = element('span', 'connections-stage-count', completed(lessons) + '/' + lessons.length);
        amount.setAttribute('aria-label', completed(lessons) + ' von ' + lessons.length + ' Lektionen abgeschlossen');
        if (!finished && lessons.includes(lesson)) row.setAttribute('aria-current', 'step');
        row.append(number, title, amount);
        stages.appendChild(row);
      });
      if (announce) status.textContent = entry.track.name + '. ' + counts.textContent + '.';
    }

    function showTooltip(button) {
      const index = buttons.indexOf(button);
      if (index < 0 || disposed) return;
      tooltip.textContent = tracks[index].track.name;
      tooltip.hidden = false;
    }
    function hideTooltip() { tooltip.hidden = true; }
    function trackTarget(event) { return event.target.closest?.('.connections-track'); }
    function onClick(event) {
      if (disposed) return;
      const button = trackTarget(event);
      const index = buttons.indexOf(button);
      if (index >= 0) { selected = index; renderSelection(true); }
      else if (action.contains(event.target)) {
        const lesson = tracks[selected] && nextLesson(tracks[selected]);
        if (lesson) go('lesson', lesson.id);
      }
    }
    function onOver(event) { showTooltip(trackTarget(event)); }
    function onOut(event) {
      if (event.type === 'pointerout') {
        if (figure.contains(event.target) && !figure.contains(event.relatedTarget)) hideTooltip();
        return;
      }
      const button = trackTarget(event);
      if (button && !button.contains(event.relatedTarget)) hideTooltip();
    }
    function onKey(event) {
      if (event.key === 'Escape') { hideTooltip(); return; }
      const index = buttons.indexOf(trackTarget(event));
      if (index < 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const offsets = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      let target;
      if (event.key === 'Home') target = 0;
      else if (event.key === 'End') target = buttons.length - 1;
      else if (Object.prototype.hasOwnProperty.call(offsets, event.key)) target = (index + offsets[event.key] + buttons.length) % buttons.length;
      else return;
      event.preventDefault();
      buttons[target].focus();
    }
    const listeners = { click: onClick, keydown: onKey, focusin: onOver, focusout: onOut, pointerover: onOver, pointerout: onOut };
    for (const [name, listener] of Object.entries(listeners)) section.addEventListener(name, listener);
    renderSelection(false);
    main.appendChild(section);
    root.lucide?.createIcons({ root: section });

    return function cleanup() {
      if (disposed) return;
      disposed = true;
      for (const [name, listener] of Object.entries(listeners)) section.removeEventListener(name, listener);
      section.remove();
    };
  }

  root.LernConnections = Object.freeze({ mount });
})(window);
