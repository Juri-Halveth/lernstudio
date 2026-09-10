"use strict";
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const root = path.resolve(__dirname, ".."), files = require("./public-files"), version = require("../package.json").version;
if (!/^\d+\.\d+\.\d+$/.test(version)) throw Error("Ungültige Paketversion");
const directory = path.join(root, "artifacts", "lernstudio-all-inkl-" + version);
if (fs.existsSync(directory)) throw Error("Paket existiert bereits. Historischen Stand nicht überschreiben: " + directory);
const entries = [];
for (const file of files) {
  const source = path.join(root, file), built = path.join(root, "dist", file);
  if (!fs.readFileSync(source).equals(fs.readFileSync(built))) throw Error("Build ist veraltet: " + file);
}
fs.mkdirSync(directory, { recursive: true });
function copy(source, target) {
  fs.copyFileSync(source, path.join(directory, target));
  const bytes = fs.readFileSync(path.join(directory, target));
  entries.push({ file: target, bytes: bytes.length, sha256: crypto.createHash("sha256").update(bytes).digest("hex") });
}
for (const file of files) copy(path.join(root, "dist", file), file);
copy(path.join(root, "dist", "index.html"), "index.htm");
copy(path.join(root, "deploy", "all-inkl.htaccess"), ".htaccess");
const manifest = { version, createdAt: new Date().toISOString(), target: "https://www.mein-lernstudio.com/", state: "PREPARED_NOT_DEPLOYED", entries };
fs.writeFileSync(directory + ".manifest.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(entries.length + " öffentliche Dateien vorbereitet: " + directory);
