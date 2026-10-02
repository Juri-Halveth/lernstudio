"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");

const ROOT = path.resolve(__dirname, "..");
const CLI = path.join(__dirname, "agent-space.mjs");
const WRAPPER = path.join(__dirname, "agent-space.ps1");
const BASE = "https://example.invalid/learning/";
const MODE = "SHA256_SORTED_KEYS_COMPACT_JSON_UTF8_EXCLUDING_REVISION_NO_NEWLINE";
const hash = value => createHash("sha256").update(value).digest("hex");
const clone = value => JSON.parse(JSON.stringify(value));
const canonicalJSON = value => Array.isArray(value) ? "[" + value.map(canonicalJSON).join(",") + "]"
  : value && typeof value === "object" ? "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + canonicalJSON(value[key])).join(",") + "}" : JSON.stringify(value);
const seal = space => {
  const { revision, ...body } = space;
  return { ...body, revision: hash(canonicalJSON(body)) };
};
const cli = (args, options = {}) => spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", timeout: 15000, shell: false, ...options });
const passed = result => {
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  return JSON.parse(result.stdout);
};
const rejected = (result, pattern) => {
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1, result.stderr);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /^agent-space: /);
  if (pattern) assert.match(result.stderr, pattern);
};

function fixture(context) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "lernstudio-agent-space-test-"));
  const root = path.join(directory, "public checkout");
  context.after(() => {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
    assert(path.basename(directory).startsWith("lernstudio-agent-space-test-"));
    fs.rmSync(directory, { recursive: true, force: true });
  });
  fs.mkdirSync(path.join(root, "api", "contexts"), { recursive: true });
  const source = "Not executable JavaScript; just source bytes for the fixture.\r\n";
  const curriculumSha256 = hash(source.replace(/\r\n/g, "\n"));
  const curriculumDigestMode = "UTF8_LF_NORMALIZED";
  const contexts = new Map();
  const lessons = [];
  for (const [id, title, count] of [["math", "Mathematik \u00e4", 13], ["words", "Words", 1]]) {
    const trackLessons = Array.from({ length: count }, (_, index) => ({
      id: id === "math" && index === 0 ? "math-realit\u00e4t-1" : id + "-" + (index + 1),
      title: index === 0 ? 'Literal "half" <em>quarter</em> & sum | part; $value (2 > 1) \\ \u00e4' : "Lesson " + (index + 1),
      stageId: id + (index < 12 ? "-first" : "-last")
    }));
    const stages = [...new Set(trackLessons.map(lesson => lesson.stageId))].map(stageId => ({ id: stageId, title: stageId.endsWith("first") ? "First stage" : null, lessonIds: trackLessons.filter(lesson => lesson.stageId === stageId).map(lesson => lesson.id) }));
    for (const lesson of trackLessons) {
      lesson.url = BASE + "#lesson/" + encodeURIComponent(lesson.id);
      lessons.push({ id: lesson.id, title: lesson.title, trackId: id, trackTitle: title, stageTitle: stages.find(stage => stage.id === lesson.stageId).title, url: lesson.url, order: lessons.length + 1 });
    }
    contexts.set(id, {
      schema: "lernstudio.track-context.v1",
      sourceBinding: { kind: "CURRICULUM_METADATA_PROJECTION", file: "curriculum.js", scope: "track:" + id },
      track: { id, title }, stages,
      lessons: trackLessons.map((lesson, index) => ({ ...lesson, previousId: trackLessons[index - 1]?.id ?? null, nextId: trackLessons[index + 1]?.id ?? null })),
      relationSemantics: { membership: "EXPLICIT_CURRICULUM_CONTAINMENT", previousId: "PREVIOUS_IN_EDITORIAL_TRACK_ORDER_NOT_PREREQUISITE", nextId: "NEXT_IN_EDITORIAL_TRACK_ORDER_NOT_PREREQUISITE", crossTrack: "NOT_ASSERTED" }
    });
  }
  const value = {
    directory, root, source, contexts,
    catalogue: { schema: "lernstudio.lesson-catalogue.v1", curriculumSha256, curriculumDigestMode, lessons },
    space: {
      schema: "lernstudio.agent-space.v1", baseURL: BASE, curriculumSha256, curriculumDigestMode, revisionMode: MODE,
      counts: { tracks: contexts.size, stages: 3, lessons: lessons.length }, catalogue: {},
      ports: [
        { id: "overview", operation: "READ_PUBLIC", transport: "HTTPS_GET", url: BASE + "api/space.json", output: "lernstudio.agent-space.v1" },
        { id: "track-context", operation: "READ_PUBLIC", transport: "HTTPS_GET", urlTemplate: BASE + "api/contexts/{trackId}.json", output: "lernstudio.track-context.v1" }
      ],
      tracks: [...contexts].map(([id, data]) => ({ id, title: data.track.title, lessonCount: data.lessons.length, entryLessonId: data.lessons[0].id, url: BASE + "#roadmap/" + id, resource: {} })),
      usage: { content: "PUBLIC_LESSON_METADATA_NOT_EXECUTABLE_LESSON_BODIES", claim: "SOURCE_BOUND_FINITE_SNAPSHOT" }
    }
  };
  fs.writeFileSync(path.join(root, "curriculum.js"), source);
  saveResources(value);
  return value;
}
function writeResource(root, file, value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value) + "\n");
  fs.writeFileSync(path.join(root, file), bytes);
  return { path: file, sha256: hash(bytes), bytes: bytes.length };
}
function saveSpace(fixture) {
  fixture.space = seal(fixture.space);
  fs.writeFileSync(path.join(fixture.root, "api", "space.json"), JSON.stringify(fixture.space) + "\n");
}
function saveResources(fixture) {
  fixture.space.catalogue = writeResource(fixture.root, "api/lessons.json", fixture.catalogue);
  for (const track of fixture.space.tracks) track.resource = writeResource(fixture.root, "api/contexts/" + track.id + ".json", fixture.contexts.get(track.id));
  saveSpace(fixture);
}
function snapshot(directory) {
  const items = [];
  function visit(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const target = path.join(current, entry.name), relative = path.relative(directory, target);
      assert(!entry.isSymbolicLink(), "Snapshots cover regular fixture files only.");
      items.push([relative, entry.isDirectory() ? "DIRECTORY" : hash(fs.readFileSync(target))]);
      if (entry.isDirectory()) visit(target);
    }
  }
  visit(directory);
  return items;
}
function snapshotFile(fixture, name, value) {
  const location = path.join(fixture.directory, name);
  fs.writeFileSync(location, JSON.stringify(seal(value)) + "\n");
  return location;
}

