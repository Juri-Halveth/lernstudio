/* Lernstudio: device-local learning data. No account, token or claim authority. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.LearningProfile = factory();
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const KEY = "lernstudio_open_v1";
  const ANIMALS = Object.freeze(["🦊", "🐼", "🦉", "🐸", "🐱", "🐶", "🐰", "🐻", "🦋", "🐢", "🐙", "🐧"]);
  const COLORS = Object.freeze(["violet", "mint", "sun", "rose", "ocean"]);
  const ACCESSORIES = Object.freeze(["", "🌱", "⭐", "🌸", "🎧", "👑"]);
  const plain = value => !!value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
  function defaults() { return { version: 1, generation: "g_initial", name: "Lernender", avatar: "🦊", color: "violet", accessory: "🌱", done: {}, perfect: {}, theme: "dark", lastLesson: null, dv: 5 }; }
  function createStore(storage, curriculum) {
    const lessons = new Map();
    curriculum.tracks.forEach(t => t.stages.forEach(s => s.lessons.forEach(l => lessons.set(l.id, l))));
    let persistence = true;
    let recovered = false;
    let recoverySaved = null;
    let lastRead = null;
    function validate(value, legacy) {
      if (!plain(value) || !plain(value.done)) throw new Error("Ungültiges Lernprofil.");
      if (!legacy && value.version !== 1) throw new Error("Diese Profilversion wird noch nicht unterstützt.");
      const clean = defaults();
      const allowed = new Set(Object.keys(clean));
      if (!legacy && Object.keys(value).some(k => !allowed.has(k))) throw new Error("Die Datei enthält unbekannte Profilfelder.");
      if (!legacy && (typeof value.generation !== "string" || !/^g_[a-zA-Z0-9-]{1,80}$/.test(value.generation))) throw new Error("Ungültige Profilgeneration.");
      if (!legacy) clean.generation = value.generation;
      if (typeof value.name !== "string" || value.name.length > 28) throw new Error("Der Profilname ist ungültig.");
      clean.name = value.name;
      if (!legacy && !ANIMALS.includes(value.avatar)) throw new Error("Unbekanntes Tierchen.");
      clean.avatar = ANIMALS.includes(value.avatar) ? value.avatar : "🦊";
      for (const [field, values] of [["color", COLORS], ["accessory", ACCESSORIES], ["theme", ["light", "dark"]]]) {
        if (value[field] === undefined && legacy) continue;
        if (!values.includes(value[field])) throw new Error("Ungültige Profileinstellung: " + field);
        clean[field] = value[field];
      }
      for (const field of ["done", "perfect"]) {
        const source = value[field] === undefined && legacy ? {} : value[field];
        if (!plain(source)) throw new Error("Ungültiger Lernstand.");
        for (const id of Object.keys(source)) {
          if (!lessons.has(id) || typeof source[id] !== "boolean") {
            if (legacy) continue;
            throw new Error("Die Sicherung passt nicht zum aktuellen Lernangebot.");
          }
          if (source[id] === true) clean[field][id] = true;
        }
      }
      for (const id of Object.keys(clean.perfect)) {
        if (!clean.done[id] || lessons.get(id).type !== "quiz") {
          if (legacy) delete clean.perfect[id];
          else throw new Error("Ein Quiz-Ergebnis passt nicht zum Lernstand.");
        }
      }
      if (value.lastLesson != null && !lessons.has(value.lastLesson)) {
        if (!legacy) throw new Error("Die zuletzt gelernte Lektion ist unbekannt.");
      } else clean.lastLesson = value.lastLesson || null;
      return clean;
    }
    function mergeMarks(value) {
      for (const [id, lesson] of lessons) {
        if (storage.getItem(KEY + ":" + value.generation + ":done:" + id) === "1") value.done[id] = true;
        if (value.done[id] && lesson.type === "quiz" && storage.getItem(KEY + ":" + value.generation + ":perfect:" + id) === "1") value.perfect[id] = true;
      }
      return value;
    }
    function preserveRejected(raw) {
      if (recoverySaved === raw) return;
      const key = KEY + ":recovery:" + Date.now() + ":" + Math.random().toString(36).slice(2);
      storage.setItem(key, raw);
      if (storage.getItem(key) !== raw) throw new Error("Die Originaldaten konnten nicht gesichert werden.");
      recoverySaved = raw;
    }
    function read() {
      try {
        const raw = storage.getItem(KEY);
        if (raw) {
          try { const value = mergeMarks(validate(JSON.parse(raw), false)); lastRead = structuredClone(value); return value; }
          catch (error) { recovered = true; preserveRejected(raw); return defaults(); }
        }
        const previous = storage.getItem("lernstudio_v1");
        if (previous) { const migrated = validate(JSON.parse(previous), true); write(migrated); return migrated; }
      } catch (error) { recovered = true; persistence = false; }
      return defaults();
    }
    function write(value, replacing) {
      const clean = validate(value, false);
      try {
        const raw = storage.getItem(KEY);
        let current = null;
        if (raw) {
          try { current = validate(JSON.parse(raw), false); }
          catch (error) { preserveRejected(raw); recovered = true; }
        }
        if (!replacing && current && current.generation !== clean.generation) return read();
        if (!replacing && current) {
          for (const field of ["name", "avatar", "color", "accessory", "theme", "lastLesson"]) {
            if (lastRead && clean[field] === lastRead[field]) clean[field] = current[field];
          }
          Object.assign(clean.done, current.done); Object.assign(clean.perfect, current.perfect);
        }
        for (const field of ["done", "perfect"]) {
          for (const id of Object.keys(clean[field])) storage.setItem(KEY + ":" + clean.generation + ":" + field + ":" + id, "1");
        }
        mergeMarks(clean);
        storage.setItem(KEY, JSON.stringify(clean)); persistence = true;
        lastRead = structuredClone(clean);
      }
      catch (error) { persistence = false; }
      return clean;
    }
    function replace(value) {
      const clean = validate(value, false);
      clean.generation = "g_" + (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2));
      return write(clean, true);
    }
    function importText(text) {
      if (typeof text !== "string" || text.length > 262144) throw new Error("Die Sicherung ist zu groß (maximal 256 KB).");
      const parsed = JSON.parse(text);
      return validate(parsed, parsed.version === undefined && parsed.dv === 5);
    }
    return { read, write, replace, validate, importText, canPersist: () => persistence, recovered: () => recovered, lessonCount: lessons.size };
  }
  return Object.freeze({ KEY, ANIMALS, COLORS, ACCESSORIES, defaults, createStore });
});
