/* Regressionstest fuer aufgabenspezifische, sparsam eingesetzte Hilfe.
   Einfache Fragen bleiben frei von generischen Hinweisen. Anspruchsvolle
   Code-, Labor- und Terminalaufgaben behalten ihre redaktionellen Tipps.
   Aufruf: node werkzeug/test-universal-task-help.js */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
const styles = fs.readFileSync(path.join(ROOT, "styles.css"), "utf8");
const curriculumSource = fs.readFileSync(path.join(ROOT, "curriculum.js"), "utf8");
const sandboxWindow = {};
vm.runInNewContext(curriculumSource, { window: sandboxWindow });

function assert(ok, message) {
  if (!ok) throw new Error(message);
}

const beatKinds = new Set();
let lessons = 0;
let interactiveLessons = 0;
let interactiveSteps = 0;
let quizzes = 0;
let quizQuestions = 0;
let classicTasks = 0;
let contextualPredicts = 0;
let classicTasksWithHints = 0;
let beatsWithOwnHints = 0;
let quizzesWithOwnHints = 0;

for (const track of sandboxWindow.CURRICULUM.tracks) {
  for (const stage of track.stages) {
    for (const lesson of stage.lessons) {
      lessons++;
      let interactive = false;
      if (lesson.type === "quiz") {
        quizzes++;
        quizQuestions += (lesson.questions || []).length;
        interactive = true;
      }
      if (lesson.task) {
        classicTasks++;
        if (Array.isArray(lesson.task.hints) && lesson.task.hints.length) classicTasksWithHints++;
        interactive = true;
      }
      const beats = lesson.beats || [];
      for (let beatIndex = 0; beatIndex < beats.length; beatIndex++) {
        const beat = beats[beatIndex];
        beatKinds.add(beat.kind);
        if (beat.kind !== "text") {
          interactiveSteps++;
          interactive = true;
          if ((Array.isArray(beat.hints) && beat.hints.length) || beat.hint) beatsWithOwnHints++;
        }
        if (beat.kind === "predict") {
          for (let vorherIndex = beatIndex - 1; vorherIndex >= 0 && vorherIndex >= beatIndex - 3; vorherIndex--) {
            const vorher = beats[vorherIndex];
            if (!vorher || vorher.kind !== "text") break;
            if (/<(?:pre|svg|table)|class=["'][^"']*mathex/i.test(vorher.html || "")) {
              contextualPredicts++;
              break;
            }
          }
        }
      }
      for (const question of lesson.questions || []) {
        if ((Array.isArray(question.hints) && question.hints.length) || question.hint || question.anleitung) quizzesWithOwnHints++;
      }
      if (interactive) interactiveLessons++;
    }
  }
}

assert(lessons > 0, "Das Curriculum muss tatsächlich Lektionen enthalten");
assert(app.includes('<details class="task-help">'), "Semantisches details-Element fuer die Hilfe fehlt");
assert(!app.includes('<details class="task-help" open'), "Aufgabenhilfe darf nicht standardmaessig geoeffnet sein");
assert(app.includes('<summary><span>Ich brauche einen Hinweis</span></summary>'), "Freiwilliger Hilfe-Einstieg fehlt");
assert(app.includes('class="task-help-line"'), "Einzelner sichtbarer Hinweis fehlt");
assert(app.includes("Nächster Hinweis"), "Stufenweise weitere Hilfe fehlt");
assert(app.includes("if (!eigene.length) return null;"), "Generische Hilfe erscheint weiterhin ohne individuelle Anleitung");
assert(!app.includes("sei ehrlich zu dir"), "Aufgabenhilfe moralisiert die Bedienung wieder");
assert(!app.includes("So gehst du vor:"), "Aufgabenhilfe zeigt wieder alle Schritte gleichzeitig");
assert(app.includes('const hilfe = hilfeEinsetzen(stageEl.firstElementChild, b.kind, b);'),
  "Universeller Hook fuer interaktive Beat-Arten fehlt");
assert(app.includes('const host = el(`<div class="task-help-host"></div>`);'), "Hilfe bleibt in der visuellen Aufgabenkarte statt darunter");
assert(app.includes('hilfeEinsetzen(box, "code", task);'), "Klassische Code-Aufgaben sind nicht angebunden");
assert(app.includes('hilfeEinsetzen(box, "flag", task);'), "Klassische Flag-Aufgaben sind nicht angebunden");
assert(app.includes('hilfeEinsetzen(c, "quiz", q);'), "Quizfragen sind nicht angebunden");
assert(!app.includes("const schritte = eigene.length ? eigene : (AUFGABEN_HILFEN"),
  "Universeller Hilfe-Rueckfall lenkt einfache Fragen wieder ab");
assert(app.includes("Array.isArray(task.hints) && task.hints.length"),
  "Klassische Aufgaben unterscheiden nicht zwischen vorhandenen und fehlenden Tipps");
assert(contextualPredicts > 0, "Curriculum enthaelt unerwartet keine Frage mit sichtbarem Pruefgegenstand");
assert(app.includes("function vorherigerPruefgegenstand()"), "Persistenter Pruefgegenstand fuer Beat-Fragen fehlt");
assert(app.includes('host.querySelectorAll("pre, .mathex, table, svg")'), "Pruefgegenstand-Auswahl ist nicht an Code, Formel, Tabelle und Grafik gebunden");
assert(app.includes('beat-block${contextHtml ? " has-context" : ""}'), "Frage und Pruefgegenstand werden nicht gemeinsam gerendert");
assert(styles.includes(".beat-block.has-context"), "Gemeinsames Layout fuer Frage und Pruefgegenstand fehlt");

assert(quizzesWithOwnHints === 0, "Einfache Quizfragen tragen unerwartet eigene Hinweise: " + quizzesWithOwnHints);
assert(classicTasksWithHints === classicTasks,
  "Nicht jede anspruchsvolle klassische Aufgabe besitzt individuelle Tipps: " + classicTasksWithHints + "/" + classicTasks);
assert(beatsWithOwnHints > 0, "Anspruchsvolle Beat-Aufgaben besitzen keine individuellen Tipps");

console.log(
  "INDIVIDUELLE-AUFGABENHILFE: BESTANDEN (" +
  lessons + " Lektionen geprueft; " +
  interactiveLessons + " interaktive Lektionen; " +
  interactiveSteps + " interaktive Beat-Schritte; " +
  quizzes + " Quizze/" + quizQuestions + " Fragen; " +
  classicTasks + " klassische Aufgaben/" + classicTasksWithHints + " mit individuellen Tipps; " +
  beatsWithOwnHints + " Beat-Aufgaben mit eigenen Tipps; " +
  contextualPredicts + " Fragen behalten Code/Grafik/Tabelle sichtbar)."
);
