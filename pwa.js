(function(){
  "use strict";
  // Project sites share an origin. Retire only the worker in this script's folder.
  const appBase=new URL(".",document.currentScript?.src||location.href);
  const retiredWorker=new URL("sw.js",appBase).href;
  if("serviceWorker" in navigator && typeof navigator.serviceWorker.getRegistrations==="function"){
    navigator.serviceWorker.getRegistrations().then(registrations=>{
      for(const registration of registrations){
        const worker=registration.active||registration.waiting||registration.installing;
        if(!worker)continue;
        if(worker.scriptURL===retiredWorker && registration.scope===appBase.href)registration.unregister();
      }
    }).catch(()=>{});
  }
})();
