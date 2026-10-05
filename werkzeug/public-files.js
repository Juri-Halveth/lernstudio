"use strict";
const contextFiles = [...require("./build-learning-api.cjs").buildData().contexts.keys()].map(id => "api/contexts/" + id + ".json");
// Exact release allowlist. History, private documents, accounts and server secrets stay out.
module.exports = Object.freeze([
  "eltern/index.html", "eltern/style.css", "eltern/lessons.js", "eltern/progress.js", "eltern/app.js",
  "languages/catalog.json", "languages/catalog.js", "languages/hub-language.js", "languages/hub-language.css", "index.html", "studio.html", "angebot.html", "inhalte.html", "genie.html", "faq.html",
  "community.html", "eve.html", "quellcode.html", "wissen.html",
  "wissen-ki-programmieren.html", "wissen-zertifikate.html", "wissen-marketing-start.html",
  "wissen-studium-und-verstehen.html", "wissen-verstehen-aber-nicht-anwenden.html",
  "wissen-lernen-jedes-alter-ausbildung-beruf.html", "wissen-frage-x-wann-gehoert-wissen-dir.html",
  "impressum.html", "datenschutz.html", "agb.html", "widerruf.html", "kontakt.html", "offline.html",
  "styles.css", "universe.css", "learning-space.css", "learning-space.js", "code-runner.js", "code-worker.js", "lucide.min.js", "lucide.LICENSE.txt", "wissen.css", "app.js", "learning-profile.js", "account-auth.js", "account-progress.js", "wallet.js", "eve-page.js", "community.js",
  "curriculum.js", "reference.js", "basics.js", "plotter.js", "payment-simulator.js", "lesson-visuals.js",
  "pwa.js", "pwa.css", "sw.js", "manifest.webmanifest", "ls-messung.js", "kontakt.js",
  "evolution-webgl.js", "ambient-sound.js", "lernreise-mobile-v3.mp3", "lernreise-hintergrund-v2.mp3",
  "voegel-wald-web-v2.mp3", "voegel-garten-web-v2.mp3", "tresor-dashboard.png", "tresor-detail.png",
  "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png",
  "favicon-32.png", "favicon-48.png", "favicon.ico", "social-share.png", "robots.txt", "sitemap.xml",
  "LICENSE.txt", "THIRD_PARTY_NOTICES.txt",
  "expedition.js", "journey-ui.js", "journey.css", "learning-bay.js", "learning-packets.js",
  "api/manifest.json", "api/lessons.json", "api/learning-contract.v1.json", "api/example-learning-packet.json",
  "api/space.json", "llms.txt", "connections-ui.js", "connections.css", ...contextFiles,
  "vendor/three/three.module.js", "vendor/three/three.core.js", "vendor/three/LICENSE.txt", "vendor/three/SOURCE.json"
]);
