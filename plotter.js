/* =========================================================
   LERNSTUDIO — Live-Funktionsplotter (fuer "Mathe zum Anfassen")
   ---------------------------------------------------------
   Zwei Teile:
   1) compile(str): sicherer Formel-Parser (Shunting-Yard -> RPN).
      KEIN eval / new Function -> es entsteht nie ausfuehrbarer Code,
      nur Zahlen. Whitelist aus Funktionen/Konstanten. Unbekannte
      Namen ausser den erlaubten Variablen werfen einen Fehler.
   2) LSPlotter: zeichnet Achsen, Gitter, Kurve (mit Stift-Anheben an
      Pol-/Definitionsluecken), Nullstellen; Zoom/Pan; Wertetabelle.

   Laeuft im Browser (window.LSPlotter/window.LScompile) UND in Node
   (module.exports) fuer die Verifikation.
   ========================================================= */
(function (root) {
  "use strict";

  // ---- Whitelist: 1-argige Funktionen + Konstanten ----
  var FUNCS = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    asin: Math.asin, acos: Math.acos, atan: Math.atan,
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
    sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs,
    exp: Math.exp, ln: Math.log,
    log: function (x) { return Math.log(x) / Math.LN10; },   // log = log10
    log2: function (x) { return Math.log(x) / Math.LN2; },
    floor: Math.floor, ceil: Math.ceil, round: Math.round, sign: Math.sign
  };
  var CONSTS = { pi: Math.PI, e: Math.E, tau: 2 * Math.PI };

  var OPS = {
    "+":  { p: 2, r: false, n: 2, f: function (a, b) { return a + b; } },
    "-":  { p: 2, r: false, n: 2, f: function (a, b) { return a - b; } },
    "*":  { p: 3, r: false, n: 2, f: function (a, b) { return a * b; } },
    "/":  { p: 3, r: false, n: 2, f: function (a, b) { return a / b; } },
    "%":  { p: 3, r: false, n: 2, f: function (a, b) { return a % b; } },
    "u-": { p: 5, r: true,  n: 1, f: function (a) { return -a; } },
    "^":  { p: 6, r: true,  n: 2, f: function (a, b) { return Math.pow(a, b); } }
  };

  function isDigit(c) { return c >= "0" && c <= "9"; }
  function isAlpha(c) { return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z"); }

  // Ein Wert-Ende (Zahl, Variable, Konstante, schliessende Klammer) darf von
  // einem impliziten Mal gefolgt werden: 2x -> 2*x, )( -> )*(, 2sin(x) -> 2*sin(x).
  function tokenize(src) {
    var s = String(src).replace(/\s+/g, "");
    var t = [], i = 0;
    function last() { return t[t.length - 1]; }
    function valueEnd() { var p = last(); return p && (p.t === "num" || p.t === "var" || p.t === "const" || p.t === "rparen"); }
    function pushImplicitMul() { if (valueEnd()) t.push({ t: "op", v: "*", implicit: true }); }

    while (i < s.length) {
      var c = s[i];
      if (isDigit(c) || c === ".") {
        var num = "";
        while (i < s.length && (isDigit(s[i]) || s[i] === ".")) num += s[i++];
        if (num.split(".").length > 2) throw new Error("Ungueltige Zahl: " + num);
        pushImplicitMul();                 // z.B. x2 -> x*2
        t.push({ t: "num", v: parseFloat(num) });
        continue;
      }
      if (isAlpha(c)) {
        var w = "";
        while (i < s.length && (isAlpha(s[i]) || isDigit(s[i]))) w += s[i++];
        var lw = w.toLowerCase();
        if (Object.prototype.hasOwnProperty.call(FUNCS, lw)) { pushImplicitMul(); t.push({ t: "fn", v: lw }); }
        else if (Object.prototype.hasOwnProperty.call(CONSTS, lw)) { pushImplicitMul(); t.push({ t: "const", v: lw }); }
        else { pushImplicitMul(); t.push({ t: "var", v: w }); }   // alles andere ist eine Variable (x, a, b, ...)
        continue;
      }
      if (c === "(") { pushImplicitMul(); t.push({ t: "lparen" }); i++; continue; }
      if (c === ")") { t.push({ t: "rparen" }); i++; continue; }
      if (c === ",") { t.push({ t: "comma" }); i++; continue; }
      if (c === "+" || c === "-") {
        var p = last();
        var unary = !p || p.t === "op" || p.t === "lparen" || p.t === "comma" || p.t === "fn";
        if (c === "-") t.push({ t: "op", v: unary ? "u-" : "-" });
        else if (!unary) t.push({ t: "op", v: "+" });  // unaeres Plus ignorieren
        i++; continue;
      }
      if (c === "*" || c === "/" || c === "^" || c === "%") { t.push({ t: "op", v: c }); i++; continue; }
      throw new Error("Ungueltiges Zeichen: " + c);
    }
    return t;
  }

  function toRPN(tokens) {
    var out = [], st = [];
    for (var k = 0; k < tokens.length; k++) {
      var tk = tokens[k];
      if (tk.t === "num" || tk.t === "var" || tk.t === "const") out.push(tk);
      else if (tk.t === "fn") st.push(tk);
      else if (tk.t === "op") {
        var o1 = OPS[tk.v];
        if (o1.n === 1) { st.push(tk); }   // Prefix (unaeres Minus): bindet an das Folgende, poppt nichts (2^-3 korrekt)
        else {
          while (st.length) {
            var top = st[st.length - 1];
            if (top.t === "op") {
              var o2 = OPS[top.v];
              if ((!o1.r && o1.p <= o2.p) || (o1.r && o1.p < o2.p)) { out.push(st.pop()); continue; }
            } else if (top.t === "fn") { out.push(st.pop()); continue; }
            break;
          }
          st.push(tk);
        }
      } else if (tk.t === "lparen") st.push(tk);
      else if (tk.t === "rparen") {
        var found = false;
        while (st.length) { if (st[st.length - 1].t === "lparen") { found = true; break; } out.push(st.pop()); }
        if (!found) throw new Error("Klammer schliesst ohne oeffnende Klammer");
        st.pop();
        if (st.length && st[st.length - 1].t === "fn") out.push(st.pop());
      } else if (tk.t === "comma") {
        while (st.length && st[st.length - 1].t !== "lparen") out.push(st.pop());
      }
    }
    while (st.length) { var r = st.pop(); if (r.t === "lparen") throw new Error("Klammer wird nicht geschlossen"); out.push(r); }
    return out;
  }

  // compile(str) -> { vars:[...], eval(scope) }. Wirft bei Syntaxfehlern.
  function compile(src) {
    var rpn = toRPN(tokenize(src));
    var vars = {};
    for (var i = 0; i < rpn.length; i++) if (rpn[i].t === "var") vars[rpn[i].v] = true;
    function ev(scope) {
      var s = [], j;
      for (j = 0; j < rpn.length; j++) {
        var tk = rpn[j];
        if (tk.t === "num") s.push(tk.v);
        else if (tk.t === "const") s.push(CONSTS[tk.v]);
        else if (tk.t === "var") {
          var val = scope ? scope[tk.v] : undefined;
          s.push(typeof val === "number" ? val : NaN);
        } else if (tk.t === "fn") { if (s.length < 1) throw new Error("Formel unvollstaendig"); s.push(FUNCS[tk.v](s.pop())); }
        else if (tk.t === "op") {
          var o = OPS[tk.v];
          if (o.n === 1) { if (s.length < 1) throw new Error("Formel unvollstaendig"); s.push(o.f(s.pop())); }
          else { if (s.length < 2) throw new Error("Formel unvollstaendig"); var b = s.pop(), a = s.pop(); s.push(o.f(a, b)); }
        }
      }
      if (s.length !== 1) throw new Error("Formel unvollstaendig");
      return s[0];
    }
    // Einmal testrechnen, damit Struktur-Fehler (zu wenige Operanden) sofort auffallen:
    var testScope = { x: 1 }; for (var v in vars) testScope[v] = 1;
    ev(testScope);
    return { vars: Object.keys(vars), eval: ev };
  }

  // ---------- Plotter (nur Browser) ----------
  function niceStep(range, target) {
    var raw = range / (target || 10);
    var mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var n = raw / mag;
    return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
  }

  function LSPlotter(canvas, opts) {
    opts = opts || {};
    this.cv = canvas;
    this.ctx = canvas.getContext("2d");
    this.V = Object.assign({ xmin: -10, xmax: 10, ymin: -7, ymax: 7 }, opts.view || {});
    this.expr = null;         // { vars, eval }
    this.scope = {};          // Parameterwerte (a, b, ...)
    this.color = opts.color || "#ffd60a";
    this.color2 = opts.color2 || "#4fb0ff";
    this.expr2 = null;
    this.showZeros = opts.showZeros !== false;
    this._bindEvents();
    this.resize();
  }
  LSPlotter.prototype.setExpr = function (str) {
    try { this.expr = str ? compile(str) : null; this.error = null; }
    catch (e) { this.expr = null; this.error = e.message; }
    this.draw(); return this.error;
  };
  LSPlotter.prototype.setExpr2 = function (str) {
    try { this.expr2 = str ? compile(str) : null; } catch (e) { this.expr2 = null; }
    this.draw();
  };
  LSPlotter.prototype.setScope = function (obj) { this.scope = Object.assign({}, this.scope, obj); this.draw(); };
  LSPlotter.prototype.setView = function (v) { this.V = Object.assign({}, this.V, v); this.draw(); };
  LSPlotter.prototype.resize = function () {
    var dpr = (root.devicePixelRatio || 1);
    var w = this.cv.clientWidth || 600, h = this.cv.clientHeight || 340;
    this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.W = w; this.H = h;
    this.draw();
  };
  LSPlotter.prototype._px = function (x) { return (x - this.V.xmin) / (this.V.xmax - this.V.xmin) * this.W; };
  LSPlotter.prototype._py = function (y) { return this.H - (y - this.V.ymin) / (this.V.ymax - this.V.ymin) * this.H; };
  LSPlotter.prototype._mx = function (sx) { return this.V.xmin + sx / this.W * (this.V.xmax - this.V.xmin); };
  LSPlotter.prototype._my = function (sy) { return this.V.ymin + (this.H - sy) / this.H * (this.V.ymax - this.V.ymin); };

  LSPlotter.prototype.draw = function () {
    var ctx = this.ctx, W = this.W, H = this.H, V = this.V;
    if (!W || !H) return;
    ctx.clearRect(0, 0, W, H);
    // Gitter
    var sx = niceStep(V.xmax - V.xmin), sy = niceStep(V.ymax - V.ymin);
    ctx.lineWidth = 1; ctx.font = "11px system-ui,sans-serif"; ctx.textBaseline = "top";
    ctx.strokeStyle = "rgba(150,150,160,.18)"; ctx.fillStyle = "rgba(150,150,160,.85)";
    var gx;
    for (gx = Math.ceil(V.xmin / sx) * sx; gx <= V.xmax; gx += sx) {
      var X = this._px(gx); ctx.beginPath(); ctx.moveTo(X, 0); ctx.lineTo(X, H); ctx.stroke();
      if (Math.abs(gx) > 1e-9) ctx.fillText(this._fmt(gx), X + 2, this._py(0) + 2);
    }
    for (var gy = Math.ceil(V.ymin / sy) * sy; gy <= V.ymax; gy += sy) {
      var Y = this._py(gy); ctx.beginPath(); ctx.moveTo(0, Y); ctx.lineTo(W, Y); ctx.stroke();
      if (Math.abs(gy) > 1e-9) ctx.fillText(this._fmt(gy), this._px(0) + 3, Y + 2);
    }
    // Achsen
    ctx.strokeStyle = "rgba(200,200,210,.6)"; ctx.lineWidth = 1.5;
    if (V.ymin < 0 && V.ymax > 0) { var y0 = this._py(0); ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(W, y0); ctx.stroke(); }
    if (V.xmin < 0 && V.xmax > 0) { var x0 = this._px(0); ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0, H); ctx.stroke(); }
    // Feste Orientierungshilfe: mathematisch positives y zeigt nach oben,
    // positives x nach rechts. Das verhindert die Verwechslung von
    // "negativer y-Wert" und "negative Steigung".
    ctx.save();
    ctx.fillStyle = "rgba(225,225,235,.9)";
    ctx.font = "600 12px system-ui,sans-serif";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText("y ↑", 8, 8);
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText("x →", W - 8, H - 8);
    ctx.restore();
    // Kurven
    if (this.expr2) this._curve(this.expr2, this.color2, 1.5);
    if (this.expr) { this._curve(this.expr, this.color, 2.5); if (this.showZeros) this._zeros(this.expr); }
  };

  LSPlotter.prototype._evalAt = function (expr, x) {
    var scope = Object.assign({}, this.scope, { x: x });
    try { var y = expr.eval(scope); return (typeof y === "number") ? y : NaN; } catch (e) { return NaN; }
  };
  LSPlotter.prototype._curve = function (expr, color, width) {
    var ctx = this.ctx, W = this.W, H = this.H;
    var jumpLimit = (this.V.ymax - this.V.ymin) * 2;
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
    var pen = false, prevY = NaN;
    for (var sx = 0; sx <= W; sx++) {
      var x = this._mx(sx), y = this._evalAt(expr, x);
      var bad = !isFinite(y);
      var jump = pen && isFinite(prevY) && Math.abs(y - prevY) > jumpLimit;   // Pol/Sprung -> Stift anheben
      if (bad || jump) { pen = false; prevY = y; continue; }
      var X = sx, Y = this._py(y);
      if (pen) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
      pen = true; prevY = y;
    }
    ctx.stroke();
  };
  LSPlotter.prototype._zeros = function (expr) {
    var ctx = this.ctx, W = this.W, raw = [];
    var eps = (this.V.xmax - this.V.xmin) / W * 1.5;   // Zusammenfassungs-Abstand
    var jumpLimit = (this.V.ymax - this.V.ymin) * 2;
    var xPrev = this.V.xmin, yPrev = this._evalAt(expr, xPrev);
    for (var sx = 1; sx <= W; sx++) {
      var x = this._mx(sx), y = this._evalAt(expr, x);
      if (isFinite(y) && y === 0) {
        raw.push(x);                                   // Punkt liegt exakt auf der Nullstelle (Produkt waere 0, nicht <0)
      } else if (isFinite(yPrev) && isFinite(y) && yPrev * y < 0 && Math.abs(y - yPrev) < jumpLimit) {
        var a = xPrev, b = x;                          // Vorzeichenwechsel -> Bisektion
        for (var it = 0; it < 40; it++) { var mm = (a + b) / 2; if (this._evalAt(expr, a) * this._evalAt(expr, mm) <= 0) b = mm; else a = mm; }
        raw.push((a + b) / 2);
      }
      xPrev = x; yPrev = y;
    }
    // nahe beieinander liegende Treffer (z.B. exakte 0 plus Nachbar-Bracket) zusammenfassen
    var found = [];
    raw.sort(function (p, q) { return p - q; });
    for (var r = 0; r < raw.length; r++) if (!found.length || Math.abs(raw[r] - found[found.length - 1]) > eps) found.push(raw[r]);
    ctx.fillStyle = "#7ee787";
    for (var i = 0; i < found.length && i < 20; i++) {
      var Xp = this._px(found[i]), Yp = this._py(0);
      ctx.beginPath(); ctx.arc(Xp, Yp, 4, 0, 2 * Math.PI); ctx.fill();
    }
    this.zeros = found;
  };
  LSPlotter.prototype._fmt = function (v) { var r = Math.round(v * 1000) / 1000; return String(r); };

  LSPlotter.prototype.table = function (xmin, xmax, step) {
    var rows = [], x;
    for (x = xmin; x <= xmax + 1e-9; x += step) {
      var y = this.expr ? this._evalAt(this.expr, x) : NaN;
      rows.push({ x: Math.round(x * 1000) / 1000, y: isFinite(y) ? Math.round(y * 1000) / 1000 : null });
    }
    return rows;
  };

  LSPlotter.prototype._bindEvents = function () {
    var self = this, dragging = false, lastX = 0, lastY = 0;
    this.cv.addEventListener("mousedown", function (e) { dragging = true; lastX = e.offsetX; lastY = e.offsetY; });
    root.addEventListener && root.addEventListener("mouseup", function () { dragging = false; });
    this.cv.addEventListener("mousemove", function (e) {
      if (!dragging) return;
      var dxu = (e.offsetX - lastX) / self.W * (self.V.xmax - self.V.xmin);
      var dyu = (e.offsetY - lastY) / self.H * (self.V.ymax - self.V.ymin);
      self.V.xmin -= dxu; self.V.xmax -= dxu; self.V.ymin += dyu; self.V.ymax += dyu;
      lastX = e.offsetX; lastY = e.offsetY; self.draw();
    });
    this.cv.addEventListener("wheel", function (e) {
      e.preventDefault();
      var k = e.deltaY < 0 ? 0.9 : 1.1;
      var cx = self._mx(e.offsetX), cy = self._my(e.offsetY);
      self.V.xmin = cx + (self.V.xmin - cx) * k; self.V.xmax = cx + (self.V.xmax - cx) * k;
      self.V.ymin = cy + (self.V.ymin - cy) * k; self.V.ymax = cy + (self.V.ymax - cy) * k;
      self.draw();
    }, { passive: false });
  };

  var API = { compile: compile, tokenize: tokenize, toRPN: toRPN, Plotter: LSPlotter, FUNCS: FUNCS, CONSTS: CONSTS };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  root.LScompile = compile;
  root.LSPlotter = LSPlotter;
})(typeof window !== "undefined" ? window : globalThis);
