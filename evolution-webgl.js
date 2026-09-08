/*
  Lernstudio Evolution Scene
  --------------------------
  Kleiner, eigenständiger WebGL-Renderer ohne externe Bibliothek.
  Die Szene ist rein visuell. Bedienung und Inhalte bleiben als echte
  HTML-Elemente darüber erreichbar.
*/
(function () {
  "use strict";

  const VERTEX_SHADER = `
    precision mediump float;
    attribute vec3 aPosition;
    attribute float aKind;
    attribute float aSize;
    attribute float aPhase;

    uniform float uTime;
    uniform float uAspect;
    uniform float uFocus;
    uniform float uOpen;
    uniform float uSolved;

    varying float vAlpha;
    varying float vKind;

    mat2 rotate2d(float angle) {
      float s = sin(angle);
      float c = cos(angle);
      return mat2(c, -s, s, c);
    }

    void main() {
      vec3 p = aPosition;
      float slowTime = uTime * 0.00018;

      if (aKind < 0.5) {
        p.z = mod(p.z + slowTime * 1.7, 7.0) - 2.4;
      } else {
        p.xz = rotate2d(slowTime + uFocus * 0.18) * p.xz;
        p.yz = rotate2d(sin(slowTime * 0.7) * 0.14) * p.yz;
      }

      float pulse = sin(uTime * 0.002 + aPhase) * 0.04;
      p *= 1.0 + pulse + uOpen * 0.12;
      p += normalize(p + vec3(0.001)) * uSolved * (0.18 + 0.16 * sin(aPhase + uTime * 0.004));

      float depth = max(1.35, p.z + 5.1 - uOpen * 0.45);
      float perspective = 2.15;
      gl_Position = vec4(
        p.x * perspective / max(0.55, uAspect),
        p.y * perspective,
        depth - 2.0,
        depth
      );
      gl_PointSize = min(12.0, aSize * (1.3 + 5.0 / depth) * (1.0 + uSolved * 0.65));
      vAlpha = clamp(1.15 - depth * 0.105, 0.14, 0.92);
      vKind = aKind;
    }
  `;

  const FRAGMENT_SHADER = `
    precision mediump float;
    uniform vec3 uColor;
    uniform float uSolved;
    varying float vAlpha;
    varying float vKind;

    void main() {
      vec2 point = gl_PointCoord - vec2(0.5);
      float distanceFromCenter = length(point);
      if (distanceFromCenter > 0.5) discard;

      float core = smoothstep(0.5, 0.04, distanceFromCenter);
      float halo = smoothstep(0.5, 0.23, distanceFromCenter);
      vec3 color = mix(uColor * 0.68, vec3(1.0), core * 0.72 + uSolved * 0.12);
      float kindStrength = vKind < 0.5 ? 0.42 : 1.0;
      float alpha = (core * 0.68 + halo * 0.34) * vAlpha * kindStrength;
      gl_FragColor = vec4(color, alpha);
    }
  `;

  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || "Unbekannter Shaderfehler";
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  }

  function createProgram(gl) {
    const program = gl.createProgram();
    const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program) || "Unbekannter Linkfehler";
      gl.deleteProgram(program);
      throw new Error(message);
    }
    return program;
  }

  function addPoint(target, x, y, z, kind, size, phase) {
    target.push(x, y, z, kind, size, phase);
  }

  function buildGeometry() {
    const points = [];

    // Tiefensterne. Sie bewegen sich auf der z-Achse und machen Perspektive sichtbar.
    for (let i = 0; i < 760; i += 1) {
      addPoint(
        points,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 6,
        Math.random() * 7 - 2.4,
        0,
        0.75 + Math.random() * 1.35,
        Math.random() * Math.PI * 2
      );
    }

    // Doppelhelix als sichtbare Entwicklungsachse.
    const helixCount = 290;
    for (let i = 0; i < helixCount; i += 1) {
      const t = (i / (helixCount - 1)) * Math.PI * 7.2;
      const y = (i / (helixCount - 1) - 0.5) * 3.9;
      for (let strand = 0; strand < 2; strand += 1) {
        const angle = t + strand * Math.PI;
        addPoint(points, Math.cos(angle) * 1.12, y, Math.sin(angle) * 1.12, 1, 2.2, angle);
      }
      if (i % 7 === 0) {
        for (let bridge = 1; bridge < 7; bridge += 1) {
          const ratio = bridge / 7;
          const ax = Math.cos(t) * 1.12;
          const az = Math.sin(t) * 1.12;
          addPoint(points, ax * (1 - ratio * 2), y, az * (1 - ratio * 2), 2, 1.35, t + ratio);
        }
      }
    }

    // Sechs Umlaufbahnen erinnern an die sechs Themen, ohne Klickflächen vorzutäuschen.
    for (let orbit = 0; orbit < 6; orbit += 1) {
      const tilt = orbit * 0.46;
      for (let i = 0; i < 86; i += 1) {
        const angle = (i / 86) * Math.PI * 2;
        const radius = 1.65 + orbit * 0.12;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius * 0.42;
        const z = Math.sin(angle + tilt) * 0.72;
        addPoint(points, x, y, z, 2, 1.2 + (i % 9 === 0 ? 1.0 : 0), angle + tilt);
      }
    }

    return new Float32Array(points);
  }

  function parseRgb(rgbText) {
    const values = String(rgbText || "255,210,10").split(",").map(value => Number(value.trim()) / 255);
    return values.length === 3 && values.every(Number.isFinite) ? values : [1, 0.824, 0.039];
  }

  class EvolutionScene {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.reducedMotion = options.reducedMotion || matchMedia("(prefers-reduced-motion: reduce)");
      this.gl = null;
      this.program = null;
      this.frame = 0;
      this.focus = 1;
      this.targetFocus = 1;
      this.open = 0;
      this.targetOpen = 0;
      this.solved = 0;
      this.targetSolved = 0;
      this.color = parseRgb("255,210,10");
      this.lastWidth = 0;
      this.lastHeight = 0;
      this.available = false;

      try {
        this.gl = canvas.getContext("webgl", {
          alpha:true,
          antialias:true,
          depth:false,
          premultipliedAlpha:true,
          powerPreference:"high-performance"
        });
        if (!this.gl) return;
        this.setup();
        this.available = true;
        this.resize();
        this.render(performance.now());
      } catch (error) {
        this.available = false;
        canvas.dataset.webglError = "1";
        canvas.dataset.webglReason = String(error && error.message ? error.message : "Kontext nicht verfügbar").slice(0, 160);
      }
    }

    setup() {
      const gl = this.gl;
      this.program = createProgram(gl);
      this.geometry = buildGeometry();
      this.stride = 6 * Float32Array.BYTES_PER_ELEMENT;
      this.pointCount = this.geometry.length / 6;
      this.buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.geometry, gl.STATIC_DRAW);

      this.locations = {
        position:gl.getAttribLocation(this.program, "aPosition"),
        kind:gl.getAttribLocation(this.program, "aKind"),
        size:gl.getAttribLocation(this.program, "aSize"),
        phase:gl.getAttribLocation(this.program, "aPhase"),
        time:gl.getUniformLocation(this.program, "uTime"),
        aspect:gl.getUniformLocation(this.program, "uAspect"),
        focus:gl.getUniformLocation(this.program, "uFocus"),
        open:gl.getUniformLocation(this.program, "uOpen"),
        solved:gl.getUniformLocation(this.program, "uSolved"),
        color:gl.getUniformLocation(this.program, "uColor")
      };

      gl.useProgram(this.program);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.disable(gl.DEPTH_TEST);
      this.bindAttribute(this.locations.position, 3, 0);
      this.bindAttribute(this.locations.kind, 1, 3);
      this.bindAttribute(this.locations.size, 1, 4);
      this.bindAttribute(this.locations.phase, 1, 5);

      this.resizeHandler = () => this.resize();
      addEventListener("resize", this.resizeHandler, { passive:true });
      this.canvas.addEventListener("webglcontextlost", event => {
        event.preventDefault();
        cancelAnimationFrame(this.frame);
        this.available = false;
      });
    }

    bindAttribute(location, size, offset) {
      const gl = this.gl;
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, this.stride, offset * Float32Array.BYTES_PER_ELEMENT);
    }

    resize() {
      if (!this.gl) return;
      const rect = this.canvas.getBoundingClientRect();
      const ratio = Math.min(devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(rect.width * ratio));
      const height = Math.max(1, Math.round(rect.height * ratio));
      if (width !== this.lastWidth || height !== this.lastHeight) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.lastWidth = width;
        this.lastHeight = height;
        this.gl.viewport(0, 0, width, height);
      }
    }

    setWorld(index, rgbText) {
      this.targetFocus = Number(index) || 0;
      this.color = parseRgb(rgbText);
      this.drawStaticIfNeeded();
    }

    setOpen(open) {
      this.targetOpen = open ? 1 : 0;
      this.drawStaticIfNeeded();
    }

    setSolved(solved) {
      this.targetSolved = solved ? 1 : 0;
      this.drawStaticIfNeeded();
    }

    drawStaticIfNeeded() {
      if (this.reducedMotion.matches && this.available) this.draw(performance.now());
    }

    render(time) {
      if (!this.available) return;
      this.draw(time);
      if (!this.reducedMotion.matches) this.frame = requestAnimationFrame(next => this.render(next));
    }

    draw(time) {
      const gl = this.gl;
      this.resize();
      this.focus += (this.targetFocus - this.focus) * 0.035;
      this.open += (this.targetOpen - this.open) * 0.06;
      this.solved += (this.targetSolved - this.solved) * 0.075;

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(this.program);
      gl.uniform1f(this.locations.time, time);
      gl.uniform1f(this.locations.aspect, this.canvas.width / Math.max(1, this.canvas.height));
      gl.uniform1f(this.locations.focus, this.focus);
      gl.uniform1f(this.locations.open, this.open);
      gl.uniform1f(this.locations.solved, this.solved);
      gl.uniform3f(this.locations.color, this.color[0], this.color[1], this.color[2]);
      gl.drawArrays(gl.POINTS, 0, this.pointCount);
    }
  }

  window.LernstudioEvolution = {
    create(canvas, options) {
      return new EvolutionScene(canvas, options);
    }
  };
})();
