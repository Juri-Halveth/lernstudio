"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");
const Packets = require("../learning-packets.js");

const root = path.resolve(__dirname, "..");
const exampleFile = path.join(root, "api", "example-learning-packet.json");
const exampleText = fs.readFileSync(exampleFile, "utf8");
const example = JSON.parse(exampleText);
const schema = JSON.parse(fs.readFileSync(path.join(root, "api", "learning-contract.v1.json"), "utf8"));
const moduleText = fs.readFileSync(path.join(root, "learning-packets.js"), "utf8");
const cliFile = path.join(__dirname, "learning-packet.mjs");
const ids = ["einstieg-0-1"];
const packet = changes => ({ ...example, source: { ...example.source }, ...changes });
const parse = value => Packets.parse(JSON.stringify(value));
const cli = args => spawnSync(process.execPath, [cliFile, ...args], { encoding: "utf8", timeout: 10000, shell: false });
const createArgs = (observation = "Ein Viertel ist die Haelfte von einem Halben.") => [
  "create", "--id", "note-fractions-01", "--title", "Brueche verstehen", "--lesson-id", "null",
  "--observation", observation, "--question", "Wie viele Viertel ergeben ein Ganzes?",
  "--source-kind", "USER_NOTE", "--source-ref", "null", "--recorded-at", "2026-10-02T10:00:00Z"
];

test("example and null lesson packets roundtrip as one closed plain JSON note", () => {
  assert.deepEqual(Packets.parse(exampleText, ids), example);
  assert.deepEqual(Packets.parse(Packets.stringify(example, ids), ids), example);
  assert.equal(Packets.stringify(example).endsWith("\n"), true);
  assert.deepEqual(parse(packet({ lessonId: null, source: { kind: "USER_NOTE", ref: null } })).lessonId, null);
  assert.equal(Object.isFrozen(Packets), true);
  assert.equal(Object.isFrozen(Packets.LIMITS), true);
});

test("unknown and missing keys are rejected at both object levels", () => {
  for (const key of ["commands", "files", "rawLogs", "secrets", "unexpected"]) {
    assert.throws(() => parse(packet({ [key]: "unused" })), /unknown field/);
    assert.throws(() => parse(packet({ source: { ...example.source, [key]: "unused" } })), /unknown field/);
  }
  for (const key of Object.keys(example)) {
    const value = packet();
    delete value[key];
    assert.throws(() => parse(value), /exactly/);
  }
  for (const key of ["kind", "ref"]) {
    const value = packet();
    delete value.source[key];
    assert.throws(() => parse(value), /exactly/);
  }
  assert.throws(() => Packets.parse(exampleText.replace('"id":', '"__proto__": {}, "id":')), /unknown field/);
  assert.equal({}.polluted, undefined);
});

test("version, publication, source kind and scalar types are enforced", () => {
  assert.throws(() => parse(packet({ schema: "lernstudio.learning-packet.v2" })), /schema/);
  assert.throws(() => parse(packet({ publication: "PUBLIC" })), /publication/);
  assert.throws(() => parse(packet({ source: { kind: "AGENT_COMMAND", ref: null } })), /source.kind/);
  for (const value of [null, [], true, 12, "note"]) assert.throws(() => parse(value), /plain JSON/);
  for (const field of ["id", "title", "observation", "question", "recordedAt"]) {
    for (const value of [null, 1, true, [], {}]) assert.throws(() => parse(packet({ [field]: value })), /Learning packet/);
  }
  assert.throws(() => parse(packet({ source: [] })), /plain JSON/);
  assert.throws(() => parse(packet({ source: { kind: "USER_NOTE", ref: 3 } })), /source.ref/);
});

test("packet.id keeps exact ASCII syntax and bounds", () => {
  assert.equal(parse(packet({ id: "a".repeat(96) })).id.length, 96);
  for (const id of ["", "a".repeat(97), "a b", "a/b", "../a", "a#home", "_note", "\u00e4", "a\n"]) {
    assert.throws(() => parse(packet({ id })), /ASCII/);
  }
});