test("help is explicit about local-only reads, source checks, bounds and comparison semantics", () => {
  for (const flag of ["help", "--help", "-h"]) {
    const result = cli([flag]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
    for (const word of ["overview", "context LESSON_ID", "search TEXT", "verify", "changes BEFORE", "NOT_PRESENT", "8 MiB", "no symlinks", "not establish web freshness"]) assert(result.stdout.includes(word), word);
  }
});

test("overview emits the compact validated root, never catalogue or shard lesson contents", context => {
  const f = fixture(context);
  const data = passed(cli(["overview", "--root", f.root]));
  assert.deepEqual(data, f.space);
  assert.equal(Object.hasOwn(data, "lessons"), false);
  assert.equal(Object.hasOwn(data.tracks[0], "lessons"), false);
  fs.unlinkSync(path.join(f.root, "api", "lessons.json"));
  fs.unlinkSync(path.join(f.root, "api", "contexts", "math.json"));
  assert.deepEqual(passed(cli(["overview", "--root", f.root])), f.space);
});

test("context returns exact Unicode identity, real parents/order and at most eight stage peers", context => {
  const f = fixture(context);
  const data = passed(cli(["context", "math-realit\u00e4t-1", "--root", f.root]));
  assert.equal(data.selectedLesson.id, "math-realit\u00e4t-1");
  assert.equal(data.selectedLesson.url, BASE + "#lesson/math-realit%C3%A4t-1");
  assert.equal(data.parentTrack.id, "math");
  assert.equal(data.parentStage.id, "math-first");
  assert.equal(data.previous, null);
  assert.equal(data.next.id, "math-2");
  assert.deepEqual([data.stagePeers.limit, data.stagePeers.total, data.stagePeers.omitted, data.stagePeers.items.length], [8, 11, 3, 8]);
  assert(data.stagePeers.items.every(peer => peer.stageId === data.parentStage.id && peer.id !== data.selectedLesson.id));
  assert.equal(data.relationSemantics.crossTrack, "NOT_ASSERTED");
  assert.match(data.relationSemantics.nextId, /NOT_PREREQUISITE/);
  const last = passed(cli(["context", "math-13", "--root", f.root]));
  assert.equal(last.previous.id, "math-12");
  assert.equal(last.previous.stageId, "math-first");
  assert.equal(last.next, null);
  assert.equal(last.parentStage.title, null);
  assert.equal(last.stagePeers.total, 0);
  assert.deepEqual(last.stagePeers.items, []);
  rejected(cli(["context", "math-realita\u0308t-1", "--root", f.root]), /not present/);
  rejected(cli(["context", "absent-1", "--root", f.root]), /not present/);
});

test("context loads only catalogue plus selected shard and treats the sourceBinding filename as data", async context => {
  const f = fixture(context);
  fs.unlinkSync(path.join(f.root, "curriculum.js"));
  fs.unlinkSync(path.join(f.root, "api", "contexts", "words.json"));
  const { run } = await import(pathToFileURL(CLI).href);
  const original = fs.openSync, opened = [];
  fs.openSync = (file, flags, ...rest) => {
    assert.equal(flags & (fs.constants.O_WRONLY | fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_TRUNC), 0);
    opened.push(path.relative(f.root, file).replaceAll(path.sep, "/"));
    return original(file, flags, ...rest);
  };
  try {
    const result = run(["context", "math-2", "--root", f.root]);
    assert.equal(result.selectedLesson.id, "math-2");
  } finally { fs.openSync = original; }
  assert.deepEqual(opened, ["api/space.json", "api/lessons.json", "api/contexts/math.json"]);
  rejected(cli(["verify", "--root", f.root]), /ENOENT/);
});

test("search is bounded literal Unicode matching, with no regex or normalization", context => {
  const f = fixture(context);
  const data = passed(cli(["search", "MATHEMATIK \u00c4", "--limit", "3", "--root", f.root]));
  assert.deepEqual([data.matches.length, data.total, data.omitted, data.limit], [3, 13, 10, 3]);
  assert.equal(passed(cli(["search", "math-realit\u00e4t-1", "--root", f.root])).matches[0].id, "math-realit\u00e4t-1");
  assert.equal(passed(cli(["search", "Lesson", "--root", f.root])).limit, 10);
  for (const query of [".*", "[", "(a+)+$", "realita\u0308t"]) assert.equal(passed(cli(["search", query, "--root", f.root])).total, 0);
  const literal = f.catalogue.lessons[0].title;
  const exact = passed(cli(["search", literal, "--root", f.root]));
  assert.equal(exact.query, literal);
  assert.equal(exact.total, 2);
  assert.equal(exact.matches[0].title, literal);
  assert.deepEqual(exact.matches[0].matchedFields, ["title"]);
  const stage = passed(cli(["search", "FIRST STAGE", "--limit", "20", "--root", f.root]));
  assert.equal(stage.total, 13);
  assert(stage.matches.every(lesson => lesson.matchedFields.includes("stageTitle")));
  assert(!stage.matches.some(lesson => lesson.id === "math-13"));
  fs.unlinkSync(path.join(f.root, "api", "contexts", "math.json"));
  assert.equal(passed(cli(["search", "math", "--root", f.root, "--limit", "20"])).total, 13);
});

test("verify checks exact JSON bytes, all memberships and the optional non-executed curriculum source", context => {
  const f = fixture(context), before = snapshot(f.directory);
  const data = passed(cli(["verify", "--root", f.root]));
  assert.equal(data.verified, true);
  assert.equal(data.sourceCheck, "MATCH");
  assert.equal(data.curriculumFileRead, true);
  assert.equal(data.webFreshness, "NOT_CHECKED");
  assert.deepEqual(data.counts, f.space.counts);
  assert.equal(data.resources.length, 3);
  assert.deepEqual(snapshot(f.directory), before);
  fs.unlinkSync(path.join(f.root, "curriculum.js"));
  const exported = passed(cli(["verify", "--root", f.root]));
  assert.equal(exported.sourceCheck, "NOT_PRESENT");
  assert.equal(exported.curriculumFileRead, false);
});

test("present curriculum rejects mismatches, invalid UTF-8, directories and files over 8 MiB", context => {
  const f = fixture(context), file = path.join(f.root, "curriculum.js");
  fs.writeFileSync(file, "different source");
  rejected(cli(["verify", "--root", f.root]), /Curriculum source SHA-256/);
  fs.writeFileSync(file, Buffer.from([0xff]));
  rejected(cli(["verify", "--root", f.root]), /valid UTF-8/);
  fs.writeFileSync(file, " ".repeat(8 * 1024 * 1024 + 1));
  rejected(cli(["verify", "--root", f.root]), /file size limit/);
  fs.unlinkSync(file);
  fs.mkdirSync(file);
  rejected(cli(["verify", "--root", f.root]), /regular local/);
});

test("standalone verify rejects a tampered shard without repairing or mutating any bytes", context => {
  const f = fixture(context), file = path.join(f.root, "api", "contexts", "math.json");
  fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace("Literal", "LITERAL"));
  const before = snapshot(f.directory);
  rejected(cli(["verify", "--root", f.root]), /SHA-256/);
  rejected(cli(["context", "math-2", "--root", f.root]), /SHA-256/);
  assert.deepEqual(snapshot(f.directory), before);
});

