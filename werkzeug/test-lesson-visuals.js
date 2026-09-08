/* Prüft, dass jede veröffentlichte Lektion ein gebundenes bildliches Denkmodell erhält. */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const sandbox = { window: {}, document: { getElementById: () => ({}) }, console };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, "curriculum.js"), "utf8"), sandbox, { filename: "curriculum.js" });
const curriculum = sandbox.window.CURRICULUM;
const visuals = require(path.join(ROOT, "lesson-visuals.js"));
const allowedKinds = new Set(["sequence", "cycle", "branch", "layers", "balance", "graph", "nest"]);

let total = 0;
let generic = 0;
const kinds = new Map();
const tracks = new Map();
const failures = [];

for (const track of curriculum.tracks || []) {
  let trackCount = 0;
  for (const stage of track.stages || []) {
    for (const lesson of stage.lessons || []) {
      total++;
      trackCount++;
      try {
        const result = visuals.describeModel({ track, stage, lesson });
        const beginner = visuals.describeBeginnerLayer({ track, stage, lesson });
        assert.ok(beginner && typeof beginner === "object", "einfache Einstiegsschicht fehlt");
        assert.ok(beginner.scene && beginner.scene.length >= 70, "Alltagsbild zu kurz");
        assert.ok(Array.isArray(beginner.steps) && beginner.steps.length === 3, "drei einfache Schritte fehlen");
        assert.ok(beginner.invitation && beginner.invitation.length >= 35, "erste Beobachtungsfrage fehlt");
        assert.ok(beginner.bridge && /Fachbegriff/i.test(beginner.bridge), "Brücke zur Fachsprache fehlt");
        assert.doesNotMatch([beginner.scene, beginner.invitation, ...beginner.steps].join(" "), /\b(?:Variable|Operator|Implementierung|deterministisch|Evidenz|Request|Response|Vertrauensgrenze|Zustandsmaschine)\b/i, "Einstieg beginnt zu technisch");
        assert.ok(result && typeof result === "object", "Modell fehlt");
        assert.ok(allowedKinds.has(result.kind), `unbekannte Form ${result.kind}`);
        assert.ok(result.name && result.name.length >= 8, "Name fehlt");
        assert.ok(result.intro && result.intro.length >= 35, "Einordnung zu kurz");
        assert.ok(Array.isArray(result.nodes) && result.nodes.length >= 4, "zu wenige Zustände");
        assert.ok(Array.isArray(result.edges) && result.edges.length >= 3, "zu wenige Beziehungen");
        assert.ok(result.question && result.question.length >= 20, "Denkfrage fehlt");
        assert.ok(result.note && /Vereinfachtes Denkmodell/.test(result.note), "Beweisgrenze fehlt");
        for (const [index, item] of result.nodes.entries()) {
          assert.ok(item.label && item.label.length >= 3, `Zustand ${index + 1}: Label fehlt`);
          assert.ok(item.detail && item.detail.length >= 15, `Zustand ${index + 1}: Erklärung zu kurz`);
        }
        for (const [from, to] of result.edges) {
          assert.ok(Number.isInteger(from) && from >= 0 && from < result.nodes.length, "ungültige Startkante");
          assert.ok(Number.isInteger(to) && to >= 0 && to < result.nodes.length, "ungültige Zielkante");
          assert.notStrictEqual(from, to, "Selbstkante ohne Lernwert");
        }
        if (/^Denkweg für/.test(result.name)) generic++;
        kinds.set(result.kind, (kinds.get(result.kind) || 0) + 1);
      } catch (error) {
        failures.push(`${track.id}/${stage.id || stage.name}/${lesson.id}: ${error.message}`);
      }
    }
  }
  tracks.set(track.id, trackCount);
}

assert.strictEqual(failures.length, 0, failures.slice(0, 20).join("\n"));
const expectedTotal = (curriculum.tracks || []).reduce((sum, track) => sum + (track.stages || []).reduce((stageSum, stage) => stageSum + (stage.lessons || []).length, 0), 0);
assert.strictEqual(total, expectedTotal, `Nicht jede Curriculum-Lektion wurde geprüft: erwartet ${expectedTotal}, erhalten ${total}`);
assert.strictEqual(tracks.size, (curriculum.tracks || []).length, "Nicht alle Lernpfade wurden geprüft");
assert.strictEqual(generic, 0, `${generic} Lektionen fielen auf die ungebundene Standardgrafik zurück`);
assert.ok(kinds.size >= 6, `Zu wenig visuelle Formen: ${[...kinds.keys()].join(", ")}`);

console.log(`✓ ${total}/${total} Lektionen erhalten ein Denkmodell`);
console.log(`✓ ${total}/${total} Lektionen beginnen mit Alltagssprache vor der Fachsprache`);
console.log(`✓ ${tracks.size} Lernpfade vollständig abgedeckt, 0 ungebundene Rückfälle`);
console.log(`✓ Formen: ${[...kinds.entries()].map(([kind, count]) => `${kind}=${count}`).join(", ")}`);
