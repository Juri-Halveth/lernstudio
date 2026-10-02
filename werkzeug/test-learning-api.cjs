"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { buildData } = require("./build-learning-api.cjs");
const packets = require("../learning-packets.js");
const root = path.resolve(__dirname, ".."), data = buildData();
for (const [file, expected] of [["manifest.json", data.manifest], ["lessons.json", data.catalogue]]) {
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, "api", file), "utf8")), expected, file + ": regenerate API");
}
const lessons = data.catalogue.lessons;
assert.equal(lessons.length, data.manifest.lessonCount);
assert.equal(new Set(lessons.map(l => l.id)).size, lessons.length);
assert.equal(new Set(lessons.map(l => l.trackId)).size, data.manifest.trackCount);
for (const lesson of lessons) {
  assert.equal(typeof lesson.title, "string");
  assert(lesson.title.length > 0);
  assert.equal(decodeURIComponent(new URL(lesson.url).hash.slice("#lesson/".length)), lesson.id);
}
const sample = JSON.parse(fs.readFileSync(path.join(root, "api/example-learning-packet.json"), "utf8"));
packets.parse(JSON.stringify(sample), lessons.map(l => l.id));
assert.equal(data.manifest.capabilities.remoteWrites, false);
assert.equal(data.manifest.capabilities.backgroundAgents, false);
assert.equal(data.manifest.capabilities.automaticCollection, false);
console.log("Public API: exact source digest, unique routes, readable lesson titles and packet membership passed.");