test("lesson IDs preserve bounded Unicode letters/numbers/marks without normalization", () => {
  const composed = "math-realit\u00e4t-1";
  const decomposed = "math-realita\u0308t-1";
  for (const lessonId of [composed, decomposed, "\u6570\u5b66-\u0661", "\u{10400}".repeat(96), "a".repeat(96)]) {
    const value = packet({ lessonId });
    assert.equal(Packets.parse(JSON.stringify(value), [lessonId]).lessonId, lessonId);
    assert.deepEqual(Packets.parse(Packets.stringify(value, [lessonId]), [lessonId]), value);
    assert.equal(Packets.link(value, undefined, [lessonId]), Packets.BASE_URL + "#lesson/" + encodeURIComponent(lessonId));
  }
  assert.throws(() => Packets.parse(JSON.stringify(packet({ lessonId: decomposed })), [composed]), /not present in knownIds/);
  for (const lessonId of ["", "\u00e4".repeat(97), "\u{10400}".repeat(97), "math 1", "math/1", "../math", "math#1", "_math", "\u0308math", "math\u20131", "math\u{1f600}", "math\n", "\ud800"]) {
    assert.throws(() => parse(packet({ lessonId })), /lessonId/);
  }
  assert.equal(Packets.link(packet({ lessonId: composed })), "https://juri-halveth.github.io/lernstudio/#lesson/math-realit%C3%A4t-1");
});

test("every actual curriculum ID passes runtime, schema, knownIds and encoded links", context => {
  const sandbox = vm.createContext({ window: {} }, { codeGeneration: { strings: false, wasm: false } });
  vm.runInContext(fs.readFileSync(path.join(root, "curriculum.js"), "utf8"), sandbox, { timeout: 2000 });
  const catalogueIds = Array.from(sandbox.window.CURRICULUM.tracks.flatMap(track => track.stages.flatMap(stage => stage.lessons.map(lesson => lesson.id))));
  assert(catalogueIds.length > 0, "The current curriculum must supply lesson IDs.");
  assert(catalogueIds.includes("math-realit\u00e4t-1"), "The actual Unicode lesson must be covered.");
  const pattern = new RegExp(schema.$defs.lessonId.pattern, "u");
  for (const lessonId of catalogueIds) {
    const value = packet({ lessonId });
    assert.equal(pattern.test(lessonId), true, "Schema must accept " + lessonId);
    assert.deepEqual(Packets.parse(Packets.stringify(value, catalogueIds), catalogueIds), value);
    assert.equal(Packets.link(value, undefined, catalogueIds), Packets.BASE_URL + "#lesson/" + encodeURIComponent(lessonId));
  }
  context.diagnostic("Validated all " + catalogueIds.length + " actual lesson IDs, including " + catalogueIds.filter(id => /[^\x00-\x7f]/.test(id)).length + " Unicode IDs.");
});

test("text uses code point limits, retains whitespace and rejects empty/control data", () => {
  for (const field of ["title", "observation", "question"]) {
    const maximum = Packets.LIMITS[field];
    assert.equal(parse(packet({ [field]: "x".repeat(maximum) }))[field].length, maximum);
    assert.equal(Array.from(parse(packet({ [field]: "\u{1d7d9}".repeat(maximum) }))[field]).length, maximum);
    assert.throws(() => parse(packet({ [field]: "x".repeat(maximum + 1) })), /exceeds/);
    assert.throws(() => parse(packet({ [field]: "\u{1d7d9}".repeat(maximum + 1) })), /exceeds/);
    for (const value of ["", " \t\n", "a\u0000", "a\u001b", "a\u007f", "a\u0085", "\ud800", "\udc00"]) {
      assert.throws(() => parse(packet({ [field]: value })), /empty|control|surrogate/);
    }
  }
  const text = "  Schritt 1\r\n\tSchritt 2  ";
  assert.equal(parse(packet({ observation: text })).observation, text);
});

