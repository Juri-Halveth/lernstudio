"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), http = require("node:http");
const dependency = name => require(process.env.CODEX_NODE_PACKAGES ? path.join(process.env.CODEX_NODE_PACKAGES, name) : name);
const { chromium } = dependency("playwright"), { PNG } = dependency("pngjs");
const root = path.resolve(__dirname, ".."), allowed = new Set(require("./public-files"));
const out = path.join(root, "research/2026-10-02-expedition", process.env.LERNSTUDIO_LIVE_BASE ? "live" : "browser");
fs.mkdirSync(out, { recursive: true });
const mime = { ".html":"text/html; charset=utf-8", ".js":"text/javascript", ".css":"text/css", ".png":"image/png", ".ico":"image/x-icon", ".json":"application/json", ".mp3":"audio/mpeg" };
const server = http.createServer((req, res) => {
  let file;
  try { file = decodeURIComponent(new URL(req.url, "http://local").pathname).replace(/^\/lernstudio\//, "") || "index.html"; }
  catch { res.writeHead(400).end(); return; }
  if (!allowed.has(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "Content-Type":mime[path.extname(file)] || "application/octet-stream", "Cache-Control":"no-store" });
  fs.createReadStream(path.join(root, file)).pipe(res);
});
function pixels(buffer) {
  const png = PNG.sync.read(buffer), colors = new Set();
  let visible = 0;
  for (let i = 0; i < png.data.length; i += 16) {
    const [r,g,b,a] = png.data.subarray(i, i + 4);
    if (a && Math.max(r,g,b) - Math.min(r,g,b) > 20 && Math.max(r,g,b) > 65) visible++;
    colors.add([r >> 4,g >> 4,b >> 4].join(","));
  }
  return { width:png.width, height:png.height, colors:colors.size, visiblePixels:visible };
}
async function layout(page) {
  const data = await page.evaluate(() => {
    const visible = e => e.getClientRects().length && getComputedStyle(e).visibility !== "hidden";
    const buttons = [...document.querySelectorAll("button")].filter(visible);
    return {
      width:innerWidth, height:innerHeight, scroll:document.documentElement.scrollWidth,
      clipped:buttons.filter(e => e.scrollWidth > e.clientWidth + 4).map(e => e.id || e.textContent),
      taskBottom:document.querySelector(".mission-choices,.mission-next")?.getBoundingClientRect().bottom
    };
  });
  assert(data.scroll <= data.width + 1, JSON.stringify(data));
  assert.deepEqual(data.clipped, [], JSON.stringify(data));
  if (data.taskBottom) assert(data.taskBottom <= data.height + 1, "Primary task requires scrolling: " + JSON.stringify(data));
  return data;
}
(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = process.env.LERNSTUDIO_LIVE_BASE || "http://127.0.0.1:" + server.address().port + "/lernstudio/";
  const browser = await chromium.launch({ headless:true, executablePath:process.env.LERNSTUDIO_CHROME || undefined });
  const reports = [];
  try {
    for (const [width,height] of [[1440,900],[1920,1080],[768,1024],[390,844],[320,640],[844,390]]) {
      const context = await browser.newContext({ viewport:{width,height}, locale:"de-DE" }), page = await context.newPage();
      const errors = [], writes = [], instrumentation = [];
      const injectedHost = url => new URL(url).hostname.endsWith(".scr.kaspersky-labs.com");
      await context.route("**/*", route => {
        if (injectedHost(route.request().url())) return route.abort();
        return route.continue();
      });
      page.on("pageerror", e => errors.push(e.message));
      page.on("request", r => {
        if (injectedHost(r.url())) { instrumentation.push(new URL(r.url()).hostname); return; }
        if (!["GET","HEAD"].includes(r.method())) writes.push(r.url());
      });
      await page.addInitScript(() => {
        window.__audio = []; const OriginalAudio = window.Audio;
        window.Audio = function(...args) { const audio = new OriginalAudio(...args); window.__audio.push(audio); return audio; };
      });
      await page.goto(base, { waitUntil:"domcontentloaded" });
      await page.waitForSelector(".mission-choices");
      await page.waitForFunction(() => document.querySelector(".lern-bay-canvas")?.dataset.renderState === "running", null, {timeout:30000});
      await page.screenshot({ path:path.join(out, width+"-arrival.png"), fullPage:true });
      const view = await layout(page);
      const sceneBox = await page.locator(".bay-viewport").boundingBox();
      if (height > 500) assert(Math.abs(sceneBox.width-width)<2 && Math.abs(sceneBox.x)<2,"The harbor fills the available width");
      assert.equal(await page.locator(".world-card,.sidebar").count(), 0);
      assert.equal(await page.evaluate(() => window.__audio.length), 0, "No audio initialized before consent");
      const canvas = page.locator(".lern-bay-canvas");
      const imageA = await canvas.screenshot(), imageStats = pixels(imageA);
      assert(imageStats.colors > 80 && imageStats.visiblePixels > 250, JSON.stringify(imageStats));
      await page.waitForTimeout(350);
      const imageB = await canvas.screenshot();
      assert(!imageA.equals(imageB), "The scene should visibly move");
      if (width === 1440) {
        await page.locator("[data-journey-sound]").click();
        await page.waitForFunction(() => window.__audio[0] && !window.__audio[0].paused);
        await page.locator("[data-journey-sound]").click();
        assert(await page.evaluate(() => window.__audio[0].paused));
        await page.locator("#journeyMenu").click();
        await page.locator("#journeyMotion").check();
        await page.locator('[aria-label="Menü schließen"]').click();
        await page.waitForFunction(() => document.querySelector(".lern-bay-canvas").dataset.renderState === "static");
        const frame = await canvas.getAttribute("data-frames");
        await page.waitForTimeout(250); assert.equal(await canvas.getAttribute("data-frames"), frame);
        await page.locator("#journeyMenu").click(); await page.locator("#journeyMotion").uncheck();
        await page.locator('[aria-label="Menü schließen"]').click();
        await page.waitForFunction(() => document.querySelector(".lern-bay-canvas").dataset.renderState === "running");
      }
      const stations = await page.evaluate(() => window.LernExpedition.stations);
      for (const station of stations) {
        const wrong = station.choices.find(c => c.id !== station.correctChoice);
        await page.locator('[data-choice="'+wrong.id+'"]').click();
        assert.equal(await page.locator("#missionNext").count(), 0);
        assert.equal(await page.locator(".mission-feedback").getAttribute("data-result"), "retry");
        await page.locator('[data-choice="'+station.correctChoice+'"]').click();
        await layout(page);
        await page.locator("#missionNext").click();
      }
      assert.equal(await page.locator("#missionContinue").count(), 1);
      await page.locator("#missionContinue").click(); await page.waitForSelector(".lesson-focus");
      assert.equal(await page.locator(".sidebar").count(), 0);
      await page.locator("#focusExit").click(); await page.waitForSelector("#missionContinue");
      await page.reload(); await page.waitForSelector("#missionContinue");
      if (width === 1440) {
        await page.locator("#journeyMenu").click(); await page.locator("#journeyTheme").click();
        assert.equal(await page.locator("html").getAttribute("data-theme"),"light");
        await page.locator('[aria-label="Menü schließen"]').click();
        await page.waitForSelector('.lern-bay-canvas[data-render-state="running"]');
        await page.screenshot({path:path.join(out,"1440-light.png"),fullPage:true});
        await page.locator("#journeyMenu").click(); await page.locator("#journeyTheme").click();
        await page.locator('[aria-label="Menü schließen"]').click();
      }
      await page.goto(base+"#bridge"); await page.waitForSelector("#packetOpen");
      const sample = JSON.parse(fs.readFileSync(path.join(root,"api/example-learning-packet.json"),"utf8"));
      sample.title = "<img src=x onerror=alert(1)>"; sample.lessonId = "py-0-1";
      const chooserPromise = page.waitForEvent("filechooser");
      await page.locator("#packetOpen").focus(); await page.keyboard.press("Enter");
      const chooser = await chooserPromise;
      await chooser.setFiles({ name:"note.json", mimeType:"application/json", buffer:Buffer.from(JSON.stringify(sample)) });
      await page.waitForSelector("#packetPreview:not([hidden])");
      assert.equal(await page.locator("#packetPreview img").count(),0);
      assert.equal(await page.locator("#packetPreview h2").textContent(),sample.title);
      await layout(page);
      await page.locator("#packetPreview button").click(); await page.waitForSelector(".lesson-focus");
      assert.equal(new URL(page.url()).hash,"#lesson/py-0-1");
      if (width === 1440) {
        await page.goto(base+"#bridge");
        await page.locator("#packetFile").setInputFiles({name:"bad.json",mimeType:"application/json",buffer:Buffer.from([0xff,0xfe,0x7b])});
        await page.waitForFunction(() => document.getElementById("packetStatus").textContent.length > 0);
        assert(await page.locator("#packetPreview").isHidden());
        sample.exec = "not-an-allowed-field";
        await page.locator("#packetFile").setInputFiles({name:"rejected.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(sample))});
        await page.waitForFunction(() => document.getElementById("packetStatus").textContent.includes("packet"));
        assert(await page.locator("#packetPreview").isHidden());
      }
      assert.deepEqual(errors,[]); assert.deepEqual(writes,[], "Guest play and note preview send no writes");
      reports.push({width,height,layout:view,canvas:imageStats,errors,writes,instrumentationRequestsBlocked:instrumentation.length});
      await context.close();
    }
    const quiet = await browser.newContext({viewport:{width:390,height:844},reducedMotion:"reduce"}), qp = await quiet.newPage();
    await qp.goto(base); await qp.waitForSelector('.lern-bay-canvas[data-render-state="static"]');
    const qframe = await qp.locator(".lern-bay-canvas").getAttribute("data-frames");
    await qp.waitForTimeout(300); assert.equal(await qp.locator(".lern-bay-canvas").getAttribute("data-frames"),qframe);
    const choice = await qp.evaluate(() => window.LernExpedition.stations[0].correctChoice);
    await qp.locator('[data-choice="'+choice+'"]').click();
    assert.equal(await qp.locator(".lern-bay-canvas").getAttribute("data-phase"),"1");
    await qp.screenshot({path:path.join(out,"reduced-motion.png"),fullPage:true}); await quiet.close();
    const fallback = await browser.newContext({viewport:{width:390,height:844}}), fp = await fallback.newPage();
    await fp.addInitScript(() => { const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type,...args) { return /webgl/.test(type) ? null : get.call(this,type,...args); }; });
    await fp.goto(base); await fp.waitForSelector('.lern-bay-canvas[data-render-state^="fallback"]');
    assert(await fp.locator(".lern-bay-fallback").isVisible());
    await layout(fp); await fp.screenshot({path:path.join(out,"no-webgl.png"),fullPage:true}); await fallback.close();
    fs.writeFileSync(path.join(out,"result.json"),JSON.stringify({at:new Date().toISOString(),base,reports,reducedMotion:true,noWebGLFallback:true},null,2));
    console.log(JSON.stringify({base,viewports:reports.length,out,reducedMotion:true,noWebGLFallback:true}));
  } finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(error => { console.error(error);server.close();process.exitCode=1; });
