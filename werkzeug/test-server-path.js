/* Inhaltsvertrag für Windows, Docker, API und Zahlungsablauf. */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, "curriculum.js"), "utf8"), sandbox);

const curriculum = sandbox.window.CURRICULUM;
const serverTrack = curriculum.tracks.find((track) => track.id === "srv");
assert(serverTrack, "Server-Lernpfad 'srv' fehlt.");

const minimums = { "srv-3": 9, "srv-4": 9, "srv-5": 9, "srv-6": 14 };
for (const [stageId, minimum] of Object.entries(minimums)) {
  const stage = serverTrack.stages.find((item) => item.id === stageId);
  assert(stage, `Stufe ${stageId} fehlt.`);
  assert(stage.lessons.length >= minimum, `${stageId} ist wieder unter den vereinbarten Praxisumfang gefallen.`);
  const firstQuiz = stage.lessons.findIndex((lesson) => lesson.type === "quiz");
  assert(firstQuiz < 0 || stage.lessons.slice(firstQuiz + 1).every((lesson) => lesson.type === "quiz"), `${stageId}: Fachlektionen stehen hinter dem Abschlussquiz.`);
}

const allLessons = curriculum.tracks.flatMap((track) => track.stages).flatMap((stage) => stage.lessons);
const ids = allLessons.map((lesson) => lesson.id);
assert.strictEqual(new Set(ids).size, ids.length, "Doppelte Lektions-ID im Curriculum.");

const runtimeText = JSON.stringify(serverTrack).toLowerCase();
const requiredConcepts = [
  ["Windows-Orientierung", "get-location"],
  ["sichere Pfade", "-literalpath"],
  ["temporäre Secrets", "umgebungsvariable"],
  ["Ports", "get-nettcpconnection"],
  ["Execution Policy", "keine vollständige sicherheitsgrenze"],
  ["Docker-Debugging", "docker logs"],
  ["Docker Compose", "docker compose"],
  ["Healthchecks", "healthcheck"],
  ["API-Antwortfehler", "response.ok"],
  ["401", "401"],
  ["403", "403"],
  ["CORS", "preflight"],
  ["Rate Limits", "429"],
  ["Zahlungsobjekte", "paymentintent"],
  ["Test/Live-Trennung", "test und live"],
  ["3-D Secure", "3-d secure"],
  ["Webhook-Rohdaten", "roh-body"],
  ["idempotente Freischaltung", "idempotent"],
  ["Rechnung", "rechnung"],
  ["Rückerstattung", "rückerstattung"],
  ["Dispute", "dispute"],
  ["Kassenabgleich", "abgleich"]
];
for (const [label, needle] of requiredConcepts) {
  assert(runtimeText.includes(needle), `Pflichtinhalt fehlt: ${label} (${needle}).`);
}

const bannedClaims = [
  "keine pci-pflicht",
  "keine pci-zertifizierung",
  "keinerlei pci-verantwortung"
];
for (const claim of bannedClaims) {
  assert(!runtimeText.includes(claim), `Falsche PCI-Aussage ist im Laufzeit-Curriculum enthalten: '${claim}'.`);
}
assert(runtimeText.includes("gemeinsame verantwortung"), "PCI-DSS muss als gemeinsame Verantwortung erklärt werden.");
assert(runtimeText.includes("nicht automatisch in jeder konfiguration eine rechnung"), "Rechnung darf nicht als automatische Folge jeder Zahlung behauptet werden.");
assert(runtimeText.includes("erfolgsseite") && runtimeText.includes("signiert"), "Erfolgsseite und signierter Webhook müssen klar getrennt sein.");

console.log("✓ Server-Pfad-Audit bestanden: Windows, Docker, API und Zahlung 0–Produktion vollständig abgedeckt.");
