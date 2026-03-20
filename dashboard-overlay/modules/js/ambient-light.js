// ═══════════════════════════════════════════════════════════════
//  AMBIENT LIGHT — WebGL screen-reactive glow beneath panels
// ═══════════════════════════════════════════════════════════════
//
//  Receives the average screen color from the main process
//  (Electron desktopCapturer, 8 fps, 24×24 thumbnails) and
//  renders a soft radial glow emanating from the center of
//  the viewport that spills beneath each dashboard module.
//
//  The effect is intentionally subtle — the glow should feel
//  like the game's light is bleeding through the transparent
//  overlay and reflecting off the panel surfaces.
//
//  Depends on: preload.js (k10.onAmbientColor, k10.ambientStart/Stop)
//              config.js  (_settings.showAmbientLight)
// ═══════════════════════════════════════════════════════════════

(function initAmbientLight() {
  'use strict';

  // ── State ──
  let _enabled = false;
  let _glCtx = null;
  let _program = null;
  let _uniforms = {};
  let _canvas = null;
  let _rafId = null;
  let _time = 0;
  let _hasReceivedColor = false;

  // Current + target color (smooth interpolation)
  let _curR = 0, _curG = 0, _curB = 0;
  let _tgtR = 0, _tgtG = 0, _tgtB = 0;

  // Lerp speed — lower = smoother (0.08 = ~12 frame blend at 60fps)
  const LERP = 0.08;

  // ── GL helpers ──
  function createShader(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('[Ambient] Shader compile:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function createProgram(gl, vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.warn('[Ambient] Program link:', gl.getProgramInfoLog(p));
      return null;
    }
    return p;
  }

  // ── Shaders ──

  const VERT_SRC = `#version 300 es
    in vec2 aPos;
    out vec2 vUV;
    void main() {
      vUV = aPos * 0.5 + 0.5;
      gl_Position = vec4(aPos, 0.0, 1.0);
    }`;

  // Fragment shader:
  //   - Soft radial glow from screen center, colored by ambient RGB
  //   - Gaussian-ish falloff (wider glow matches widescreen)
  //   - Subtle pulsing breath to keep it alive
  const FRAG_SRC = `#version 300 es
    precision highp float;
    in  vec2 vUV;
    out vec4 fragColor;

    uniform vec3  uColor;      // ambient RGB (0-1)
    uniform float uTime;       // seconds
    uniform vec2  uRes;        // canvas pixel size
    uniform float uIntensity;  // master intensity (0-1)

    void main() {
      // Aspect-corrected coordinates centered at (0.5, 0.5)
      vec2 center = vUV - 0.5;
      float aspect = uRes.x / uRes.y;
      center.x *= aspect;

      // Distance from center
      float d = length(center);

      // Soft gaussian falloff (σ ≈ 0.38)
      float glow = exp(-d * d / (2.0 * 0.38 * 0.38));

      // Outer haze (much wider, much dimmer)
      float haze = exp(-d * d / (2.0 * 0.7 * 0.7)) * 0.3;

      // Gentle breathing pulse
      float breath = 1.0 + 0.06 * sin(uTime * 0.7);

      // Combine
      float alpha = (glow + haze) * breath * uIntensity;

      // Boost color brightness slightly so dark scenes still show something
      vec3 col = uColor + 0.04;

      // Clamp alpha to keep it subtle
      alpha = clamp(alpha, 0.0, 0.25);

      fragColor = vec4(col * alpha, alpha);
    }`;

  // ── Init WebGL ──
  function initGL() {
    _canvas = document.getElementById('ambientGlCanvas');
    if (!_canvas) {
      console.warn('[Ambient] Canvas #ambientGlCanvas not found');
      return false;
    }

    const gl = _canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      powerPreference: 'low-power'
    });
    if (!gl) {
      console.warn('[Ambient] WebGL2 not available');
      return false;
    }

    const vs = createShader(gl, gl.VERTEX_SHADER, VERT_SRC);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vs || !fs) return false;

    _program = createProgram(gl, vs, fs);
    if (!_program) return false;

    // Full-screen quad
    const quad = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(_program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // Cache uniform locations
    _uniforms = {
      uColor:     gl.getUniformLocation(_program, 'uColor'),
      uTime:      gl.getUniformLocation(_program, 'uTime'),
      uRes:       gl.getUniformLocation(_program, 'uRes'),
      uIntensity: gl.getUniformLocation(_program, 'uIntensity'),
    };

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // premultiplied alpha

    _glCtx = gl;
    console.log('[Ambient] WebGL2 initialized');
    return true;
  }

  // ── Resize ──
  function resize() {
    if (!_canvas || !_glCtx) return;
    // Render at half resolution for performance
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.round(window.innerWidth  * dpr * 0.5);
    const h = Math.round(window.innerHeight * dpr * 0.5);
    if (_canvas.width !== w || _canvas.height !== h) {
      _canvas.width = w;
      _canvas.height = h;
      _glCtx.viewport(0, 0, w, h);
    }
  }

  // ── Update CSS shadow vars ──
  // Compose full box-shadow values so CSS doesn't need rgba(var()) syntax
  function updateCSSShadows(r, g, b) {
    const root = document.documentElement.style;
    const rgba = (a) => `rgba(${r}, ${g}, ${b}, ${a})`;

    root.setProperty('--ambient-shadow',       `0 0 18px 4px ${rgba(0.14)}`);
    root.setProperty('--ambient-shadow-lg',    `0 0 40px 8px ${rgba(0.07)}`);
    root.setProperty('--ambient-shadow-tacho',    `0 0 24px 6px ${rgba(0.18)}`);
    root.setProperty('--ambient-shadow-tacho-lg', `0 0 50px 12px ${rgba(0.09)}`);
  }

  function clearCSSShadows() {
    const root = document.documentElement.style;
    root.setProperty('--ambient-shadow',       '0 0 0 transparent');
    root.setProperty('--ambient-shadow-lg',    '0 0 0 transparent');
    root.setProperty('--ambient-shadow-tacho',    '0 0 0 transparent');
    root.setProperty('--ambient-shadow-tacho-lg', '0 0 0 transparent');
  }

  // ── Render loop ──
  let _lastFrame = 0;

  function render(timestamp) {
    if (!_enabled) return;
    _rafId = requestAnimationFrame(render);

    // Throttle to ~30fps
    if (timestamp - _lastFrame < 32) return;
    _lastFrame = timestamp;

    const gl = _glCtx;
    if (!gl || !_program) return;

    resize();

    // Smooth color interpolation
    _curR += (_tgtR - _curR) * LERP;
    _curG += (_tgtG - _curG) * LERP;
    _curB += (_tgtB - _curB) * LERP;

    _time += 0.033;

    // Perceived brightness modulates intensity (brighter scenes = stronger glow)
    const luma = 0.299 * _curR + 0.587 * _curG + 0.114 * _curB;
    const intensity = 0.4 + luma * 0.6;

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(_program);
    gl.uniform3f(_uniforms.uColor, _curR, _curG, _curB);
    gl.uniform1f(_uniforms.uTime, _time);
    gl.uniform2f(_uniforms.uRes, _canvas.width, _canvas.height);
    gl.uniform1f(_uniforms.uIntensity, intensity);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Update per-panel CSS box-shadow glow
    const r8 = Math.round(_curR * 255);
    const g8 = Math.round(_curG * 255);
    const b8 = Math.round(_curB * 255);
    updateCSSShadows(r8, g8, b8);
  }

  // ── Receive color from main process ──
  function onColorUpdate(color) {
    _hasReceivedColor = true;
    // Normalize 0-255 → 0-1
    _tgtR = color.r / 255;
    _tgtG = color.g / 255;
    _tgtB = color.b / 255;
  }

  // ── Public API ──
  // Register color listener once (idempotent — IPC .on is additive)
  let _listenerRegistered = false;

  window.startAmbientLight = function() {
    if (_enabled) return;
    if (!_glCtx && !initGL()) return;
    _enabled = true;
    _lastFrame = 0;
    _rafId = requestAnimationFrame(render);

    // Tell main process to start screen capture
    if (window.k10 && window.k10.ambientStart) {
      window.k10.ambientStart();
    }

    // Listen for color updates (register once)
    if (!_listenerRegistered && window.k10 && window.k10.onAmbientColor) {
      window.k10.onAmbientColor(onColorUpdate);
      _listenerRegistered = true;
    }

    // If no screen capture data arrives within 2s, use a dim warm fallback
    // so the user can at least see the effect is working
    setTimeout(() => {
      if (_enabled && !_hasReceivedColor) {
        console.warn('[Ambient] No screen capture data — using fallback color. Grant Screen Recording permission if on macOS.');
        _tgtR = 0.15;
        _tgtG = 0.10;
        _tgtB = 0.20;
      }
    }, 2000);

    console.log('[Ambient] Started');
  };

  window.stopAmbientLight = function() {
    _enabled = false;
    if (_rafId) {
      cancelAnimationFrame(_rafId);
      _rafId = null;
    }
    // Tell main process to stop capture
    if (window.k10 && window.k10.ambientStop) {
      window.k10.ambientStop();
    }
    // Clear the canvas
    if (_glCtx) {
      _glCtx.clear(_glCtx.COLOR_BUFFER_BIT);
    }
    clearCSSShadows();
    console.log('[Ambient] Stopped');
  };

  window.isAmbientLightActive = function() {
    return _enabled;
  };

  // Note: startup is handled by applySettings() in settings.js
  // which calls startAmbientLight() / stopAmbientLight() based on
  // the persisted showAmbientLight setting.

})();
