"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {JSDOM,VirtualConsole}=require("jsdom");
const root=path.resolve(__dirname,"..");
async function createApp(hash="",stored={},signedIn=true){
  const errors=[],requests=[];const virtualConsole=new VirtualConsole();virtualConsole.on("jsdomError",e=>errors.push(e));
  const dom=new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>',{url:"https://local.example/"+hash,runScripts:"outside-only",virtualConsole});
  const w=dom.window;
  w.structuredClone=value=>w.JSON.parse(w.JSON.stringify(value));
  w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.confirm=()=>true;w.alert=()=>{};
  w.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});
  w.fetch=async(url,init={})=>{
    requests.push({url,init});
    let body;
    if(url.endsWith('/auth/v1/user')) body={id:'fixture-a',email:'learner@example.test'};
    else if(url.includes('/rest/v1/user_progress?'))body=[];
    else if(url.endsWith('/rest/v1/rpc/sync_user_progress'))body={};
    else throw Error('Unexpected request in local account fixture: '+url);
    return {ok:true,status:200,json:async()=>w.JSON.parse(JSON.stringify(body))};
  };
  w.requestAnimationFrame=()=>0;w.cancelAnimationFrame=()=>{};
  w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:text=>({width:String(text).length*8}),createLinearGradient:()=>({addColorStop(){}}),getImageData:()=>({data:[]})},{get:(target,key)=>key in target?target[key]:()=>{}});
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event("close"));};
  for(const [key,value]of Object.entries(stored))w.localStorage.setItem(key,value);
  if(signedIn)w.localStorage.setItem('ls_session',JSON.stringify({access_token:'fixture-token',refresh_token:'fixture-refresh',expires_at:Date.now()+3600000}));
  for(const file of ["curriculum.js","learning-profile.js","account-auth.js","account-progress.js","reference.js","basics.js","plotter.js","payment-simulator.js"])w.eval(fs.readFileSync(path.join(root,file),"utf8"));
  let source=fs.readFileSync(path.join(root,"app.js"),"utf8");
  source=source.replace('  readRoute(); render();','  window.__test={go,markDone,openProfile,readRoute,render,getState:()=>state};\n  readRoute(); render();');
  w.eval(source);await w.learningAccountReady;return {dom,w,errors,requests};
}
(async()=>{
const guest=await createApp('#lesson/html-1',{},false);
assert(guest.w.document.getElementById('accountForm'),'Learning starts with the real email form');assert.equal(guest.requests.length,0,'Browsing as guest sends no account request');guest.dom.window.close();
const {dom,w,errors,requests}=await createApp();
assert.equal(w.document.querySelectorAll(".world-card").length,w.CURRICULUM.tracks.length);
assert.equal(requests.length,3,"Restore verifies the user, loads progress and merges it");
const search=w.document.getElementById("lessonSearch");search.value="this-will-not-exist";search.dispatchEvent(new w.Event("input"));assert(w.document.querySelector(".empty-result"));
let rendered=0;
for(const track of w.CURRICULUM.tracks){
  w.__test.go("roadmap",track.id);assert.equal(w.document.querySelectorAll(".open-lesson").length,track.stages.reduce((n,s)=>n+s.lessons.length,0));
  for(const stage of track.stages)for(const lesson of stage.lessons){
    w.__test.go("lesson",lesson.id);assert(w.document.querySelector(".lesson-focus"),lesson.id+": focus renderer");assert(w.document.querySelector("main").textContent.trim().length>0,lesson.id+": content");rendered++;
  }
}
const first=w.CURRICULUM.tracks[0].stages[0].lessons[0].id;
w.__test.markDone(first,true);w.__test.markDone(first,true);assert.equal(w.__test.getState().done[first],true);
assert.equal(Object.keys(w.__test.getState().done).length,1,"Repeated completion does not duplicate points");
w.__test.go("home");w.__test.openProfile();assert(w.document.querySelector("dialog[open]"));
w.document.querySelector('[data-animal="🐢"]').click();assert.equal(w.__test.getState().avatar,"🐢");
w.document.querySelector('[data-color="mint"]').click();assert.equal(w.__test.getState().color,"mint");
w.document.querySelector("dialog").close();assert.equal(w.document.activeElement.id,"acctBtn");
const accountKey='lernstudio_account_fixture-a:'+w.LearningProfile.KEY;
const saved=w.localStorage.getItem(accountKey);assert(saved);dom.window.close();
const second=await createApp("#lesson/"+first,{[accountKey]:saved});assert.equal(second.w.__test.getState().lastLesson,first);assert.equal(second.w.__test.getState().avatar,"🐢");second.dom.window.close();
const other=await createApp('',{['lernstudio_account_fixture-b:lernstudio_open_v1']:saved,lernstudio_open_v1:saved,lernstudio_v1:saved});assert.equal(Object.keys(other.w.__test.getState().done).length,0,'Only the verified account cache may be imported');other.dom.window.close();
assert.deepEqual(errors.map(e=>e.message),[]);
assert(requests.every(r=>!(/stripe|entitlements|purchase|has_active_access/.test(r.url))));
console.log("Lokaler DOM-Funktionstest: "+rendered+" Lektionen mit kostenlosem Konto, alle Pfade, Suche, Direktlinks, Profil, Cache-Isolation und wiederholte Abschlüsse bestanden. Kontodienst und Canvas als lokale Testdoppel.");
})().catch(error=>{console.error(error);process.exit(1);});
