(function (root) {
  'use strict';
  let active = null;
  let source = null;
  const sourceURL = new URL('code-worker.js', document.currentScript.src);
  function stop() { if (active) active({ok:false,output:'Ausführung gestoppt.'}); }
  async function run(lang, code, onStatus = () => {}) {
    stop();
    if (!['js','python'].includes(lang) || typeof code !== 'string' || code.length > 50000) return {ok:false,output:'Ungültiges Programm (maximal 50.000 Zeichen).'};
    return new Promise(resolve => {
      const frame = document.createElement('iframe');
      frame.hidden = true; frame.title = 'Isolierte Codeausführung'; frame.sandbox = 'allow-scripts';
      let timer, ended = false;
      const id = crypto.randomUUID();
      const finish = result => { if (ended) return; ended = true; clearTimeout(timer); root.removeEventListener('message', receive); frame.remove(); if (active === finish) active = null; resolve(result); };
      const receive = event => {
        if (event.source !== frame.contentWindow || event.data?.id !== id) return;
        if (event.data.type === 'ready') { clearTimeout(timer); timer = setTimeout(() => finish({ok:false,output:'Zeitlimit nach 8 Sekunden. Prüfe Schleifen und Abbruchbedingungen.'}),8000); onStatus('Programm läuft …'); }
        if (event.data.type === 'result') finish({ok:event.data.ok === true,output:String(event.data.output).slice(0,34000)});
      };
      active = finish;
      timer = setTimeout(() => finish({ok:false,output:'Die Laufzeit konnte nicht rechtzeitig geladen werden. Prüfe deine Verbindung.'}),90000);
      root.addEventListener('message', receive);
      onStatus(lang === 'python' ? 'Python wird geladen …' : 'JavaScript startet …');
      (async () => {
        try {
          if (!source) { const response = await fetch(sourceURL); if (!response.ok) throw new Error('Code-Laufzeit fehlt.'); source = await response.text(); }
          if (ended) return;
          const csp = "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net/pyodide/v0.26.2/full/; worker-src blob:; connect-src https://cdn.jsdelivr.net/pyodide/v0.26.2/full/; base-uri 'none'; form-action 'none'";
          const setup = `const id=${JSON.stringify(id)};const w=new Worker(URL.createObjectURL(new Blob([${JSON.stringify(source)}],{type:'text/javascript'})));w.onmessage=e=>parent.postMessage({...e.data,id},'*');w.onerror=()=>parent.postMessage({id,type:'result',ok:false,output:'Laufzeit nicht verfügbar.'},'*');w.postMessage(${JSON.stringify({lang,code})});`;
          frame.srcdoc = '<!doctype html><meta http-equiv="Content-Security-Policy" content="'+csp+'"><script>'+setup.replace(/<\/script/gi,'<\\/script')+'<\/script>';
          document.body.appendChild(frame);
        } catch (error) { finish({ok:false,output:'Start fehlgeschlagen: '+error.message}); }
      })();
    });
  }
  root.LSCodeRunner = Object.freeze({run,stop});
})(window);
