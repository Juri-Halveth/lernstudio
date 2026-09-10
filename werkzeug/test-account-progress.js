/* Regressionstest fuer kontogebundenen Lernfortschritt und geschlossene Rubriken.
   Aufruf: node werkzeug/test-account-progress.js */
"use strict";

const fs = require("fs");
const path = require("path");
const progress = require("../account-progress.js");

const ROOT = path.resolve(__dirname, "..");

function assert(ok, message) {
  if (!ok) throw new Error(message);
}

function response(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    async json() { return body; },
  };
}

function testMerge() {
  const merged = progress.mergeState(
    {
      name: "Lokal",
      avatar: "🦊",
      done: { "lesson-local": true, kaputt: false },
      perfect: { "quiz-local": true },
      theme: "dark",
      lastLesson: "lesson-local",
    },
    { marketing: { lokal: 1 }, nurLokal: true },
    {
      display_name: "Server",
      avatar: "🦉",
      done: { "lesson-server": true },
      perfect: { "quiz-server": true },
      theme: "light",
      last_lesson: "lesson-server",
      extra_state: { marketing: { server: 1 }, nurServer: true },
    }
  );
  assert(merged.state.done["lesson-local"] && merged.state.done["lesson-server"], "Abschluesse wurden nicht vereinigt");
  assert(!("kaputt" in merged.state.done), "Nicht-true-Abschluss wurde uebernommen");
  assert(merged.state.perfect["quiz-local"] && merged.state.perfect["quiz-server"], "Perfekt-Zustand wurde nicht vereinigt");
  assert(merged.state.lastLesson === "lesson-server", "Server-Lernort muss beim Login gewinnen");
  assert(merged.state.name === "Server" && merged.state.avatar === "🦉", "Serverprofil wurde nicht wiederhergestellt");
  assert(merged.state.theme === "light", "Server-Theme wurde nicht wiederhergestellt");
  assert(merged.extraState.nurLokal && merged.extraState.nurServer, "Zusatz-Lernzustand wurde nicht vereinigt");
  assert(merged.extraState.marketing.lokal === 1, "Noch nicht synchronisierter lokaler Projektstand ging verloren");
  assert(merged.extraState.marketing.server === 1, "Server-Projektstand wurde nicht wiederhergestellt");
}

async function testLoadAndSave() {
  const calls = [];
  let session = { access_token: "token-a", user_id: "konto-a" };
  const client = progress.createClient({
    baseUrl: "https://example.supabase.co",
    apiKey: "publishable",
    getSession: () => session,
    refreshSession: async () => session,
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      if (url.includes("/user_progress?")) {
        return response(200, [{
          done: { server: true },
          perfect: {},
          last_lesson: "server",
          display_name: "Juri",
          avatar: "🧑‍💻",
          theme: "dark",
          extra_state: {},
        }]);
      }
      if (url.endsWith("/rpc/sync_user_progress")) return response(200, {});
      throw new Error("Unerwartete URL " + url);
    },
  });
  const result = await client.load({ done: { local: true }, perfect: {}, lastLesson: "local" }, {});
  assert(result.ok, "Load+Sync muss erfolgreich sein");
  assert(result.state.done.local && result.state.done.server, "Lokaler und Serverfortschritt fehlen");
  assert(calls.length === 2, "Erwartet werden genau GET und atomarer RPC-Sync");
  assert(calls[0].init.headers.Authorization === "Bearer token-a", "Bearer-Token fehlt beim Lesen");
  const payload = JSON.parse(calls[1].init.body);
  assert(payload.p_done.local && payload.p_done.server, "Vereinigter Stand wurde nicht zum Server geschrieben");
}

