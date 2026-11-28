'use strict';

// Focused Chromium acceptance for the parents' progress import. The application
// runs unchanged on an allowlisted loopback server, with a fresh browser context
// for every viewport/theme. All progress is synthetic; remote requests are blocked.
// Install Playwright outside the checkout and set HALVETH_PLAYWRIGHT to its package
// path. HALVETH_TEST_OUTPUT selects receipts/screenshots (default: artifacts/).
// --serve-check validates only the local fixture; it does not claim browser coverage.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.resolve(process.env.HALVETH_TEST_OUTPUT || path.join(ROOT, 'artifacts/elternmodus-browser'));
const model = require('../eltern/progress.js');
const FILES = new Set(['eltern/index.html', 'eltern/app.js', 'eltern/progress.js',
  'eltern/lessons.js', 'eltern/style.css', 'eltern/assets/together-room.png', 'favicon.ico']);
const serveOnly = process.argv.includes('--serve-check');

function serve(req, res) {
  const url = new URL(req.url, 'http://127.0.0.1');
  const relative = url.pathname === '/eltern/' ? 'eltern/index.html' : url.pathname.slice(1);
  if (req.method !== 'GET' || !FILES.has(relative)) {
    res.writeHead(404);res.end();return;
  }
  const types = {'.html': 'text/html; charset=utf-8', '.js': 'application/javascript',
    '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon'};
  res.setHeader('Content-Type', types[path.extname(relative)]);
  res.end(fs.readFileSync(path.join(ROOT, relative)));
}

async function finishRead(page, index) {
  await page.evaluate(async index => {
    const read = window.__testReads[index];
    if (!read) throw Error('Expected FileReader was not created');
    let timer;
    try {
      read.start();
      await Promise.race([read.done, new Promise((_, reject) => {
        timer = setTimeout(() => reject(Error('FileReader loadend did not arrive')), 5000);
      })]);
    } finally {clearTimeout(timer);}
  }, index);
}

async function keyboardConfirm(page) {
  await page.locator('#confirm-import').waitFor({state: 'visible'});
  await page.locator('#progress-file').focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'confirm-import',
    'Tab from the file input must reach the explicit confirmation');
  const outline = await page.locator('#confirm-import').evaluate(el => ({
    style: getComputedStyle(el).outlineStyle, width: parseFloat(getComputedStyle(el).outlineWidth)
  }));
  assert(outline.style !== 'none' && outline.width > 0, 'Keyboard focus must be visible');
  await page.keyboard.press('Enter');
  await page.locator('#confirm-import').waitFor({state: 'detached'});
}

