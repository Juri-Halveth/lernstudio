'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const dependency = name => require(process.env.CODEX_NODE_PACKAGES ? path.join(process.env.CODEX_NODE_PACKAGES, name) : name);
const root = path.resolve(__dirname, '..');
const files = new Set(['styles.css', 'universe.css', 'learning-space.css', 'journey.css', 'connections.css',
  'lucide.min.js', 'curriculum.js', 'learning-profile.js', 'connections-ui.js']);
const html = `<!doctype html><html lang="de" data-theme="dark"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Pulsar component QA</title>
${['styles.css', 'universe.css', 'learning-space.css', 'journey.css', 'connections.css'].map(file => '<link rel="stylesheet" href="' + file + '">').join('')}
</head><body class="single-task-active"><header class="journey-header"><span class="journey-brand">Lernstudio</span></header>
<div class="layout"><main class="content" id="qa-host"></main></div>
${['lucide.min.js', 'curriculum.js', 'learning-profile.js', 'connections-ui.js'].map(file => '<script src="' + file + '"></script>').join('')}
<script>
const host = document.getElementById('qa-host');
const all = CURRICULUM.tracks.flatMap(t => t.stages.flatMap(s => s.lessons));
window.__state = LearningProfile.defaults();
__state.done = {[all[0].id]:true,[all[2].id]:true,unknown:true};
__state.lastLesson = 'py-0-1';
Object.freeze(__state.done); Object.freeze(__state);
window.__before = JSON.stringify(__state); window.__navigation = []; window.__effects = [];
for (const name of ['fetch','XMLHttpRequest','WebSocket','EventSource','Worker','requestAnimationFrame','setTimeout','setInterval']) {
  window[name] = function() { __effects.push(name); throw Error('Unexpected effect: ' + name); };
}
for (const name of ['localStorage','sessionStorage']) Object.defineProperty(window,name,{get(){__effects.push(name);throw Error('Unexpected storage access');}});
let cleanup;
window.__mount = function() { cleanup = LernConnections.mount(host,{curriculum:CURRICULUM,state:__state,go}); };
function go(view,id) {
  __navigation.push([view,id]); cleanup();
  const title = document.createElement('h1');
  title.textContent = all.find(l => l.id === id).title;
  title.id = 'qa-lesson'; title.tabIndex = -1;
  const back = document.createElement('button'); back.type = 'button'; back.id = 'qa-back'; back.textContent = 'Pulsar';
  back.onclick = function() { host.replaceChildren(); __mount(); };
  host.append(title,back); title.focus();
}
window.__cleanup = function() { cleanup(); };
__mount();
</script></body></html>`;

