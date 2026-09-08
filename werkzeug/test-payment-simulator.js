/* Zustands-, Sicherheits- und Auslieferungsvertrag des MYTHOS-Zahlungssimulators. */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const simulator = require("../payment-simulator.js");

const ROOT = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");
const A = simulator.ACTIONS;

let state = simulator.initialState();
assert.strictEqual(state.entitlement, "free");
assert.strictEqual(state.order, "none");
assert.strictEqual(state.grants, 0);

// Unzulässige Reihenfolge darf keinerlei fachliche Wirkung haben.
const premature = simulator.transition(state, A.VALID_WEBHOOK);
assert.strictEqual(premature.entitlement, "free");
assert.strictEqual(premature.grants, 0);
assert.strictEqual(state.history.length, 1, "transition darf den Eingabestatus nicht mutieren.");

state = simulator.transition(state, A.CREATE_CHECKOUT);
assert.strictEqual(state.order, "pending");
assert.strictEqual(state.payment, "requires_action");
assert.strictEqual(state.entitlement, "free");

// Ein gefälschter Webhook darf auch bei existierender Bestellung nie freischalten.
state = simulator.transition(state, A.FORGED_WEBHOOK);
assert.strictEqual(state.webhook, "rejected");
assert.strictEqual(state.entitlement, "free");
assert.strictEqual(state.grants, 0);
assert.strictEqual(state.missions.forgedRejected, true);

state = simulator.transition(state, A.CONFIRM_BANK);
assert.strictEqual(state.payment, "paid");
assert.strictEqual(state.entitlement, "free", "Bankstatus allein darf PRO nicht vergeben.");

state = simulator.transition(state, A.VALID_WEBHOOK);
assert.strictEqual(state.order, "paid");
assert.strictEqual(state.entitlement, "pro");
assert.strictEqual(state.grants, 1);
assert.deepStrictEqual(state.processedEventIds, ["evt_checkout_paid"]);

state = simulator.transition(state, A.DUPLICATE_WEBHOOK);
assert.strictEqual(state.entitlement, "pro");
assert.strictEqual(state.grants, 1, "Doppelwebhook hat eine zweite Freischaltung erzeugt.");
assert.strictEqual(state.processedEventIds.length, 1, "Doppelwebhook darf keine zweite Event-ID vortäuschen.");
assert.strictEqual(state.missions.duplicateIgnored, true);

// Refund bleibt bis zur bewusst erzeugten Rechnung gesperrt, damit der Lernpfad komplett ist.
const earlyRefund = simulator.transition(state, A.REFUND);
assert.strictEqual(earlyRefund.payment, "paid");
assert.strictEqual(earlyRefund.entitlement, "pro");

state = simulator.transition(state, A.CREATE_INVOICE);
assert.strictEqual(state.invoice, "created");
assert.strictEqual(state.missions.invoiceCreated, true);

state = simulator.transition(state, A.REFUND);
assert.strictEqual(state.payment, "refunded");
assert.strictEqual(state.order, "refunded");
assert.strictEqual(state.entitlement, "revoked");
assert.strictEqual(state.invoice, "correction_required");
assert.strictEqual(state.grants, 1);
assert.strictEqual(state.completed, true);
assert.strictEqual(Object.values(state.missions).every(Boolean), true);
assert.deepStrictEqual(state.processedEventIds, ["evt_checkout_paid", "evt_charge_refunded"]);

state = simulator.transition(state, A.RESET);
assert.deepStrictEqual(state, simulator.initialState(), "Reset stellt keinen sauberen Anfangszustand her.");

// Curriculum- und Engine-Anbindung.
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(read("curriculum.js"), sandbox);
const paymentStage = sandbox.window.CURRICULUM.tracks
  .find((track) => track.id === "srv").stages
  .find((stage) => stage.id === "srv-6");
const lesson = paymentStage.lessons.find((item) => item.id === "srv-6-13");
assert(lesson, "MYTHOS-Zahlungssimulation fehlt im Curriculum.");
assert(lesson.beats.some((beat) => beat.kind === "paymentflow"), "paymentflow-Beat fehlt.");
assert(paymentStage.lessons.indexOf(lesson) < paymentStage.lessons.findIndex((item) => item.type === "quiz"), "Simulation muss vor dem Abschlussquiz liegen.");

const app = read("app.js");
assert(app.includes('paymentflow: ['), "Universelle Bedienhilfe für paymentflow fehlt.");
assert(app.includes('b.kind === "paymentflow"'), "Beat-Routing für paymentflow fehlt.");
assert(app.includes("window.LSPaymentSimulator.mount"), "Simulator wird nicht durch die Beat-Engine gemountet.");

const studio = read("studio.html");
assert(studio.indexOf("payment-simulator.js") < studio.indexOf("app.js?v="), "Simulator muss vor app.js geladen werden.");
assert(require("./public-files").includes("payment-simulator.js"), "Simulator fehlt im Produktionsbau.");
assert(!read("pwa.js").includes("serviceWorker.register("), "Die aktuelle Webfassung soll keinen Offline-Modus versprechen.");

console.log("✓ MYTHOS-Zahlungssimulator bestanden: Angriff, Happy Path, Idempotenz, Rechnung, Refund und Auslieferung geprüft.");
