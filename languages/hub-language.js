/* MIT. Local presentation dictionaries; source IDs, code and user input retain their bytes. */
(function () {
 'use strict';
 const supported=new Set(['de','en','ru']),current=new URL(location.href);
 const requested=current.searchParams.get('lang');
 let saved;try{saved=localStorage.getItem('halveth-hub-language');}catch{}
 const pathLanguage=current.pathname.match(/^\/(en|ru)(?:\/|$)/)?.[1];
 let language=supported.has(requested)?requested:pathLanguage||(document.documentElement.hasAttribute('data-language-static')?document.documentElement.lang:supported.has(saved)?saved:'de');
 const dict=window.HalvethHubTranslations||Object.create(null);
 const reverse=new Map(),normalized=new Map();
 for(const [source,translations] of Object.entries(dict)){
  normalized.set(source.replace(/\s+/g,' '),source);
  for(const value of Object.values(translations))if(typeof value==='string'&&value!==source&&!reverse.has(value))reverse.set(value,source);
 }
 function t(value){
  const key=String(value).trim(),source=Object.hasOwn(dict,key)?key:reverse.get(key)||normalized.get(key.replace(/\s+/g,' '));
  return source?(language==='de'?source:dict[source][language]||key):key;
 }
 function text(value){
  const trimmed=value.trim();if(!trimmed)return value;
  let translated=t(trimmed);
  if(translated===trimmed){
   const piece=part=>{
    const key=part.trim(),exact=t(key);if(exact!==key)return part.replace(key,exact);
    const decorated=key.match(/^([^\p{L}\p{N}]+)(.+)$/u);
    if(decorated&&t(decorated[2])!==decorated[2])return part.replace(key,decorated[1]+t(decorated[2]));
    const punctuation=key.match(/^(.+?)([.!?…])$/u);
    if(punctuation&&t(punctuation[1])!==punctuation[1])return part.replace(key,t(punctuation[1])+punctuation[2]);
    const count=key.match(/^(\d[\d.,]*(?:\s*\/\s*\d[\d.,]*)?)\s+(.+)$/);
    if(count&&t(count[2])!==count[2])return part.replace(key,count[1]+' '+t(count[2]));
    const tail=key.match(/^(.+?)\s+(\d[\d.,]*(?:\s*\/\s*\d[\d.,]*)?)$/);
    if(tail&&t(tail[1])!==tail[1])return part.replace(key,t(tail[1])+' '+tail[2]);
    const progress=key.match(/^Fortschritt\s+(.+)$/);
    if(progress)return part.replace(key,t('Fortschritt')+' '+t(progress[1]));
    return part;
   };
   translated=trimmed.split(/(\s*·\s*|:\s+)/).map(piece).join('');
  }
  return value.replace(trimmed,translated);
 }
 function link(value,lang=language){
  const u=new URL(value,document.baseURI);
  if(u.hostname!=='juri-halveth.github.io'&&u.origin!==current.origin)return u.href;
  if(!/\/$|\.html$/.test(u.pathname))return u.href;
  if(u.hostname==='juri-halveth.github.io'&&/^\/(?:en\/|ru\/)?(?:$|arbeiten\/$|profil\/$)/.test(u.pathname)){
   u.pathname=u.pathname.replace(/^\/(?:en\/|ru\/)?/,'/'+(lang==='de'?'':lang+'/'));u.searchParams.delete('lang');
  }else u.searchParams.set('lang',lang);
  return u.href;
 }
 function select(lang){if(!supported.has(lang))return;try{localStorage.setItem('halveth-hub-language',lang);}catch{}
  if(document.documentElement.hasAttribute('data-language-in-place')&&window.HalvethLanguage?.set){window.HalvethLanguage.set(lang);return;}
  location.assign(link(location.href,lang));
 }
 window.HalvethHubLanguage=Object.freeze({get language(){return language;},t,link,select,searchable:value=>[String(value),t(value),...(Object.values(dict[String(value)]||{}))].join(' ')});
 const sources=new WeakMap(),attributeSources=new WeakMap();
 const excluded='script,style,code,pre,textarea,math,.trace-body,.trace-author,[contenteditable],[data-no-translate],[data-original-source],[data-user-content],[data-hub-navigation],[data-lang="en"]';
 function translate(root){
  if(root.nodeType===3){updateText(root);return;}
  if(root.nodeType!==1&&root.nodeType!==9)return;
  if(root.nodeType===1&&root.closest(excluded))return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];
  while(walker.nextNode())nodes.push(walker.currentNode);
  nodes.forEach(updateText);
  const elements=root.nodeType===1?[root,...root.querySelectorAll('*')]:[...root.querySelectorAll('*')];
  for(const node of elements){
   if(node.tagName!=='TEXTAREA'&&node.closest(excluded))continue;
   let record=attributeSources.get(node);if(!record){record={};attributeSources.set(node,record);}
   for(const attr of ['alt','aria-label','aria-valuetext','placeholder','title','content']){
    if(attr==='content'&&!node.matches('meta[name="description"],meta[property="og:title"],meta[property="og:description"]'))continue;
    const value=node.getAttribute(attr);if(value===null)continue;
    if(!record[attr]||record[attr].last!==value)record[attr]={original:value,last:value};
    const next=text(record[attr].original);if(value!==next)node.setAttribute(attr,next);record[attr].last=next;
   }
  }
 }
 function updateText(node){
  if(!node.parentElement||node.parentElement.closest(excluded))return;
  const value=node.nodeValue;let record=sources.get(node);
  if(!record||record.last!==value){record={original:value,last:value};sources.set(node,record);}
  const next=text(record.original);if(value!==next)node.nodeValue=next;record.last=next;
 }
 function navigation(){
  if(document.documentElement.hasAttribute('data-language-static'))return;
  if(document.querySelector('[data-hub-navigation]'))return;
  const nav=document.createElement('nav');nav.className='hub-navigation';nav.dataset.hubNavigation='';nav.setAttribute('aria-label',language==='ru'?'Главная страница и языки':language==='en'?'Home and languages':'Startseite und Sprachen');
  const home=document.createElement('a');home.href='https://juri-halveth.github.io/'+(language==='de'?'':language+'/');home.textContent=language==='ru'?'← Обзор тем':language==='en'?'← Topic overview':'← Themenübersicht';nav.append(home);
  for(const [lang,label] of [['de','DE'],['en','EN'],['ru','RU']]){
   const a=document.createElement('a');a.href=link(location.href,lang);a.textContent=label;a.lang=lang;a.hreflang=lang;
   if(lang===language)a.setAttribute('aria-current','true');
   a.addEventListener('click',event=>{try{localStorage.setItem('halveth-hub-language',lang);}catch{}
    if(document.documentElement.hasAttribute('data-language-in-place')&&window.HalvethLanguage?.set){event.preventDefault();select(lang);}
   });nav.append(a);
  }
  const slot=document.documentElement.hasAttribute('data-language-in-place')?document.querySelector('.profile-languages'):null;
  if(slot){nav.classList.add('hub-navigation--embedded');slot.replaceChildren(nav);}else document.body.prepend(nav);
 }
 function routes(root){
  if(!root.querySelectorAll)return;
  const anchors=root.nodeType===1&&root.matches('a[href]')?[root,...root.querySelectorAll('a[href]')]:root.querySelectorAll('a[href]');
  for(const a of anchors){
   const value=a.getAttribute('href');if(!value||value.startsWith('#')||a.closest('[data-hub-navigation]')||a.hasAttribute('data-set-lang')||a.hasAttribute('data-language-link'))continue;
   const next=link(value);if(next!==a.href)a.href=next;
  }
 }
 function start(){
  document.documentElement.lang=language;document.documentElement.dataset.hubLanguage=language;
  navigation();translate(document);routes(document);
  const observer=new MutationObserver(records=>{
   observer.disconnect();
   if(!document?.body)return;
   for(const record of records){
    if(record.type==='childList')for(const node of record.addedNodes){translate(node);routes(node);}
    else if(record.type==='characterData')updateText(record.target);
    else translate(record.target);
   }
   observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['alt','aria-label','aria-valuetext','placeholder','title']});
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['alt','aria-label','aria-valuetext','placeholder','title']});
  window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
 }
 window.addEventListener('halveth:language',event=>{
  const lang=event.detail?.language;if(!supported.has(lang))return;
  language=lang;document.documentElement.dataset.hubLanguage=lang;
  try{localStorage.setItem('halveth-hub-language',lang);}catch{}
  document.querySelector('[data-hub-navigation]')?.remove();navigation();translate(document);routes(document);
 });
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>queueMicrotask(start),{once:true});else queueMicrotask(start);
}());
