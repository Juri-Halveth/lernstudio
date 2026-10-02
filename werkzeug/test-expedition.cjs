"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const Expedition = require("../expedition.js");
const Profile = require("../learning-profile.js");

const root = path.resolve(__dirname, "..");
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "curriculum.js"), "utf8"), context, { filename: "curriculum.js" });
const curriculum = context.window.CURRICULUM;
const entries = [];
for (const track of curriculum.tracks) {
  for (const stage of track.stages) {
    for (const lesson of stage.lessons) {
      entries.push({ id: lesson.id, title: lesson.title, trackId: track.id, trackTitle: track.name });
    }
  }
}
const ids = new Set(entries.map(lesson => lesson.id));
const snapshot = value => JSON.stringify(value);
const plain = value => JSON.parse(snapshot(value));

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}
deepFreeze(curriculum);

test("all 702 real lessons retain their exact existing hash routes, including Unicode IDs", () => {
  assert.equal(curriculum.tracks.length, 13);
  assert.equal(entries.length, 702);
  assert.equal(ids.size, 702);
  assert(entries.some(lesson => /[^\x00-\x7f]/.test(lesson.id)));
  for (const lesson of entries) {
    const route = Expedition.routeForLesson(curriculum, lesson.id);
    assert.equal(route, "#lesson/" + encodeURIComponent(lesson.id));
    assert.equal(decodeURIComponent(route.slice("#lesson/".length)), lesson.id);
  }
});

test("three immutable missions each have one question, distinct choices and a real curriculum anchor", () => {
  assert.equal(Expedition.stations.length, 3);
  assert.equal(new Set(Expedition.stations.map(station => station.id)).size, 3);
  assert.deepEqual(Expedition.stations.map(station => station.scenePhase), [0, 1, 2]);
  assert(Object.isFrozen(Expedition));
  assert(Object.isFrozen(Expedition.stations));
  for (const station of Expedition.stations) {
    for (const field of ["id", "title", "kicker", "prompt", "correctChoice", "success", "tryAgain", "lessonId"]) {
      assert.equal(typeof station[field], "string");
      assert(station[field].trim().length > 0, field);
    }
    assert.equal((station.prompt.match(/\?/g) || []).length, 1);
    assert(station.prompt.length <= 180);
    assert.equal(station.choices.length, 3);
    assert.equal(new Set(station.choices.map(choice => choice.id)).size, 3);
    assert.equal(station.choices.filter(choice => choice.id === station.correctChoice).length, 1);
    assert(ids.has(station.lessonId), station.lessonId);
    assert(!ids.has(station.id), "An onboarding station is not a curriculum lesson");
    assert(Expedition.routeForLesson(curriculum, station.lessonId));
    assert(Object.isFrozen(station));
    assert(Object.isFrozen(station.choices));
    station.choices.forEach(choice => {
      assert(Object.isFrozen(choice));
      assert.equal(typeof choice.label, "string");
      assert(choice.label.trim());
    });
  }
});

test("evaluation is repeatable and gives a distinct contextual explanation for each wrong action", () => {
  const before = snapshot(Expedition.stations);
  for (const station of Expedition.stations) {
    const explanations = new Set();
    for (const choice of station.choices) {
      const result = Expedition.evaluate(station.id, choice.id);
      assert.deepEqual(Object.keys(result).sort(), ["correct", "feedback"]);
      assert.equal(result.correct, choice.id === station.correctChoice);
      assert.deepEqual(Expedition.evaluate(station.id, choice.id), result);
      assert.equal(typeof result.feedback, "string");
      if (result.correct) assert.equal(result.feedback, station.success);
      else {
        assert.notEqual(result.feedback, station.tryAgain);
        explanations.add(result.feedback);
      }
      result.correct = !result.correct;
      result.feedback = "caller-local edit";
      assert.notEqual(Expedition.evaluate(station.id, choice.id).feedback, result.feedback);
    }
    assert.equal(explanations.size, 2);
  }
  assert.equal(snapshot(Expedition.stations), before);
});