test("catalogue byte length and SHA-256 are checked before metadata is used", context => {
  const f = fixture(context), file = path.join(f.root, "api", "lessons.json");
  fs.appendFileSync(file, " ");
  rejected(cli(["search", "math", "--root", f.root]), /byte count/);
  saveResources(f);
  fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace("Literal", "LITERAL"));
  rejected(cli(["context", "math-2", "--root", f.root]), /SHA-256/);
});

test("revision hashing ignores object key order/whitespace but preserves array order", context => {
  const f = fixture(context), file = path.join(f.root, "api", "space.json");
  const reverseKeys = value => Array.isArray(value) ? value.map(reverseKeys) : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).reverse().map(key => [key, reverseKeys(value[key])])) : value;
  fs.writeFileSync(file, JSON.stringify(reverseKeys(f.space), null, 4) + "\n\n");
  assert.equal(passed(cli(["overview", "--root", f.root])).revision, f.space.revision);
  const changed = clone(f.space);
  changed.tracks.reverse();
  fs.writeFileSync(file, JSON.stringify(changed));
  rejected(cli(["overview", "--root", f.root]), /revision/);
  const originalHash = f.space.revision;
  f.space = changed;
  saveSpace(f);
  assert.notEqual(f.space.revision, originalHash);
  assert.equal(passed(cli(["overview", "--root", f.root])).revision, f.space.revision);
  f.space.revisionMode = "UNSORTED_JSON";
  saveSpace(f);
  rejected(cli(["overview", "--root", f.root]), /revisionMode/);
});

