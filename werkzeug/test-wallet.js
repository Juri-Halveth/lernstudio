"use strict";
const assert=require("node:assert/strict"),{EventEmitter}=require("node:events");
const Wallet=require("../wallet");
const A="0x"+"1".repeat(40),B="0x"+"2".repeat(40);
async function main(){
  const provider=new EventEmitter(),calls=[];
  provider.request=async({method})=>{calls.push(method);return method==="eth_requestAccounts"?[A]:"0x38";};
  const w=Wallet.create(provider);assert.deepEqual(calls,[]);await w.connect();
  assert.deepEqual(calls,["eth_requestAccounts","eth_chainId"]);assert.equal(w.snapshot().address,A);assert.equal(w.snapshot().chainName,"BNB Smart Chain");
  provider.emit("accountsChanged",[B]);assert.equal(w.snapshot().address,B);provider.emit("chainChanged","0x1");assert.equal(w.snapshot().chainName,"Ethereum");
  w.disconnect();assert.equal(w.snapshot().address,null);assert.equal(provider.listenerCount("accountsChanged"),0);
  await Wallet.create(null).connect();
  provider.request=async()=>{throw Object.assign(new Error("denied"),{code:4001});};
  await w.connect();assert.match(w.snapshot().message,/abgelehnt/);assert.equal(provider.listenerCount("accountsChanged"),0);
  provider.request=async({method})=>{if(method==="eth_chainId"){provider.emit("accountsChanged",[B]);provider.emit("chainChanged","0x2105");return "0x38";}return [A];};
  await w.connect();assert.equal(w.snapshot().address,B);assert.equal(w.snapshot().chainName,"Base","A pending request does not overwrite a newer chain event");
  provider.emit("accountsChanged",[]);assert.equal(w.snapshot().address,null);
  let resolve;provider.request=()=>new Promise(r=>resolve=r);const pending=w.connect();w.disconnect();resolve([A]);await pending;assert.equal(w.snapshot().address,null);assert.equal(w.snapshot().pending,false);
  assert.equal(provider.listenerCount("chainChanged"),0);
  console.log("Wallet: freiwilliger Start, Ablehnung, Account-/Chain-Wechsel, Race-Fälle und Trennen bestanden; nur zwei lesende RPC-Methoden.");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
