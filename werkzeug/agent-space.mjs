#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(import.meta.url);
const DEFAULT_ROOT = path.resolve(path.dirname(SCRIPT), "..");
const REVISION_MODE = "SHA256_SORTED_KEYS_COMPACT_JSON_UTF8_EXCLUDING_REVISION_NO_NEWLINE";
const LIMITS = Object.freeze({ space: 256 * 1024, catalogue: 4 * 1024 * 1024, shard: 1024 * 1024, source: 8 * 1024 * 1024, total: 64 * 1024 * 1024, tracks: 128, stages: 2048, lessons: 10000, peers: 8 });
const SEMANTICS = Object.freeze({
  membership: "EXPLICIT_CURRICULUM_CONTAINMENT",
  previousId: "PREVIOUS_IN_EDITORIAL_TRACK_ORDER_NOT_PREREQUISITE",
  nextId: "NEXT_IN_EDITORIAL_TRACK_ORDER_NOT_PREREQUISITE",
  crossTrack: "NOT_ASSERTED"
});
const HELP = `Lernstudio agent space (Node.js 18+, local JSON data only)

  node werkzeug/agent-space.mjs overview [--root DIR]
  node werkzeug/agent-space.mjs context LESSON_ID [--root DIR]
  node werkzeug/agent-space.mjs search TEXT [--root DIR] [--limit 1..20]
  node werkzeug/agent-space.mjs verify [--root DIR]
  node werkzeug/agent-space.mjs changes BEFORE_SPACE_JSON AFTER_SPACE_JSON
  node werkzeug/agent-space.mjs --help

The default root is the repository containing this script, not the current
directory. overview reads api/space.json only. search also reads the catalogue;
context reads the catalogue and exactly one track shard. verify checks every
referenced JSON resource, its exact bytes/SHA-256, and catalogue membership.
If root/curriculum.js is present, verify also hashes its strict UTF-8 text with
CRLF converted to LF (at most 8 MiB); it never executes that source. Metadata-only
exports report sourceCheck: NOT_PRESENT. A present source mismatch is an error.
Revisions use recursively sorted object keys, preserved array order, compact
UTF-8 JSON excluding revision, and no trailing newline (revisionMode in space).

context reports editorial previous/next lessons, not inferred prerequisites;
stagePeers excludes the selected lesson and returns at most 8, with total/omitted.
search uses Unicode lowercase literal substring matching on title, ID, track
and stage title, with matchedFields naming the matching metadata. No regex or
normalization (default limit 10, query at most 256 code points).
changes compares two validated snapshot declarations, not referenced files or
semantic lesson changes. It reports port IDs, track resource hashes, metadata
and ordering separately. A changed curriculum digest need not change all shards.

File limits: space 256 KiB, catalogue 4 MiB, shard 1 MiB, referenced total 64 MiB.
Strict UTF-8 JSON, local regular files, no symlinks in path components. Resources
must be api/lessons.json or api/contexts/<safe-ASCII-track-id>.json.
Ports and HTTPS links remain text data; none are contacted or activated.
No network, subprocesses, eval, listeners, file writes, cache, environment reads
or uploads. Local consistency does not establish web freshness or authorship.
Success writes one compact JSON value (help is text). Errors leave stdout empty,
write a path-redacted diagnostic to stderr, and exit 1.
`;

class InputError extends Error {}
function requireThat(condition, message) { if (!condition) throw new InputError(message); }
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object"
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const equal = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));

