/* Explicit learning notes. Parsing and linking have no storage or I/O effects. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else if (typeof define === "function" && define.amd) define([], factory);
  else root.LernPackets = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SCHEMA = "lernstudio.learning-packet.v1";
  const BASE_URL = "https://juri-halveth.github.io/lernstudio/";
  const MAX_BYTES = 128 * 1024;
  const LIMITS = Object.freeze({ id: 96, title: 120, lessonId: 96, observation: 2000, question: 500, ref: 2048 });
  const FIELDS = ["schema", "id", "title", "lessonId", "observation", "question", "source", "recordedAt", "publication"];
  const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,95}$/;
  const LESSON_ID = /^[\p{L}\p{N}][\p{L}\p{M}\p{N}_-]{0,95}$/u;
  const TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;
  const URN = /^urn:[A-Za-z0-9][A-Za-z0-9-]{0,30}[A-Za-z0-9]:(?:[A-Za-z0-9._~!$&'()*+,;=:@/?#-]|%[0-9A-Fa-f]{2})+$/i;

  function fail(field, message) {
    throw new Error("Learning packet: " + field + " " + message);
  }

  function utf8Size(text, field) {
    let bytes = 0;
    for (let i = 0; i < text.length; i++) {
      const point = text.charCodeAt(i);
      if (point >= 0xd800 && point <= 0xdbff) {
        const next = text.charCodeAt(++i);
        if (!(next >= 0xdc00 && next <= 0xdfff)) fail(field, "contains an unpaired Unicode surrogate.");
        bytes += 4;
      } else if (point >= 0xdc00 && point <= 0xdfff) {
        fail(field, "contains an unpaired Unicode surrogate.");
      } else {
        bytes += point < 0x80 ? 1 : point < 0x800 ? 2 : 3;
      }
      if (bytes > MAX_BYTES) fail(field, "exceeds the 128 KiB UTF-8 limit.");
    }
    return bytes;
  }

  function closedRecord(value, fields, field) {
    if (!value || typeof value !== "object" || Array.isArray(value)) fail(field, "must be a plain JSON object.");
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) fail(field, "must be a plain JSON object.");
    const keys = Reflect.ownKeys(value);
    if (keys.some(key => typeof key !== "string" || !fields.includes(key))) fail(field, "contains an unknown field.");
    if (keys.length !== fields.length) fail(field, "must contain exactly: " + fields.join(", ") + ".");
    const copy = Object.create(null);
    for (const key of fields) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) fail(field + "." + key, "must be an enumerable data property.");
      copy[key] = descriptor.value;
    }
    return copy;
  }

  function textField(value, field, maximum) {
    if (typeof value !== "string") fail(field, "must be text.");
    // Bound work before checking Unicode scalars, including supplementary characters.
    if (value.length > maximum * 2) fail(field, "exceeds " + maximum + " Unicode characters.");
    utf8Size(value, field);
    if (Array.from(value).length > maximum) fail(field, "exceeds " + maximum + " Unicode characters.");
    if (!value.trim()) fail(field, "must not be empty or whitespace only.");
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/.test(value)) fail(field, "contains a disallowed control character.");
    return value;
  }

  function identifier(value, field) {
    if (typeof value !== "string" || !ID.test(value)) fail(field, "must be 1-96 ASCII letters, digits, underscores or hyphens, starting with a letter or digit.");
    return value;
  }

  function lessonIdentifier(value, field) {
    if (typeof value !== "string" || value.length > LIMITS.lessonId * 2 || !LESSON_ID.test(value)) fail(field, "must be 1-96 Unicode letters, numbers, combining marks, underscores or ASCII hyphens, starting with a letter or number.");
    return value;
  }

  function httpsURL(value, field) {
    if (!/^https:\/\//i.test(value) || /[\s\\\u0000-\u001f\u007f-\u009f]/.test(value) || /%(?![0-9A-Fa-f]{2})/.test(value)) fail(field, "must be an absolute HTTPS URL without whitespace or backslashes and with valid percent escapes.");
    const authority = value.slice(8).split(/[/?#]/, 1)[0];
    if (!authority || authority.includes("@")) fail(field, "must not contain URL credentials.");
    let url;
    try { url = new URL(value); }
    catch (_) { fail(field, "must be a valid absolute HTTPS URL."); }
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) fail(field, "must be HTTPS without credentials.");
    return url;
  }

  function timestamp(value) {
    if (typeof value !== "string" || value.length > 29) fail("recordedAt", "must be an ISO timestamp with a timezone.");
    const parts = TIME.exec(value);
    if (!parts) fail("recordedAt", "must use YYYY-MM-DDTHH:mm:ss[.sss]Z or an explicit +/-HH:mm offset.");
    const [year, month, day, hour, minute, second] = parts.slice(1, 7).map(Number);
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1] || hour > 23 || minute > 59 || second > 59 || !Number.isFinite(Date.parse(value))) {
      fail("recordedAt", "must name a real calendar date and time (no leap seconds).");
    }
    return value;
  }

  function validate(packet, knownIds) {
    const data = closedRecord(packet, FIELDS, "packet");
    if (data.schema !== SCHEMA) fail("schema", "must be " + SCHEMA + ".");
    if (data.publication !== "LOCAL_DRAFT_ONLY") fail("publication", "must be LOCAL_DRAFT_ONLY.");
    identifier(data.id, "id");
    if (data.lessonId !== null) lessonIdentifier(data.lessonId, "lessonId");
    if (knownIds !== undefined) {
      if (!Array.isArray(knownIds) || knownIds.length > 100000) fail("knownIds", "must be an array of at most 100000 lesson IDs.");
      const ids = new Set();
      for (let i = 0; i < knownIds.length; i++) {
        const descriptor = Object.getOwnPropertyDescriptor(knownIds, String(i));
        if (!descriptor || !("value" in descriptor)) fail("knownIds", "must contain only explicit data entries.");
        lessonIdentifier(descriptor.value, "knownIds entry");
        ids.add(descriptor.value);
      }
      if (data.lessonId !== null && !ids.has(data.lessonId)) fail("lessonId", "is not present in knownIds.");
    }
    const source = closedRecord(data.source, ["kind", "ref"], "source");
    if (!["USER_NOTE", "LOCAL_EXERCISE", "PUBLIC_SOURCE"].includes(source.kind)) fail("source.kind", "must be USER_NOTE, LOCAL_EXERCISE or PUBLIC_SOURCE.");
    if (source.ref !== null) {
      textField(source.ref, "source.ref", LIMITS.ref);
      if (!URN.test(source.ref)) httpsURL(source.ref, "source.ref");
    }
    return {
      schema: SCHEMA,
      id: data.id,
      title: textField(data.title, "title", LIMITS.title),
      lessonId: data.lessonId,
      observation: textField(data.observation, "observation", LIMITS.observation),
      question: textField(data.question, "question", LIMITS.question),
      source: { kind: source.kind, ref: source.ref },
      recordedAt: timestamp(data.recordedAt),
      publication: "LOCAL_DRAFT_ONLY"
    };
  }

  function parse(text, knownIds) {
    if (typeof text !== "string") fail("input", "must be a JSON string.");
    if (text.length > MAX_BYTES) fail("input", "exceeds the 128 KiB UTF-8 limit.");
    utf8Size(text, "input");
    let packet;
    try { packet = JSON.parse(text); }
    catch (_) { fail("input", "must be valid JSON containing one learning packet."); }
    return validate(packet, knownIds);
  }

  function stringify(packet, knownIds) {
    const text = JSON.stringify(validate(packet, knownIds), null, 2) + "\n";
    utf8Size(text, "output");
    return text;
  }

  function link(packet, baseURL, knownIds) {
    const data = validate(packet, knownIds);
    const base = baseURL === undefined ? BASE_URL : baseURL;
    textField(base, "baseURL", LIMITS.ref);
    const url = httpsURL(base, "baseURL");
    if (base.includes("?") || base.includes("#") || !url.pathname.endsWith("/")) fail("baseURL", "must be an HTTPS directory URL ending in /, without query or fragment.");
    url.hash = data.lessonId === null ? "home" : "lesson/" + encodeURIComponent(data.lessonId);
    return url.href;
  }

  return Object.freeze({ SCHEMA, BASE_URL, MAX_BYTES, LIMITS, parse, stringify, link });
});