test("UTF-8 transport bounds apply before parsing, including multibyte input", () => {
  const compact = JSON.stringify(example);
  const exact = compact + " ".repeat(Packets.MAX_BYTES - Buffer.byteLength(compact));
  assert.equal(Buffer.byteLength(exact), Packets.MAX_BYTES);
  assert.deepEqual(Packets.parse(exact), example);
  assert.throws(() => Packets.parse(exact + " "), /128 KiB/);
  const oversized = JSON.stringify(packet({ observation: "\u00e9".repeat(66000) }));
  assert(oversized.length < Packets.MAX_BYTES);
  assert.throws(() => Packets.parse(oversized), /128 KiB/);
  assert.throws(() => Packets.parse("\ud800"), /surrogate/);
  assert.throws(() => Packets.parse(Buffer.from(exampleText)), /JSON string/);
  for (const text of ["", "{broken", exampleText + exampleText, "\ufeff" + exampleText]) {
    assert.throws(() => Packets.parse(text), /valid JSON/);
  }
});

test("timestamp validation rejects rollover, implicit timezones and invalid offsets", () => {
  for (const value of ["2024-02-29T23:59:59.123Z", "2026-10-02T10:00:00+02:00", "2000-02-29T00:00:00.1-05:30"]) {
    assert.equal(parse(packet({ recordedAt: value })).recordedAt, value);
  }
  for (const value of ["2026-02-29T00:00:00Z", "1900-02-29T00:00:00Z", "2026-04-31T00:00:00Z", "2026-13-01T00:00:00Z", "2026-00-01T00:00:00Z", "2026-01-00T00:00:00Z", "2026-10-02", "2026-10-02T10:00:00", "2026-10-02T24:00:00Z", "2026-10-02T10:60:00Z", "2026-10-02T10:00:60Z", "2026-10-02T10:00:00+24:00", "2026-10-02T10:00:00+02:60", "0000-01-01T00:00:00Z", "2026-10-02T10:00:00.1234Z", "2026-10-02T10:00:00Z\n"]) {
    assert.throws(() => parse(packet({ recordedAt: value })), /recordedAt/);
  }
});

test("sources accept nullable HTTPS/URN references and preserve their original text", () => {
  for (const kind of ["USER_NOTE", "LOCAL_EXERCISE", "PUBLIC_SOURCE"]) {
    for (const ref of [null, "https://example.org/learn?chapter=2#fractions", "HTTPS://EXAMPLE.ORG/learn", "urn:lernstudio:note:fractions-01", "urn:example:note%20one"]) {
      assert.deepEqual(parse(packet({ source: { kind, ref } })).source, { kind, ref });
    }
  }
  const ref = "https://example.org/" + "a".repeat(2048 - "https://example.org/".length);
  assert.equal(parse(packet({ source: { kind: "PUBLIC_SOURCE", ref } })).source.ref, ref);
  assert.throws(() => parse(packet({ source: { kind: "PUBLIC_SOURCE", ref: ref + "a" } })), /2048/);
});

test("unsafe and malformed reference URLs are rejected", () => {
  for (const ref of ["http://example.org/", "ftp://example.org/", "file:///lesson.txt", "data:text/plain,lesson", "//example.org/", "https://person:password@example.org/", "https://person@example.org/", "https://@example.org/", "https://example.org\\learn", " https://example.org/", "https://example.org/\n", "https:///learn", "https://", "https://example.org/%oops", "urn:x:lesson", "urn:example:", "urn:example:bad%escape"]) {
    assert.throws(() => parse(packet({ source: { kind: "PUBLIC_SOURCE", ref } })), /source.ref/);
  }
});

test("lesson membership is optional and never inferred or fetched", () => {
  assert.deepEqual(Packets.parse(exampleText, ids), example);
  assert.deepEqual(Packets.parse(exampleText), example);
  assert.throws(() => Packets.parse(exampleText, []), /not present in knownIds/);
  assert.throws(() => Packets.stringify(example, ["other"]), /knownIds/);
  assert.throws(() => Packets.link(example, undefined, []), /knownIds/);
  assert.equal(Packets.parse(JSON.stringify(packet({ lessonId: null })), []).lessonId, null);
  for (const value of [null, {}, "einstieg-0-1", [1], ["bad id"], new Array(1)]) {
    assert.throws(() => Packets.parse(exampleText, value), /knownIds/);
  }
});

