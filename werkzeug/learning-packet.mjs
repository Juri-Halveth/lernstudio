#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import Packets from "../learning-packets.js";

const HELP = `Lernstudio learning packets (local data only)

  node werkzeug/learning-packet.mjs validate FILE [--known-ids IDS.json]
  node werkzeug/learning-packet.mjs link FILE [--known-ids IDS.json] [--base-url HTTPS_DIRECTORY]
  node werkzeug/learning-packet.mjs create --id ID --title TEXT --lesson-id ID_OR_null
    --observation TEXT --question TEXT --source-kind KIND --source-ref HTTPS_OR_URN_OR_null
    --recorded-at ISO_TIMESTAMP [--known-ids IDS.json]

create writes validated UTF-8 JSON to stdout. validate writes the validated packet
to stdout. link writes only a lesson URL or #home, never packet text or its source.
IDS.json is an explicit local JSON array of lesson IDs (at most 128 KiB).
All eight create flags are required. Literal null is allowed only for lesson-id
and source-ref. Publication is always LOCAL_DRAFT_ONLY. No upload or file writes.
`;

function fail(message) { throw new Error(message); }

function readLocalJSON(file, label) {
  if (typeof file !== "string" || !file || file.length > 4096 || /[\u0000-\u001f\u007f]/.test(file)) fail(label + " requires an explicit local file path.");
  if (/^[\\/]{2}/.test(file) || /:/.test(file.replace(/^[A-Za-z]:[\\/]/, ""))) fail(label + " requires a local path, not a URL, network path or stream.");
  const location = path.resolve(file);
  if (!fs.lstatSync(location).isFile()) fail(label + " must be a regular local file, not a link or directory.");
  const descriptor = fs.openSync(location, "r");
  try {
    const stat = fs.fstatSync(descriptor);
    if (!stat.isFile() || stat.size > Packets.MAX_BYTES) fail(label + " must be a regular file of at most 128 KiB.");
    // Reading one bounded buffer also handles a file that grows after the size check.
    const bytes = Buffer.alloc(Packets.MAX_BYTES + 1);
    let length = 0;
    while (length < bytes.length) {
      const count = fs.readSync(descriptor, bytes, length, bytes.length - length, null);
      if (!count) break;
      length += count;
    }
    if (length > Packets.MAX_BYTES) fail(label + " exceeds the 128 KiB limit.");
    try { return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes.subarray(0, length)); }
    catch (_) { fail(label + " must contain valid UTF-8 JSON."); }
  } finally {
    fs.closeSync(descriptor);
  }
}

function flags(args, allowed) {
  const result = Object.create(null);
  if (args.length > allowed.length * 2 || args.length % 2 !== 0) fail("Flags require one explicit value each; use --help for syntax.");
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    if (!allowed.includes(key)) fail("Unknown flag; use --help for allowed flags.");
    if (Object.hasOwn(result, key)) fail("Duplicate flag: " + key);
    if (Buffer.byteLength(args[i + 1], "utf8") > Packets.MAX_BYTES) fail(key + " exceeds the input limit.");
    result[key] = args[i + 1];
  }
  return result;
}

function knownIds(file) {
  if (file === undefined) return undefined;
  try { return JSON.parse(readLocalJSON(file, "known-ids")); }
  catch (error) {
    if (error instanceof SyntaxError) fail("known-ids must contain a JSON array of lesson IDs.");
    throw error;
  }
}

function main(args) {
  if (args.length === 1 && (args[0] === "--help" || args[0] === "help")) return HELP;
  const [command, ...rest] = args;
  if (command === "validate" || command === "link") {
    if (!rest[0] || rest[0].startsWith("--")) fail(command + " requires FILE.");
    const options = flags(rest.slice(1), command === "link" ? ["--known-ids", "--base-url"] : ["--known-ids"]);
    const ids = knownIds(options["--known-ids"]);
    const packet = Packets.parse(readLocalJSON(rest[0], "packet"), ids);
    return command === "link" ? Packets.link(packet, options["--base-url"], ids) + "\n" : Packets.stringify(packet, ids);
  }
  if (command === "create") {
    const required = ["--id", "--title", "--lesson-id", "--observation", "--question", "--source-kind", "--source-ref", "--recorded-at"];
    const options = flags(rest, [...required, "--known-ids"]);
    for (const key of required) if (!Object.hasOwn(options, key)) fail("Missing required flag: " + key);
    const packet = {
      schema: Packets.SCHEMA,
      id: options["--id"],
      title: options["--title"],
      lessonId: options["--lesson-id"] === "null" ? null : options["--lesson-id"],
      observation: options["--observation"],
      question: options["--question"],
      source: { kind: options["--source-kind"], ref: options["--source-ref"] === "null" ? null : options["--source-ref"] },
      recordedAt: options["--recorded-at"],
      publication: "LOCAL_DRAFT_ONLY"
    };
    return Packets.stringify(packet, knownIds(options["--known-ids"]));
  }
  fail("Expected validate, create or link. Use --help for syntax.");
}

try {
  process.stdout.write(main(process.argv.slice(2)));
} catch (error) {
  // Filesystem errors can contain private paths; return the code, not the path.
  const message = typeof error.code === "string" ? "Cannot read the requested local file (" + error.code + ")." : error.message;
  process.stderr.write("learning-packet: " + message + "\n");
  process.exitCode = 1;
}
