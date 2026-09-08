"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {JSDOM,VirtualConsole}=require("jsdom");
const root=path.resolve(__dirname,"..");
function createApp(hash="",stored={}){
  const errors=[],requests=[];const virtualConsole=new VirtualConsole();virtualConsole.on("jsdomError",e=>errors.push(e));
  const dom=new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>',{url:"https://local.example/"+hash,runScripts:"outside-only",virtualConsole});
  const w=dom.window;
  w.structuredClone=value=>w.JSON.parse(w.JSON.stringify(value));
  w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.confirm=()=>true;w.alert=()=>{};
  w.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});
  w.fetch=(...args)=>{requests.push(args);throw Error("No network allowed in this local test");};
  w.requestAnimationFrame=()=>0;w.cancelAnimationFrame=()=>{};
  w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:text=>({width:String(text).length*8}),createLinearGradient:()=>({addColorStop(){}}),getImageData:()=>({data:[]})},{get:(target,key)=>key in target?target[key]:()=>{}});
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event("close"));};
  for(const [key,value]of Object.entries(stored))w.localStorage.setItem(key,value);
  for(const file of ["curriculum.js","learning-profile.js","reference.js","basics.js","plotter.js","payment-simulator.js"])w.eval(fs.readFileSync(path.join(root,file),"utf8"));
  let source=fs.readFileSync(path.join(root,"app.js"),"utf8");
  source=source.replace('  readRoute(); render();','  window.__test={go,markDone,openProfile,readRoute,render,getState:()=>state};\n  readRoute(); render();');
  w.eval(source);return {dom,w,errors,requests};
}
const {dom,w,errors,requests}=createApp("",{ls_session:JSON.stringify({access_token:"synthetic-unused-session"})});
assert.equal(w.document.querySelectorAll(".world-card").length,w.CURRICULUM.tracks.length);
assert.equal(requests.length,0,"An existing old session cannot trigger authentication or API requests");
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
const saved=w.localStorage.getItem(w.LearningProfile.KEY);dom.window.close();
const second=createApp("#lesson/"+first,{lernstudio_open_v1:saved});assert.equal(second.w.__test.getState().lastLesson,first);assert.equal(second.w.__test.getState().avatar,"🐢");assert.equal(second.requests.length,0);second.dom.window.close();
assert.equal(requests.length,0);assert.deepEqual(errors.map(e=>e.message),[]);
console.log("Lokaler DOM-Funktionstest: "+rendered+" Lektionen, alle Pfade, Suche, Direktlinks, Profil und wiederholte Abschlüsse bestanden. Keine Browser-/Pixelprüfung; Canvas als lokales Testdoppel.");
