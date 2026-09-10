/* =========================================================
   LERNSTUDIO — kontogebundener Fortschritt
   ---------------------------------------------------------
   Reine, testbare Supabase-Ladeschicht. Der Browser bleibt
   ein schneller Offline-Zwischenspeicher; die Serverzeile
   pro auth.uid() ist die dauerhafte Kontowahrheit.
   ========================================================= */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LSAccountProgress = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MAX_MAP_KEYS = 5000;
  const MAX_EXTRA_BYTES = 250000;

  function cleanBoolMap(value) {
    const out = {};
    if (!value || typeof value !== "object" || Array.isArray(value)) return out;
    Object.keys(value).slice(0, MAX_MAP_KEYS).forEach(key => {
      if (typeof key === "string" && key.length <= 160 && value[key] === true) out[key] = true;
    });
    return out;
  }

  function cleanExtraState(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    try {
      const text = JSON.stringify(value);
      if (text.length > MAX_EXTRA_BYTES) return {};
      return JSON.parse(text);
    } catch (e) {
      return {};
    }
  }

  function cleanText(value, max, fallback) {
    if (typeof value !== "string") return fallback;
    const text = value.trim().slice(0, max);
    return text || fallback;
  }

  function normalizeState(value) {
    const source = value && typeof value === "object" ? value : {};
    return {
      name: cleanText(source.name, 28, "Lernender"),
      avatar: cleanText(source.avatar, 16, "🧑‍💻"),
      done: cleanBoolMap(source.done),
      perfect: cleanBoolMap(source.perfect),
      theme: source.theme === "light" ? "light" : "dark",
      lastLesson: cleanText(source.lastLesson, 160, null),
      dv: 5,
    };
  }

  // Konfliktregel:
  // - Abschlüsse/Perfekt-Ergebnisse sind monoton und werden vereinigt.
  // - Existiert bereits eine Serverzeile, ist sie für letzten Lernort und Profil
  //   maßgeblich. So überschreibt ein alter Gerätecache keinen neueren Serverstand.
  // - Gerätespezifische Zusatzdaten werden flach vereinigt; lokale, noch nicht
  //   hochgeladene Schlüssel bleiben dabei erhalten.
  function mergeState(localState, localExtra, remoteRow) {
    const local = normalizeState(localState);
    const remote = remoteRow && typeof remoteRow === "object" ? remoteRow : null;
    if (!remote) return { state: local, extraState: cleanExtraState(localExtra) };

    const state = {
      name: cleanText(remote.display_name, 28, local.name),
      avatar: cleanText(remote.avatar, 16, local.avatar),
      done: Object.assign({}, local.done, cleanBoolMap(remote.done)),
      perfect: Object.assign({}, local.perfect, cleanBoolMap(remote.perfect)),
      theme: remote.theme === "light" || remote.theme === "dark" ? remote.theme : local.theme,
      lastLesson: cleanText(remote.last_lesson, 160, local.lastLesson),
      dv: 5,
    };
    const remoteExtra = cleanExtraState(remote.extra_state);
    const localExtraClean = cleanExtraState(localExtra);
    const extraState = Object.assign({}, remoteExtra);
    Object.keys(localExtraClean).forEach(key => {
      const localValue = localExtraClean[key];
      const remoteValue = remoteExtra[key];
      extraState[key] = localValue && remoteValue
        && typeof localValue === "object" && !Array.isArray(localValue)
        && typeof remoteValue === "object" && !Array.isArray(remoteValue)
        ? Object.assign({}, remoteValue, localValue)
        : localValue;
    });
    return { state, extraState };
  }

  function payloadFor(stateValue, extraValue) {
    const state = normalizeState(stateValue);
    return {
      p_done: state.done,
      p_perfect: state.perfect,
      p_last_lesson: state.lastLesson,
      p_display_name: state.name,
      p_avatar: state.avatar,
      p_theme: state.theme,
      p_extra_state: cleanExtraState(extraValue),
    };
  }

  function createClient(options) {
    const baseUrl = String(options && options.baseUrl || "").replace(/\/+$/, "");
    const apiKey = String(options && options.apiKey || "");
    const fetchImpl = options && options.fetchImpl;
    const getSession = options && options.getSession;
    const refreshSession = options && options.refreshSession;
    if (!baseUrl || !apiKey || typeof fetchImpl !== "function" || typeof getSession !== "function") {
      throw new Error("Account-Fortschritt: unvollständige Client-Konfiguration");
    }

    function headers(token, json) {
      const out = { "apikey": apiKey, "Authorization": "Bearer " + token };
      if (json) out["Content-Type"] = "application/json";
      return out;
    }

    async function request(path, init, expectedUser) {
      let session = getSession();
      if (!session || !session.access_token || !session.user_id) return { ok: false, status: 401, response: null };
      const originalUserId = expectedUser || session.user_id;
      const sameAccount = () => getSession()?.user_id === originalUserId;
      if (!sameAccount()) return { ok: false, status: 409, response: null };
      const run = async token => {
        const cfg = Object.assign({}, init || {});
        cfg.headers = Object.assign({}, cfg.headers || {}, headers(token, !!cfg.body));
        const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15000);
        try { return await fetchImpl(baseUrl + path, { ...cfg, signal: controller.signal }); }
        finally { clearTimeout(timeout); }
      };
      let response;
      try {
        response = await run(session.access_token);
      } catch (e) {
        return { ok: false, status: 0, response: null };
      }
      if (!sameAccount()) return { ok: false, status: 409, response: null };
      if (response.status === 401 && typeof refreshSession === "function") {
        session = await refreshSession();
        if (!sameAccount() || (session && session.user_id !== originalUserId)) {
          return { ok: false, status: 401, response: null };
        }
        if (session && session.access_token) {
          try { response = await run(session.access_token); }
          catch (e) { return { ok: false, status: 0, response: null }; }
        }
      }
      if (!sameAccount()) return { ok: false, status: 409, response: null };
      return { ok: !!response.ok, status: response.status, response };
    }

    async function save(state, extraState, expectedUser) {
      const result = await request("/rest/v1/rpc/sync_user_progress", {
        method: "POST",
        body: JSON.stringify(payloadFor(state, extraState)),
      }, expectedUser);
      return { ok: result.ok, status: result.status };
    }

    async function load(localState, localExtra) {
      const userId = getSession()?.user_id;
      const result = await request(
        "/rest/v1/user_progress?select=done,perfect,last_lesson,display_name,avatar,theme,extra_state,updated_at&limit=1",
        { method: "GET" }, userId
      );
      if (!result.ok) {
        const local = mergeState(localState, localExtra, null);
        return { ok: false, status: result.status, state: local.state, extraState: local.extraState };
      }
      let rows;
      try { rows = await result.response.json(); } catch (e) { return { ok: false, status: 502 }; }
      if (!Array.isArray(rows) || rows.length > 1 || (rows[0] && (typeof rows[0] !== "object" || Array.isArray(rows[0])))) return { ok: false, status: 502 };
      if (!userId || userId !== getSession()?.user_id) return { ok: false, status: 409 };
      const merged = mergeState(localState, localExtra, rows && rows[0]);
      const saved = await save(merged.state, merged.extraState, userId);
      return {
        ok: saved.ok,
        status: saved.status,
        state: merged.state,
        extraState: merged.extraState,
      };
    }

    async function reset() {
      const result = await request("/rest/v1/rpc/reset_user_progress", {
        method: "POST",
        body: "{}",
      });
      return { ok: result.ok, status: result.status };
    }

    return { load, save, reset };
  }

  return {
    cleanBoolMap,
    cleanExtraState,
    normalizeState,
    mergeState,
    payloadFor,
    createClient,
  };
});