test("unknown station and answer IDs are never accepted or coerced", () => {
  for (const id of [undefined, null, 0, {}, "", "__proto__", "constructor", "missing"]) {
    const result = Expedition.evaluate(id, "connect-send");
    assert.equal(result.correct, false);
    assert(result.feedback.length > 0);
    for (const station of Expedition.stations) {
      assert.equal(Expedition.evaluate(station.id, id).correct, false);
    }
  }
  const [first, second] = Expedition.stations;
  assert.equal(Expedition.evaluate(first.id, second.correctChoice).correct, false);
});

test("a full deterministic walk visits every lesson and quiz in curriculum order", () => {
  const state = Profile.defaults();
  assert.deepEqual(Expedition.nextLesson(curriculum), entries[0]);
  for (const lesson of entries) {
    const before = snapshot(state);
    assert.deepEqual(Expedition.nextLesson(curriculum, state), lesson);
    assert.deepEqual(Expedition.nextLesson(curriculum, state), lesson);
    assert.equal(snapshot(state), before);
    // Only the test caller simulates completion of an actual lesson.
    state.done[lesson.id] = true;
    state.lastLesson = lesson.id;
  }
  assert.equal(Expedition.nextLesson(curriculum, state), null);
});

test("every resumed track starts at its earliest gap, even when the bookmark is much later", () => {
  for (const track of curriculum.tracks) {
    const own = entries.filter(lesson => lesson.trackId === track.id);
    const state = Profile.defaults();
    state.lastLesson = own.at(-1).id;
    assert.deepEqual(Expedition.nextLesson(curriculum, state), own[0]);
    state.done = Object.fromEntries(own.map(lesson => [lesson.id, true]));
    state.done[own[1].id] = false;
    assert.deepEqual(Expedition.nextLesson(curriculum, state), own[1]);
  }
});

test("explicit station anchors select the actual track without skipping its foundations", () => {
  const state = deepFreeze({ ...Profile.defaults(), lastLesson: entries[0].id });
  for (const station of Expedition.stations) {
    const anchor = entries.find(lesson => lesson.id === station.lessonId);
    const first = entries.find(lesson => lesson.trackId === anchor.trackId);
    assert.deepEqual(Expedition.nextLesson(curriculum, state, station.lessonId), first);
  }
  const python = entries.find(lesson => lesson.trackId === "python");
  assert.equal(python.id, "py-0-1", "Track identity cannot be inferred from the lesson ID prefix");
  const math = entries.filter(lesson => lesson.trackId === "math");
  const unicodeIndex = math.findIndex(lesson => /[^\x00-\x7f]/.test(lesson.id));
  const unicodeState = deepFreeze({ ...Profile.defaults(), lastLesson: math[unicodeIndex].id,
    done: Object.fromEntries(math.slice(0, unicodeIndex).map(lesson => [lesson.id, true])) });
  assert.deepEqual(Expedition.nextLesson(curriculum, unicodeState), math[unicodeIndex]);
});

test("finishing a track recommends the first remaining lesson; explicit null clears the bookmark", () => {
  for (const track of curriculum.tracks) {
    const own = entries.filter(lesson => lesson.trackId === track.id);
    const state = deepFreeze({ ...Profile.defaults(), lastLesson: own.at(-1).id,
      done: Object.fromEntries(own.map(lesson => [lesson.id, true])) });
    assert.deepEqual(Expedition.nextLesson(curriculum, state), entries.find(lesson => lesson.trackId !== track.id));
  }
  const state = deepFreeze({ ...Profile.defaults(), lastLesson: "py-3-1" });
  assert.deepEqual(Expedition.nextLesson(curriculum, state, null), entries[0]);
});

test("only an own boolean true completion mark can skip a lesson", () => {
  const [first, second] = entries;
  const inherited = Object.create({ [first.id]: true });
  assert.deepEqual(Expedition.nextLesson(curriculum, { done: inherited }), first);
  for (const value of [false, "true", 1, {}, null, undefined]) {
    assert.deepEqual(Expedition.nextLesson(curriculum, { done: { [first.id]: value } }), first);
  }
  assert.deepEqual(Expedition.nextLesson(curriculum, { done: { [first.id]: true } }), second);
});

