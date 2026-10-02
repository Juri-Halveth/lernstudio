'use strict';
// One disposable worker per run. Its enclosing opaque-origin frame supplies CSP.
self.onmessage = async ({data}) => {
  const logs = []; let size = 0;
  const out = (...args) => {
    if (size > 32000) return;
    const line = args.map(v => {
      if (typeof v === 'string') return v;
      try { return JSON.stringify(v) ?? String(v); } catch (_) { return String(v); }
    }).join(' ');
    logs.push(line.slice(0, 32000-size)); size += line.length + 1;
  };
  try {
    if (data.lang === 'python') {
      const base = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/';
      importScripts(base + 'pyodide.js');
      const py = await loadPyodide({indexURL:base});
      py.setStdout({batched:out}); py.setStderr({batched:out});
      self.postMessage({type:'ready'});
      await py.runPythonAsync(data.code);
    } else {
      self.postMessage({type:'ready'});
      const console = {log:out,info:out,warn:out,error:out};
      await new Function('console', '"use strict";\n'+data.code)(console);
      for (let i=0;i<4;i++) await new Promise(r => setTimeout(r,0));
    }
    self.postMessage({type:'result',output:logs.join('\n'),ok:true});
  } catch (e) {
    self.postMessage({type:'result',output:logs.concat('Fehler: '+String(e.message || e).slice(-2000)).join('\n'),ok:false});
  }
};
