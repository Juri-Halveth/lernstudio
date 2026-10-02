'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.CODEX_NODE_PACKAGES?path.join(process.env.CODEX_NODE_PACKAGES,'playwright'):'playwright');
const root=path.resolve(__dirname,'..'),allowed=new Set(require('./public-files'));
const out=path.join(root,'research/2026-10-02-learning-space/browser');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.ico':'image/x-icon','.json':'application/json'};
const server=http.createServer((req,res)=>{let p;try{p=decodeURIComponent(new URL(req.url,'http://local').pathname).replace(/^\/lernstudio\//,'')||'index.html';}catch{res.writeHead(400).end();return;}if(!allowed.has(p)){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(path.join(root,p)).pipe(res);});
const reports=[];
async function layout(page){const v=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,clipped:[...document.querySelectorAll('button')].filter(e=>e.getClientRects().length&&e.scrollWidth>e.clientWidth+4).map(e=>({text:e.textContent.trim(),id:e.id,class:e.className,width:e.clientWidth,scroll:e.scrollWidth}))}));assert(v.scroll<=v.width+1,JSON.stringify(v));assert.deepEqual(v.clipped,[]);return v;}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=process.env.LERNSTUDIO_LIVE_BASE||`http://127.0.0.1:${server.address().port}/lernstudio/`;
 const browser=await chromium.launch({headless:true,executablePath:process.env.LERNSTUDIO_CHROME||undefined});
 try{
  for(const width of [1440,1920,768,390,320]){
   const context=await browser.newContext({viewport:{width,height:900},locale:'de-DE'}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForSelector('.world-card');await page.evaluate(()=>window.learningAccountReady);
   assert.equal(await page.locator('.world-card').count(),13);assert.equal(await page.locator('.course-art svg').count(),13);
   if(width<=900){assert.equal(await page.locator('#acctBtn .aname').isVisible(),false);assert.equal(await page.locator('#acctBtn').evaluate(e=>Math.round(e.getBoundingClientRect().width)),44);}
   const view=await layout(page);await page.screenshot({path:path.join(out,`${width}-home.png`),fullPage:true});
   await page.locator('#lessonSearch').fill('print');await page.waitForSelector('.lesson-result');assert((await page.locator('.lesson-result').count())>0);
   await page.locator('#lessonSearch').fill('xy-no-result-1845');await page.waitForSelector('.empty-result');
   await page.goto(base+'#lesson/py-0-1');await page.waitForSelector('.lesson-focus');assert.equal(await page.locator('#accountForm').count(),0);await layout(page);
   await page.locator('.lesson-model>summary').click();await page.waitForSelector('.lesson-model svg');
   const before=await page.locator('.lesson-visual-step').textContent();await page.locator('.lesson-visual-next').click();assert.notEqual(await page.locator('.lesson-visual-step').textContent(),before);
   await page.locator('#readingSize').click();await layout(page);await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});await page.waitForTimeout(500);await page.screenshot({path:path.join(out,`${width}-lesson.png`),fullPage:true});
   await page.goto(base+'#lab');await page.waitForSelector('#labCode');await page.locator('#labLanguage').selectOption('js');await page.locator('#labRun').click();await page.waitForFunction(()=>!document.getElementById('labRun').disabled);
   assert.equal((await page.locator('#labOutput').textContent()).replace(/\s/g,''),'[1,4,9,16,25]');
   assert(await page.locator('#labChart').isVisible());const pixels=await page.locator('#labChart').evaluate(c=>Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data).filter((v,i)=>i%4===3&&v>0).length);assert(pixels>1000);
   await layout(page);await page.screenshot({path:path.join(out,`${width}-lab.png`),fullPage:true});
   if(width===1440){
    await page.locator('#labLanguage').selectOption('python');await page.locator('#labRun').click();await page.waitForFunction(()=>!document.getElementById('labRun').disabled,null,{timeout:95000});
    assert.equal((await page.locator('#labOutput').textContent()).replace(/\s/g,''),'[1,4,9,16,25]');
    await page.screenshot({path:path.join(out,'python-run.png'),fullPage:true});
    await page.locator('#labLanguage').selectOption('js');await page.locator('#labCode').fill('while (true) {}');await page.locator('#labRun').click();await page.waitForTimeout(300);await page.locator('#labStop').click();await page.waitForFunction(()=>!document.getElementById('labRun').disabled);assert.match(await page.locator('#labOutput').textContent(),/gestoppt/);
    await page.locator('#labRun').click();await page.waitForFunction(()=>!document.getElementById('labRun').disabled,null,{timeout:15000});assert.match(await page.locator('#labOutput').textContent(),/Zeitlimit/);
    await page.locator('#labCode').fill('console.log(typeof document, typeof localStorage);');await page.locator('#labRun').click();await page.waitForFunction(()=>!document.getElementById('labRun').disabled);assert.equal(await page.locator('#labOutput').textContent(),'undefined undefined');
    await page.goto(base+'#home');await page.locator('#themeBtn').click();await layout(page);await page.screenshot({path:path.join(out,'1440-light.png'),fullPage:true});
   }
   assert.deepEqual(errors,[]);reports.push({width,layout:view,errors,python:width===1440,canvasPixels:pixels});await context.close();
  }
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({at:new Date().toISOString(),base,reports},null,2));console.log(JSON.stringify({base,passed:reports.length,out}));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
