(function (root) {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalized = s => String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('de');
  const asText = value => {
    if (typeof value === 'string') return value.replace(/<[^>]*>/g, ' ');
    if (Array.isArray(value)) return value.map(asText).join(' ');
    if (value && typeof value === 'object') return Object.values(value).map(asText).join(' ');
    return '';
  };
  const icons = {einstieg:'compass',ki:'sparkles',machine:'cpu',html:'panels-top-left',python:'code',js:'braces',sec:'shield-check',math:'sigma',mktg:'megaphone',seo:'search',proj:'blocks',srv:'terminal',matheanfassen:'chart-spline'};
  const colors = ['#56d5b0','#c1a4fc','#86bafa','#efb76e','#8ac5ed','#efe07c','#9cdc9f','#f5a1a7'];
  function mount(main, ctx) {
    const {curriculum, state, go, progress, groups, persistent} = ctx;
    const lessons = curriculum.tracks.flatMap(track => track.stages.flatMap((stage, depth) => stage.lessons.map(lesson => ({track,stage,depth,lesson,text:normalized(track.name+' '+stage.title+' '+asText(lesson))}))));
    const last = lessons.find(x => x.lesson.id === state.lastLesson);
    const totalDone = lessons.filter(x => state.done[x.lesson.id]).length;
    main.innerHTML = `<section class="learning-intro"><div><p class="eyebrow">DEIN OFFENES LERNSTUDIO</p><h1>Was möchtest du entdecken?</h1><p>Dein erster Computer. Dein nächstes Programm. Eine neue Perspektive.</p></div><a class="btn" href="#lab"><i data-lucide="code"></i>Code-Werkstatt</a></section>
      <section class="learning-resume" aria-label="Dein Lernstand"><div><span class="status-dot"></span><span>${last ? 'Dein letzter Lernort' : 'Ein guter Anfang'}</span><strong>${esc(last?.lesson.title || lessons[0].lesson.title)}</strong></div><button class="btn primary" id="continueLearning"><i data-lucide="play"></i>${last ? 'Weiterlernen' : 'Loslernen'}</button></section>
      <div class="learning-stats"><span><b>${curriculum.tracks.length}</b> Lernpfade</span><span><b>${lessons.length}</b> Lektionen</span><span><b>${totalDone}</b> abgeschlossen</span><span class="free-note">Kostenlos · Ohne Pflichtkonto</span></div>
      <p id="storageNotice" class="storage-notice" role="status" ${persistent ? 'hidden' : ''}>Browser-Speicher nicht verfügbar oder bisheriger Lernstand nicht lesbar. Originaldaten bleiben erhalten. Sichere deinen aktuellen Stand im Lernprofil.</p>
      <section id="lernpfade" aria-labelledby="worldsTitle"><div class="catalogue-heading"><div><h2 id="worldsTitle">Deine Lernwelten</h2><p>Welcher Gedanke macht dich neugierig?</p></div><label class="search-label"><span class="sr-only">Lernpfade und Lektionen durchsuchen</span><input type="search" id="lessonSearch" placeholder="Suche nach Thema, Frage oder Code" autocomplete="off"></label></div>
      <div class="catalogue-tools"><div class="world-filters" role="group" aria-label="Lernbereich"><button data-group="all" aria-pressed="true">Alle</button>${groups.map(g => `<button data-group="${esc(g.id)}" aria-pressed="false">${esc(g.name)}</button>`).join('')}</div><label class="depth-filter">Einstieg<select id="learningDepth"><option value="all">Alle Stufen</option><option value="first">Erste Schritte</option><option value="further">Weitere Stufen</option></select></label></div>
      <p id="searchSummary" role="status" aria-live="polite"></p><div class="world-grid" id="worldResults"></div><button class="btn more-results" id="moreResults" hidden>Weitere Lektionen</button></section>
      <section class="learning-next"><div><i data-lucide="book-open"></i><h2>Begriffe verbinden.</h2><a href="#reference">Wissen & Spickzettel</a></div><div><i data-lucide="messages-square"></i><h2>Gemeinsam weiterdenken.</h2><a href="community.html">Zur Lerngemeinschaft</a></div><div><i data-lucide="github"></i><h2>Hinter die Oberfläche.</h2><a href="quellcode.html">Der Quellcode</a></div></section>`;
    main.querySelector('#continueLearning').onclick = () => go('lesson', last?.lesson.id || lessons[0].lesson.id);
    let group = 'all', limit = 36;
    function show() {
      const tokens = normalized(main.querySelector('#lessonSearch').value.trim()).split(/\s+/).filter(Boolean);
      const depth = main.querySelector('#learningDepth').value;
      const trackIds = group === 'all' ? curriculum.tracks.map(t => t.id) : groups.find(g => g.id === group).tracks.map(t => t.id);
      const matches = lessons.filter(x => trackIds.includes(x.track.id) && (depth === 'all' || (depth === 'first' ? x.depth === 0 : x.depth > 0)) && tokens.every(t => x.text.includes(t)));
      const results = main.querySelector('#worldResults');
      results.classList.toggle('lesson-results', tokens.length > 0 || depth !== 'all');
      const more = main.querySelector('#moreResults'); more.hidden = true;
      if (!tokens.length && depth === 'all') {
        const tracks = curriculum.tracks.filter(t => trackIds.includes(t.id));
        results.innerHTML = tracks.map((t, i) => {
          const p = progress(t), first = t.stages.flatMap(s => s.lessons)[0];
          return `<article class="world-card" data-track="${esc(t.id)}" style="--world-color:${colors[curriculum.tracks.indexOf(t)%colors.length]}"><div class="course-art" aria-hidden="true"><i data-lucide="${icons[t.id] || 'book-open'}"></i><span>${String(curriculum.tracks.indexOf(t)+1).padStart(2,'0')}</span><div class="course-lines"><b></b><b></b><b></b><b></b></div></div><div class="course-body"><small>${p.total} LEKTIONEN</small><h3>${esc(t.name)}</h3><p>${esc(t.subtitle)}</p><div class="first-lesson">Erster Gedanke <strong>${esc(first.title)}</strong></div><div class="world-progress"><progress value="${p.done}" max="${p.total || 1}" aria-label="Fortschritt ${esc(t.name)}"></progress><small>${p.done} / ${p.total} abgeschlossen</small></div><button class="world-open" data-open-track="${esc(t.id)}">Lernpfad öffnen<i data-lucide="arrow-up-right"></i><span class="sr-only">: ${esc(t.name)}</span></button></div></article>`;
        }).join('');
        main.querySelector('#searchSummary').textContent = `${tracks.length} Lernpfade · ${matches.length} Lektionen`;
      } else {
        results.innerHTML = matches.slice(0, limit).map(x => `<article class="lesson-result"><div><small>${esc(x.track.name)} · ${esc(x.stage.title)}</small><h3>${esc(x.lesson.title)}</h3><p>${x.lesson.minutes ? esc(x.lesson.minutes)+' Min. · ' : ''}${state.done[x.lesson.id] ? 'Abgeschlossen' : 'Noch offen'}</p></div><button class="iconbtn" title="${esc(x.lesson.title)} öffnen" aria-label="${esc(x.lesson.title)} öffnen" data-open-lesson="${esc(x.lesson.id)}"><i data-lucide="arrow-right"></i></button></article>`).join('');
        main.querySelector('#searchSummary').textContent = `${matches.length} passende Lektionen · ${Math.min(limit,matches.length)} angezeigt`;
        more.hidden = matches.length <= limit;
      }
      if (!matches.length) results.innerHTML = '<p class="empty-result">Noch kein Treffer. Versuche einen kürzeren Begriff oder einen anderen Lernbereich.</p>';
      results.querySelectorAll('[data-open-track]').forEach(b => b.onclick = () => go('roadmap', b.dataset.openTrack));
      results.querySelectorAll('[data-open-lesson]').forEach(b => b.onclick = () => go('lesson', b.dataset.openLesson));
      root.lucide?.createIcons();
    }
    main.querySelector('#moreResults').onclick = () => { limit += 36; show(); };
    for (const name of ['lessonSearch', 'learningDepth']) main.querySelector('#'+name).addEventListener(name === 'lessonSearch' ? 'input' : 'change', () => { limit = 36; show(); });
    main.querySelectorAll('[data-group]').forEach(b => b.onclick = () => { group = b.dataset.group; limit = 36; main.querySelectorAll('[data-group]').forEach(n => n.setAttribute('aria-pressed', String(n === b))); show(); });
    show();
  }
  root.LearningSpace = Object.freeze({mount, normalized});
})(window);