test("packet objects are copied, not mutated, and getters/toJSON are never invoked", () => {
  const value = packet();
  const before = JSON.stringify(value);
  Object.freeze(value.source);
  Object.freeze(value);
  Packets.stringify(value, ids);
  Packets.link(value, undefined, ids);
  assert.equal(JSON.stringify(value), before);
  const result = Packets.parse(before);
  result.source.ref = null;
  assert.equal(JSON.stringify(value), before);
  let calls = 0;
  const getter = packet();
  Object.defineProperty(getter, "title", { get() { calls++; return "getter"; }, enumerable: true });
  assert.throws(() => Packets.stringify(getter), /data property/);
  const withMethod = packet({ toJSON() { calls++; return example; } });
  assert.throws(() => Packets.stringify(withMethod), /unknown field/);
  const nested = packet();
  Object.defineProperty(nested.source, "ref", { get() { calls++; return null; }, enumerable: true });
  assert.throws(() => Packets.stringify(nested), /data property/);
  assert.equal(calls, 0);
  assert.throws(() => Packets.stringify(Object.assign(Object.create({ inherited: true }), example)), /plain JSON/);
  assert.throws(() => Packets.stringify({ ...example, [Symbol("extra")]: true }), /unknown field/);
  const hidden = packet();
  Object.defineProperty(hidden, "title", { value: "hidden", enumerable: false });
  assert.throws(() => Packets.stringify(hidden), /data property/);
});

test("links use only a validated lesson ID or home, with canonical Pages by default", () => {
  assert.equal(Packets.link(example), "https://juri-halveth.github.io/lernstudio/#lesson/einstieg-0-1");
  assert.equal(Packets.link(packet({ lessonId: null })), "https://juri-halveth.github.io/lernstudio/#home");
  assert.equal(Packets.link(example, "https://example.org/learning/", ids), "https://example.org/learning/#lesson/einstieg-0-1");
  const withNote = packet({ observation: "Keep this local", source: { kind: "PUBLIC_SOURCE", ref: "https://example.org/private-note" } });
  assert.equal(Packets.link(withNote), Packets.link(example));
  for (const base of [null, "http://example.org/", "https://person@example.org/", "https://example.org/index.html", "https://example.org/?query=1", "https://example.org/#bridge", "https://example.org/?", "https://example.org/#"]) {
    assert.throws(() => Packets.link(example, base), /baseURL/);
  }
});

test("browser UMD keeps markup/source data inert with process, network, DOM and storage denied", () => {
  const attempts = [];
  const sandbox = { URL };
  for (const name of ["process", "require", "fetch", "XMLHttpRequest", "WebSocket", "Worker", "SharedWorker", "navigator", "document", "location", "history", "localStorage", "sessionStorage", "setTimeout", "setInterval"]) {
    Object.defineProperty(sandbox, name, { get() { attempts.push(name); throw new Error("Forbidden effect: " + name); } });
  }
  vm.createContext(sandbox, { codeGeneration: { strings: false, wasm: false } });
  vm.runInContext(moduleText, sandbox, { timeout: 1000 });
  const text = "A <strong>half</strong> and a <em>quarter</em>. Literal a & b; 2 > 1.";
  const input = JSON.stringify(packet({ observation: text, source: { kind: "PUBLIC_SOURCE", ref: "https://example.org/fractions" } }));
  const result = sandbox.LernPackets.parse(input);
  assert.equal(result.observation, text);
  assert.deepEqual(JSON.parse(sandbox.LernPackets.stringify(result)), JSON.parse(input));
  assert.equal(sandbox.LernPackets.link(result), Packets.link(example));
  assert.deepEqual(attempts, []);
  assert.deepEqual(Object.keys(sandbox), ["URL", "LernPackets"]);
});

test("AMD registration exposes the same data-only API", () => {
  let api;
  const define = (dependencies, factory) => { assert.equal(dependencies.length, 0); api = factory(); };
  define.amd = {};
  vm.runInNewContext(moduleText, { define, URL }, { timeout: 1000 });
  assert.equal(api.link(api.parse(exampleText)), Packets.link(example));
});

