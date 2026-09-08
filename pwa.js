(function(){
  "use strict";
  // Retire only this application's old workers/caches. This release is ordinary web.
  if("serviceWorker" in navigator && typeof navigator.serviceWorker.getRegistrations==="function"){
    navigator.serviceWorker.getRegistrations().then(registrations=>{
      for(const registration of registrations){
        const worker=registration.active||registration.waiting||registration.installing;
        if(!worker)continue;
        const url=new URL(worker.scriptURL);
        if(url.origin===location.origin && url.pathname==="/sw.js")registration.unregister();
      }
    }).catch(()=>{});
  }
  if(window.caches)caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("lernstudio-public-")).map(key=>caches.delete(key)))).catch(()=>{});
})();
