/* Existing Lernstudio email accounts. Public browser key; no billing dependency. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.LearningAccount = factory();
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const URL = "https://nqvjsfdtubfsobrmqtbs.supabase.co";
  const KEY = "sb_publishable_irndXLddtkSIRtH2arWXsA_LYQuTrk4";
  const SESSION_KEY = "ls_session";
  const REDIRECT = "https://www.mein-lernstudio.com/studio.html";
  function createClient({ storage, fetchImpl }) {
    let session = null, epoch = 0, refreshPending = null, recovery = false;
    function readSaved() { try { return JSON.parse(storage.getItem(SESSION_KEY) || "null"); } catch (_) { return null; } }
    function persist(value) {
      try { if (value) storage.setItem(SESSION_KEY, JSON.stringify(value)); else storage.removeItem(SESSION_KEY); } catch (_) { /* In-memory login still works. */ }
    }
    function clear() { epoch++; session = null; recovery = false; persist(null); }
    async function request(path, method = "GET", body, token) {
      const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetchImpl(URL + path, { method, signal: controller.signal,
          headers: { apikey: KEY, ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: "Bearer " + token } : {}) },
          ...(body ? { body: JSON.stringify(body) } : {}) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const error = new Error(response.status === 429 ? "Zu viele Versuche. Bitte warte kurz und versuche es erneut." : "Das Konto konnte nicht bestätigt werden. Bitte prüfe deine Angaben oder melde dich erneut an.");
          error.status = response.status; throw error;
        }
        return data;
      } catch (error) {
        if (error.status) throw error;
        throw new Error("Die Verbindung zum Konto ist gerade nicht verfügbar. Bitte versuche es erneut.");
      } finally { clearTimeout(timeout); }
    }
    async function accept(data, expectedEpoch, expectedUser) {
      if (!data || typeof data.access_token !== "string" || !data.access_token) throw new Error("Die Anmeldung enthält keine gültige Sitzung.");
      const user = await request("/auth/v1/user", "GET", undefined, data.access_token);
      if (!user || typeof user.id !== "string" || !user.id || (expectedUser && user.id !== expectedUser)) throw new Error("Die Sitzung gehört nicht zum erwarteten Konto. Bitte melde dich neu an.");
      if (epoch !== expectedEpoch) throw new Error("Die Anmeldung wurde inzwischen beendet oder gewechselt.");
      session = { access_token: data.access_token, refresh_token: data.refresh_token || "",
        expires_at: data.expires_in ? Date.now() + Number(data.expires_in) * 1000 : Number(data.expires_at) || 0,
        email: user.email || "", user_id: user.id };
      persist(session); return session;
    }
    async function refreshSession() {
      if (refreshPending) return refreshPending;
      const before = session, run = epoch;
      if (!before?.refresh_token) return null;
      const operation = (async () => {
        try { return await accept(await request("/auth/v1/token?grant_type=refresh_token", "POST", { refresh_token: before.refresh_token }), run, before.user_id); }
        catch (error) { if (epoch === run && [400, 401, 403].includes(error.status)) clear(); return null; }
      })();
      refreshPending = operation;
      try { return await operation; } finally { if (refreshPending === operation) refreshPending = null; }
    }
    async function restore(hash) {
      const run = ++epoch; session = null; recovery = false;
      const params = new URLSearchParams(String(hash || "").replace(/^#/, ""));
      if (params.has("error") || params.has("error_description")) throw new Error("Dieser E-Mail-Link ist abgelaufen oder ungültig. Fordere bitte einen neuen Link an.");
      const callback = params.get("access_token");
      let candidate = callback ? { access_token: callback, refresh_token: params.get("refresh_token"), expires_in: Number(params.get("expires_in")) } : readSaved();
      if (!candidate?.access_token) return null;
      try {
        if (!callback && candidate.refresh_token && Number(candidate.expires_at) < Date.now() + 60000) {
          candidate = await request("/auth/v1/token?grant_type=refresh_token", "POST", { refresh_token: candidate.refresh_token });
        }
        const result = await accept(candidate, run);
        recovery = !!callback && params.get("type") === "recovery"; return result;
      } catch (error) { if (epoch === run && [400, 401, 403].includes(error.status)) clear(); throw error; }
    }
    async function signIn(email, password) {
      const run = ++epoch; session = null; recovery = false;
      return accept(await request("/auth/v1/token?grant_type=password", "POST", { email: email.trim(), password }), run);
    }
    async function signUp(email, password) {
      const run = ++epoch; session = null; recovery = false;
      const data = await request("/auth/v1/signup?redirect_to=" + encodeURIComponent(REDIRECT), "POST", { email: email.trim(), password });
      if (data.access_token) return accept(data, run);
      return null;
    }
    async function recover(email) { await request("/auth/v1/recover?redirect_to=" + encodeURIComponent(REDIRECT), "POST", { email: email.trim() }); }
    async function updatePassword(password) {
      const before = session; if (!before || !recovery) throw new Error("Öffne zuerst den Link aus deiner E-Mail.");
      await request("/auth/v1/user", "PUT", { password }, before.access_token);
      if (session === before) recovery = false;
    }
    async function signOut() {
      const before = session; clear();
      if (before) { try { await request("/auth/v1/logout?scope=local", "POST", {}, before.access_token); } catch (_) { return false; } }
      return true;
    }
    async function deleteAccount() {
      const before = session; if (!before) throw new Error("Bitte melde dich zuerst an.");
      await request("/functions/v1/delete-account", "POST", {}, before.access_token);
      if (session === before) clear();
    }
    return { restore, signIn, signUp, recover, updatePassword, signOut, deleteAccount, refreshSession,
      getSession: () => session, isRecovery: () => recovery };
  }
  return { createClient, URL, KEY, SESSION_KEY, REDIRECT };
});