test("closed root and nested objects reject missing/unknown fields as inert data", context => {
  const f = fixture(context), original = clone(f.space);
  const edits = [
    value => { value.commands = "This field is data, not an instruction."; },
    value => { delete value.catalogue; },
    value => { value.counts.extra = 1; },
    value => { value.tracks[0].resource.extra = "data"; },
    value => { value.ports[0].unexpected = "data"; },
    value => { value.tracks[0].extra = "data"; },
    value => { value.schema = "lernstudio.agent-space.v2"; }
  ];
  for (const edit of edits) {
    f.space = clone(original);
    edit(f.space);
    saveSpace(f);
    const before = snapshot(f.directory);
    rejected(cli(["overview", "--root", f.root]), /fields|schema/);
    assert.deepEqual(snapshot(f.directory), before);
  }
});

test("resource paths reject traversal, network, encoding, streams and mismatched track IDs", context => {
  const f = fixture(context), original = clone(f.space);
  for (const bad of ["../private.json", "api/../private.json", "api/contexts/../math.json", "api/contexts/%2e%2e.json", "api\\contexts\\math.json", "/api/contexts/math.json", "https://example.invalid/math.json", "//example.invalid/share/math.json", "api/contexts/math.json:stream", "api/contexts/words.json", "api/contexts/math.json/child"]) {
    f.space = clone(original);
    f.space.tracks[0].resource.path = bad;
    saveSpace(f);
    rejected(cli(["overview", "--root", f.root]), /Resource path/);
  }
  f.space = clone(original);
  f.space.catalogue.path = "api/other.json";
  saveSpace(f);
  rejected(cli(["verify", "--root", f.root]), /Resource path/);
  f.space = clone(original);
  f.space.tracks[0].id = "m\u00e4th";
  saveSpace(f);
  rejected(cli(["overview", "--root", f.root]), /ID syntax/);
});

test("invalid IDs, hashes, counts, duplicate tracks/ports and credential URLs are rejected", context => {
  const f = fixture(context), original = clone(f.space);
  const edits = [
    value => { value.tracks.push(clone(value.tracks[0])); },
    value => { value.ports.push(clone(value.ports[0])); },
    value => { value.counts.lessons++; },
    value => { value.counts.stages = 2049; },
    value => { value.tracks[0].entryLessonId = null; },
    value => { value.tracks[0].entryLessonId = "../note"; },
    value => { value.catalogue.sha256 = "z".repeat(64); },
    value => { value.catalogue.bytes = 4 * 1024 * 1024 + 1; },
    value => { value.tracks[0].resource.bytes = 1024 * 1024 + 1; },
    value => { value.catalogue.bytes = 1.5; },
    value => { value.ports[0].url = "https://person:secret@example.invalid/"; },
    value => { value.ports[0].url = "https://@example.invalid/"; },
    value => { value.ports[0].url = "http://example.invalid/"; }
  ];
  for (const edit of edits) {
    f.space = clone(original);
    edit(f.space);
    saveSpace(f);
    rejected(cli(["overview", "--root", f.root]));
  }
});

