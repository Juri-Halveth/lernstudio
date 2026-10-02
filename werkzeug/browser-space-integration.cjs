"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), http = require("node:http");
const dependency = name => require(process.env.CODEX_NODE_PACKAGES ? path.join(process.env.CODEX_NODE_PACKAGES, name) : name);
const {chromium} = dependency("playwright");
const root = path.resolve(__dirname, ".."), allowed = new Set(require("./public-files"));
const out = path.join(root, "research/2026-10-02-agent-space", process.env.LERNSTUDIO_LIVE_BASE ? "live" : "browser");
const mime = {".html":"text/html; charset=utf-8", ".js":"text/javascript", ".css":"text/css", ".png":"image/png", ".ico":"image/x-icon", ".json":"application/json", ".mp3":"audio/mpeg", ".txt":"text/plain; charset=utf-8"};
const server = http.createServer((req, res) => {
  let file;
  try { file = decodeURIComponent(new URL(req.url, "http://local").pathname).replace(/^\/lernstudio\//, "") || "index.html"; }
  catch { res.writeHead(400).end(); return; }
  if (!allowed.has(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, {"Content-Type":mime[path.extname(file)] || "application/octet-stream", "Cache-Control":"no-store"});
  fs.createReadStream(path.join(root, file)).pipe(res);
});

(async () => {
  fs.mkdirSync(out, {recursive:true});
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  let browser;
  const results = [], startedAt = new Date().toISOString();
  try {
    browser = await chromium.launch({headless:true, executablePath:process.env.LERNSTUDIO_CHROME || undefined});
    const base = process.env.LERNSTUDIO_LIVE_BASE || "http://127.0.0.1:" + server.address().port + "/lernstudio/";
    for (const [width,height] of [[1440,900],[1920,1080],[768,1024],[390,844],[320,640],[844,390]]) {
      const context = await browser.newContext({viewport:{width,height}, locale:"de-DE"});
      const page = await context.newPage(), errors = [], writes = [], instrumentation = [];
      const injected = url => new URL(url).hostname.endsWith(".scr.kaspersky-labs.com");
      await context.route("**/*", route => injected(route.request().url()) ? route.abort() : route.continue());
      page.on("pageerror", error => errors.push(error.message));
      page.on("request", request => {
        if (injected(request.url())) instrumentation.push(new URL(request.url()).hostname);
        else if (!["GET","HEAD"].includes(request.method())) writes.push(request.url());
      });
      await page.goto(base + "#connections", {waitUntil:"domcontentloaded"});
      await page.waitForSelector(".connections-track");
      assert.equal(await page.locator(".connections-track").count(), 13);
      assert.equal(await page.locator(".sidebar,.mission-choices").count(), 0, "Overview is optional, not mixed with the current task");
      await page.locator('[data-track-id="python"]').click();
      assert.equal(await page.locator(".connections-view").getAttribute("data-selected-track"), "python");
      assert.equal(await page.locator(".connections-context").getAttribute("href"), "api/contexts/python.json");
      const geometry = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll(".connections-track")];
        const boxes = buttons.map(button => button.getBoundingClientRect());
        let overlaps = 0;
        for (let i=0;i<boxes.length;i++) for (let j=i+1;j<boxes.length;j++) {
          const a=boxes[i], b=boxes[j];
          if (Math.min(a.right,b.right)-Math.max(a.left,b.left)>1 && Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1) overlaps++;
        }
        const tooltip=document.querySelector('.connections-tooltip').getBoundingClientRect();
        const hub=document.querySelector('.connections-hub').getBoundingClientRect();
        return {width:innerWidth, scroll:document.documentElement.scrollWidth, overlaps,
          tooltipOccludesHub:tooltip.width>0 && tooltip.top<hub.bottom && tooltip.bottom>hub.top,
          outOfBounds:boxes.filter(box => box.x<0 || box.right>innerWidth+1).length,
          clipping:[...document.querySelectorAll(".connections-view h1,.connections-view h2,.connections-view h3,.connections-continue")].filter(el=>el.scrollWidth>el.clientWidth+2).map(el=>el.tagName)};
      });
      assert(geometry.scroll<=width+1, JSON.stringify(geometry));
      assert.equal(geometry.overlaps,0,JSON.stringify(geometry));
      assert.equal(geometry.outOfBounds,0,JSON.stringify(geometry));
      assert.equal(geometry.tooltipOccludesHub,false,JSON.stringify(geometry));
      assert.deepEqual(geometry.clipping,[],JSON.stringify(geometry));
      await page.screenshot({path:path.join(out,width+"-connections.png"),fullPage:true});
      const lessonId=await page.locator(".connections-continue").getAttribute("data-lesson-id");
      await page.locator(".connections-continue").click();
      await page.waitForURL(url => url.hash === "#lesson/"+encodeURIComponent(lessonId));
      await page.waitForSelector(".lesson-focus-content");
      assert.equal(await page.locator(".connections-view").count(),0);
      await page.goBack();
      await page.waitForSelector(".connections-view");
      assert.equal(await page.locator(".connections-view").getAttribute("data-selected-track"), "python");
      await page.locator('[data-track-id="einstieg"]').focus();
      await page.keyboard.press("ArrowRight");
      assert.equal(await page.evaluate(()=>document.activeElement.dataset.trackId),"ki");
      await page.keyboard.press("Enter");
      assert.equal(await page.locator(".connections-view").getAttribute("data-selected-track"),"ki");
      await page.locator("#journeyMenu").click();
      await page.locator("#journeyTheme").click();
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("html").getAttribute("data-theme"),"light");
      await page.screenshot({path:path.join(out,width+"-connections-light.png"),fullPage:true});
      await page.goto(base + "#bridge",{waitUntil:"domcontentloaded"});
      await page.locator(".bridge-access summary").click();
      await page.locator('.bridge-access a[href="#connections"]').click();
      await page.waitForSelector(".connections-view");
      await page.locator("#journeyMenu").click();
      await page.locator('.journey-menu nav a[href="#home"]').click();
      await page.waitForSelector(".mission-content");
      assert.equal(await page.locator(".connections-view").count(),0);
      assert.deepEqual(errors,[]); assert.deepEqual(writes,[]);
      results.push({width,height,geometry,lessonId,errors,writes,blockedInstrumentationHosts:[...new Set(instrumentation)]});
      await context.close();
    }
    const result = {schema:"lernstudio.space-browser-integration.v1",base,startedAt,completedAt:new Date().toISOString(),views:results};
    fs.writeFileSync(path.join(out,"integration.json"),JSON.stringify(result,null,2)+"\n");
    console.log(JSON.stringify({base,views:results.length,out,scope:"Real app routing, overview controls, lesson continuation, keyboard, light/dark, zero application writes in this guest run"}));
  } finally { await browser?.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(error=>{console.error(error);process.exitCode=1;});
