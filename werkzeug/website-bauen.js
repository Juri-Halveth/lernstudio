"use strict";
const fs = require("node:fs"), path = require("node:path");
const { execFileSync } = require("node:child_process");
const ROOT = path.resolve(__dirname, ".."), WEBSITE = require("./public-files");
console.log("1/3: Inhaltszahlen aus curriculum.js aktualisieren");
execFileSync(process.execPath, [path.join(__dirname, "zahlen-aktualisieren.js")], {stdio:"inherit"});
console.log("2/3: Freien Lernbetrieb und bestehende Lernfunktionen prüfen");
execFileSync(process.execPath, [path.join(__dirname, "test.js")], {stdio:"inherit"});
for (const file of WEBSITE) if (!fs.statSync(path.join(ROOT,file)).isFile()) throw new Error("Release file missing: " + file);
console.log("3/3: Nur freigegebene öffentliche Dateien zusammenstellen");
for (const directory of ["website", "dist"]) {
  const target = path.resolve(ROOT,directory);
  if (path.dirname(target) !== ROOT || !["website","dist"].includes(path.basename(target))) throw new Error("Output outside project");
  if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) throw new Error("Output must not be a symbolic link");
  fs.rmSync(target,{recursive:true,force:true}); fs.mkdirSync(target,{recursive:true});
  for (const file of WEBSITE) fs.copyFileSync(path.join(ROOT,file),path.join(target,file));
  if (JSON.stringify(fs.readdirSync(target).sort())!==JSON.stringify([...WEBSITE].sort())) throw new Error("Release allowlist mismatch");
}
console.log("Build bestanden: " + WEBSITE.length + " öffentliche Dateien; vollständiges Curriculum; keine Kontodaten oder Geheimnisdateien.");
