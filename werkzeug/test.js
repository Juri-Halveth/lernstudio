"use strict";
const path=require("node:path");
const {execFileSync}=require("node:child_process");
require("./build-learning-api.cjs").generate();
execFileSync(process.execPath,["--test",path.join(__dirname,"../tests/elternmodus.test.cjs")],{stdio:"inherit"});
const checks=["test-free-site.js","test-learning-profile.js","test-account-auth.js","test-account-progress.js","test-wallet.js","test-expedition.cjs","test-learning-packets.cjs","test-learning-api.cjs","test-space-generation.cjs","test-agent-space.cjs","test-connections-ui.cjs","test-free-app.js","test-server-path.js","test-math-plots.js","test-payment-simulator.js","test-lesson-visuals.js","test-lesson-back-navigation.js","test-universal-task-help.js","../tests/hub-languages.test.cjs"];
for(const check of checks){console.log("Prüfe "+check);execFileSync(process.execPath,[path.join(__dirname,check)],{stdio:"inherit"});}
console.log("Alle "+checks.length+" aktuellen Prüfsuiten bestanden.");