test("bounded strict UTF-8 JSON rejects oversized, malformed, deep and invalid Unicode documents", context => {
  const f = fixture(context), file = path.join(f.root, "api", "space.json");
  for (const bytes of [Buffer.from([0xff, 0xfe]), Buffer.from([0xc0, 0xaf]), Buffer.from([0xe2, 0x82])]) {
    fs.writeFileSync(file, bytes);
    rejected(cli(["overview", "--root", f.root]), /UTF-8/);
  }
  for (const body of ["{not JSON", "{}{}", "\ufeff{}", "null", "[]"]) {
    fs.writeFileSync(file, body);
    rejected(cli(["overview", "--root", f.root]), /JSON/);
  }
  fs.writeFileSync(file, " ".repeat(256 * 1024 + 1));
  rejected(cli(["overview", "--root", f.root]), /file size limit/);
  fs.writeFileSync(file, "[".repeat(18) + "0" + "]".repeat(18));
  rejected(cli(["overview", "--root", f.root]), /structural limits/);
  f.space.usage.bad = "\ud800";
  saveSpace(f);
  rejected(cli(["overview", "--root", f.root]), /Unicode/);
  delete f.space.usage.bad;
  saveSpace(f);
  const bytes = fs.readFileSync(file);
  fs.writeFileSync(file, Buffer.concat([bytes, Buffer.alloc(256 * 1024 - bytes.length, 32)]));
  assert.equal(passed(cli(["overview", "--root", f.root])).revision, f.space.revision);
});

test("a stale size observation cannot cause an unbounded read and the descriptor is closed", async context => {
  const f = fixture(context), file = path.join(f.root, "api", "space.json");
  const maximum = 256 * 1024;
  fs.writeFileSync(file, " ".repeat(maximum + 100));
  const before = snapshot(f.directory);
  const { run } = await import(pathToFileURL(CLI).href);
  const original = { lstatSync: fs.lstatSync, readSync: fs.readSync, closeSync: fs.closeSync };
  let requested = 0, closed = 0;
  fs.lstatSync = (...args) => {
    const stat = original.lstatSync(...args);
    if (path.resolve(args[0]) === file) stat.size = 10;
    return stat;
  };
  fs.readSync = (descriptor, buffer, offset, length, position) => {
    assert.equal(buffer.length, maximum + 1);
    requested += length;
    return original.readSync(descriptor, buffer, offset, length, position);
  };
  fs.closeSync = descriptor => { closed++; return original.closeSync(descriptor); };
  try { assert.throws(() => run(["overview", "--root", f.root]), /file size limit/); }
  finally { Object.assign(fs, original); }
  assert.equal(requested, maximum + 1);
  assert.equal(closed, 1);
  assert.deepEqual(snapshot(f.directory), before);
});

test("catalogue consistency rejects duplicates, wrong track membership, source digest and ordering", context => {
  const f = fixture(context), original = clone(f.catalogue);
  const edits = [
    value => { value.lessons[1].id = value.lessons[0].id; },
    value => { value.lessons[0].trackId = "absent"; },
    value => { value.lessons[0].trackTitle = "Another title"; },
    value => { value.lessons[0].order = 2; },
    value => { value.lessons[0].url = "https://example.invalid/wrong"; },
    value => { value.lessons[0].id = "bad id"; },
    value => { value.lessons[0].title = "\u0000"; },
    value => { value.lessons[0].extra = "data"; },
    value => { value.curriculumSha256 = "a".repeat(64); },
    value => { value.lessons.pop(); }
  ];
  for (const edit of edits) {
    f.catalogue = clone(original);
    edit(f.catalogue);
    saveResources(f);
    rejected(cli(["verify", "--root", f.root]));
  }
});

test("shard membership, metadata, editorial links and scoped sourceBinding must match", context => {
  const f = fixture(context), original = clone(f.contexts.get("math"));
  const edits = [
    value => { value.curriculumSha256 = f.space.curriculumSha256; },
    value => { value.sourceBinding.scope = "track:words"; },
    value => { value.sourceBinding.file = "private.txt"; },
    value => { value.track.id = "words"; },
    value => { value.stages[1].id = value.stages[0].id; },
    value => { value.stages[0].lessonIds[1] = value.stages[0].lessonIds[0]; },
    value => { value.stages[0].lessonIds[0] = "absent"; },
    value => { value.stages[0].title = "Wrong title"; },
    value => { value.lessons[1].id = value.lessons[0].id; },
    value => { value.lessons[0].stageId = "words-first"; },
    value => { value.lessons[0].title = "Wrong title"; },
    value => { value.lessons[0].nextId = "words-1"; },
    value => { value.lessons[0].previousId = value.lessons[0].id; },
    value => { value.lessons[0].extra = "data"; },
    value => { value.lessons.pop(); },
    value => { value.relationSemantics.crossTrack = "INFERRED_NEIGHBORS"; }
  ];
  for (const edit of edits) {
    const modified = clone(original);
    edit(modified);
    f.contexts.set("math", modified);
    saveResources(f);
    rejected(cli(["verify", "--root", f.root]));
  }
});

