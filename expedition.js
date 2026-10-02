/* Lernstudio: onboarding models, separate from curriculum completion. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else if (typeof define === "function" && define.amd) define([], factory);
  else root.LernExpedition = factory();
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const stations = [
    {
      id: "signal-order",
      title: "Ein Signal kommt an",
      kicker: "Reihenfolge",
      prompt: "Die Modelllampe empfaengt nur mit verbundenem Kabel ein Signal. Welche Reihenfolge bringt sie zum Leuchten?",
      choices: [
        { id: "send-connect", label: "Signal senden, dann verbinden" },
        { id: "connect-send", label: "Verbinden, dann Signal senden" },
        { id: "connect-only", label: "Nur verbinden" }
      ],
      correctChoice: "connect-send",
      success: "Das Kabel ist verbunden, dann kommt das Signal an: Die Modelllampe leuchtet.",
      tryAgain: "Die Lampe braucht zuerst eine Verbindung und danach ein Signal.",
      lessonId: "machine-0-fetch-decode-execute",
      scenePhase: 0
    },
    {
      id: "repeat-steps",
      title: "Drei Felder, eine Regel",
      kicker: "Wiederholung",
      prompt: "Im Modell markiert jeder Schritt genau ein neues Feld. Wie markiert die Figur genau drei Felder?",
      choices: [
        { id: "three-steps", label: "Einen Schritt dreimal wiederholen" },
        { id: "one-step", label: "Einen Schritt einmal ausfuehren" },
        { id: "four-steps", label: "Einen Schritt viermal wiederholen" }
      ],
      correctChoice: "three-steps",
      success: "Die Figur setzt drei Schritte. Drei Felder sind markiert: Eine Wiederholung fuehrt dieselbe Aktion mehrfach aus.",
      tryAgain: "Zaehle einen neuen Marker pro Schritt; das Ziel sind genau drei.",
      lessonId: "py-3-1",
      scenePhase: 1
    },
    {
      id: "permission-check",
      title: "Die Freigabe lesen",
      kicker: "Lokales Spielmodell",
      prompt: "Die Karte erlaubt im Spielmodell nur Fach A. Welche Aktion passt zu dieser Freigabe?",
      choices: [
        { id: "open-b", label: "Fach B oeffnen" },
        { id: "open-all", label: "Alle Faecher oeffnen" },
        { id: "open-a", label: "Fach A oeffnen" }
      ],
      correctChoice: "open-a",
      success: "Fach A oeffnet sich im Modell. Fach B bleibt geschlossen: Die Aktion passt genau zur Freigabe.",
      tryAgain: "Lies den Buchstaben auf der Freigabe und vergleiche ihn mit dem Fach.",
      lessonId: "sec-0-1",
      scenePhase: 2
    }
  ];

  const feedbackByChoice = {
    "signal-order": {
      "send-connect": "Beim Senden fehlt die Verbindung; das Signal erreicht die Lampe nicht. Verbinde zuerst und sende danach.",
      "connect-only": "Das Kabel ist verbunden, die Lampe bleibt dunkel. Es fehlt noch das Signal."
    },
    "repeat-steps": {
      "one-step": "Ein Feld ist markiert. Fuer drei Felder fehlen noch zwei Schritte; wiederhole dieselbe Aktion.",
      "four-steps": "Vier Felder waeren markiert, eines mehr als gewuenscht. Begrenze die Wiederholung auf drei Schritte."
    },
    "permission-check": {
      "open-b": "Fach B bleibt im Modell geschlossen. Die Karte nennt nur Fach A; waehle das freigegebene Fach.",
      "open-all": "Die Sammelaktion wird im Modell nicht ausgefuehrt: Sie umfasst auch Fach B. Waehle nur das freigegebene Fach A."
    }
  };

  for (const station of stations) {
    station.choices.forEach(Object.freeze);
    Object.freeze(station.choices);
    Object.freeze(station);
  }
  Object.freeze(stations);

  function evaluate(stationId, choiceId) {
    const station = stations.find(item => item.id === stationId);
    if (!station) return { correct: false, feedback: "Diese Station ist nicht verfuegbar." };
    if (!station.choices.some(choice => choice.id === choiceId)) {
      return { correct: false, feedback: "Waehle eine der angebotenen Aktionen. " + station.tryAgain };
    }
    const correct = choiceId === station.correctChoice;
    return { correct, feedback: correct ? station.success : feedbackByChoice[station.id][choiceId] };
  }

  // Existing lesson IDs include Unicode letters, for example in the math track.
  function validId(value) {
    return typeof value === "string" && value.length <= 128 && /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u.test(value);
  }

  function lessonEntries(curriculum) {
    if (!curriculum || !Array.isArray(curriculum.tracks)) return null;
    const entries = [], lessonIds = new Set(), trackIds = new Set();
    for (const track of curriculum.tracks) {
      if (!track || !validId(track.id) || trackIds.has(track.id) || typeof track.name !== "string" || !track.name.trim() || !Array.isArray(track.stages)) return null;
      trackIds.add(track.id);
      for (const stage of track.stages) {
        if (!stage || !Array.isArray(stage.lessons)) return null;
        for (const lesson of stage.lessons) {
          if (!lesson || !validId(lesson.id) || lessonIds.has(lesson.id) || typeof lesson.title !== "string" || !lesson.title.trim()) return null;
          lessonIds.add(lesson.id);
          entries.push({ id: lesson.id, title: lesson.title, trackId: track.id, trackTitle: track.name });
        }
      }
    }
    return entries;
  }

  function nextLesson(curriculum, state, lastLessonId) {
    const entries = lessonEntries(curriculum);
    if (!entries) return null;
    if (state == null) state = {};
    if (typeof state !== "object" || Array.isArray(state)) return null;
    const done = state.done === undefined ? {} : state.done;
    if (!done || typeof done !== "object" || Array.isArray(done)) return null;
    const pending = lesson => !(Object.prototype.hasOwnProperty.call(done, lesson.id) && done[lesson.id] === true);
    const anchorId = lastLessonId === undefined ? state.lastLesson : lastLessonId;
    if (anchorId != null) {
      if (!validId(anchorId)) return null;
      const anchor = entries.find(lesson => lesson.id === anchorId);
      if (!anchor) return null;
      // A bookmark selects a track, never permission to skip its earlier gaps.
      const inTrack = entries.find(lesson => lesson.trackId === anchor.trackId && pending(lesson));
      if (inTrack) return inTrack;
    }
    return entries.find(pending) || null;
  }

  function routeForLesson(curriculum, lessonId) {
    if (!validId(lessonId)) return null;
    const entries = lessonEntries(curriculum);
    return entries && entries.some(lesson => lesson.id === lessonId)
      ? "#lesson/" + encodeURIComponent(lessonId)
      : null;
  }

  return Object.freeze({ stations, evaluate, nextLesson, routeForLesson });
});
