/* Regressionstest fuer die Zurueck-Navigation im Beat- und Quiz-Runner.
   Fuehrt die echten Funktionen aus app.js mit einem kleinen DOM-Doppel aus.
   Aufruf: node werkzeug/test-lesson-back-navigation.js */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");

function funktionAusApp(name, endMarker) {
  const start = source.indexOf("  function " + name + "(");
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error(name + " konnte in app.js nicht gefunden werden");
  return source.slice(start, end).trim();
}

function testUmgebung() {
  const nodes = [];

  class FakeNode {
    constructor(markup = "") {
      this.markup = markup;
      this.children = [];
      this.style = {};
      this.disabled = false;
      this.hidden = false;
      this.attributes = {};
      this.textContent = "";
      this.onclick = null;
      this.listeners = {};
      this.named = {};
      this.classes = new Set();
      this.classList = {
        add: (...names) => names.forEach(name => this.classes.add(name)),
        remove: (...names) => names.forEach(name => this.classes.delete(name)),
        toggle: (name, force) => {
          const on = force === undefined ? !this.classes.has(name) : !!force;
          if (on) this.classes.add(name); else this.classes.delete(name);
          return on;
        },
      };
      this._innerHTML = "";
    }
    appendChild(child) { this.children.push(child); return child; }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    addEventListener(type, fn) { this.listeners[type] = fn; }
    querySelector(selector) {
      if (!this.named[selector]) this.named[selector] = createNode(selector);
      return this.named[selector];
    }
    click() {
      if (this.disabled) return;
      if (typeof this.onclick === "function") return this.onclick();
      if (typeof this.listeners.click === "function") return this.listeners.click();
    }
    set innerHTML(value) {
      this._innerHTML = String(value);
      if (value === "") this.children = [];
    }
    get innerHTML() { return this._innerHTML; }
  }

  function createNode(markup = "") {
    const node = new FakeNode(markup);
    nodes.push(node);
    return node;
  }

  const context = {
    el: createNode,
    esc: value => String(value == null ? "" : value),
    stufeLabel: stage => "Stufe " + stage.stage,
    markDone() {},
    refreshSidebarChecks() {},
    refreshHeaderRing() {},
    xpForLesson: () => 10,
    allLessons: () => [],
    go() {},
    save() {},
    state: {},
    PERFEKT_BONUS: 5,
    lessonFocusFragments: html => String(html || "").split("|"),
    shuffleChoices: (options, answer) => ({ options, answer, map: options.map((_, i) => i) }),
    hilfeEinsetzen() {},
    installLessonTitleIntro() {},
    window: { scrollTo() {} },
  };

  return { context, createNode, nodes };
}

function finde(nodes, text) {
  const treffer = nodes.filter(node => node.markup.includes(text));
  if (treffer.length !== 1) throw new Error(text + ": genau ein Element erwartet, gefunden " + treffer.length);
  return treffer[0];
}

function assert(ok, message) {
  if (!ok) throw new Error(message);
}

