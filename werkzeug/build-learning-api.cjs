"use strict";
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const { createHash } = require("node:crypto");
const ROOT = path.resolve(__dirname, "..");
const BASE = "https://juri-halveth.github.io/lernstudio/";
const digest = value => createHash("sha256").update(value, "utf8").digest("hex");
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object"
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const serialize = (file, value) => JSON.stringify(value, null, file === "api/space.json" || file.startsWith("api/contexts/") ? 0 : 2) + "\n";
function resource(file, value) {
  const body = serialize(file, value);
  return {path:file, sha256:digest(body), bytes:Buffer.byteLength(body, "utf8")};
}

function buildData(source = fs.readFileSync(path.join(ROOT, "curriculum.js"))) {
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
  const curriculumSha256 = digest(source.toString("utf8").replace(/\r\n/g, "\n"));
  const curriculumDigestMode = "UTF8_LF_NORMALIZED";
  const catalogue = { schema: "lernstudio.lesson-catalogue.v1", curriculumSha256, curriculumDigestMode, lessons };
  const contexts = new Map(), stageIds = new Set(), trackIds = new Set();
  for (const track of tracks) {
    if (typeof track.id !== "string" || !/^[a-z][a-z0-9-]{0,63}$/.test(track.id) || trackIds.has(track.id)) throw new Error("Invalid or duplicate track ID");
    trackIds.add(track.id);
    const trackLessons = track.stages.flatMap(stage => stage.lessons.map(lesson => ({
      id:lesson.id, title:lesson.title, stageId:stage.id,
      url:BASE + "#lesson/" + encodeURIComponent(lesson.id)
    })));
    contexts.set(track.id, {
      schema:"lernstudio.track-context.v1",
      sourceBinding:{kind:"CURRICULUM_METADATA_PROJECTION", file:"curriculum.js", scope:"track:" + track.id},
      track:{id:track.id, title:track.name},
      stages:track.stages.map(stage => {
        if (typeof stage.id !== "string" || !stage.id || stageIds.has(stage.id)) throw new Error("Missing or duplicate stage ID");
        stageIds.add(stage.id);
        return {id:stage.id, title:stage.title || stage.name || null, lessonIds:stage.lessons.map(lesson => lesson.id)};
      }),
      lessons:trackLessons.map((lesson, index) => ({...lesson,
        previousId:trackLessons[index - 1]?.id ?? null, nextId:trackLessons[index + 1]?.id ?? null
      })),
      relationSemantics:{
        membership:"EXPLICIT_CURRICULUM_CONTAINMENT",
        previousId:"PREVIOUS_IN_EDITORIAL_TRACK_ORDER_NOT_PREREQUISITE",
        nextId:"NEXT_IN_EDITORIAL_TRACK_ORDER_NOT_PREREQUISITE",
        crossTrack:"NOT_ASSERTED"
      }
    });
  }
  const spaceBody = {
    schema:"lernstudio.agent-space.v1",
    baseURL:BASE, curriculumSha256, curriculumDigestMode,
    revisionMode:"SHA256_SORTED_KEYS_COMPACT_JSON_UTF8_EXCLUDING_REVISION_NO_NEWLINE",
    counts:{tracks:tracks.length, stages:stageIds.size, lessons:lessons.length},
    catalogue:resource("api/lessons.json", catalogue),
    ports:[
      {id:"overview", operation:"READ_PUBLIC", transport:"HTTPS_GET", url:BASE + "api/space.json", output:"lernstudio.agent-space.v1"},
      {id:"track-context", operation:"READ_PUBLIC", transport:"HTTPS_GET", urlTemplate:BASE + "api/contexts/{trackId}.json", output:"lernstudio.track-context.v1"},
      {id:"lesson-index", operation:"READ_PUBLIC", transport:"HTTPS_GET", url:BASE + "api/lessons.json", output:"lernstudio.lesson-catalogue.v1"},
      {id:"learning-note", operation:"LOCAL_PREVIEW", transport:"USER_SELECTED_FILE", url:BASE + "#bridge", input:"lernstudio.learning-packet.v1", output:"TAB_LOCAL_PREVIEW"},
      {id:"contribution", operation:"REVIEWED_PROPOSAL", transport:"GITHUB_PULL_REQUEST", url:"https://github.com/Juri-Halveth/lernstudio/pulls", output:"PROPOSAL_NOT_DEPLOYMENT"}
    ],
    tracks:tracks.map(track => ({
      id:track.id, title:track.name, lessonCount:contexts.get(track.id).lessons.length,
      entryLessonId:contexts.get(track.id).lessons[0]?.id ?? null,
      url:BASE + "#roadmap/" + encodeURIComponent(track.id),
      resource:resource("api/contexts/" + track.id + ".json", contexts.get(track.id))
    })),
    usage:{
      entry:"READ_OVERVIEW_THEN_ONLY_NEEDED_TRACKS",
      cache:"COMPARE_REVISION_THEN_TRACK_RESOURCE_SHA256",
      content:"PUBLIC_LESSON_METADATA_NOT_EXECUTABLE_LESSON_BODIES",
      authority:"REFERENCES_AND_HASHES_DO_NOT_GRANT_EXECUTION_OR_WRITE_AUTHORITY",
      claim:"SOURCE_BOUND_FINITE_SNAPSHOT"
    }
  };
  const space = {...spaceBody, revision:digest(JSON.stringify(canonical(spaceBody)))};
  return {
    manifest: {
      schema: "lernstudio.read-api.v1", baseURL: BASE,
      curriculumSha256, curriculumDigestMode, lessonCount: lessons.length, trackCount: tracks.length,
      endpoints: {
        lessons: BASE + "api/lessons.json",
        agentSpace: BASE + "api/space.json",
        packetContract: BASE + "api/learning-contract.v1.json",
        packetExample: BASE + "api/example-learning-packet.json"
      },
      routes: { journey: BASE, map: BASE + "#map", connections: BASE + "#connections", workshop: BASE + "#lab", import: BASE + "#bridge" },
      contributionGuide: "https://github.com/Juri-Halveth/lernstudio/blob/main/AGENT_LEARNING.md",
      capabilities: {
        publicReads: true, explicitLocalPacketPreview: true,
        remoteWrites: false, backgroundAgents: false, automaticCollection: false
      }
    },
    catalogue, space, contexts
  };
}
function outputs(data = buildData()) {
  return new Map([
    ["api/manifest.json", data.manifest], ["api/lessons.json", data.catalogue], ["api/space.json", data.space],
    ...[...data.contexts].map(([id, context]) => ["api/contexts/" + id + ".json", context])
  ]);
}
function generate() {
  const data = buildData();
  for (const [file, value] of outputs(data)) {
    const target = path.join(ROOT, file), output = serialize(file, value);
    fs.mkdirSync(path.dirname(target), {recursive:true});
    if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== output) fs.writeFileSync(target, output);
  }
  console.log("Read-only learning API: " + data.catalogue.lessons.length + " addresses, " + data.space.tracks.length + " direct contexts, " + Buffer.byteLength(serialize("api/space.json", data.space)) + " overview bytes.");
}
if (require.main === module) generate();
module.exports = { buildData, generate, outputs, serialize, canonical };
