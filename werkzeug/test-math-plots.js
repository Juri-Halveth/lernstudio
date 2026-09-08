/* Dauerhafter Regressionsaudit für alle interaktiven Mathe-Graphen. */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { compile, Plotter } = require("../plotter.js");

const ROOT = path.resolve(__dirname, "..");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, "curriculum.js"), "utf8"), sandbox);

const curriculum = sandbox.window.CURRICULUM;
const mathTrack = curriculum.tracks.find((track) => track.id === "matheanfassen");
assert(mathTrack, "Mathe-Lernpfad 'matheanfassen' fehlt.");

const plots = [];
for (const stage of mathTrack.stages) {
  for (const lesson of stage.lessons) {
    for (const [beatIndex, beat] of (lesson.beats || []).entries()) {
      if (beat.kind === "plot") plots.push({ stage, lesson, beat, beatIndex });
    }
  }
}

assert.strictEqual(plots.length, 25, "Unerwartete Zahl interaktiver Mathe-Plots; Audit bewusst aktualisieren.");

function close(actual, expected, tolerance = 1e-8, message = "") {
  assert(Math.abs(actual - expected) <= tolerance, `${message} erwartet ${expected}, erhalten ${actual}`);
}

function defaultScope(beat) {
  return Object.fromEntries((beat.params || []).map((param) => [param.name, param.value]));
}

function stepAligned(value, param) {
  const steps = (value - param.min) / param.step;
  return Math.abs(steps - Math.round(steps)) < 1e-8;
}

for (const { lesson, beat, beatIndex } of plots) {
  const where = `${lesson.id} Beat ${beatIndex + 1}`;
  assert(beat.fn && typeof beat.fn === "string", `${where}: fn fehlt.`);
  assert(beat.view, `${where}: view fehlt.`);
  for (const key of ["xmin", "xmax", "ymin", "ymax"]) {
    assert(Number.isFinite(beat.view[key]), `${where}: view.${key} ist keine endliche Zahl.`);
  }
  assert(beat.view.xmin < beat.view.xmax, `${where}: x-Bereich ist umgekehrt oder leer.`);
  assert(beat.view.ymin < beat.view.ymax, `${where}: y-Bereich ist umgekehrt oder leer.`);

  const params = beat.params || [];
  assert.strictEqual(new Set(params.map((param) => param.name)).size, params.length, `${where}: doppelte Parameter.`);
  for (const param of params) {
    assert(param.name && param.label, `${where}: Parametername oder Label fehlt.`);
    assert(Number.isFinite(param.min) && Number.isFinite(param.max) && Number.isFinite(param.step) && Number.isFinite(param.value), `${where}: ungültiger Parameter ${param.name}.`);
    assert(param.min <= param.value && param.value <= param.max, `${where}: Standardwert von ${param.name} außerhalb des Bereichs.`);
    assert(param.step > 0 && stepAligned(param.value, param), `${where}: Standardwert von ${param.name} liegt nicht auf dem Slider-Raster.`);
  }

  const allowedVariables = new Set(["x", ...params.map((param) => param.name)]);
  for (const formulaName of ["fn", "fn2"]) {
    if (!beat[formulaName]) continue;
    const expression = compile(beat[formulaName]);
    for (const variable of expression.vars) {
      assert(allowedVariables.has(variable), `${where}: ${formulaName} nutzt unbekannte Variable '${variable}'.`);
    }

    const scopes = [defaultScope(beat)];
    if (beat.challenge && beat.challenge.target) scopes.push({ ...defaultScope(beat), ...beat.challenge.target });
    for (const scope of scopes) {
      let finiteSamples = 0;
      for (let index = 0; index <= 40; index++) {
        const x = beat.view.xmin + (beat.view.xmax - beat.view.xmin) * index / 40;
        if (Number.isFinite(expression.eval({ ...scope, x }))) finiteSamples++;
      }
      assert(finiteSamples >= 30, `${where}: ${formulaName} liefert zu wenige darstellbare Werte.`);
    }
  }

  if (beat.challenge && beat.challenge.target) {
    for (const [name, value] of Object.entries(beat.challenge.target)) {
      const param = params.find((item) => item.name === name);
      assert(param, `${where}: Challenge-Ziel '${name}' hat keinen Slider.`);
      assert(value >= param.min && value <= param.max, `${where}: Challenge-Ziel '${name}' liegt außerhalb des Sliders.`);
      assert(stepAligned(value, param), `${where}: Challenge-Ziel '${name}' ist mit dem Slider nicht erreichbar.`);
    }
    assert(Number.isFinite(beat.challenge.tol) && beat.challenge.tol >= 0, `${where}: Challenge-Toleranz ungültig.`);
    assert(beat.challenge.prompt && beat.challenge.done, `${where}: Challenge-Anleitung oder Erfolgstext fehlt.`);
  }
}

