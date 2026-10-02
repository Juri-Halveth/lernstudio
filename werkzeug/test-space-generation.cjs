"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createHash } = require("node:crypto");
const { test, after } = require("node:test");
const builder = require("./build-learning-api.cjs");
const publicFiles = require("./public-files.js");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "curriculum.js");
const sourceBytes = fs.readFileSync(sourcePath);
const sandbox = { window: {}, document: { getElementById: () => ({}) }, console };
vm.runInNewContext(sourceBytes.toString("utf8"), sandbox, { filename: "curriculum.js", timeout: 10000 });
const curriculum = sandbox.window.CURRICULUM;
const data = builder.buildData();
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const plain = value => JSON.parse(JSON.stringify(value));
const filesFor = result => new Map(Array.from(builder.outputs(result), ([file, value]) => [file, builder.serialize(file, value)]));
const sourceFor = value => '"use strict";\nwindow.CURRICULUM = ' + JSON.stringify(value, null, 2) + ";\n";

function fixture() {
  return { tracks: [
    { id: "alpha", name: "\u00dcben mit Gr\u00fc\u00dfen", stages: [
      { id: "alpha-first", title: "Anfang", lessons: [
        { id: "alpha-eins", title: "Ein Signal", type: "lesson" },
        { id: "alpha-pr\u00fcfen", title: "\u00dcberpr\u00fcfen", type: "quiz" }
      ] },
      { id: "alpha-second", title: "Danach", lessons: [
        { id: "alpha-drei", title: "Ein neuer Schritt", type: "lesson" }
      ] }
    ] },
    { id: "beta", name: "Zweiter Lernpfad", stages: [
      { id: "beta-first", title: "Eigener Anfang", lessons: [
        { id: "beta-eins", title: "Eine Beobachtung", type: "lesson" },
        { id: "beta-zwei", title: "Eine Frage", type: "lesson" }
      ] }
    ] }
  ] };
}

// Independent revision oracle: render sorted object keys without reordering arrays.
function canonicalJson(value) {
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + canonicalJson(value[key])).join(",") + "}";
  }
  return JSON.stringify(value);
}

function reversedObjectKeys(value) {
  if (Array.isArray(value)) return value.map(reversedObjectKeys);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).reverse().map(key => [key, reversedObjectKeys(value[key])]));
}

function checkMembership(result, expected) {
  const trackIds = [], stageIds = [], lessonIds = [];
  for (const track of expected.tracks) {
    trackIds.push(track.id);
    const context = result.contexts.get(track.id);
    assert(context, "Missing context: " + track.id);
    assert.deepEqual(plain(context.track), { id: track.id, title: track.name });
    assert.deepEqual(plain(context.sourceBinding), {
      kind: "CURRICULUM_METADATA_PROJECTION", file: "curriculum.js", scope: "track:" + track.id
    });
    const own = [];
    for (const stage of track.stages) {
      stageIds.push(stage.id);
      const projected = context.stages.find(item => item.id === stage.id);
      assert(projected, "Missing stage: " + stage.id);
      const expectedIds = Array.from(stage.lessons, lesson => lesson.id);
      assert.deepEqual(plain(projected.lessonIds), expectedIds);
      assert.equal(projected.title, stage.title || stage.name || null);
      for (const lesson of stage.lessons) {
        own.push({ id: lesson.id, title: lesson.title, stageId: stage.id });
        lessonIds.push(lesson.id);
      }
    }
    assert.equal(context.stages.length, track.stages.length);
    assert.deepEqual(plain(context.lessons.map(({ id, title, stageId }) => ({ id, title, stageId }))), own);
    const summary = result.space.tracks.find(item => item.id === track.id);
    assert.equal(summary.title, track.name);
    assert.equal(summary.lessonCount, own.length);
    assert.equal(summary.entryLessonId, own[0]?.id ?? null);
    assert.equal(summary.resource.path, "api/contexts/" + track.id + ".json");
    assert.equal(decodeURIComponent(new URL(summary.url).hash.slice("#roadmap/".length)), track.id);
    for (const lesson of context.lessons) {
      assert.equal(decodeURIComponent(new URL(lesson.url).hash.slice("#lesson/".length)), lesson.id);
    }
  }
  assert.deepEqual(Array.from(result.contexts.keys()), trackIds);
  assert.deepEqual(plain(result.space.tracks.map(track => track.id)), trackIds);
  assert.deepEqual(plain(result.catalogue.lessons.map(lesson => lesson.id)), lessonIds);
  assert.deepEqual(plain(result.catalogue.lessons.map(lesson => lesson.order)), lessonIds.map((_, index) => index + 1));
  assert.equal(new Set(trackIds).size, trackIds.length);
  assert.equal(new Set(stageIds).size, stageIds.length);
  assert.equal(new Set(lessonIds).size, lessonIds.length);
  assert.deepEqual(plain(result.space.counts), { tracks: trackIds.length, stages: stageIds.length, lessons: lessonIds.length });
  assert.equal(result.manifest.lessonCount, lessonIds.length);
  assert.equal(result.manifest.trackCount, trackIds.length);
}

