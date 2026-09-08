/* =========================================================
   LERNSTUDIO — deterministische Zahlungsfluss-Simulation
   ---------------------------------------------------------
   Reine Zustandsmaschine + kleine DOM-Ansicht. Kein Netzwerk,
   kein Stripe, kein echtes Geld und keine Geheimnisse.
   Laeuft im Browser und in Node fuer Regressionstests.
   ========================================================= */
(function (root) {
  "use strict";

  var ACTIONS = Object.freeze({
    CREATE_CHECKOUT: "create_checkout",
    CONFIRM_BANK: "confirm_bank",
    FORGED_WEBHOOK: "forged_webhook",
    VALID_WEBHOOK: "valid_webhook",
    DUPLICATE_WEBHOOK: "duplicate_webhook",
    CREATE_INVOICE: "create_invoice",
    REFUND: "refund",
    RESET: "reset"
  });

  var ACTION_LABELS = Object.freeze({
    create_checkout: "1 · Checkout starten",
    confirm_bank: "2 · Bank / 3-D Secure bestätigen",
    forged_webhook: "Angriff testen: falscher Webhook",
    valid_webhook: "3 · Echten Webhook zustellen",
    duplicate_webhook: "4 · Denselben Webhook erneut senden",
    create_invoice: "5 · Rechnung erzeugen",
    refund: "6 · Refund auslösen",
    reset: "↺ Neustart"
  });

  function initialState() {
    return {
      order: "none",
      checkout: "none",
      payment: "none",
      webhook: "none",
      entitlement: "free",
      invoice: "none",
      processedEventIds: [],
      grants: 0,
      missions: {
        forgedRejected: false,
        proGranted: false,
        duplicateIgnored: false,
        invoiceCreated: false,
        refundRevoked: false
      },
      history: [{
        kind: "info",
        title: "Kasse bereit",
        text: "Noch existieren weder Bestellung noch Zahlung. Das Konto ist FREE."
      }],
      lastMessage: "Starte beim Kaufknopf. Beobachte danach, welches System welchen Zustand besitzt.",
      completed: false
    };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function addHistory(state, kind, title, text) {
    state.history.push({ kind: kind, title: title, text: text });
    if (state.history.length > 8) state.history.shift();
    state.lastMessage = text;
  }

  function allMissionsDone(missions) {
    return Object.keys(missions).every(function (key) { return missions[key] === true; });
  }

  function availableActions(state) {
    return {
      create_checkout: state.order === "none",
      confirm_bank: state.payment === "requires_action",
      forged_webhook: state.order === "pending" && !state.missions.forgedRejected,
      valid_webhook: state.payment === "paid" && state.processedEventIds.indexOf("evt_checkout_paid") < 0,
      duplicate_webhook: state.missions.proGranted && !state.missions.duplicateIgnored,
      create_invoice: state.missions.proGranted && state.invoice === "none",
      refund: state.missions.proGranted && state.invoice === "created" && state.payment !== "refunded",
      reset: true
    };
  }

  function transition(current, action) {
    if (action === ACTIONS.RESET) return initialState();
    var state = clone(current);
    var allowed = availableActions(state);
    if (!allowed[action]) {
      addHistory(state, "warn", "Noch nicht möglich", "Dieser Schritt braucht zuerst den vorherigen bestätigten Zustand.");
      return state;
    }

    if (action === ACTIONS.CREATE_CHECKOUT) {
      state.order = "pending";
      state.checkout = "open";
      state.payment = "requires_action";
      addHistory(state, "info", "Bestellung angelegt", "Der Server wählt Price und Währung, speichert ORDER-1001 als pending und erstellt die Checkout Session. Kartendaten bleiben bei Stripe.");
    } else if (action === ACTIONS.CONFIRM_BANK) {
      state.checkout = "complete";
      state.payment = "paid";
      addHistory(state, "info", "Bank bestätigt", "3-D Secure ist abgeschlossen. Stripe kennt die Zahlung als bezahlt — deine Datenbank und der PRO-Zugang aber noch nicht.");
    } else if (action === ACTIONS.FORGED_WEBHOOK) {
      state.webhook = "rejected";
      state.missions.forgedRejected = true;
      addHistory(state, "bad", "Angriff abgewehrt", "Die Signatur passt nicht. Der Server antwortet ablehnend; Bestellung und Berechtigung bleiben unverändert.");
    } else if (action === ACTIONS.VALID_WEBHOOK) {
      state.webhook = "verified";
      state.order = "paid";
      state.entitlement = "pro";
      state.processedEventIds.push("evt_checkout_paid");
      state.grants += 1;
      state.missions.proGranted = true;
      addHistory(state, "good", "PRO serverseitig freigeschaltet", "Signatur, Modus, Betrag, Währung und Zuordnung stimmen. In einer idempotenten Transaktion werden Bestellung und Berechtigung gespeichert.");
    } else if (action === ACTIONS.DUPLICATE_WEBHOOK) {
      state.webhook = "duplicate";
      state.missions.duplicateIgnored = true;
      addHistory(state, "good", "Doppelwebhook ohne Doppelwirkung", "Event evt_checkout_paid ist bereits verarbeitet. Der Server bestätigt den Empfang, vergibt PRO aber nicht ein zweites Mal.");
    } else if (action === ACTIONS.CREATE_INVOICE) {
      state.invoice = "created";
      state.missions.invoiceCreated = true;
      addHistory(state, "info", "Rechnung bewusst erzeugt", "Die Rechnung wird mit Verkäuferdaten und Nummer erstellt. Zahlungsbestätigung und Rechnung sind getrennte Dokumente; die Verantwortung bleibt beim Verkäufer.");
    } else if (action === ACTIONS.REFUND) {
      state.payment = "refunded";
      state.order = "refunded";
      state.webhook = "refund_verified";
      state.entitlement = "revoked";
      state.invoice = "correction_required";
      state.processedEventIds.push("evt_charge_refunded");
      state.missions.refundRevoked = true;
      addHistory(state, "good", "Refund vollständig verarbeitet", "Der signierte Refund-Webhook setzt die Bestellung auf refunded, entzieht PRO und markiert die Abrechnung für die notwendige Korrektur.");
    }

    state.completed = allMissionsDone(state.missions);
    if (state.completed) {
      addHistory(state, "good", "System verstanden", "Du hast Angriff, Happy Path, Wiederholung, Rechnung und Rückabwicklung selbst geprüft. Das ist der vollständige Zahlungslebenszyklus.");
    }
    return state;
  }

  var NODE_COPY = {
    order: {
      none: ["Server / Order", "keine Bestellung", "idle"],
      pending: ["Server / Order", "ORDER-1001 · pending", "pending"],
      paid: ["Server / Order", "ORDER-1001 · paid", "good"],
      refunded: ["Server / Order", "ORDER-1001 · refunded", "warn"]
    },
    payment: {
      none: ["Stripe / Bank", "noch keine Zahlung", "idle"],
      requires_action: ["Stripe / Bank", "requires_action · 3DS", "pending"],
      paid: ["Stripe / Bank", "paid", "good"],
      refunded: ["Stripe / Bank", "refunded", "warn"]
    },
    webhook: {
      none: ["Webhook-Tür", "noch kein Ereignis", "idle"],
      rejected: ["Webhook-Tür", "Signatur abgelehnt", "bad"],
      verified: ["Webhook-Tür", "Signatur geprüft", "good"],
      duplicate: ["Webhook-Tür", "Duplikat erkannt", "good"],
      refund_verified: ["Webhook-Tür", "Refund geprüft", "good"]
    },
    entitlement: {
      free: ["Datenbank / Zugang", "FREE", "idle"],
      pro: ["Datenbank / Zugang", "PRO · aktiv", "good"],
      revoked: ["Datenbank / Zugang", "PRO · entzogen", "warn"]
    },
    invoice: {
      none: ["Abrechnung", "keine Rechnung", "idle"],
      created: ["Abrechnung", "Rechnung erstellt", "good"],
      correction_required: ["Abrechnung", "Korrektur erforderlich", "warn"]
    }
  };

  var MISSION_COPY = [
    ["forgedRejected", "Gefälschten Webhook abwehren"],
    ["proGranted", "PRO nur nach echtem Webhook vergeben"],
    ["duplicateIgnored", "Doppelwebhook ohne Doppelwirkung"],
    ["invoiceCreated", "Rechnung bewusst separat erzeugen"],
    ["refundRevoked", "Refund entzieht PRO wieder"]
  ];

  function nodeMarkup(key, value, icon) {
    var data = NODE_COPY[key][value];
    return '<div class="pay-node ' + data[2] + '" data-pay-node="' + key + '">' +
      '<span class="pay-node-icon" aria-hidden="true">' + icon + '</span>' +
      '<b>' + data[0] + '</b><small>' + data[1] + '</small></div>';
  }

  function mount(container, options) {
    options = options || {};
    if (!container || typeof container.innerHTML === "undefined") throw new Error("Payment-Simulator braucht ein DOM-Zielelement.");
    var state = initialState();
    var solvedNotified = false;

    container.innerHTML =
      '<section class="payment-sim" aria-label="Interaktive Simulation eines vollständigen Shop-Zahlungsablaufs">' +
        '<div class="pay-sim-head"><div><span class="pay-kicker">MYTHOS · KASSE VON INNEN</span><h3>Vom Kaufklick bis zum Refund</h3></div>' +
        '<span class="pay-mode">SIMULATION · KEIN ECHTES GELD</span></div>' +
        '<div class="pay-world" aria-live="polite"></div>' +
        '<div class="pay-message" role="status"></div>' +
        '<div class="pay-layout">' +
          '<div><h4>Deine Steuerung</h4><div class="pay-actions"></div></div>' +
          '<div><h4>Beweise</h4><div class="pay-missions"></div></div>' +
        '</div>' +
        '<div class="pay-log-wrap"><h4>Ereignisprotokoll</h4><ol class="pay-log"></ol></div>' +
      '</section>';

    var world = container.querySelector(".pay-world");
    var message = container.querySelector(".pay-message");
    var actions = container.querySelector(".pay-actions");
    var missions = container.querySelector(".pay-missions");
    var log = container.querySelector(".pay-log");

    Object.keys(ACTION_LABELS).forEach(function (action) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = action === ACTIONS.RESET ? "btn ghost pay-action reset" : "btn ghost pay-action";
      button.dataset.action = action;
      button.textContent = ACTION_LABELS[action];
      button.addEventListener("click", function () {
        state = transition(state, action);
        if (action === ACTIONS.RESET) solvedNotified = false;
        render();
      });
      actions.appendChild(button);
    });

    function render() {
      world.innerHTML =
        '<div class="pay-node browser"><span class="pay-node-icon" aria-hidden="true">🛒</span><b>Browser / Kunde</b><small>' +
          (state.checkout === "none" ? "Warenkorb" : state.checkout === "open" ? "bei Checkout" : "zurück im Shop") +
        '</small></div>' +
        '<span class="pay-arrow" aria-hidden="true">→</span>' +
        nodeMarkup("order", state.order, "🧾") +
        '<span class="pay-arrow" aria-hidden="true">→</span>' +
        nodeMarkup("payment", state.payment, "🏦") +
        '<span class="pay-arrow return" aria-hidden="true">↘</span>' +
        nodeMarkup("webhook", state.webhook, "🔏") +
        '<span class="pay-arrow" aria-hidden="true">→</span>' +
        nodeMarkup("entitlement", state.entitlement, "🔐") +
        '<span class="pay-arrow" aria-hidden="true">→</span>' +
        nodeMarkup("invoice", state.invoice, "📄");

      message.className = "pay-message" + (state.completed ? " complete" : "");
      message.innerHTML = '<b>' + (state.completed ? "✓ Mission vollständig" : "Aktueller Befund") + '</b><span>' + state.lastMessage + '</span>' +
        '<small>PRO-Vergaben: ' + state.grants + ' · verarbeitete Event-IDs: ' + state.processedEventIds.length + '</small>';

      var allowed = availableActions(state);
      Array.prototype.forEach.call(actions.querySelectorAll("[data-action]"), function (button) {
        button.disabled = !allowed[button.dataset.action];
        button.setAttribute("aria-disabled", button.disabled ? "true" : "false");
      });

      missions.innerHTML = MISSION_COPY.map(function (mission) {
        var done = state.missions[mission[0]];
        return '<div class="pay-mission ' + (done ? "done" : "") + '"><span>' + (done ? "✓" : "○") + '</span><b>' + mission[1] + '</b></div>';
      }).join("");

      log.innerHTML = state.history.slice().reverse().map(function (entry) {
        return '<li class="' + entry.kind + '"><b>' + entry.title + '</b><span>' + entry.text + '</span></li>';
      }).join("");

      if (state.completed && !solvedNotified) {
        solvedNotified = true;
        if (typeof options.onSolved === "function") options.onSolved(clone(state));
      }
    }

    render();
    return {
      dispatch: function (action) { state = transition(state, action); render(); return clone(state); },
      getState: function () { return clone(state); }
    };
  }

  var API = {
    ACTIONS: ACTIONS,
    initialState: initialState,
    availableActions: availableActions,
    transition: transition,
    mount: mount
  };

  if (typeof module !== "undefined" && module.exports) module.exports = API;
  root.LSPaymentSimulator = API;
})(typeof window !== "undefined" ? window : globalThis);
