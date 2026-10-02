"use strict";
const fs = require("node:fs"), path = require("node:path");
const { execFileSync } = require("node:child_process");
const ROOT = path.resolve(__dirname, ".."), WEBSITE = require("./public-files");
console.log("1/3: Inhaltszahlen aus curriculum.js aktualisieren");
execFileSync(process.execPath, [path.join(__dirname, "zahlen-aktualisieren.js")], {stdio:"inherit"});
require("./build-learning-api.cjs").generate();
console.log("2/3: Freien Lernbetrieb und bestehende Lernfunktionen prüfen");
execFileSync(process.execPath, [path.join(__dirname, "test.js")], {stdio:"inherit"});
for (const file of WEBSITE) {
  if (!/^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/.test(file) || file.split("/").some(p => p === "." || p === "..")) throw new Error("Invalid release path: " + file);
  if (!fs.statSync(path.join(ROOT,file)).isFile()) throw new Error("Release file missing: " + file);
  const resolved = fs.realpathSync(path.join(ROOT,file));
  if (!resolved.startsWith(fs.realpathSync(ROOT) + path.sep)) throw new Error("Release source outside project: " + file);
}
function listFiles(directory, prefix = "") {
  return fs.readdirSync(directory, {withFileTypes:true}).flatMap(entry => {
    const relative = prefix + entry.name;
    if (entry.isDirectory()) return listFiles(path.join(directory, entry.name), relative + "/");
    if (!entry.isFile()) throw new Error("Unexpected export entry: " + relative);
    return relative;
  });
}
console.log("3/3: Nur freigegebene öffentliche Dateien zusammenstellen");
for (const directory of ["website", "dist"]) {
  const target = path.resolve(ROOT,directory);
  if (path.dirname(target) !== ROOT || !["website","dist"].includes(path.basename(target))) throw new Error("Output outside project");
  if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) throw new Error("Output must not be a symbolic link");
  fs.rmSync(target,{recursive:true,force:true}); fs.mkdirSync(target,{recursive:true});
  for (const file of WEBSITE) {
    const destination = path.join(target, file);
    fs.mkdirSync(path.dirname(destination), {recursive:true});
    fs.copyFileSync(path.join(ROOT,file), destination);
  }
  if (JSON.stringify(listFiles(target).sort())!==JSON.stringify([...WEBSITE].sort())) throw new Error("Release allowlist mismatch");
}
console.log("Build bestanden: " + WEBSITE.length + " öffentliche Dateien; vollständiges Curriculum; keine Kontodaten oder Geheimnisdateien.");