test("published schema is closed, has the same limits, and its patterns accept the example", () => {
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.source.additionalProperties, false);
  assert.deepEqual(new Set(schema.required), new Set(Object.keys(example)));
  assert.equal(schema.properties.schema.const, Packets.SCHEMA);
  assert.equal(schema.properties.publication.const, "LOCAL_DRAFT_ONLY");
  assert.equal(schema.$defs.id.maxLength, Packets.LIMITS.id);
  assert.equal(new RegExp(schema.$defs.id.pattern, "u").test(example.id), true);
  assert.equal(new RegExp(schema.$defs.id.pattern, "u").test("note-\u00e4"), false);
  assert.equal(schema.$defs.lessonId.maxLength, Packets.LIMITS.lessonId);
  assert.equal(schema.properties.lessonId.anyOf[0].$ref, "#/$defs/lessonId");
  assert.equal(new RegExp(schema.$defs.lessonId.pattern, "u").test("math-realit\u00e4t-1"), true);
  assert.equal(new RegExp(schema.$defs.lessonId.pattern, "u").test("math-realita\u0308t-1"), true);
  assert.equal(new RegExp(schema.$defs.lessonId.pattern, "u").test("math/1"), false);
  for (const field of ["title", "observation", "question"]) {
    assert.equal(schema.properties[field].maxLength, Packets.LIMITS[field]);
    const pattern = new RegExp(schema.$defs.text.pattern, "u");
    assert.equal(pattern.test(example[field]), true);
    assert.equal(pattern.test(" \n"), false);
    assert.equal(pattern.test("text\u0000"), false);
  }
  assert.equal(new RegExp(schema.properties.recordedAt.pattern, "u").test(example.recordedAt), true);
  const alternatives = schema.properties.source.properties.ref.anyOf;
  for (const [index, ref] of [[1, "https://example.org/learn"], [2, example.source.ref]]) {
    assert.equal(new RegExp(alternatives[index].pattern, "u").test(ref), true);
    assert.equal(alternatives[index].maxLength, Packets.LIMITS.ref);
  }
  for (const ref of ["https://person@example.org/", "http://example.org/", "https://example.org/\n", "https://example.org\\path"]) {
    assert.equal(new RegExp(alternatives[1].pattern, "u").test(ref), false);
  }
});

test("CLI validate/link/create print bounded data and require explicit fields", () => {
  const validated = cli(["validate", exampleFile]);
  assert.equal(validated.status, 0, validated.stderr);
  assert.deepEqual(JSON.parse(validated.stdout), example);
  const linked = cli(["link", exampleFile]);
  assert.equal(linked.status, 0, linked.stderr);
  assert.equal(linked.stdout, Packets.link(example) + "\n");
  const text = 'Literal "half" <em>quarter</em> & sum | part; $value (2 > 1)';
  const created = cli(createArgs(text));
  assert.equal(created.status, 0, created.stderr);
  assert.equal(Packets.parse(created.stdout).observation, text);
  assert.equal(Packets.parse(created.stdout).lessonId, null);
  assert.equal(Packets.parse(created.stdout).source.ref, null);
  const unicodeArgs = createArgs();
  unicodeArgs[unicodeArgs.indexOf("--lesson-id") + 1] = "math-realit\u00e4t-1";
  const unicode = cli(unicodeArgs);
  assert.equal(unicode.status, 0, unicode.stderr);
  assert.equal(Packets.parse(unicode.stdout).lessonId, "math-realit\u00e4t-1");
  const help = cli(["--help"]);
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /LOCAL_DRAFT_ONLY/);
});

test("CLI rejects unknown, duplicate, missing and oversized flags without packet output", () => {
  for (const args of [[], ["upload"], ["create"], ["validate"], ["validate", exampleFile, "--unknown", "x"], [...createArgs(), "--title", "duplicate"], [...createArgs(), "--upload", "yes"], createArgs().slice(0, -1), createArgs("x".repeat(2001)), ["link", exampleFile, "--base-url", "http://example.org/"], ["validate", "https://example.org/packet.json"], ["validate", "\\\\example.invalid\\share\\packet.json"]]) {
    const result = cli(args);
    assert.equal(result.status, 1, JSON.stringify(args) + result.stderr);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /^learning-packet:/);
  }
});