function checkResources(result, files) {
  const resources = [result.space.catalogue, ...result.space.tracks.map(track => track.resource)];
  assert.equal(new Set(resources.map(resource => resource.path)).size, resources.length);
  for (const resource of resources) {
    const content = files.get(resource.path);
    assert.notEqual(content, undefined, resource.path + ": missing resource");
    const bytes = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
    assert.equal(resource.bytes, bytes.length, resource.path + ": byte length");
    assert.equal(resource.sha256, sha256(bytes), resource.path + ": SHA-256");
  }
}

test("real source: all 702 lessons belong exactly once to 13 tracks and their declared stages", () => {
  checkMembership(data, curriculum);
  assert.equal(data.space.counts.lessons, 702);
  assert.equal(data.space.counts.tracks, 13);
});

test("two synthetic tracks retain quiz membership, Unicode IDs and stage boundaries", () => {
  const source = fixture();
  const result = builder.buildData(sourceFor(source));
  checkMembership(result, source);
  assert.deepEqual(plain(result.space.counts), { tracks: 2, stages: 3, lessons: 5 });
  assert(result.contexts.get("alpha").lessons.some(lesson => lesson.id === "alpha-pr\u00fcfen"));
});

test("all generated files on disk match the current source, and resource hashes cover exact UTF-8 bytes", () => {
  const diskFiles = new Map();
  for (const [file, content] of filesFor(data)) {
    const actual = fs.readFileSync(path.join(root, file));
    assert(actual.equals(Buffer.from(content, "utf8")), file + ": regenerate API");
    assert.equal(actual.at(-1), 10, file + ": final LF");
    assert(!actual.includes(13), file + ": generated JSON must use LF");
    diskFiles.set(file, actual);
  }
  checkResources(data, diskFiles);
  const synthetic = builder.buildData(sourceFor(fixture()));
  const files = filesFor(synthetic);
  checkResources(synthetic, files);
  const unicodeBody = files.get("api/contexts/alpha.json");
  assert(Buffer.byteLength(unicodeBody, "utf8") > unicodeBody.length, "UTF-8 bytes are not JavaScript string length");
  assert.notEqual(synthetic.space.tracks[0].resource.sha256, sha256(unicodeBody.slice(0, -1)), "Final LF belongs to the resource hash");
});

test("adjacency follows editorial order across stages, remains inside each track, and asserts no prerequisites", () => {
  const semantics = {
    membership: "EXPLICIT_CURRICULUM_CONTAINMENT",
    previousId: "PREVIOUS_IN_EDITORIAL_TRACK_ORDER_NOT_PREREQUISITE",
    nextId: "NEXT_IN_EDITORIAL_TRACK_ORDER_NOT_PREREQUISITE",
    crossTrack: "NOT_ASSERTED"
  };
  for (const result of [data, builder.buildData(sourceFor(fixture()))]) {
    for (const context of result.contexts.values()) {
      assert.deepEqual(plain(context.relationSemantics), semantics);
      for (let index = 0; index < context.lessons.length; index++) {
        const lesson = context.lessons[index];
        assert.equal(lesson.previousId, context.lessons[index - 1]?.id ?? null);
        assert.equal(lesson.nextId, context.lessons[index + 1]?.id ?? null);
        assert(!Object.hasOwn(lesson, "prerequisites"));
      }
    }
  }
});

test("rebuilding the same real or synthetic source produces byte-identical outputs", () => {
  const actualBefore = filesFor(data);
  assert.deepEqual(filesFor(builder.buildData()), actualBefore);
  assert.deepEqual(filesFor(builder.buildData(sourceBytes)), actualBefore);
  const text = sourceFor(fixture());
  assert.deepEqual(filesFor(builder.buildData(text)), filesFor(builder.buildData(Buffer.from(text, "utf8"))));
});

