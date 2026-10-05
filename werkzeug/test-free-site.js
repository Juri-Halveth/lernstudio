"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {JSDOM}=require("jsdom"),files=require("./public-files"),{zahlen}=require("./zahlen-aktualisieren");
const root=path.resolve(__dirname,"..");
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
for(const file of files){assert(fs.existsSync(path.join(root,file)),"Release file missing: "+file);}
for(const file of files.filter(f=>/\.(?:html|js|txt|json|xml)$/.test(f))){
  assert(!read(file).includes(['mein','lernstudio.com'].join('-')),file+': retired custom domain');
}
assert(!files.some(f=>f.toLowerCase()==='cname'),'Public release uses the GitHub Pages address without a custom domain');
for(const file of files.filter(f=>f.endsWith(".html"))){
  const text=read(file),dom=new JSDOM(text),doc=dom.window.document;
  assert.equal(doc.documentElement.lang,file.startsWith('eltern/')?'ru':"de",file+": language");assert(doc.querySelector("title")?.textContent,file+": title");
  assert(doc.querySelector('meta[name="viewport"]'),file+": viewport");
  for(const script of doc.querySelectorAll('script[type="application/ld+json"]'))JSON.parse(script.textContent);
  for(const element of doc.querySelectorAll("a[href],link[href],script[src],img[src]")){
    const value=element.getAttribute("href")||element.getAttribute("src");
    if(!value||/^(?:https?:|mailto:|tel:|data:|#)/.test(value))continue;
    const relative=value.split(/[?#]/)[0];
    const resolved=relative?path.posix.normalize(path.posix.join(path.posix.dirname(file),relative)):'';
    const target=resolved.endsWith('/')?path.posix.normalize(resolved+'index.html'):resolved;
    if(target)assert(files.includes(target),file+": linked target absent from release: "+target);
  }
  assert(!doc.querySelector('script[src*="ls-messung"]'),file+": sales analytics still loaded");
  if(!["widerruf.html"].includes(file)){
    assert(!/buy\.stripe\.com|133[.,]33|12 Monate Vollzugang|Thema gesperrt|kostenpflichtig freischalten/.test(text),file+": old sales flow");
  }
  dom.window.close();
}
for(const file of ["index.html","studio.html"]){
  const text=read(file);assert.match(text,/src="curriculum\.js/);assert.match(text,/learning-profile\.js/);
  assert.match(text,/account-auth\.js/);assert.match(text,/account-progress\.js/);
  assert.doesNotMatch(text,/content-public|content-loader|ls-messung/);
}
for(const file of ["app.js","account-auth.js","account-progress.js"])assert.doesNotMatch(read(file),/buy\.stripe|renderPaywall|has_active_access|purchase_intent|\/entitlements|signTransaction|eth_sendTransaction/);
assert.match(read("account-auth.js"),/auth\/v1\/token\?grant_type=password/);
assert.match(read("account-progress.js"),/rpc\/sync_user_progress/);
assert.doesNotMatch(read("wallet.js"),/eth_sendTransaction|personal_sign|eth_sign|wallet_switchEthereumChain/);
assert.doesNotMatch(read("ls-messung.js"),/fetch\(|googletagmanager|gtag\(/);
assert(!files.some(f=>/secret|credentials|keyhashes|backend-|\.md$|\.zip$/.test(f)));
const z=zahlen();assert(z.lektionen>0&&z.pfadeAnzahl>0);
(async()=>{
  const vm=require('node:vm');
  for(const base of ['https://example.test/lernstudio/','https://example.test/']){
    const removed=[];
    const registrations=[
      {id:'own',scope:base,active:{scriptURL:base+'sw.js'}},
      {id:'sibling',scope:'https://example.test/scarlet/',active:{scriptURL:'https://example.test/scarlet/sw.js'}},
      {id:'other-origin',scope:'https://other.test/',active:{scriptURL:'https://other.test/sw.js'}},
      {id:'different-scope',scope:base+'nested/',active:{scriptURL:base+'sw.js'}},
    ].map(item=>({...item,unregister:()=>removed.push(item.id)}));
    if(base.endsWith('/lernstudio/'))registrations.push({scope:'https://example.test/',active:{scriptURL:'https://example.test/sw.js'},unregister:()=>removed.push('root')});
    vm.runInNewContext(read('pwa.js'),{URL,document:{currentScript:{src:base+'pwa.js?v=4'}},location:{href:base+'studio.html'},navigator:{serviceWorker:{getRegistrations:()=>Promise.resolve(registrations)}},window:{caches:{keys:()=>{throw new Error('Shared cache enumeration is not needed');}}}});
    await new Promise(resolve=>setImmediate(resolve));
    assert.deepEqual(removed,['own'],'Only the bound application worker is retired');
  }
  console.log("Öffentliche Seiten: Metadaten, Release-Links, kostenloser Zugang und pfadgebundene PWA-Abmeldung bestanden. Curriculum: "+z.lektionen+" Lektionen / "+z.pfadeAnzahl+" Pfade.");
})().catch(error=>{console.error(error);process.exitCode=1;});