test("verify checks global stage uniqueness and declared stage totals", context => {
  const f = fixture(context), words = f.contexts.get("words");
  words.stages[0].id = "math-first";
  words.lessons[0].stageId = "math-first";
  saveResources(f);
  rejected(cli(["verify", "--root", f.root]), /Stage ID occurs/);
  words.stages[0].id = "words-first";
  words.lessons[0].stageId = "words-first";
  f.space.counts.stages++;
  saveResources(f);
  rejected(cli(["verify", "--root", f.root]), /stage or lesson totals/);
});

test("unknown, duplicate, missing and malformed flags fail with empty stdout", context => {
  const f = fixture(context), invalid = [
    [], ["upload"], ["overview", "extra"], ["context"], ["context", "--root", f.root], ["search"], ["changes"],
    ["changes", "before.json"], ["changes", "before.json", "after.json", "--root", f.root],
    ["overview", "--root"], ["overview", "--root", ""], ["overview", "--root", "--root"],
    ["overview", "--root", f.root, "--root", f.root], ["overview", "--unknown", "data"],
    ["context", "math-2", "--limit", "2"], ["search", "math", "--limit", "2", "--limit", "3"],
    ["search", " ", "--root", f.root], ["search", "x".repeat(257), "--root", f.root],
    ["search", "line\nnext", "--root", f.root], ["context", "x".repeat(97), "--root", f.root],
    ["overview", "--root", "x".repeat(4097)], ["--help", "extra"]
  ];
  for (const limit of ["0", "21", "-1", "1.5", "01", "NaN", "Infinity", "1e1", "", "--root"]) invalid.push(["search", "math", "--root", f.root, "--limit", limit]);
  for (const args of invalid) rejected(cli(args));
});

test("local path errors redact private paths and reject network URLs/UNC/streams before reads", context => {
  const f = fixture(context);
  for (const location of ["https://example.invalid/export", "file:///tmp/export", "//example.invalid/share", "\\\\example.invalid\\share", "C:\\data\\file:stream", "C:relative", "\\\\?\\C:\\data"]) {
    rejected(cli(["overview", "--root", location]), /local path/);
    rejected(cli(["changes", location, path.join(f.root, "api", "space.json")]), /local path/);
  }
  const missing = path.join(f.root, "sensitive-marker-absent");
  const result = cli(["overview", "--root", missing]);
  rejected(result, /ENOENT/);
  assert(!result.stderr.includes("sensitive-marker"));
  assert(!result.stderr.includes(f.directory));
  const snapshotError = cli(["changes", missing, missing]);
  rejected(snapshotError, /ENOENT/);
  assert(!snapshotError.stderr.includes(f.directory));
});

test("root and API directory symlinks or Windows junctions are rejected", context => {
  const f = fixture(context), alias = path.join(f.directory, "alias");
  fs.symlinkSync(f.root, alias, process.platform === "win32" ? "junction" : "dir");
  rejected(cli(["overview", "--root", alias]), /Symlinks|junctions/);
  rejected(cli(["changes", path.join(alias, "api", "space.json"), path.join(f.root, "api", "space.json")]), /Symlinks|junctions/);
  const api = path.join(f.root, "api"), stored = path.join(f.root, "stored-api");
  fs.renameSync(api, stored);
  fs.symlinkSync(stored, api, process.platform === "win32" ? "junction" : "dir");
  rejected(cli(["overview", "--root", f.root]), /Symlinks|junctions/);
});