function object(value, label) {
  requireThat(value !== null && typeof value === "object" && !Array.isArray(value), label + " must be a JSON object.");
}
function keys(value, required, optional, label) {
  object(value, label);
  requireThat(required.every(key => Object.hasOwn(value, key)) && Object.keys(value).every(key => required.includes(key) || optional.includes(key)), label + " has missing or unknown fields.");
}
function text(value, maximum, label, nullable = false) {
  if (nullable && value === null) return;
  requireThat(typeof value === "string" && value.trim().length > 0 && Array.from(value).length <= maximum && !/[\u0000-\u001f\u007f-\u009f\ud800-\udfff]/u.test(value), label + " must be bounded, well-formed Unicode text without control characters.");
}
function identifier(value, label, track = false) {
  text(value, track ? 64 : 96, label);
  requireThat((track ? /^[a-z][a-z0-9-]{0,63}$/ : /^[\p{L}\p{N}][\p{L}\p{N}\p{M}_-]*$/u).test(value), label + " has invalid ID syntax.");
}
function integer(value, maximum, label, minimum = 0) {
  requireThat(Number.isSafeInteger(value) && value >= minimum && value <= maximum, label + " is outside its integer bounds.");
}
function array(value, maximum, label) {
  requireThat(Array.isArray(value) && value.length <= maximum, label + " must be a bounded JSON array.");
}
function sha(value, label) {
  requireThat(typeof value === "string" && /^[a-f0-9]{64}$/.test(value), label + " must be a lowercase SHA-256 digest.");
}
function https(value, label) {
  text(value, 2048, label);
  requireThat(/^https:\/\//i.test(value) && !/[\s\\]/u.test(value), label + " must be a credential-free HTTPS URL.");
  let url;
  try { url = new URL(value); } catch { throw new InputError(label + " must be a valid HTTPS URL."); }
  requireThat(url.protocol === "https:" && url.hostname && !url.username && !url.password && !value.split("/")[2].includes("@"), label + " must be a credential-free HTTPS URL.");
  return url;
}

function localPath(value, label) {
  text(value, 4096, label);
  requireThat(!/^[\\/]{2}/.test(value) && !/:/.test(value.replace(/^[A-Za-z]:[\\/]/, "")), label + " must be a local path, not a URL, network path or stream.");
  const absolute = path.resolve(value);
  requireThat(!/^[\\/]{2}/.test(absolute), label + " must resolve to a local path.");
  return absolute;
}

function inspectPath(absolute, file) {
  const anchor = path.parse(absolute).root;
  let location = anchor;
  const parts = absolute.slice(anchor.length).split(path.sep).filter(Boolean);
  let stat = fs.lstatSync(anchor);
  requireThat(stat.isDirectory() && !stat.isSymbolicLink(), "Local path root must be an ordinary directory.");
  for (let index = 0; index < parts.length; index++) {
    location = path.join(location, parts[index]);
    stat = fs.lstatSync(location);
    requireThat(!stat.isSymbolicLink(), "Symlinks and junctions are not allowed in local data paths.");
    requireThat(index === parts.length - 1 && file ? stat.isFile() : stat.isDirectory(), "Expected a regular local file or directory.");
  }
  requireThat(!file || stat.isFile(), "Expected a regular local file.");
  return stat;
}

function readUTF8(file, maximum, label, resource) {
  const absolute = localPath(file, label);
  const before = inspectPath(absolute, true);
  requireThat(before.size <= maximum, label + " exceeds its file size limit.");
  if (resource) requireThat(before.size === resource.bytes, label + " byte count does not match its resource declaration.");
  const descriptor = fs.openSync(absolute, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  let bytes;
  try {
    const opened = fs.fstatSync(descriptor);
    requireThat(opened.isFile() && opened.dev === before.dev && opened.ino === before.ino, "Local file changed while opening it.");
    inspectPath(absolute, true);
    // One extra byte detects growth without ever performing an unbounded read.
    const buffer = Buffer.alloc(maximum + 1);
    let length = 0;
    while (length < buffer.length) {
      const count = fs.readSync(descriptor, buffer, length, buffer.length - length, null);
      if (count === 0) break;
      length += count;
    }
    requireThat(length <= maximum, label + " exceeds its file size limit.");
    const after = fs.fstatSync(descriptor);
    const current = inspectPath(absolute, true);
    requireThat(current.dev === opened.dev && current.ino === opened.ino && after.size === length && after.size === opened.size && after.mtimeMs === opened.mtimeMs && after.ctimeMs === opened.ctimeMs, "Local file changed while reading it.");
    bytes = buffer.subarray(0, length);
  } finally { fs.closeSync(descriptor); }
  if (resource) {
    requireThat(bytes.length === resource.bytes, label + " byte count does not match its resource declaration.");
    requireThat(digest(bytes) === resource.sha256, label + " SHA-256 does not match its resource declaration.");
  }
  try { return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes); }
  catch { throw new InputError(label + " must contain valid UTF-8."); }
}

function readJSON(file, maximum, label, resource) {
  const decoded = readUTF8(file, maximum, label, resource);
  let value;
  try { value = JSON.parse(decoded); }
  catch { throw new InputError(label + " must contain one JSON value without a BOM."); }
  // Bound structural work before recursively canonicalizing a parsed document.
  const pending = [[value, 0]];
  let nodes = 0;
  while (pending.length) {
    const [item, depth] = pending.pop();
    requireThat(++nodes <= 150000 && depth <= 16, label + " exceeds JSON structural limits.");
    if (typeof item === "string") requireThat(item.length <= 8192 && !/[\ud800-\udfff]/u.test(item), label + " contains oversized or malformed Unicode text.");
    if (typeof item === "number") requireThat(Number.isFinite(item), label + " contains a non-finite number.");
    if (item && typeof item === "object") {
      requireThat(Object.keys(item).length <= LIMITS.lessons, label + " exceeds JSON collection limits.");
      for (const [key, child] of Object.entries(item)) {
        requireThat(key.length <= 128 && !/[\ud800-\udfff]/u.test(key), label + " has an invalid JSON key.");
        pending.push([child, depth + 1]);
      }
    }
  }
  return value;
}

function resource(value, expectedPath, maximum) {
  keys(value, ["path", "sha256", "bytes"], [], "resource");
  requireThat(value.path === expectedPath, "Resource path must be the declared api/lessons.json or api/contexts/<track-id>.json path.");
  sha(value.sha256, "resource.sha256");
  integer(value.bytes, maximum, "resource.bytes", 1);
}

function spaceFile(file) {
  const space = readJSON(file, LIMITS.space, "space");
  keys(space, ["schema", "baseURL", "curriculumSha256", "curriculumDigestMode", "revisionMode", "counts", "catalogue", "ports", "tracks", "revision"], ["usage"], "space");
  requireThat(space.schema === "lernstudio.agent-space.v1", "Unsupported agent space schema.");
  requireThat(space.revisionMode === REVISION_MODE, "Unsupported revisionMode.");
  requireThat(space.curriculumDigestMode === "UTF8_LF_NORMALIZED", "Unsupported curriculumDigestMode.");
  sha(space.curriculumSha256, "curriculumSha256");
  sha(space.revision, "revision");
  const base = https(space.baseURL, "baseURL");
  requireThat(space.baseURL.endsWith("/") && !base.search && !base.hash, "baseURL must be an HTTPS directory URL.");
  keys(space.counts, ["tracks", "stages", "lessons"], [], "counts");
  for (const key of ["tracks", "stages", "lessons"]) integer(space.counts[key], LIMITS[key], "counts." + key);
  resource(space.catalogue, "api/lessons.json", LIMITS.catalogue);
  array(space.tracks, LIMITS.tracks, "tracks");
  array(space.ports, 64, "ports");
  const trackIds = new Set(), portIds = new Set();
  let lessonCount = 0, totalBytes = space.catalogue.bytes;
  for (const track of space.tracks) {
    keys(track, ["id", "title", "lessonCount", "entryLessonId", "url", "resource"], [], "track");
    identifier(track.id, "track.id", true);
    requireThat(!trackIds.has(track.id), "Duplicate track ID.");
    trackIds.add(track.id);
    text(track.title, 1024, "track.title");
    integer(track.lessonCount, LIMITS.lessons, "track.lessonCount");
    if (track.entryLessonId !== null) identifier(track.entryLessonId, "entryLessonId");
    requireThat((track.lessonCount === 0) === (track.entryLessonId === null), "Track entry lesson and count disagree.");
    requireThat(track.url === space.baseURL + "#roadmap/" + track.id, "Track URL does not match its root and ID.");
    resource(track.resource, "api/contexts/" + track.id + ".json", LIMITS.shard);
    totalBytes += track.resource.bytes;
    lessonCount += track.lessonCount;
  }
  requireThat(space.counts.tracks === trackIds.size && space.counts.lessons === lessonCount, "Space counts do not match track declarations.");
  requireThat(totalBytes <= LIMITS.total, "Referenced resources exceed the total byte limit.");
  for (const port of space.ports) {
    keys(port, ["id", "operation", "transport", "output"], ["input", "url", "urlTemplate"], "port");
    identifier(port.id, "port.id", true);
    requireThat(!portIds.has(port.id), "Duplicate port ID.");
    portIds.add(port.id);
    for (const key of ["operation", "transport", "output", ...(Object.hasOwn(port, "input") ? ["input"] : [])]) text(port[key], 128, "port field");
    requireThat(Object.hasOwn(port, "url") !== Object.hasOwn(port, "urlTemplate"), "Port needs exactly one URL or URL template.");
    if (Object.hasOwn(port, "url")) https(port.url, "port.url");
    else {
      text(port.urlTemplate, 2048, "port.urlTemplate");
      requireThat(port.urlTemplate === space.baseURL + "api/contexts/{trackId}.json", "Unsupported port URL template.");
    }
  }
  if (Object.hasOwn(space, "usage")) object(space.usage, "usage");
  const { revision, ...body } = space;
  requireThat(digest(JSON.stringify(canonical(body))) === revision, "Space revision does not match its sorted-key JSON body.");
  return space;
}

function catalogueAt(root, space) {
  const catalogue = readJSON(path.join(root, space.catalogue.path), LIMITS.catalogue, "catalogue", space.catalogue);
  keys(catalogue, ["schema", "curriculumSha256", "curriculumDigestMode", "lessons"], [], "catalogue");
  requireThat(catalogue.schema === "lernstudio.lesson-catalogue.v1", "Unsupported catalogue schema.");
  requireThat(catalogue.curriculumSha256 === space.curriculumSha256 && catalogue.curriculumDigestMode === space.curriculumDigestMode, "Catalogue and space curriculum bindings differ.");
  array(catalogue.lessons, LIMITS.lessons, "catalogue.lessons");
  requireThat(catalogue.lessons.length === space.counts.lessons, "Catalogue lesson total differs from space.");
  const lessons = new Map(), tracks = new Map(space.tracks.map(track => [track.id, track]));
  const members = new Map(space.tracks.map(track => [track.id, []]));
  for (const [index, lesson] of catalogue.lessons.entries()) {
    keys(lesson, ["id", "title", "trackId", "trackTitle", "stageTitle", "url", "order"], [], "catalogue lesson");
    identifier(lesson.id, "lesson.id");
    requireThat(!lessons.has(lesson.id), "Duplicate catalogue lesson ID.");
    text(lesson.title, 1024, "lesson.title");
    text(lesson.stageTitle, 1024, "lesson.stageTitle", true);
    const track = tracks.get(lesson.trackId);
    requireThat(track && lesson.trackTitle === track.title, "Catalogue lesson does not match a declared track.");
    requireThat(lesson.url === space.baseURL + "#lesson/" + encodeURIComponent(lesson.id), "Lesson URL does not match its exact ID.");
    requireThat(lesson.order === index + 1, "Catalogue order must be contiguous and explicit.");
    lessons.set(lesson.id, lesson);
    members.get(track.id).push(lesson);
  }
  for (const track of space.tracks) {
    const items = members.get(track.id);
    requireThat(items.length === track.lessonCount && (items[0]?.id ?? null) === track.entryLessonId, "Catalogue track count or entry lesson differs from space.");
  }
  return { lessons, tracks, members };
}

function contextAt(root, space, catalogue, track) {
  const shard = readJSON(path.join(root, track.resource.path), LIMITS.shard, "track context", track.resource);
  keys(shard, ["schema", "sourceBinding", "track", "stages", "lessons", "relationSemantics"], [], "track context");
  requireThat(shard.schema === "lernstudio.track-context.v1", "Unsupported track context schema.");
  requireThat(equal(shard.sourceBinding, { kind: "CURRICULUM_METADATA_PROJECTION", file: "curriculum.js", scope: "track:" + track.id }), "Track sourceBinding does not match its metadata projection scope.");
  requireThat(equal(shard.track, { id: track.id, title: track.title }), "Track context identity differs from space.");
  requireThat(equal(shard.relationSemantics, SEMANTICS), "Unsupported relationSemantics; editorial order must not assert prerequisites or cross-track neighbors.");
  array(shard.stages, LIMITS.stages, "stages");
  array(shard.lessons, LIMITS.lessons, "track lessons");
  requireThat(shard.lessons.length === track.lessonCount, "Track context lesson total differs from space.");
  const stages = new Map(), owners = new Map(), order = [];
  for (const stage of shard.stages) {
    keys(stage, ["id", "title", "lessonIds"], [], "stage");
    identifier(stage.id, "stage.id");
    text(stage.title, 1024, "stage.title", true);
    requireThat(!stages.has(stage.id), "Duplicate stage ID.");
    stages.set(stage.id, stage);
    array(stage.lessonIds, LIMITS.lessons, "stage.lessonIds");
    for (const id of stage.lessonIds) {
      identifier(id, "stage lesson ID");
      requireThat(!owners.has(id), "Duplicate lesson membership in stages.");
      requireThat(order.length < LIMITS.lessons, "Stage membership exceeds the lesson limit.");
      owners.set(id, stage);
      order.push(id);
    }
  }
  requireThat(order.length === shard.lessons.length, "Stage membership total differs from track lessons.");
  const lessons = new Map(), expected = catalogue.members.get(track.id);
  for (const [index, lesson] of shard.lessons.entries()) {
    keys(lesson, ["id", "title", "stageId", "url", "previousId", "nextId"], [], "track lesson");
    identifier(lesson.id, "lesson.id");
    const parent = owners.get(lesson.id), entry = expected[index];
    requireThat(!lessons.has(lesson.id), "Duplicate track lesson ID.");
    requireThat(parent && parent.id === lesson.stageId && order[index] === lesson.id, "Track lesson stage membership or order differs.");
    requireThat(entry && entry.id === lesson.id && entry.title === lesson.title && entry.url === lesson.url && entry.stageTitle === parent.title, "Track lesson metadata differs from its catalogue membership.");
    requireThat(lesson.previousId === (expected[index - 1]?.id ?? null) && lesson.nextId === (expected[index + 1]?.id ?? null), "Track previous/next relation differs from editorial order.");
    lessons.set(lesson.id, lesson);
  }
  return { shard, stages, lessons, owners };
}

function compareById(before, after, project) {
  const left = new Map(before.map(item => [item.id, project(item)]));
  const right = new Map(after.map(item => [item.id, project(item)]));
  return {
    added: [...right.keys()].filter(id => !left.has(id)).sort(),
    removed: [...left.keys()].filter(id => !right.has(id)).sort(),
    changed: [...right.keys()].filter(id => left.has(id) && !equal(left.get(id), right.get(id))).sort(),
    orderChanged: !equal(before.map(item => item.id), after.map(item => item.id))
  };
}
function changes(before, after) {
  const metadata = track => ({ title: track.title, lessonCount: track.lessonCount, entryLessonId: track.entryLessonId, url: track.url, path: track.resource.path, bytes: track.resource.bytes });
  return {
    schema: "lernstudio.agent-space-changes.v1",
    comparisonKind: "DECLARED_SNAPSHOT_METADATA_NOT_SEMANTIC_DIFF",
    beforeRevision: before.revision, afterRevision: after.revision, revisionChanged: before.revision !== after.revision,
    curriculumChanged: before.curriculumSha256 !== after.curriculumSha256,
    catalogueChanged: !equal(before.catalogue, after.catalogue),
    ports: { comparisonKind: "PORT_DECLARATIONS_BY_ID", ...compareById(before.ports, after.ports, port => port) },
    tracks: { comparisonKind: "TRACK_RESOURCE_SHA256_BY_ID", ...compareById(before.tracks, after.tracks, track => track.resource.sha256), metadataChanged: compareById(before.tracks, after.tracks, metadata).changed },
    rootMetadataChanged: ["baseURL", "curriculumSha256", "curriculumDigestMode", "revisionMode", "counts", "usage"].filter(key => !equal(before[key], after[key])),
    snapshotRevisionsVerified: true, referencedResourcesVerified: false
  };
}

function argumentsFor(args) {
  requireThat(Array.isArray(args) && args.length <= 8 && args.every(arg => typeof arg === "string" && Buffer.byteLength(arg, "utf8") <= 4096), "Arguments exceed the input limit.");
  if (args.length === 1 && ["help", "--help", "-h"].includes(args[0])) return { command: "help" };
  const [command, ...rest] = args;
  requireThat(["overview", "context", "search", "verify", "changes"].includes(command), "Expected overview, context, search, verify or changes. Use --help.");
  const count = command === "changes" ? 2 : ["context", "search"].includes(command) ? 1 : 0;
  const positional = rest.slice(0, count);
  requireThat(positional.length === count && positional.every(value => value && !value.startsWith("--")), "Missing required positional argument. Use --help.");
  const allowed = command === "changes" ? [] : command === "search" ? ["--root", "--limit"] : ["--root"];
  const options = new Map();
  const flags = rest.slice(count);
  requireThat(flags.length % 2 === 0, "Flags require one explicit value each. Use --help.");
  for (let index = 0; index < flags.length; index += 2) {
    const flag = flags[index], value = flags[index + 1];
    requireThat(allowed.includes(flag), "Unknown flag. Use --help.");
    requireThat(!options.has(flag), "Duplicate flag. Use --help.");
    requireThat(value.length > 0 && !value.startsWith("--"), "Missing flag value. Use --help.");
    options.set(flag, value);
  }
  if (command === "context") identifier(positional[0], "LESSON_ID");
  if (command === "search") text(positional[0], 256, "Search text");
  if (options.has("--limit")) requireThat(/^(?:[1-9]|1[0-9]|20)$/.test(options.get("--limit")), "--limit must be an integer from 1 to 20.");
  return { command, positional, root: options.get("--root") ?? DEFAULT_ROOT, limit: Number(options.get("--limit") ?? 10) };
}

export function run(args) {
  const { command, positional, root: requestedRoot, limit } = argumentsFor(args);
  if (command === "help") return HELP;
  if (command === "changes") return changes(spaceFile(positional[0]), spaceFile(positional[1]));
  const root = localPath(requestedRoot, "root");
  inspectPath(root, false);
  const space = spaceFile(path.join(root, "api", "space.json"));
  if (command === "overview") return space;
  const catalogue = catalogueAt(root, space);
  if (command === "search") {
    const query = positional[0].toLowerCase();
    const fields = ["id", "title", "trackId", "trackTitle", "stageTitle"];
    const matches = [];
    for (const lesson of catalogue.lessons.values()) {
      const matchedFields = fields.filter(field => typeof lesson[field] === "string" && lesson[field].toLowerCase().includes(query));
      if (matchedFields.length) matches.push({ ...lesson, matchedFields });
    }
    return { schema: "lernstudio.agent-search.v1", revision: space.revision, curriculumSha256: space.curriculumSha256, query: positional[0], matching: "UNICODE_LOWERCASE_LITERAL_SUBSTRING_NO_NORMALIZATION", limit, total: matches.length, omitted: Math.max(0, matches.length - limit), matches: matches.slice(0, limit) };
  }
  if (command === "context") {
    const entry = catalogue.lessons.get(positional[0]);
    requireThat(entry, "Lesson ID is not present in the catalogue.");
    const track = catalogue.tracks.get(entry.trackId);
    const { shard, lessons, owners } = contextAt(root, space, catalogue, track);
    const selectedLesson = lessons.get(entry.id), parent = owners.get(entry.id);
    const peers = parent.lessonIds.filter(id => id !== entry.id);
    return {
      schema: "lernstudio.agent-context.v1", revision: space.revision, curriculumSha256: space.curriculumSha256,
      sourceBinding: shard.sourceBinding, catalogue: space.catalogue, resource: track.resource,
      selectedLesson, parentTrack: { id: track.id, title: track.title, url: track.url },
      parentStage: { id: parent.id, title: parent.title, lessonCount: parent.lessonIds.length },
      previous: selectedLesson.previousId === null ? null : lessons.get(selectedLesson.previousId),
      next: selectedLesson.nextId === null ? null : lessons.get(selectedLesson.nextId),
      stagePeers: { limit: LIMITS.peers, total: peers.length, omitted: Math.max(0, peers.length - LIMITS.peers), items: peers.slice(0, LIMITS.peers).map(id => lessons.get(id)) },
      relationSemantics: shard.relationSemantics
    };
  }
  const stageIds = new Set(), lessonIds = new Set();
  for (const track of space.tracks) {
    const context = contextAt(root, space, catalogue, track);
    for (const id of context.stages.keys()) {
      requireThat(!stageIds.has(id), "Stage ID occurs in more than one track.");
      stageIds.add(id);
    }
    for (const id of context.lessons.keys()) {
      requireThat(!lessonIds.has(id), "Lesson ID occurs in more than one track.");
      lessonIds.add(id);
    }
  }
  requireThat(stageIds.size === space.counts.stages && lessonIds.size === space.counts.lessons, "Verified stage or lesson totals differ from space.");
  const sourceFile = path.join(root, "curriculum.js");
  let sourceCheck = "MATCH";
  try { fs.lstatSync(sourceFile); }
  catch (error) { if (error.code === "ENOENT") sourceCheck = "NOT_PRESENT"; else throw error; }
  if (sourceCheck === "MATCH") {
    const source = readUTF8(sourceFile, LIMITS.source, "curriculum source");
    requireThat(digest(source.replace(/\r\n/g, "\n")) === space.curriculumSha256, "Curriculum source SHA-256 does not match space.");
  }
  return { schema: "lernstudio.agent-space-verification.v1", verified: true, verificationKind: "REFERENCED_JSON_BYTES_AND_STRUCTURE", revision: space.revision, curriculumSha256: space.curriculumSha256, curriculumDigestMode: space.curriculumDigestMode, sourceCheck, curriculumFileRead: sourceCheck === "MATCH", webFreshness: "NOT_CHECKED", counts: space.counts, resources: [space.catalogue, ...space.tracks.map(track => track.resource)] };
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT) {
  try {
    const result = run(process.argv.slice(2));
    process.stdout.write(typeof result === "string" ? result : JSON.stringify(result) + "\n");
  } catch (error) {
    const code = typeof error.code === "string" && /^[A-Z0-9_]{2,30}$/.test(error.code) ? " (" + error.code + ")" : "";
    const message = error instanceof InputError ? error.message : "Cannot read or validate the requested local data" + code + ".";
    process.stderr.write("agent-space: " + message + "\n");
    process.exitCode = 1;
  }
}
