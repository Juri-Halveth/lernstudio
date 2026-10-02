'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');
const source = file => fs.readFileSync(path.join(root, file), 'utf8');
const dom = new JSDOM('<!doctype html><main><p id="sibling">Preserve me</p></main><aside><i data-lucide="compass"></i></aside>', {
  url: 'https://local.example/lernstudio/#connections', runScripts: 'outside-only'
});
const w = dom.window;
const main = w.document.querySelector('main');
const calls = [], forbidden = [];
for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'Worker', 'requestAnimationFrame', 'setTimeout', 'setInterval']) {
  w[name] = () => { forbidden.push(name); throw new Error('Unexpected side effect: ' + name); };
}
for (const name of ['localStorage', 'sessionStorage']) Object.defineProperty(w, name, {
  get() { forbidden.push(name); throw new Error('Storage must not be read or written'); }
});
w.eval(source('curriculum.js'));
w.eval(source('learning-profile.js'));
w.eval(source('lucide.min.js'));
w.eval(source('connections-ui.js'));
const curriculum = w.CURRICULUM;
const all = curriculum.tracks.flatMap(t => t.stages.flatMap(s => s.lessons));
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}
freeze(curriculum);
const state = freeze(w.LearningProfile.defaults());
const before = JSON.stringify(state);
const go = (...args) => calls.push(args);
let passed = 0;
function check(name, run) { run(); passed++; console.log('PASS ' + name); }
const cleanup = w.LernConnections.mount(main, { curriculum, state, go });
const view = main.querySelector('.connections-view');
const buttons = [...view.querySelectorAll('.connections-track')];
try {
  check('actual 13 tracks and all 702 lessons are aggregated', () => {
    assert.equal(curriculum.tracks.length, 13);
    assert.equal(all.length, 702);
    assert.equal(buttons.length, curriculum.tracks.length);
    assert.equal(view.dataset.lessonCount, String(all.length));
    assert.equal(view.querySelector('.connections-total').textContent, String(all.length));
    assert.equal(view.querySelectorAll('.connections-spoke').length, buttons.length);
    assert.equal(view.dataset.relation, 'curriculum-membership');
  });
  check('all titles, stage counts, first unfinished lessons and context links derive from curriculum', () => {
    let coverage = 0;
    for (const [index, track] of curriculum.tracks.entries()) {
      const own = track.stages.flatMap(s => s.lessons);
      buttons[index].click();
      assert.equal(buttons[index].getAttribute('aria-label'), track.name);
      assert.equal(view.querySelector('h2').textContent, track.name);
      const rows = [...view.querySelectorAll('.connections-stages li')];
      assert.deepEqual(rows.map(row => row.querySelector('.connections-stage-name').textContent), [...track.stages.map(s => s.title)]);
      assert.equal(view.querySelector('progress').max, own.length);
      assert.equal(view.querySelector('progress').value, 0);
      assert.equal(view.querySelector('.connections-continue').dataset.lessonId, own[0].id);
      assert.equal(view.querySelectorAll('.connections-continue').length, 1);
      assert.equal(view.querySelectorAll('.connections-track[aria-pressed="true"]').length, 1);
      assert.equal(view.querySelector('.connections-context').getAttribute('href'), 'api/contexts/' + encodeURIComponent(track.id) + '.json');
      coverage += own.length;
    }
    assert.equal(coverage, 702);
    assert.equal(calls.length, 0, 'Selecting a track never navigates');
    assert.equal(JSON.stringify(state), before, 'Selecting does not mark progress');
  });
  check('scoped lucide icons leave unrelated DOM alone', () => {
    assert.equal(view.querySelectorAll('.connections-track svg').length, 13);
    assert(w.document.querySelector('aside i[data-lucide="compass"]'));
    assert(w.document.getElementById('sibling'));
  });
  check('keyboard focus moves independently from selection and tooltip is dismissible', () => {
    const selected = view.dataset.selectedTrack;
    buttons[0].focus();
    assert.equal(view.querySelector('[role="tooltip"]').textContent, curriculum.tracks[0].name);
    buttons[0].dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    assert.equal(w.document.activeElement, buttons[1]);
    assert.equal(view.dataset.selectedTrack, selected);
    buttons[1].dispatchEvent(new w.KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
    assert.equal(w.document.activeElement, buttons.at(-1));
    buttons.at(-1).dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
    assert.equal(w.document.activeElement, buttons[0]);
    buttons[0].dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.equal(view.querySelector('[role="tooltip"]').hidden, true);
    const tab = new w.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    buttons[0].dispatchEvent(tab);
    assert.equal(tab.defaultPrevented, false);
  });
  check('one explicit continue action navigates independently of the window hash', () => {
    buttons[4].click();
    view.querySelector('.connections-continue').click();
    assert.deepEqual(calls.pop(), ['lesson', curriculum.tracks[4].stages[0].lessons[0].id]);
    assert.equal(w.location.hash, '#connections');
    assert.equal(JSON.stringify(state), before);
    assert(view.querySelector('a[href="api/space.json"]'));
    assert(view.querySelector('a[href$="/AGENT_LEARNING.md"]'));
  });
  check('cleanup is idempotent, removes handlers and preserves host siblings', () => {
    cleanup(); cleanup();
    buttons[1].click();
    view.querySelector('.connections-continue').click();
    assert.equal(calls.length, 0);
    assert.equal(main.querySelector('.connections-view'), null);
    assert(w.document.getElementById('sibling'));
  });
  check('first unfinished lesson skips noncontiguous completions and ignores unknown IDs', () => {
    for (const track of curriculum.tracks) {
      const own = track.stages.flatMap(s => s.lessons);
      const done = { [own[0].id]: true, [own[2].id]: true, unknown: true };
      const profile = freeze({ done, lastLesson: own.at(-1).id });
      const end = w.LernConnections.mount(main, { curriculum, state: profile, go });
      const node = main.querySelector('.connections-view');
      assert.equal(node.dataset.selectedTrack, track.id);
      assert.equal(node.querySelector('.connections-continue').dataset.lessonId, own[1].id);
      assert.equal(node.querySelector('progress').value, 2);
      assert.equal(node.querySelector('.connections-caption').lastChild.textContent, '2 abgeschlossen');
      node.querySelector('.connections-continue').click();
      assert.deepEqual(calls.pop(), ['lesson', own[1].id]);
      end();
    }
  });
  check('completed track offers one honest repeat action without altering progress', () => {
    const profile = freeze({ done: Object.fromEntries(all.map(l => [l.id, true])), lastLesson: all.at(-1).id });
    const end = w.LernConnections.mount(main, { curriculum, state: profile, go });
    const node = main.querySelector('.connections-view');
    assert.equal(node.querySelector('.connections-continue span').textContent, 'Erneut lernen');
    assert.equal(node.querySelector('.connections-next p').textContent, 'Lernpfad abgeschlossen');
    assert.equal(node.querySelectorAll('[aria-current="step"]').length, 0);
    assert.equal(node.querySelector('.connections-caption').lastChild.textContent, '702 abgeschlossen');
    end();
  });
  check('changed progress is reread at the explicit continue boundary', () => {
    const profile = { done: {} };
    const end = w.LernConnections.mount(main, { curriculum, state: profile, go });
    profile.done[all[0].id] = true;
    main.querySelector('.connections-continue').click();
    assert.deepEqual(calls.pop(), ['lesson', all[1].id]);
    end();
  });
  check('markup-like curriculum text remains text and URLs stay encoded', () => {
    const text = '<img src=x onerror="throw 1"> & <script>bad()</script>';
    const lessonId = 'math-realitaet-\u00e4';
    const data = { tracks: [{ id: 'track/one', name: text, stages: [{ id: 'stage', title: text, lessons: [{ id: lessonId, title: text }] }] }] };
    const end = w.LernConnections.mount(main, { curriculum: freeze(data), state: {}, go });
    const node = main.querySelector('.connections-view');
    assert.equal(node.querySelector('h2').textContent, text);
    assert.equal(node.querySelector('.connections-lesson').textContent, text);
    assert.equal(node.querySelector('.connections-stage-name').textContent, text);
    assert.equal(node.querySelectorAll('img,script').length, 0);
    assert.equal(node.querySelector('.connections-context').getAttribute('href'), 'api/contexts/track%2Fone.json');
    node.querySelector('.connections-continue').click();
    assert.deepEqual(calls.pop(), ['lesson', lessonId]);
    end();
  });
  check('empty curriculum and empty tracks remain readable with no phantom lesson', () => {
    for (const data of [{ tracks: [] }, { tracks: [{ id: 'empty', name: 'Empty', stages: [] }] }]) {
      const end = w.LernConnections.mount(main, { curriculum: data, go });
      assert.equal(main.querySelector('.connections-view').dataset.lessonCount, '0');
      assert.equal(main.querySelector('.connections-next').hidden, true);
      end();
    }
  });
  check('independent instances and inert template hosts clean up independently', () => {
    const template = w.document.createElement('template');
    template.innerHTML = '<main></main>';
    const host = template.content.firstChild;
    const end = w.LernConnections.mount(host, { curriculum, state, go });
    const other = w.LernConnections.mount(main, { curriculum, state, go });
    assert.notEqual(host.querySelector('h1').id, main.querySelector('h1').id);
    end();
    assert(main.querySelector('.connections-view'));
    other();
  });
  check('no implicit network, storage, timers or animation work', () => {
    assert.deepEqual(forbidden, []);
  });
  console.log(JSON.stringify({ suites: passed, tracks: curriculum.tracks.length, lessons: all.length, forbiddenEffects: forbidden }));
} finally { dom.window.close(); }