async function startServer() {
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://local').pathname;
    const file = pathname.replace(/^\/lernstudio\//, '');
    const headers = {
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'none'; base-uri 'none'; frame-ancestors 'none'"
    };
    if (pathname === '/lernstudio/') { res.writeHead(200, { ...headers, 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); return; }
    if (!files.has(file)) { res.writeHead(404, headers).end(); return; }
    res.writeHead(200, { ...headers, 'Content-Type': file.endsWith('.css') ? 'text/css' : 'text/javascript' });
    fs.createReadStream(path.join(root, file)).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, base: 'http://127.0.0.1:' + server.address().port + '/lernstudio/' };
}

async function geometry(page) {
  return page.evaluate(() => {
    const box = element => {
      const r = element.getBoundingClientRect();
      return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };
    const buttons = [...document.querySelectorAll('.connections-track')];
    const overlap = [];
    buttons.forEach((a, i) => buttons.slice(i + 1).forEach(b => {
      const x = box(a), y = box(b);
      if (Math.min(x.right, y.right) - Math.max(x.x, y.x) > .5 && Math.min(x.bottom, y.bottom) - Math.max(x.y, y.y) > .5) overlap.push([a.dataset.trackId, b.dataset.trackId]);
    }));
    const visible = [...document.querySelectorAll('.connections-view button,.connections-view a,.connections-stage-name,.connections-lesson,.connections-detail h2,.connections-tooltip')].filter(n => n.getClientRects().length);
    return {
      width: innerWidth, scroll: document.documentElement.scrollWidth, overlap,
      clipped: visible.filter(n => n.scrollWidth > n.clientWidth + 1).map(n => n.className),
      offscreen: visible.filter(n => { const r = box(n); return r.x < -.5 || r.right > innerWidth + .5; }).map(n => n.className),
      undersized: buttons.filter(n => box(n).width < 44 || box(n).height < 44).map(n => n.dataset.trackId),
      diagram: box(document.querySelector('.connections-radial'))
    };
  });
}

async function run({ onScreenshot, nodePackages } = {}) {
  const load = nodePackages ? name => require(path.join(nodePackages, name)) : dependency;
  const { chromium } = load('playwright');
  const { PNG } = load('pngjs');
  const { server, base } = await startServer();
  let browser;
  const reports = [];
  try {
    const installed = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(file => fs.existsSync(file));
    browser = await chromium.launch({ headless: true, executablePath: process.env.LERNSTUDIO_CHROME || installed || undefined });
    for (const [width, height] of [[320, 640], [390, 844], [768, 1024], [816, 600], [1440, 900], [1920, 1080], [844, 390]]) {
      for (const theme of ['dark', 'light']) {
        const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', locale: 'de-DE' });
        try {
          const page = await context.newPage();
          const errors = [], requests = [];
          page.on('pageerror', error => errors.push(error.message));
          await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
          page.on('request', request => {
            if (new URL(request.url()).origin === new URL(base).origin) requests.push({ method: request.method(), path: new URL(request.url()).pathname });
          });
          await page.goto(base + '#connections', { waitUntil: 'load' });
          await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
          const expected = await page.evaluate(() => CURRICULUM.tracks.map(t => {
            const own = t.stages.flatMap(s => s.lessons);
            return { id: t.id, title: t.name, count: own.length, stages: t.stages.length,
              next: own.find(l => __state.done[l.id] !== true).id };
          }));
          assert.equal(expected.length, 13);
          assert.equal(await page.locator('.connections-total').textContent(), '702');
          const requestCount = requests.length;
          for (const track of expected) {
            const button = page.getByRole('button', { name: track.title, exact: true });
            await button.click();
            assert.equal(await page.locator('.connections-detail h2').textContent(), track.title);
            assert.equal(await page.locator('.connections-stages li').count(), track.stages);
            assert.equal(await page.locator('.connections-continue').getAttribute('data-lesson-id'), track.next);
            assert.equal(await page.locator('.connections-continue').count(), 1);
            assert.equal(await page.locator('[aria-pressed="true"]').count(), 1);
            const metrics = await geometry(page);
            assert(metrics.scroll <= width, JSON.stringify(metrics));
            assert.deepEqual(metrics.overlap, [], JSON.stringify(metrics));
            assert.deepEqual(metrics.clipped, [], JSON.stringify(metrics));
            assert.deepEqual(metrics.offscreen, [], JSON.stringify(metrics));
            assert.deepEqual(metrics.undersized, [], JSON.stringify(metrics));
          }
          assert.equal(await page.evaluate(() => JSON.stringify(__state)), await page.evaluate(() => __before));
          assert.deepEqual(await page.evaluate(() => __navigation), []);
          const first = page.locator('.connections-track').first();
          await first.hover();
          await page.getByRole('tooltip').hover();
          assert(await page.getByRole('tooltip').isVisible(), 'A name tooltip can itself be hovered');
          await first.focus();
          await page.keyboard.press('ArrowRight');
          assert.equal(await page.locator('.connections-track:focus').getAttribute('data-track-id'), expected[1].id);
          const previousSelection = await page.locator('.connections-view').getAttribute('data-selected-track');
          assert.equal(previousSelection, expected.at(-1).id);
          await page.keyboard.press('Enter');
          assert.equal(await page.locator('.connections-view').getAttribute('data-selected-track'), expected[1].id);
          await page.keyboard.press('Escape');
          assert(await page.getByRole('tooltip', { includeHidden: true }).isHidden());
          await page.keyboard.press('End');
          await page.keyboard.press('Tab');
          assert(await page.locator('.connections-continue').evaluate(n => n === document.activeElement), 'Tab exits the radial selector');
          await page.keyboard.press('Shift+Tab');
          await page.keyboard.press('Home');
          await page.keyboard.press('Space');
          assert.equal(await page.locator('.connections-view').getAttribute('data-selected-track'), expected[0].id);
          assert.equal(requests.length, requestCount, 'Selecting, focusing and reading send no requests');
          await page.locator('.connections-continue').click();
          assert.deepEqual(await page.evaluate(() => __navigation), [['lesson', expected[0].next]]);
          assert.equal(await page.locator('.connections-view').count(), 0);
          assert(await page.locator('#qa-lesson').evaluate(n => n === document.activeElement));
          await page.locator('#qa-back').click();
          assert.equal(await page.locator('.connections-track').count(), 13);
          assert.equal(await page.locator('a[href="api/space.json"]').count(), 1);
          assert.equal(await page.locator('a[href$="/AGENT_LEARNING.md"]').count(), 1);
          await page.getByRole('button', { name: expected[10].title, exact: true }).click();
          await page.keyboard.press('Escape');
          await page.mouse.move(0, 0);
          await page.evaluate(() => { document.activeElement.blur(); window.scrollTo(0, 0); });
          const screenshot = await page.screenshot({ fullPage: true });
          const png = PNG.sync.read(screenshot), colors = new Set();
          for (let i = 0; i < png.data.length; i += 64) colors.add([png.data[i] >> 4, png.data[i + 1] >> 4, png.data[i + 2] >> 4].join(','));
          assert(colors.size > 40, 'Screenshot has visible content and distinct accents');
          if (onScreenshot) await onScreenshot({ width, height, theme, buffer: screenshot });
          const metrics = await geometry(page);
          assert.deepEqual(errors, []);
          assert.deepEqual(await page.evaluate(() => __effects), []);
          assert.equal(await page.evaluate(() => JSON.stringify(__state)), await page.evaluate(() => __before));
          assert(requests.every(r => r.method === 'GET'));
          await page.evaluate(() => __cleanup());
          assert.equal(await page.locator('.connections-view').count(), 0);
          reports.push({ width, height, theme, selectedTracks: expected.length, metrics, colors: colors.size, errors, sideEffects: [] });
        } finally { await context.close(); }
      }
    }
    return { viewports: reports.length, tracks: 13, lessons: 702, reports, integration: 'isolated component with actual curriculum and shared styles' };
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
}

module.exports = { startServer, run };
if (require.main === module) run().then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { console.error(error); process.exitCode = 1; });
