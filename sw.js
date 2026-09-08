"use strict";
// Compatibility endpoint for previously installed Lernstudio workers.
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",event=>event.waitUntil(self.registration.unregister()));