test("root revision independently binds recursively sorted keys, array order and no trailing newline", () => {
  assert.equal(data.space.revisionMode, "SHA256_SORTED_KEYS_COMPACT_JSON_UTF8_EXCLUDING_REVISION_NO_NEWLINE");
  const { revision, ...body } = data.space;
  const canonicalBody = canonicalJson(body);
  assert.equal(revision, sha256(Buffer.from(canonicalBody, "utf8")));
  assert.equal(revision, sha256(canonicalJson(reversedObjectKeys(body))), "Object insertion order must not affect the revision");
  assert.notEqual(revision, sha256(JSON.stringify(body)), "Root insertion order is not the revision contract");
  assert.notEqual(revision, sha256(canonicalBody + "\n"), "Revision excludes a trailing newline");
  assert.notEqual(revision, sha256(canonicalJson(data.space)), "Revision excludes its own field");
  const reordered = plain(body);
  reordered.tracks.reverse();
  assert.notEqual(revision, sha256(canonicalJson(reordered)), "Track array order remains significant");
  const sample = { z: 6, m: { b: 5, a: 4 }, a: [{ z: 1, a: 2 }, 3] };
  assert.equal(JSON.stringify(builder.canonical(sample)), '{"a":[{"a":2,"z":1},3],"m":{"a":4,"b":5},"z":6}');
});

test("changing only one track title invalidates only its context, plus overview and catalogue", () => {
  const input = fixture();
  const before = builder.buildData(sourceFor(input));
  input.tracks[0].name = "Neuer Titel mit \u00dc";
  const after = builder.buildData(sourceFor(input));
  const beforeFiles = filesFor(before), afterFiles = filesFor(after);
  const changedContexts = before.space.tracks.filter(track =>
    track.resource.sha256 !== after.space.tracks.find(item => item.id === track.id).resource.sha256
  ).map(track => track.id);
  assert.deepEqual(plain(changedContexts), ["alpha"]);
  assert.notEqual(afterFiles.get("api/contexts/alpha.json"), beforeFiles.get("api/contexts/alpha.json"));
  assert.equal(afterFiles.get("api/contexts/beta.json"), beforeFiles.get("api/contexts/beta.json"));
  assert.notEqual(after.space.curriculumSha256, before.space.curriculumSha256);
  assert.notEqual(after.space.revision, before.space.revision);
  assert.notEqual(after.space.catalogue.sha256, before.space.catalogue.sha256);
  assert.notEqual(sha256(afterFiles.get("api/space.json")), sha256(beforeFiles.get("api/space.json")));
  checkResources(after, afterFiles);
});

test("unprojected lesson body changes update source binding without invalidating any track context", () => {
  const input = fixture();
  const before = builder.buildData(sourceFor(input));
  input.tracks[0].stages[0].lessons[0].beats = [{ kind: "text", html: "<p>Synthetic lesson body.</p>" }];
  const after = builder.buildData(sourceFor(input));
  for (const track of before.space.tracks) {
    assert.deepEqual(plain(after.space.tracks.find(item => item.id === track.id).resource), plain(track.resource));
  }
  assert.notEqual(after.space.curriculumSha256, before.space.curriculumSha256);
  assert.notEqual(after.space.revision, before.space.revision);
  assert.notEqual(after.space.catalogue.sha256, before.space.catalogue.sha256);
  assert.deepEqual(plain(after.catalogue.lessons), plain(before.catalogue.lessons));
});

test("LF and CRLF representations of the real source preserve all 13 contexts and every generated output", () => {
  const lf = sourceBytes.toString("utf8").replace(/\r\n/g, "\n");
  const crlf = lf.replace(/\n/g, "\r\n");
  assert.notEqual(sha256(lf), sha256(crlf));
  const lfData = builder.buildData(lf), crlfData = builder.buildData(Buffer.from(crlf, "utf8"));
  assert.equal(lfData.space.curriculumDigestMode, "UTF8_LF_NORMALIZED");
  assert.equal(lfData.space.curriculumSha256, sha256(lf));
  assert.equal(crlfData.space.curriculumSha256, lfData.space.curriculumSha256);
  assert.equal(crlfData.contexts.size, 13);
  assert.deepEqual(plain(crlfData.space.tracks), plain(lfData.space.tracks));
  assert.deepEqual(filesFor(crlfData), filesFor(lfData));
});

