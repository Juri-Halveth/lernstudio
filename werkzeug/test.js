"use strict";
const path=require("node:path");
const {execFileSync}=require("node:child_process");
const checks=["test-free-site.js","test-learning-profile.js","test-account-auth.js","test-account-progress.js","test-wallet.js","test-free-app.js","test-server-path.js","test-math-plots.js","test-payment-simulator.js","test-lesson-visuals.js","test-lesson-back-navigation.js","test-universal-task-help.js"];
for(const check of checks){console.log("Prüfe "+check);execFileSync(process.execPath,[path.join(__dirname,check)],{stdio:"inherit"});}
console.log("Alle "+checks.length+" aktuellen Prüfsuiten bestanden.");