function testBeatNavigation() {
  const env = testUmgebung();
  const renderBeatLesson = vm.runInNewContext(
    "(" + funktionAusApp("renderBeatLesson", "  /* ---------------- FLAG / CTF-AUFGABE") + ")",
    env.context
  );
  const main = env.createNode("main");
  renderBeatLesson(
    main,
    { id: "test", name: "Testpfad" },
    { stage: 1 },
    { id: "beat-test", title: "Beat-Test", beats: [{ kind: "text", html: "Eins A|Eins B" }, { kind: "text", html: "Zwei" }] }
  );

  const back = finde(env.nodes, "beat-zurueck");
  const next = finde(env.nodes, "beat-weiter");
  const info = finde(env.nodes, "beat-step");

  assert(back.disabled, "Beat: Zurueck muss im ersten Schritt deaktiviert sein");
  assert(info.textContent === "Schritt 1 von 2", "Beat: erster Schritt fehlt");
  assert(!next.disabled, "Beat: Textschritt muss weitergehen koennen");

  next.click();
  assert(back.hidden === false, "Beat: innerhalb eines langen Textes muss Zurueck sichtbar werden");
  assert(info.textContent === "Schritt 1 von 2", "Beat: zweiter Textgedanke darf noch keinen neuen Beat vortaeuschen");

  next.click();
  assert(!back.disabled, "Beat: Zurueck muss ab Schritt 2 aktiv sein");
  assert(info.textContent === "Schritt 2 von 2", "Beat: zweiter Schritt fehlt");

  back.click();
  assert(info.textContent === "Schritt 1 von 2", "Beat: Ruecksprung auf Schritt 1 fehlgeschlagen");
  assert(!next.disabled, "Beat: bereits gemeisterter Schritt darf nicht erneut sperren");

  back.click();
  assert(info.textContent === "Schritt 1 von 2", "Beat: Ruecksprung innerhalb des ersten Textes fehlgeschlagen");

  next.click();
  next.click();
  next.click();
  assert(info.textContent === "Fertig", "Beat: Ergebnisbildschirm fehlt");
  assert(!back.disabled, "Beat: Vom Ergebnis muss man zurueckblicken koennen");

  back.click();
  assert(info.textContent === "Schritt 2 von 2", "Beat: Ruecksprung vom Ergebnis fehlgeschlagen");
  assert(!next.disabled, "Beat: letzter gemeisterter Schritt muss passierbar bleiben");
}

function testQuizNavigation() {
  const env = testUmgebung();
  const renderQuiz = vm.runInNewContext(
    "(" + funktionAusApp("renderQuiz", "  /* ---------------- WISSENS-DATENBANK") + ")",
    env.context
  );
  const wrap = env.createNode("wrap");
  renderQuiz(wrap, { id: "test" }, {
    id: "quiz-test",
    questions: [
      { q: "Eins?", options: ["Ja", "Nein"], answer: 0, why: "Genau." },
      { q: "Zwei?", options: ["Nein", "Ja"], answer: 1, why: "Genau." },
    ],
  });

  const back = finde(env.nodes, "beat-zurueck");
  const next = finde(env.nodes, "beat-weiter");
  const info = finde(env.nodes, "beat-step");
  let optionen = env.nodes.filter(node => node.markup === ".beat-opts");

  assert(back.disabled, "Quiz: Zurueck muss bei Frage 1 deaktiviert sein");
  optionen[0].children[0].click();
  assert(!next.disabled, "Quiz: beantwortete Frage muss Weiter freischalten");
  next.click();
  assert(info.textContent === "Frage 2 von 2", "Quiz: zweite Frage fehlt");
  assert(!back.disabled, "Quiz: Zurueck muss ab Frage 2 aktiv sein");

  back.click();
  assert(info.textContent === "Frage 1 von 2", "Quiz: Ruecksprung auf Frage 1 fehlgeschlagen");
  assert(!next.disabled, "Quiz: gespeicherte Antwort muss Weiter freigeschaltet halten");

  next.click();
  optionen = env.nodes.filter(node => node.markup === ".beat-opts");
  optionen[optionen.length - 1].children[1].click();
  next.click();
  assert(info.textContent === "Ergebnis", "Quiz: Ergebnisbildschirm fehlt");
  assert(!back.disabled, "Quiz: Vom Ergebnis muss man zurueckblicken koennen");

  back.click();
  assert(info.textContent === "Frage 2 von 2", "Quiz: Ruecksprung vom Ergebnis fehlgeschlagen");
  assert(!next.disabled, "Quiz: Antwort muss nach Ruecksprung erhalten bleiben");
}

testBeatNavigation();
testQuizNavigation();
console.log("LEKTIONS-ZURUECK-TEST: BESTANDEN (Beats, Quiz, Ergebnis und Antwortspeicher).");