// Bildschirmkoordinate: Größere mathematische y-Werte müssen weiter oben liegen.
const projection = { V: { ymin: -10, ymax: 10 }, H: 400 };
assert(
  Plotter.prototype._py.call(projection, 5) < Plotter.prototype._py.call(projection, -5),
  "Plotter-y-Achse ist invertiert: positive Mathematikrichtung muss nach oben zeigen."
);

// Lineare Funktionen: Das Vorzeichen des y-Werts darf nicht mit der Steigung verwechselt werden.
const linear = compile("m*x+b");
for (const m of [0.5, 1, 2, 3]) {
  assert(linear.eval({ x: 2, m, b: -4 }) > linear.eval({ x: -2, m, b: -4 }), `Positive Steigung m=${m} steigt nicht.`);
}
for (const m of [-0.5, -1, -2, -3]) {
  assert(linear.eval({ x: 2, m, b: 4 }) < linear.eval({ x: -2, m, b: 4 }), `Negative Steigung m=${m} fällt nicht.`);
}
close(linear.eval({ x: -3, m: 2, b: 0 }), -6, 1e-10, "y=2x links");
assert(linear.eval({ x: 3, m: 2, b: 0 }) > linear.eval({ x: -3, m: 2, b: 0 }), "y=2x muss trotz negativem linken y-Wert steigen.");

// Tangente und Sekante an x² berühren beziehungsweise schneiden die angegebenen Punkte.
const parabola = compile("x^2");
const tangent = compile("2*p*x-p^2");
for (const p of [-3, -1, 0, 1, 3]) {
  close(tangent.eval({ x: p, p }), parabola.eval({ x: p }), 1e-10, `Tangente bei p=${p}`);
  const numericSlope = (tangent.eval({ x: p + 1e-5, p }) - tangent.eval({ x: p - 1e-5, p })) / 2e-5;
  close(numericSlope, 2 * p, 1e-7, `Tangentensteigung bei p=${p}`);
}
const secant = compile("(2*p+h)*(x-p)+p^2");
for (const [p, h] of [[-1, 0.25], [0, 1], [1, 3]]) {
  close(secant.eval({ x: p, p, h }), parabola.eval({ x: p }), 1e-10, "Sekante am Startpunkt");
  close(secant.eval({ x: p + h, p, h }), parabola.eval({ x: p + h }), 1e-10, "Sekante am Endpunkt");
}

// Allgemeine Ableitungsformeln gegen numerische Ableitung.
const quadratic = compile("a*x^2+b*x+c");
const quadraticDerivative = compile("2*a*x+b");
for (const scope of [{ a: 1, b: 0, c: 4 }, { a: -2, b: 3, c: -1 }, { a: 0.5, b: -2, c: 7 }]) {
  for (const x of [-2, 0, 2]) {
    const h = 1e-5;
    const numerical = (quadratic.eval({ ...scope, x: x + h }) - quadratic.eval({ ...scope, x: x - h })) / (2 * h);
    close(quadraticDerivative.eval({ ...scope, x }), numerical, 1e-6, "Quadratische Ableitung");
  }
}
for (let n = 1; n <= 5; n++) {
  const power = compile("x^n");
  const derivative = compile("n*x^(n-1)");
  for (const x of [-1.5, -0.5, 0.5, 1.5]) {
    const h = 1e-5;
    const numerical = (power.eval({ x: x + h, n }) - power.eval({ x: x - h, n })) / (2 * h);
    close(derivative.eval({ x, n }), numerical, 2e-4, `Potenzableitung n=${n}`);
  }
}

// Besondere fachliche Zielaussagen aus den Aufgaben.
const roots = compile("x^2-4");
close(roots.eval({ x: -2 }), 0, 1e-10, "Nullstelle -2");
close(roots.eval({ x: 2 }), 0, 1e-10, "Nullstelle +2");
const growth = compile("1000*(1+p)^x");
const decay = compile("1000*(1-p)^x");
assert(growth.eval({ x: 10, p: 0.05 }) > growth.eval({ x: 9, p: 0.05 }), "Positives Wachstum muss steigen.");
assert(decay.eval({ x: 10, p: 0.1 }) < decay.eval({ x: 9, p: 0.1 }), "Positive Abnahme muss fallen.");
close(compile("sin(x)").eval({ x: Math.PI / 2 }), 1, 1e-10, "sin(pi/2)");
close(compile("cos(x)").eval({ x: 0 }), 1, 1e-10, "cos(0)");

console.log(`✓ Mathe-Plot-Audit bestanden: ${plots.length} Übungen, Formeln, Slider, Zielwerte und Achsenrichtung geprüft.`);