test("source projections omit extra fields at every curriculum level", () => {
  const input = fixture(), marker = "PRIVATE_FIXTURE_SENTINEL";
  input.privateAudit = marker;
  for (const track of input.tracks) {
    track.ownerNote = marker;
    for (const stage of track.stages) {
      stage.privateContext = marker;
      for (const lesson of stage.lessons) {
        lesson.beats = [{ html: marker }];
        lesson.task = { code: marker };
        lesson.personalProgress = marker;
        lesson.prerequisites = [marker];
      }
    }
  }
  const result = builder.buildData(sourceFor(input));
  for (const [file, content] of filesFor(result)) assert(!content.includes(marker), file);
  for (const context of result.contexts.values()) {
    assert.deepEqual(Object.keys(context).sort(), ["lessons", "relationSemantics", "schema", "sourceBinding", "stages", "track"]);
    assert.deepEqual(Object.keys(context.track).sort(), ["id", "title"]);
    for (const stage of context.stages) assert.deepEqual(Object.keys(stage).sort(), ["id", "lessonIds", "title"]);
    for (const lesson of context.lessons) assert.deepEqual(Object.keys(lesson).sort(), ["id", "nextId", "previousId", "stageId", "title", "url"]);
  }
});

test("published API allowlist is exactly generated outputs plus the two explicit packet files", () => {
  const generated = Array.from(builder.outputs(data).keys());
  const expected = [...generated, "api/learning-contract.v1.json", "api/example-learning-packet.json"].sort();
  assert.equal(generated.length, 16);
  assert.equal(new Set(publicFiles).size, publicFiles.length, "No duplicate public paths");
  assert.deepEqual(publicFiles.filter(file => file.startsWith("api/")).sort(), expected);
  for (const file of generated) assert(publicFiles.includes(file), file);
  for (const file of publicFiles) {
    assert.match(file, /^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/);
    assert(!file.split("/").some(part => part === "." || part === ".."));
    assert(!/^(?:research|artifacts|node_modules|\.git|website|dist|werkzeug|docs)\//.test(file), file);
  }
  for (const file of ["AGENTS.md", "PROJECT_STATUS.md", "SESSION_HANDOFF.md", "TASKS.md", ".env", "api/private.json", "api/contexts/orphan.json"]) {
    assert(!publicFiles.includes(file), file + ": not intended for the website artifact");
  }
});

test("allowlist context paths depend only on the supplied validated tracks, without directory discovery", () => {
  const generated = builder.buildData(sourceFor(fixture()));
  const module = { exports: {} };
  const required = [];
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "public-files.js"), "utf8"), {
    module,
    require(name) {
      required.push(name);
      assert.equal(name, "./build-learning-api.cjs", "Allowlist must not discover files by scanning the filesystem");
      return { buildData: () => generated };
    }
  }, { filename: "public-files.js", timeout: 1000 });
  assert.deepEqual(required, ["./build-learning-api.cjs"]);
  assert.deepEqual(Array.from(module.exports).filter(file => file.startsWith("api/contexts/")).sort(), [
    "api/contexts/alpha.json", "api/contexts/beta.json"
  ]);
});

const badTrackIds = [
  ["parent traversal", "../outside"], ["nested traversal", "alpha/../../outside"],
  ["absolute path", "/outside"], ["drive path", "C:\\outside"],
  ["backslash", "alpha\\outside"], ["encoded separator", "alpha%2foutside"],
  ["query", "alpha?outside"], ["fragment", "alpha#outside"],
  ["empty", ""], ["overlong", "a".repeat(65)],
  ["trailing newline", "alpha\n"], ["embedded newline", "al\npha"],
  ["missing", undefined], ["null", null], ["boolean", false], ["array", ["alpha"]]
];
for (const [label, id] of badTrackIds) {
  test("rejects unsafe or non-string track ID before output planning: " + label, () => {
    const input = fixture();
    input.tracks[0].id = id;
    assert.throws(() => builder.outputs(builder.buildData(sourceFor(input))), /Invalid or duplicate track ID/);
  });
}

for (const kind of ["track", "stage", "lesson"]) {
  test("rejects duplicate " + kind + " IDs across tracks before output planning", () => {
    const input = fixture();
    if (kind === "track") input.tracks[1].id = input.tracks[0].id;
    if (kind === "stage") input.tracks[1].stages[0].id = input.tracks[0].stages[0].id;
    if (kind === "lesson") input.tracks[1].stages[0].lessons[0].id = input.tracks[0].stages[0].lessons[0].id;
    assert.throws(() => builder.outputs(builder.buildData(sourceFor(input))), /(?:Missing|Invalid) or duplicate .* ID/);
  });
}

after(() => {
  assert(fs.readFileSync(sourcePath).equals(sourceBytes), "The actual curriculum source must remain byte-identical");
});