async function main() {
  fs.mkdirSync(OUT, {recursive: true});
  const result = {schema: 'lernstudio.eltern-browser.v1',
    scope: 'SYNTHETIC_LOOPBACK_PROGRESS_IMPORT_NO_PRODUCTION_ACCOUNTS',
    kind: serveOnly ? 'SERVER_ONLY_NO_BROWSER' : 'CHROMIUM_BROWSER',
    githubSha: process.env.GITHUB_SHA || null, sourceSha256: {}, cases: [], passed: false};
  for (const file of FILES) result.sourceSha256[file] = crypto.createHash('sha256')
    .update(fs.readFileSync(path.join(ROOT, file))).digest('hex');
  const server = http.createServer(serve);
  let browser;
  try {
    await new Promise((resolve, reject) => {server.once('error', reject);server.listen(0, '127.0.0.1', resolve);});
    const origin = 'http://127.0.0.1:' + server.address().port;
    if (serveOnly) {
      for (const file of FILES) {
        const response = await fetch(origin + '/' + file);
        assert.equal(response.status, 200);
        assert.deepEqual(Buffer.from(await response.arrayBuffer()), fs.readFileSync(path.join(ROOT, file)));
      }
      assert.equal((await fetch(origin + '/package.json')).status, 404);
      assert.equal((await fetch(origin + '/eltern/app.js', {method: 'POST'})).status, 404);
      result.cases.push({id: 'allowlisted-loopback-fixture', passed: true, files: FILES.size});
    } else {
      const pw = require(process.env.HALVETH_PLAYWRIGHT || 'playwright');
      browser = await pw.chromium.launch({headless: true});
      result.browser = browser.version();
      for (const theme of ['light', 'dark']) for (const width of [390, 1280]) {
        const context = await browser.newContext({viewport: {width, height: 900}, reducedMotion: 'reduce'});
        const page = await context.newPage(), remote = [], errors = [];
        page.setDefaultTimeout(10000);
        page.on('pageerror', error => errors.push(error.message));
        await context.route('**/*', route => {
          if (new URL(route.request().url()).origin === origin) return route.continue();
          remote.push(route.request().url());return route.abort();
        });
        try {
          await page.addInitScript(({key, initial}) => {
            if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(initial));
          }, {key: model.KEY, initial: {...model.empty(), done: ['first-click']}});
          await page.goto(origin + '/eltern/#help');
          if (theme === 'dark') {
            await page.locator('#theme').focus();await page.keyboard.press('Enter');
          }
          assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
          const input = page.locator('#progress-file');
          const file = done => ({name: 'progress.json', mimeType: 'application/json',
            buffer: Buffer.from(JSON.stringify({...model.empty(), theme, done}))});
          const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), model.KEY);

          // Ordinary import uses Chromium's unmodified FileReader.
          await input.setInputFiles(file(['windows']));
          await page.locator('#confirm-import').waitFor({state: 'visible'});
          assert.deepEqual((await saved()).done, ['first-click']);
          await keyboardConfirm(page);
          assert.deepEqual((await saved()).done, ['first-click', 'windows']);
          await page.reload();
          assert.deepEqual((await saved()).done, ['first-click', 'windows']);

          // Reorder starts of real reads, retaining native FileReader/File parsing.
          await page.evaluate(() => {
            const NativeReader = window.FileReader;window.__testReads = [];
            window.FileReader = class extends NativeReader {
              readAsText(...args) {
                const done = new Promise(resolve => this.addEventListener('loadend', resolve, {once: true}));
                window.__testReads.push({start: () => super.readAsText(...args), done});
              }
            };
          });
          await input.setInputFiles(file(['message']));
          await input.setInputFiles(file(['tabs']));
          await finishRead(page, 1);await finishRead(page, 0);
          assert.deepEqual((await saved()).done, ['first-click', 'windows']);
          await keyboardConfirm(page);
          assert.deepEqual((await saved()).done, ['first-click', 'windows', 'tabs']);

          const layout = await page.evaluate(() => ({theme: document.documentElement.dataset.theme,
            background: getComputedStyle(document.body).backgroundColor,
            scrollWidth: document.documentElement.scrollWidth, viewport: innerWidth}));
          assert.equal(layout.theme, theme);
          assert(layout.scrollWidth <= layout.viewport + 1, 'Unexpected horizontal overflow');
          await page.screenshot({path: path.join(OUT, `import-${theme}-${width}.png`), fullPage: true});

          // A rejected newer file must remain rejected after an older read arrives.
          await input.setInputFiles(file(['photos']));
          await input.setInputFiles({name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('broken')});
          await finishRead(page, 3);
          const notice = await page.locator('#main .feedback').textContent();
          await finishRead(page, 2);
          assert.equal(await page.locator('#confirm-import').count(), 0);
          assert.equal(await page.locator('#main .feedback').textContent(), notice);
          assert.deepEqual((await saved()).done, ['first-click', 'windows', 'tabs']);
          assert.deepEqual(remote, []);assert.deepEqual(errors, []);
          result.cases.push({id: `import-${theme}-${width}`, passed: true, ...layout,
            normalImportAndReload: true, nativeFileReader: true, completionOrder: [1, 0],
            latestSelectionImported: true, rejectedNewerSelectionPreserved: true,
            tabAndEnterConfirmation: true, visibleKeyboardFocus: true,
            applicationRemoteRequests: remote.length, pageErrors: errors});
        } finally {await context.close();}
      }
      assert.notEqual(result.cases.find(c => c.theme === 'light').background,
        result.cases.find(c => c.theme === 'dark').background, 'Both color schemes must render distinctly');
    }
    result.passed = true;
  } catch (error) {
    result.error = error.stack || String(error);process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (server.listening) await new Promise(resolve => server.close(resolve));
    fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
  }
}
main().catch(error => {console.error(error);process.exitCode = 1;});
