"use strict";
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const { createHash } = require("node:crypto");
const ROOT = path.resolve(__dirname, "..");
const BASE = "https://juri-halveth.github.io/lernstudio/";

function buildData() {
  const source = fs.readFileSync(path.join(ROOT, "curriculum.js"));
  const sandbox = { window: {}, document: { getElementById: () => ({}) }, console };
  vm.runInNewContext(source.toString("utf8"), sandbox, { filename: "curriculum.js", timeout: 10000 });
  const tracks = sandbox.window.CURRICULUM.tracks;
  const seen = new Set(), lessons = [];
  for (const track of tracks) for (const stage of track.stages) for (const lesson of stage.lessons) {
    if (!lesson.id || seen.has(lesson.id)) throw new Error("Missing or duplicate lesson ID");
    seen.add(lesson.id);
    lessons.push({
      id: lesson.id, title: lesson.title, trackId: track.id, trackTitle: track.name,
      stageTitle: stage.title || stage.name || null,
      url: BASE + "#lesson/" + encodeURIComponent(lesson.id),
      order: lessons.length + 1
    });
  }
  const curriculumSha256 = createHash("sha256").update(source.toString("utf8").replace(/\r\n/g, "\n"), "utf8").digest("hex");
  const curriculumDigestMode = "UTF8_LF_NORMALIZED";
  return {
    manifest: {
      schema: "lernstudio.read-api.v1", baseURL: BASE,
      curriculumSha256, curriculumDigestMode, lessonCount: lessons.length, trackCount: tracks.length,
      endpoints: {
        lessons: BASE + "api/lessons.json",
        packetContract: BASE + "api/learning-contract.v1.json",
        packetExample: BASE + "api/example-learning-packet.json"
      },
      routes: { journey: BASE, map: BASE + "#map", workshop: BASE + "#lab", import: BASE + "#bridge" },
      contributionGuide: "https://github.com/Juri-Halveth/lernstudio/blob/main/AGENT_LEARNING.md",
      capabilities: {
        publicReads: true, explicitLocalPacketPreview: true,
        remoteWrites: false, backgroundAgents: false, automaticCollection: false
      }
    },
    catalogue: { schema: "lernstudio.lesson-catalogue.v1", curriculumSha256, curriculumDigestMode, lessons }
  };
}
function generate() {
  const data = buildData();
  fs.mkdirSync(path.join(ROOT, "api"), { recursive: true });
  for (const [file, value] of [["manifest.json", data.manifest], ["lessons.json", data.catalogue]]) {
    const target = path.join(ROOT, "api", file), output = JSON.stringify(value, null, 2) + "\n";
    if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== output) fs.writeFileSync(target, output);
  }
  console.log("Read-only learning API: " + data.catalogue.lessons.length + " source-bound lesson addresses.");
}
if (require.main === module) generate();
module.exports = { buildData, generate };
