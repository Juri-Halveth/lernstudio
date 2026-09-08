"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {JSDOM}=require("jsdom"),files=require("./public-files"),{zahlen}=require("./zahlen-aktualisieren");
const root=path.resolve(__dirname,"..");
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
for(const file of files){assert(fs.existsSync(path.join(root,file)),"Release file missing: "+file);}
for(const file of files.filter(f=>f.endsWith(".html"))){
  const text=read(file),dom=new JSDOM(text),doc=dom.window.document;
  assert.equal(doc.documentElement.lang,"de",file+": language");assert(doc.querySelector("title")?.textContent,file+": title");
  assert(doc.querySelector('meta[name="viewport"]'),file+": viewport");
  for(const script of doc.querySelectorAll('script[type="application/ld+json"]'))JSON.parse(script.textContent);
  for(const element of doc.querySelectorAll("a[href],link[href],script[src],img[src]")){
    const value=element.getAttribute("href")||element.getAttribute("src");
    if(!value||/^(?:https?:|mailto:|tel:|data:|#)/.test(value))continue;
    const target=value.split(/[?#]/)[0].replace(/^\.\//,"");
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
  assert.doesNotMatch(text,/content-public|content-loader|account-progress|ls-messung/);
}
assert.doesNotMatch(read("app.js"),/SUPABASE_URL|buy\.stripe|renderPaywall|has_active_access|auth\/v1|signTransaction|eth_sendTransaction/);
assert.doesNotMatch(read("wallet.js"),/eth_sendTransaction|personal_sign|eth_sign|wallet_switchEthereumChain/);
assert.doesNotMatch(read("ls-messung.js"),/fetch\(|googletagmanager|gtag\(/);
assert(!files.some(f=>/secret|credentials|keyhashes|backend-|\.md$|\.zip$/.test(f)));
const z=zahlen();assert(z.lektionen>0&&z.pfadeAnzahl>0);
console.log("Öffentliche Seiten: Metadaten, JSON-LD, Release-Links, kostenlose Inhalte und fehlende Auth-/Kauf-/Trackingpfade bestanden. Curriculum: "+z.lektionen+" Lektionen / "+z.pfadeAnzahl+" Pfade.");
