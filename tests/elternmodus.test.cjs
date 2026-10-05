'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom'),data=require('../eltern/lessons.js'),model=require('../eltern/progress.js');
const root=path.resolve(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const flush=()=>new Promise(resolve=>setTimeout(resolve,20));
function create({hash='',stored=null,blocked=false}={}){
  const errors=[],network=[],vc=new VirtualConsole();vc.on('jsdomError',error=>errors.push(error.message));
  const dom=new JSDOM(read('eltern/index.html'),{url:'https://juri-halveth.github.io/lernstudio/eltern/'+hash,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
  const w=dom.window;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
  w.fetch=async(...args)=>{network.push(args);throw Error('No remote practice submission');};w.URL.createObjectURL=()=> 'blob:local-fixture';w.URL.revokeObjectURL=()=>{};
  if(stored)w.localStorage.setItem(model.KEY,stored);
  if(blocked){w.Storage.prototype.getItem=()=>{throw Error('Storage blocked');};w.Storage.prototype.setItem=()=>{throw Error('Storage blocked');};}
  for(const file of ['lessons.js','progress.js','app.js'])w.eval(read('eltern/'+file));
  return {dom,w,doc:w.document,errors,network};
}
function click(doc,text){const button=[...doc.querySelectorAll('button')].find(b=>b.textContent===text);assert(button,'Button present: '+text);button.click();}
function solve(doc,step){
  if(step.kind==='choice')return doc.querySelector('[data-option="'+step.answer+'"]').click();
  if(['text','search','message'].includes(step.kind)){const input=doc.getElementById('practice-text');input.value=step.accepted?.[0]||step.example||'как пересадить орхидею';doc.querySelector('form').dispatchEvent(new doc.defaultView.Event('submit',{cancelable:true,bubbles:true}));return;}
  if(step.kind==='point')return click(doc,'☕ Чашка');
  if(step.kind==='window'){click(doc,'— Свернуть');click(doc,'▣ Вернуть окно');return;}
  if(step.kind==='scroll')return click(doc,'Нашёл конец');
  if(step.kind==='tabs'){click(doc,'♧ Рецепт');click(doc,'✉ Письмо');return;}
  if(step.kind==='translate')return click(doc,'Сохранить');
  if(step.kind==='video'){click(doc,'▷ Воспроизвести');click(doc,'Ⅱ Пауза');return;}
  if(step.kind==='listing')return click(doc,'▰ Целый стул · самовывоз');
  if(step.kind==='photos')return click(doc,'▰ Стул');
  if(step.kind==='files'){click(doc,'▤ Downloads / Загрузки');click(doc,'▧ Памятка.pdf');return;}
  throw Error('Exercise lacks a test path: '+step.kind);
}
test('catalog is extensible, uniquely addressed and contains only this everyday learning path',()=>{
  assert.equal(new Set(data.lessons.map(l=>l.id)).size,data.lessons.length);
  const kinds=new Set();for(const lesson of data.lessons){assert(data.chapters.some(c=>c.id===lesson.chapter));assert(lesson.intro&&lesson.takeaway&&lesson.joke);assert(lesson.steps.length);for(const step of lesson.steps){kinds.add(step.kind);assert(step.prompt&&step.hint);if(step.kind==='choice')assert(Number.isInteger(step.answer)&&step.answer>=0&&step.answer<step.options.length);}}
  assert(kinds.size>6);assert(!data.lessons.some(l=>/marketing|programming|javascript/.test(l.id)));
  const expanded={...data,lessons:[...data.lessons,{id:'new-topic',steps:[{}]}]};assert.equal(model.summary(model.empty(),expanded).total,data.lessons.length+1);
});
test('every real lesson path can be completed without account, payment or remote requests',()=>{
  for(const lesson of data.lessons){const app=create({hash:'#lesson/'+lesson.id});try{assert(app.doc.querySelector('h1').textContent.includes(lesson.title));for(const step of lesson.steps){solve(app.doc,step);assert.equal(app.doc.querySelector('.feedback').dataset.result,'success');assert(app.doc.getElementById('next-step'));app.doc.getElementById('next-step').click();}assert.equal(app.doc.querySelector('.exercise h2').textContent,'Получилось!');assert(JSON.parse(app.w.localStorage.getItem(model.KEY)).done.includes(lesson.id));assert.deepEqual(app.network,[]);assert.deepEqual(app.errors,[]);}finally{app.dom.window.close();}}
});
test('wrong answers and incomplete drafts stay on the task and explain the next attempt',()=>{
  const app=create({hash:'#lesson/writing'});try{app.doc.querySelector('form').dispatchEvent(new app.w.Event('submit',{cancelable:true}));assert.equal(app.doc.querySelector('.feedback').dataset.result,'retry');assert(!app.doc.getElementById('next-step'));app.doc.getElementById('hint').click();assert(app.doc.querySelector('.feedback').textContent.includes('Привет'));solve(app.doc,data.lessons.find(l=>l.id==='writing').steps[0]);assert(app.doc.getElementById('next-step'));}finally{app.dom.window.close();}
});
test('hover-equivalent keyboard focus gives the cup description; closing the practice window recovers',()=>{
  const first=create({hash:'#lesson/first-click'});try{const cup=[...first.doc.querySelectorAll('button')].find(b=>b.textContent==='☕ Чашка');cup.focus();assert(first.doc.getElementById('point-tip').textContent.includes('Чашка'));assert.equal(first.doc.activeElement,cup);}finally{first.dom.window.close();}
  const app=create({hash:'#lesson/windows'});try{click(app.doc,'× Закрыть');assert(!app.doc.getElementById('next-step'));click(app.doc,'Открыть снова');solve(app.doc,{kind:'window'});assert(app.doc.getElementById('next-step'));}finally{app.dom.window.close();}
});
test('reload restores exact lesson step and completed lessons; preferences persist independently',()=>{
  const app=create({hash:'#lesson/tabs'});solve(app.doc,{kind:'tabs'});app.doc.getElementById('next-step').click();app.doc.getElementById('theme').click();app.doc.getElementById('text-size').click();const saved=app.w.localStorage.getItem(model.KEY);app.dom.window.close();const resumed=create({stored:saved});try{resumed.doc.getElementById('start').click();assert(resumed.doc.querySelector('.step-count').textContent.startsWith('Шаг 2'));assert.equal(resumed.doc.documentElement.dataset.theme,'dark');assert(resumed.doc.documentElement.classList.contains('large-text'));}finally{resumed.dom.window.close();}
});
test('blocked browser storage keeps a working session and shows the file-transfer recovery route',()=>{
  const app=create({blocked:true,hash:'#lesson/first-click'});try{solve(app.doc,{kind:'point'});app.doc.getElementById('next-step').click();assert(app.doc.getElementById('storage-note').textContent.includes('только пока'));assert(app.doc.querySelector('[href="#help"]'));assert.deepEqual(app.errors,[]);}finally{app.dom.window.close();}
});
test('import validates before changing state, merges completions and exposes removed lesson IDs',()=>{
  const incoming={...model.empty(),done:['first-click','future-lesson']};const bound=model.validate(incoming,data);assert.deepEqual(bound.unknown,['future-lesson']);const merged=model.merge({...model.empty(),done:['windows']},bound.state);assert.deepEqual(merged.done,['windows','first-click']);
  for(const bad of [{...incoming,version:99},{...incoming,cursor:{id:'first-click',step:999}},{...incoming,done:['first-click','first-click']},{...incoming,privateMessage:'hidden'},null])assert.throws(()=>model.validate(bad,data));
});
test('catalog changes retain the previous cached record while current progress uses available lessons',()=>{
 const raw=JSON.stringify({...model.empty(),done:['first-click','retired-lesson']});const app=create({stored:raw});try{assert.equal(app.w.localStorage.getItem(model.KEY+'.previous'),raw);app.doc.getElementById('start').click();assert.deepEqual(JSON.parse(app.w.localStorage.getItem(model.KEY)).done,['first-click']);assert.equal(app.w.localStorage.getItem(model.KEY+'.previous'),raw);}finally{app.dom.window.close();}
});
test('file import needs an explicit second click and a corrupt file preserves current progress',async()=>{
  const stored=JSON.stringify({...model.empty(),done:['first-click']});const app=create({stored,hash:'#help'});try{const input=app.doc.getElementById('progress-file');Object.defineProperty(input,'files',{configurable:true,value:[new app.w.File([JSON.stringify({...model.empty(),done:['windows']})],'progress.json',{type:'application/json'})]});input.dispatchEvent(new app.w.Event('change'));await flush();assert.deepEqual(JSON.parse(app.w.localStorage.getItem(model.KEY)).done,['first-click']);assert(app.doc.getElementById('confirm-import'));app.doc.getElementById('confirm-import').click();assert.deepEqual(JSON.parse(app.w.localStorage.getItem(model.KEY)).done,['first-click','windows']);const before=app.w.localStorage.getItem(model.KEY);Object.defineProperty(input,'files',{configurable:true,value:[new app.w.File(['broken'],'bad.json')]});input.dispatchEvent(new app.w.Event('change'));await flush();assert.equal(app.w.localStorage.getItem(model.KEY),before);assert(!app.doc.getElementById('confirm-import'));}finally{app.dom.window.close();}
});
test('typed markup stays text in the draft, with no script or image activation',()=>{
  const app=create({hash:'#lesson/message'});try{app.doc.getElementById('practice-text').value='<img src=x onerror=alert(1)> Stuhl?';app.doc.querySelector('form').dispatchEvent(new app.w.Event('submit',{cancelable:true}));assert(app.doc.querySelector('.message-preview').textContent.includes('<img'));assert(!app.doc.querySelector('.message-preview img'));assert.deepEqual(app.network,[]);}finally{app.dom.window.close();}
});
test('Russian route, scoped public files, keyboard controls, reduced motion and return paths are present',()=>{
  const files=require('../werkzeug/public-files.js');for(const file of ['index.html','lessons.js','progress.js','app.js','style.css','assets/together-room.png'])assert(files.includes('eltern/'+file));assert(!files.includes('eltern/README.md'));assert(!files.includes('eltern/assets/README.md'));
  const app=create();try{assert.equal(app.doc.documentElement.lang,'ru');assert(app.doc.querySelector('meta[http-equiv="Content-Security-Policy"]').content.includes("connect-src 'none'"));assert(app.doc.querySelector('[href="../?lang=ru"]'));assert(app.doc.querySelector('[href="#help"]'));assert.match(read('eltern/style.css'),/prefers-reduced-motion/);assert.match(read('eltern/style.css'),/:focus-visible/);assert(!app.doc.querySelector('[type=password]'));}finally{app.dom.window.close();}
});