test("CLI reads only bounded regular UTF-8 files and honors explicit known IDs", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "lernstudio-packet-test-"));
  try {
    const idsFile = path.join(directory, "ids.json");
    fs.writeFileSync(idsFile, JSON.stringify(ids));
    const accepted = cli(["validate", exampleFile, "--known-ids", idsFile]);
    assert.equal(accepted.status, 0, accepted.stderr);
    fs.writeFileSync(idsFile, "[]");
    assert.equal(cli(["validate", exampleFile, "--known-ids", idsFile]).status, 1);
    fs.writeFileSync(idsFile, "{}");
    assert.equal(cli(["create", ...createArgs().slice(1), "--known-ids", idsFile]).status, 1);
    const large = path.join(directory, "large.json");
    fs.writeFileSync(large, " ".repeat(Packets.MAX_BYTES + 1));
    assert.match(cli(["validate", large]).stderr, /128 KiB/);
    const invalid = path.join(directory, "invalid.json");
    fs.writeFileSync(invalid, Buffer.from([0xff, 0xfe, 0xfd]));
    assert.match(cli(["validate", invalid]).stderr, /UTF-8/);
    assert.match(cli(["validate", directory]).stderr, /regular local file/);
    const absent = cli(["validate", path.join(directory, "absent.json")]);
    assert.equal(absent.status, 1);
    assert.match(absent.stderr, /ENOENT/);
    assert.equal(absent.stderr.includes(directory), false);
    assert.deepEqual(fs.readdirSync(directory).sort(), ["ids.json", "invalid.json", "large.json"]);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("CLI has a fixed standard-library import surface and no process/network/storage writer", () => {
  const source = fs.readFileSync(cliFile, "utf8");
  const imports = [...source.matchAll(/^import .+ from "([^"]+)";/gm)].map(match => match[1]);
  assert.deepEqual(imports, ["node:fs", "node:path", "../learning-packets.js"]);
  assert.doesNotMatch(source, /process\.(?:env|binding)|\b(?:fetch|eval|exec|spawn|listen|writeFile|appendFile|createWriteStream)\s*\(/);
  const wrapper = fs.readFileSync(path.join(__dirname, "learning-packet.ps1"), "utf8");
  assert.match(wrapper, /& \$nodeCommand\.Source @nodeArguments/);
  assert.doesNotMatch(wrapper, /Invoke-Expression|Start-Process|TcpListener|HttpListener/i);
});

test("PowerShell wrapper preserves argument data and the CLI exit code", context => {
  const version = spawnSync("pwsh", ["--version"], { encoding: "utf8", timeout: 10000, shell: false });
  if (version.error && version.error.code === "ENOENT") return context.skip("PowerShell 7.3+ is not installed.");
  assert.equal(version.status, 0, version.stderr);
  const match = /PowerShell (\d+)\.(\d+)/.exec(version.stdout);
  assert(match, "Expected a PowerShell version.");
  if (Number(match[1]) < 7 || (Number(match[1]) === 7 && Number(match[2]) < 3)) return context.skip("PowerShell 7.3+ is required.");
  const wrapper = path.join(__dirname, "learning-packet.ps1");
  const run = args => spawnSync("pwsh", ["-NoProfile", "-NonInteractive", "-File", wrapper, ...args], { encoding: "utf8", timeout: 10000, shell: false });
  const text = 'Literal "half" and \'quarter\' <em>text</em> & sum | part; $value (2 > 1) \\ \u00e4 \u{1d7d9}';
  const created = run(createArgs(text));
  assert.equal(created.status, 0, created.stderr);
  assert.equal(Packets.parse(created.stdout).observation, text);
  const linked = run(["link", exampleFile]);
  assert.equal(linked.status, 0, linked.stderr);
  assert.equal(linked.stdout.trim(), Packets.link(example));
  const rejected = run(["create"]);
  assert.equal(rejected.status, 1, rejected.stderr);
  assert.equal(rejected.stdout, "");
  assert.match(rejected.stderr, /Missing required flag/);
});