test("invalid anchors, malformed curricula and non-member route IDs return null", () => {
  const invalidIds = [undefined, null, 12, {}, "", "unknown-lesson", "../home", "#home", "py/0/1",
    "py-0-1?x=1", "py-0-1#home", " py-0-1", "py-0-1 ", "py-0-1\n", "py-0-1/",
    "javascript:alert(1)", "math-realit%C3%A4t-1", "\ud800", "x".repeat(129)];
  for (const id of invalidIds) {
    assert.equal(Expedition.routeForLesson(curriculum, id), null);
    if (id != null) {
      assert.equal(Expedition.nextLesson(curriculum, Profile.defaults(), id), null);
      assert.equal(Expedition.nextLesson(curriculum, { done: {}, lastLesson: id }), null);
    }
  }
  const duplicateLesson = { tracks: [{ id: "sample", name: "Sample", stages: [{ lessons: [
    { id: "one", title: "One" }, { id: "one", title: "One again" }
  ] }] }] };
  const duplicateTrack = { tracks: [
    { id: "sample", name: "Sample", stages: [] }, { id: "sample", name: "Again", stages: [] }
  ] };
  for (const bad of [null, {}, { tracks: null }, { tracks: [null] },
    { tracks: [{ id: "sample", name: "Sample", stages: [null] }] }, duplicateLesson, duplicateTrack]) {
    assert.equal(Expedition.nextLesson(bad, Profile.defaults()), null);
    assert.equal(Expedition.routeForLesson(bad, entries[0].id), null);
  }
  assert.equal(Expedition.nextLesson({ tracks: [] }, Profile.defaults()), null);
  for (const state of [false, "profile", [], { done: null }, { done: [] }, { done: "true" }]) {
    assert.equal(Expedition.nextLesson(curriculum, state), null);
  }
});

test("the real profile and curriculum stay unchanged after every onboarding answer", () => {
  const storage = new Map();
  const store = Profile.createStore({ getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }, curriculum);
  const state = deepFreeze(store.read());
  const before = snapshot({ curriculum, state, storage: [...storage] });
  assert.equal(store.lessonCount, 702);
  for (const station of Expedition.stations) {
    for (const choice of station.choices) Expedition.evaluate(station.id, choice.id);
    const lesson = Expedition.nextLesson(curriculum, state, station.lessonId);
    Expedition.routeForLesson(curriculum, lesson.id);
    lesson.title = "caller-local edit";
    assert.notEqual(Expedition.nextLesson(curriculum, state, station.lessonId).title, lesson.title);
  }
  assert.equal(snapshot({ curriculum, state, storage: [...storage] }), before);
  assert.deepEqual(store.read().done, {});
});

test("browser and AMD loading match CommonJS without DOM, storage, clocks or network effects", () => {
  const source = fs.readFileSync(path.join(root, "expedition.js"), "utf8");
  const denied = () => { throw new Error("Unexpected browser effect"); };
  const browser = {};
  for (const key of ["document", "localStorage", "sessionStorage", "fetch", "XMLHttpRequest", "Date", "Math", "setTimeout", "setInterval"]) {
    Object.defineProperty(browser, key, { get: denied });
  }
  browser.window = browser;
  vm.runInNewContext(source, browser, { filename: "expedition.js" });
  assert.deepEqual(plain(browser.LernExpedition.stations), plain(Expedition.stations));
  for (const station of Expedition.stations) {
    for (const choice of station.choices) {
      assert.deepEqual(plain(browser.LernExpedition.evaluate(station.id, choice.id)), Expedition.evaluate(station.id, choice.id));
    }
  }
  assert.deepEqual(plain(browser.LernExpedition.nextLesson(curriculum, Profile.defaults())), entries[0]);
  assert.equal(browser.LernExpedition.routeForLesson(curriculum, entries[0].id), Expedition.routeForLesson(curriculum, entries[0].id));
  let amd;
  const define = (deps, factory) => { assert.equal(deps.length, 0); amd = factory(); };
  define.amd = {};
  vm.runInNewContext(source, { define });
  assert.deepEqual(plain(amd.stations), plain(Expedition.stations));
});
