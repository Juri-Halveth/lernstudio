"use strict";
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const ROOT=path.resolve(__dirname,"..");
function zahlen(){
  const sandbox={window:{},document:{getElementById:()=>({})},console};vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT,"curriculum.js"),"utf8"),sandbox,{filename:"curriculum.js",timeout:10000});
  const pfade=sandbox.window.CURRICULUM.tracks.map(t=>({id:t.id,name:t.name,lektionen:t.stages.reduce((n,s)=>n+s.lessons.length,0)}));
  return {lektionen:pfade.reduce((n,p)=>n+p.lektionen,0),pfadeAnzahl:pfade.length,pfade,mktgSeo:pfade.filter(p=>["mktg","seo"].includes(p.id)).reduce((n,p)=>n+p.lektionen,0)};
}
function main(){
  const z=zahlen();
  const file=path.join(ROOT,"wissen-marketing-start.html"),before=fs.readFileSync(file,"utf8");
  const after=before.replace(/Marketing und Suche mit zusammen \d+ Lektionen/g,"Marketing und Suche mit zusammen "+z.mktgSeo+" Lektionen");
  if(after!==before)fs.writeFileSync(file,after);
  console.log(z.lektionen+" Lektionen, "+z.pfadeAnzahl+" Lernpfade; alle kostenlos.");
}
if(require.main===module)main();
module.exports={zahlen};