async function test401RefreshAndReset() {
  const auth = [];
  let session = { access_token: "alt", user_id: "konto-a" };
  let first = true;
  const client = progress.createClient({
    baseUrl: "https://example.supabase.co",
    apiKey: "publishable",
    getSession: () => session,
    refreshSession: async () => {
      session = { access_token: "neu", user_id: "konto-a" };
      return session;
    },
    fetchImpl: async (url, init) => {
      auth.push(init.headers.Authorization);
      if (url.includes("/user_progress?") && first) {
        first = false;
        return response(401, {});
      }
      if (url.includes("/user_progress?")) return response(200, []);
      return response(200, {});
    },
  });
  const loaded = await client.load({ done: {}, perfect: {} }, {});
  assert(loaded.ok, "Sync nach Token-Refresh fehlgeschlagen");
  assert(auth[0] === "Bearer alt" && auth[1] === "Bearer neu", "401 wurde nicht genau einmal mit frischem Token wiederholt");
  const reset = await client.reset();
  assert(reset.ok, "Expliziter Server-Reset fehlgeschlagen");
}

async function testAccountSwitchStopsRetry() {
  let session = { access_token: "alt", user_id: "konto-a" };
  let calls = 0;
  const client = progress.createClient({
    baseUrl: "https://example.supabase.co",
    apiKey: "publishable",
    getSession: () => session,
    refreshSession: async () => {
      session = { access_token: "neu", user_id: "konto-b" };
      return session;
    },
    fetchImpl: async () => {
      calls++;
      return response(401, {});
    },
  });
  const result = await client.save({ done: { nurA: true } }, {});
  assert(!result.ok, "Kontowechsel waehrend 401 darf nicht weiterschreiben");
  assert(calls === 1, "Alter Stand wurde nach Kontowechsel mit neuem Token wiederholt");
}

async function testLoadContinuity() {
  let session = { access_token: "fixture-a", user_id: "konto-a" }, writes = 0;
  const client = progress.createClient({ baseUrl: "https://example.supabase.co", apiKey: "publishable", getSession: () => session,
    fetchImpl: async (url, init) => {
      if (init.method === "POST") writes++;
      return {ok:true,status:200,json:async()=>{ session = {access_token:"fixture-b",user_id:"konto-b"}; return [{done:{saved:true}}]; }};
    }
  });
  const loaded = await client.load({done:{}},{});
  assert(!loaded.ok && writes === 0, "Ein Kontowechsel zwischen Lesen und Zusammenführen darf keine Daten in ein anderes Konto schreiben");
  const malformed = progress.createClient({baseUrl:"https://example.supabase.co",apiKey:"publishable",getSession:()=>session,
    fetchImpl:async(url,init)=>{ if(init.method==='POST')writes++; return response(200,{message:'unexpected'}); }});
  assert(!(await malformed.load({done:{}},{})).ok && writes===0,"Unerwartete Serverantwort darf keine leere Initialisierung auslösen");
}

function testIntegrationContracts() {
  const app = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
  const studio = fs.readFileSync(path.join(ROOT, "studio.html"), "utf8");
  assert(!app.includes('class="sb-rubrik open"'), "Sidebar-Rubriken duerfen nicht offen starten");
  assert(!app.includes('class="rubrik open"'), "Dashboard-Rubriken duerfen nicht offen starten");
  assert(app.includes('aria-expanded="false"'), "Geschlossener ARIA-Startzustand fehlt");
  assert(app.includes("LS_ACCOUNT_PREFIX"), "Lokaler Cache ist nicht nach Konto getrennt");
  const appScript = studio.match(/app\.js\?v=\d+/);
  assert(appScript && studio.indexOf("account-progress.js") < studio.indexOf(appScript[0]), "Sync-Modul muss vor app.js laden");
}

(async () => {
  testMerge();
  await testLoadAndSave();
  await test401RefreshAndReset();
  await testAccountSwitchStopsRetry();
  await testLoadContinuity();
  testIntegrationContracts();
  console.log("ACCOUNT-FORTSCHRITT-TEST: BESTANDEN (lokale Testdoppel: Merge, Restore, 401, Reset, Kontowechsel, Rubriken). Keine Live-RLS-Prüfung.");
})().catch(error => {
  console.error(error);
  process.exit(1);
});