test("context-directory links and curriculum/file symlinks are rejected", context => {
  const f = fixture(context), directory = path.join(f.root, "api", "contexts"), stored = path.join(f.root, "saved-contexts");
  fs.renameSync(directory, stored);
  fs.symlinkSync(stored, directory, process.platform === "win32" ? "junction" : "dir");
  rejected(cli(["context", "math-2", "--root", f.root]), /Symlinks|junctions/);
  const second = fixture(context), source = path.join(second.root, "curriculum.js"), saved = path.join(second.root, "saved-source.txt");
  fs.renameSync(source, saved);
  try { fs.symlinkSync(saved, source, "file"); }
  catch (error) {
    if (error.code === "EPERM" || error.code === "EACCES") { context.diagnostic("File-symlink creation unavailable; directory junction coverage passed."); return; }
    throw error;
  }
  rejected(cli(["verify", "--root", second.root]), /Symlinks|junctions/);
  const file = path.join(second.root, "api", "space.json"), other = path.join(second.root, "space-copy.json");
  fs.renameSync(file, other);
  fs.symlinkSync(other, file, "file");
  rejected(cli(["overview", "--root", second.root]), /Symlinks|junctions/);
});

test("changes reports declared additions/removals/hashes/ports without reading any referenced resources", context => {
  const f = fixture(context), before = snapshotFile(f, "before.json", f.space), after = clone(f.space);
  after.tracks[0].resource.sha256 = "a".repeat(64);
  after.tracks[0].title = "New title";
  after.tracks[1].id = "language";
  after.tracks[1].url = BASE + "#roadmap/language";
  after.tracks[1].resource.path = "api/contexts/language.json";
  after.ports[0].output = "NEW_DECLARATION";
  after.ports[1].id = "context-new";
  const afterFile = snapshotFile(f, "after.json", after);
  fs.unlinkSync(path.join(f.root, "api", "lessons.json"));
  fs.unlinkSync(path.join(f.root, "api", "contexts", "math.json"));
  const original = snapshot(f.directory), data = passed(cli(["changes", before, afterFile]));
  assert.equal(data.comparisonKind, "DECLARED_SNAPSHOT_METADATA_NOT_SEMANTIC_DIFF");
  assert.equal(data.revisionChanged, true);
  assert.equal(data.referencedResourcesVerified, false);
  assert.deepEqual(data.tracks.added, ["language"]);
  assert.deepEqual(data.tracks.removed, ["words"]);
  assert.deepEqual(data.tracks.changed, ["math"]);
  assert.deepEqual(data.tracks.metadataChanged, ["math"]);
  assert.deepEqual(data.ports.added, ["context-new"]);
  assert.deepEqual(data.ports.removed, ["track-context"]);
  assert.deepEqual(data.ports.changed, ["overview"]);
  assert.deepEqual(snapshot(f.directory), original);
});

test("changes distinguishes unchanged track projections from global source or root metadata changes", context => {
  const f = fixture(context), before = snapshotFile(f, "before.json", f.space), after = clone(f.space);
  after.curriculumSha256 = "b".repeat(64);
  after.catalogue.sha256 = "c".repeat(64);
  after.usage.claim = "METADATA_UPDATED";
  const afterFile = snapshotFile(f, "after.json", after);
  const data = passed(cli(["changes", before, afterFile]));
  assert.equal(data.revisionChanged, true);
  assert.equal(data.curriculumChanged, true);
  assert.equal(data.catalogueChanged, true);
  assert.deepEqual(data.tracks.changed, []);
  assert.deepEqual(data.tracks.metadataChanged, []);
  assert.deepEqual(data.rootMetadataChanged, ["curriculumSha256", "usage"]);
  const same = passed(cli(["changes", before, before]));
  assert.equal(same.revisionChanged, false);
  assert.equal(same.ports.orderChanged, false);
  assert.deepEqual(same.tracks.changed, []);
  after.ports.reverse();
  const reordered = passed(cli(["changes", afterFile, snapshotFile(f, "reordered.json", after)]));
  assert.equal(reordered.ports.orderChanged, true);
  assert.deepEqual(reordered.ports.changed, []);
});

