"use strict";
const assert = require("node:assert/strict"), { createClient, SESSION_KEY, REDIRECT } = require("../account-auth");
function fixture(saved, respond) {
  const values = new Map(saved ? [[SESSION_KEY, JSON.stringify(saved)]] : []), calls = [];
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const client = createClient({storage, fetchImpl: async (url, init) => {
    calls.push({ url, init }); const result = await respond(url, init);
    return { ok: result.status < 300, status: result.status, json: async () => result.body };
  }});
  return { client, calls, values };
}
const ok = body => ({status:200,body});
const tokens = {access_token:"local-fixture-token",refresh_token:"local-fixture-refresh",expires_in:3600};
(async () => {
  const f = fixture(null, (url, init) => {
    if(url.endsWith("/user") && init.method === "GET") return ok({id:"account-a",email:"learner@example.test"});
    if(url.includes("grant_type="))return ok(tokens);
    if(url.includes("/signup"))return ok({user:{id:"pending"}});
    return ok({});
  });
  assert.equal(await f.client.restore(""),null);assert.equal(f.calls.length,0);
  assert.equal(await f.client.signUp("learner@example.test","example-pass"),null);
  assert.equal(f.client.getSession(),null,"Confirmation-pending signup must not become an active account");
  assert(f.calls[0].url.includes(encodeURIComponent(REDIRECT)));
  const signed = await f.client.signIn("learner@example.test","example-pass");
  assert.equal(signed.user_id,"account-a");assert(f.calls.at(-1).url.endsWith("/user"));
  assert.equal(JSON.parse(f.values.get(SESSION_KEY)).email,"learner@example.test");
  assert(!f.values.get(SESSION_KEY).includes('example-pass'),"Passwords are never persisted");
  await Promise.all([f.client.refreshSession(),f.client.refreshSession()]);
  assert.equal(f.calls.filter(c=>c.url.includes('grant_type=refresh_token')).length,1);
  await f.client.recover("learner@example.test");assert(f.calls.at(-1).url.includes('/recover?redirect_to='));
  await f.client.restore('#access_token=fixture-recovery&refresh_token=fixture-refresh&type=recovery&expires_in=3600');
  assert(f.client.isRecovery());await f.client.updatePassword('updated-example-pass');assert(!f.client.isRecovery());
  await f.client.signOut();assert.equal(f.client.getSession(),null);assert(!f.values.has(SESSION_KEY));
  assert(f.calls.every(c=>!(/stripe|has_active_access|entitlements|purchase/.test(c.url))));

  const expired = fixture({...tokens,user_id:"old-label",expires_at:Date.now()+600000},()=>({status:401,body:{}}));
  await assert.rejects(()=>expired.client.restore(''));assert.equal(expired.client.getSession(),null);assert(!expired.values.has(SESSION_KEY));
  const offline = fixture({...tokens,expires_at:Date.now()+600000},()=>{throw Error('offline');});
  await assert.rejects(()=>offline.client.restore(''));assert(offline.values.has(SESSION_KEY),'Transient network failure preserves the stored session for retry');

  let resolveUser;
  const deferred = fixture(null,url=>url.endsWith('/user') ? new Promise(resolve=>{resolveUser=resolve;}) : ok(tokens));
  const pending = deferred.client.signIn('learner@example.test','example-pass');
  await new Promise(resolve=>setImmediate(resolve));
  await deferred.client.signOut();resolveUser(ok({id:'account-a',email:'learner@example.test'}));
  await assert.rejects(()=>pending);assert.equal(deferred.client.getSession(),null,'A completed logout cannot be reversed by an older response');
  console.log('E-Mail-Konto: Login, Bestätigung, Passwortwechsel, Refresh, Abmeldung und unterbrochene Sitzung lokal geprüft. Keine echten Konten oder E-Mails erzeugt.');
})().catch(error=>{console.error(error);process.exit(1);});
