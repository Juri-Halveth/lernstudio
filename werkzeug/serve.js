"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const allowed = new Set(require("./public-files"));
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".ico": "image/x-icon", ".mp3": "audio/mpeg", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml" };
const server = http.createServer((req, res) => {
  let file;
  try { file = decodeURIComponent(new URL(req.url, "http://localhost").pathname).slice(1) || "index.html"; }
  catch (error) { res.writeHead(400); res.end(); return; }
  if (!allowed.has(file) || !["GET", "HEAD"].includes(req.method)) { res.writeHead(404); res.end("Nicht gefunden"); return; }
  const target = path.join(root, file);
  if (!fs.existsSync(target)) { res.writeHead(404); res.end("Nicht gefunden"); return; }
  res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  if (req.method === "HEAD") res.end(); else fs.createReadStream(target).pipe(res);
});
server.listen(0, "127.0.0.1", () => console.log("Local: http://127.0.0.1:" + server.address().port));