test("every successful command preserves fixture contents and treats text/URLs as inert data", async context => {
  const f = fixture(context), before = snapshot(f.directory);
  const { run } = await import(pathToFileURL(CLI).href);
  const denied = ["fetch", "WebSocket", "eval", "Function"];
  const saved = denied.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  for (const key of denied) Object.defineProperty(globalThis, key, { configurable: true, value: () => { throw new Error("Unexpected active capability: " + key); } });
  try {
    for (const args of [["overview"], ["context", "math-realit\u00e4t-1"], ["search", f.catalogue.lessons[0].title], ["verify"]]) assert(run([...args, "--root", f.root]));
    const file = path.join(f.root, "api", "space.json");
    assert.equal(run(["changes", file, file]).revisionChanged, false);
  } finally {
    for (const [key, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
  assert.deepEqual(snapshot(f.directory), before);
});

test("CLI and wrapper have a fixed local read-only import and argument surface", () => {
  const source = fs.readFileSync(CLI, "utf8");
  const imports = [...source.matchAll(/^import .+ from "([^"]+)";/gm)].map(match => match[1]);
  assert.deepEqual(imports, ["node:fs", "node:path", "node:crypto", "node:url"]);
  assert.doesNotMatch(source, /process\.(?:env|binding)|\b(?:fetch|eval|exec|execSync|spawn|spawnSync|listen|writeFile|writeFileSync|appendFile|mkdir|mkdirSync|rename|unlink|rm|createWriteStream)\s*\(/);
  assert.doesNotMatch(source, /build-learning-api|node:vm|child_process|\bimport\s*\(/);
  const wrapper = fs.readFileSync(WRAPPER, "utf8");
  assert.match(wrapper, /#requires -Version 7\.3/);
  assert.match(wrapper, /\$PSNativeCommandArgumentPassing = 'Standard'/);
  assert.match(wrapper, /& \$nodeCommand\.Source @nodeArguments/);
  assert.doesNotMatch(wrapper, /Invoke-Expression|Start-Process|TcpListener|HttpListener|\$env:/i);
});

test("PowerShell 7.3+ wrapper preserves literal arguments, Unicode and failure exit codes", context => {
  const version = spawnSync("pwsh", ["--version"], { encoding: "utf8", timeout: 10000, shell: false });
  if (version.error?.code === "ENOENT") return context.skip("PowerShell 7.3+ is not installed.");
  assert.equal(version.status, 0, version.stderr);
  const match = /PowerShell (\d+)\.(\d+)/.exec(version.stdout);
  assert(match);
  if (+match[1] < 7 || (+match[1] === 7 && +match[2] < 3)) return context.skip("PowerShell 7.3+ is required.");
  const f = fixture(context);
  const run = args => spawnSync("pwsh", ["-NoProfile", "-NonInteractive", "-File", WRAPPER, ...args], { encoding: "utf8", timeout: 15000, shell: false });
  const query = f.catalogue.lessons[0].title;
  assert.equal(passed(run(["search", query, "--root", f.root, "--limit", "1"])).query, query);
  assert.equal(passed(run(["context", "math-realit\u00e4t-1", "--root", f.root])).selectedLesson.id, "math-realit\u00e4t-1");
  rejected(run(["search", "math", "--limit", "0"]), /--limit/);
  rejected(run(["overview", "--root", ""]), /value/);
});

test("actual generated API verifies every member; default root is independent of cwd", context => {
  const file = path.join(ROOT, "api", "space.json");
  if (!fs.existsSync(file)) return context.skip("Agent-space generator output is not present yet.");
  const space = JSON.parse(fs.readFileSync(file, "utf8"));
  const data = passed(cli(["verify"], { cwd: os.tmpdir() }));
  assert.deepEqual(data.counts, space.counts);
  assert.equal(data.sourceCheck, "MATCH");
  assert.equal(data.resources.length, space.tracks.length + 1);
  const catalogue = JSON.parse(fs.readFileSync(path.join(ROOT, "api", "lessons.json"), "utf8"));
  const ids = [...new Set([...space.tracks.map(track => track.entryLessonId).filter(Boolean), ...catalogue.lessons.filter(lesson => /[^\x00-\x7f]/.test(lesson.id)).map(lesson => lesson.id)])];
  for (const id of ids) {
    const result = passed(cli(["context", id], { cwd: os.tmpdir() }));
    assert.equal(result.selectedLesson.id, id);
    assert.equal(result.selectedLesson.url, space.baseURL + "#lesson/" + encodeURIComponent(id));
    assert(result.stagePeers.items.length <= 8);
  }
  const loops = passed(cli(["search", "Schleifen", "--limit", "20"]));
  const stageMembers = space.tracks.reduce((total, track) => {
    const shard = JSON.parse(fs.readFileSync(path.join(ROOT, track.resource.path), "utf8"));
    return total + shard.stages.filter(stage => typeof stage.title === "string" && stage.title.toLowerCase().includes("schleifen")).reduce((count, stage) => count + stage.lessonIds.length, 0);
  }, 0);
  assert(stageMembers > 0, "The actual curriculum must include Schleifen stages.");
  assert(loops.total >= stageMembers, "Literal search must cover every lesson in matching declared stages.");
  assert(loops.matches.find(lesson => lesson.id === "py-3-1")?.matchedFields.includes("stageTitle"));
  context.diagnostic("Schleifen search: " + loops.total + " matches covering " + stageMembers + " declared stage members, including py-3-1.");
  context.diagnostic("Verified " + data.counts.lessons + " actual lessons, " + data.counts.stages + " stages, " + data.counts.tracks + " shards; context checked for " + ids.length + " track-entry/Unicode IDs.");
});
