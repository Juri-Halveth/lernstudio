// ============================================================
// LERNSTUDIO — Konto loeschen (Supabase Edge Function, Deno)
// Aufgabe: der EINGELOGGTE Nutzer loescht sein EIGENES Konto (DSGVO).
// Nur mit gueltigem Login-Token, und es wird ausschliesslich das eigene Konto geloescht.
// Das Loeschen des auth.users-Eintrags kaskadiert per ON DELETE CASCADE auf
// user_progress (siehe account-schema.sql).
// Deploy:  supabase functions deploy delete-account
//   (JWT-Verify AN lassen: nur angemeldete Aufrufe. Die Funktion prueft zusaetzlich selbst.)
// Secrets (Supabase -> Edge Functions -> Secrets):
//   SUPABASE_URL, SUPABASE_PUBLISHABLE_KEYS und SUPABASE_SECRET_KEYS werden
//   von Supabase automatisch bereitgestellt. Keine eigenen SUPABASE_-Secrets anlegen.
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
function getDefaultKey(mapName: string, legacyName: string): string {
  try {
    const keys = JSON.parse(Deno.env.get(mapName) ?? "");
    if (keys && typeof keys.default === "string" && keys.default) return keys.default;
  } catch { /* current Supabase key map unavailable or malformed */ }
  return Deno.env.get(legacyName) ?? "";
}
const ANON         = getDefaultKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
const SERVICE_ROLE = getDefaultKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!SUPABASE_URL || !ANON || !SERVICE_ROLE) return json({ error: "server configuration" }, 500);

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "Nicht angemeldet." }, 401);

  // 1) Nutzer aus dem Login-Token verifizieren (nur er darf sich selbst loeschen).
  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: "Bearer " + token } },
    auth: { persistSession: false },
  });
  const { data: u, error: ue } = await userClient.auth.getUser();
  if (ue || !u?.user?.id) return json({ error: "Nicht angemeldet." }, 401);
  const userId = u.user.id;

  // 2) Mit service_role das EIGENE Konto loeschen
  //    (kaskadiert auf entitlements/purchase_intents/user_progress).
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const { error: de } = await admin.auth.admin.deleteUser(userId);
  if (de) { console.error("deleteUser", de); return json({ error: "Loeschen fehlgeschlagen." }, 500); }

  return json({ ok: true });
});
