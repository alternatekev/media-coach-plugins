// ═══════════════════════════════════════════════════════════════
//  AMBIENT LIGHT — Per-panel glow + glass reflections
// ═══════════════════════════════════════════════════════════════
//
//  No WebGL canvas — all glow/reflection is done via CSS pseudo-
//  elements (::before = radial glow, ::after = glass highlight).
//
//  This JS module handles:
//    • Smooth LERP interpolation of the ambient color
//    • Updating --ambient-r / --ambient-g / --ambient-b on :root
//    • Receiving color from Electron screen capturer (IPC)
//    • Falling back to polled flag-state color
//
//  The CSS breathing animation runs independently in ambient.css.
// ═══════════════════════════════════════════════════════════════

(function initAmbientLight() {
  'use strict';

  // ── State ──
  let _enabled = false;
  let _rafId = null;
  let _hasReceivedColor = false;
  let _usePolledColor = false;

  // Current + target color (smooth interpolation, 0-1 range)
  let _curR = 0, _curG = 0, _curB = 0;
  let _tgtR = 0, _tgtG = 0, _tgtB = 0;

  const LERP = 0.30;

  // ── Flag-to-color mapping ──
  const FLAG_AMBIENT = {
    green:     { r: 0.35, g: 0.85, b: 0.45 },
    yellow:    { r: 0.95, g: 0.82, b: 0.25 },
    red:       { r: 0.90, g: 0.20, b: 0.15 },
    blue:      { r: 0.30, g: 0.50, b: 0.95 },
    white:     { r: 0.85, g: 0.85, b: 0.90 },
    black:     { r: 0.25, g: 0.25, b: 0.25 },
    checkered: { r: 0.80, g: 0.80, b: 0.82 },
    meatball:  { r: 0.90, g: 0.35, b: 0.20 },
    orange:    { r: 0.95, g: 0.60, b: 0.15 },
    debris:    { r: 0.85, g: 0.72, b: 0.25 },
    none:      { r: 0.45, g: 0.55, b: 0.75 },
  };

  // ── Update CSS vars that drive glow + reflection tint on panels ──
  // No brightness floor — dark sampled colors darken the modules.
  // --ambient-lum (0-1) tells CSS how bright the ambient light is,
  // so panels can dim their background when the lighting source is dark.
  // Expose ambient color for WebGL postfx shader (0-1 range)
  window._ambientGL = { r: 0, g: 0, b: 0, lum: 0 };

  function updateReflectionColor(r, g, b) {
    const root = document.documentElement.style;
    root.setProperty('--ambient-r', String(Math.round(r * 255)));
    root.setProperty('--ambient-g', String(Math.round(g * 255)));
    root.setProperty('--ambient-b', String(Math.round(b * 255)));
    // Perceptual luminance (rec. 709)
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    root.setProperty('--ambient-lum', lum.toFixed(3));
    // Push to WebGL-readable global
    const a = window._ambientGL;
    a.r = r; a.g = g; a.b = b; a.lum = lum;
  }

  function clearReflectionColor() {
    const root = document.documentElement.style;
    root.setProperty('--ambient-r', '80');
    root.setProperty('--ambient-g', '100');
    root.setProperty('--ambient-b', '140');
  }

  // ── Polled color from flag state ──
  function pollFlagColor() {
    const flag = window._currentFlagState || 'none';
    const c = FLAG_AMBIENT[flag] || FLAG_AMBIENT.none;
    _tgtR = c.r;
    _tgtG = c.g;
    _tgtB = c.b;
  }

  // ── Render loop — LERP + push CSS vars each frame ──
  let _logTimer = 0;
  function render(timestamp) {
    if (!_enabled) return;
    _rafId = requestAnimationFrame(render);

    if (_usePolledColor) pollFlagColor();

    // Smooth interpolation
    _curR += (_tgtR - _curR) * LERP;
    _curG += (_tgtG - _curG) * LERP;
    _curB += (_tgtB - _curB) * LERP;

    // Push to CSS vars (drives both ::before glow and ::after reflection)
    updateReflectionColor(_curR, _curG, _curB);

    // Plastic mode: push telemetry to CSS custom properties so the
    // CSS-only glow can animate with speed + steering rotation.
    // Only writes when plastic is active to avoid unnecessary DOM work.
    if (window._ambientModeInt === 0 && document.body.classList.contains('ambient-plastic')) {
      const pfx = window._pfx;
      if (pfx) {
        const root = document.documentElement.style;
        // steer: -1..+1 → rotation in degrees (inverted, ±4° like WebGL)
        root.setProperty('--plastic-rotate', (-pfx.steer * 4).toFixed(2) + 'deg');
        // speed: 0..1 → sweep offset (0px..30px horizontal shift)
        const spdMul = 0.075 + pfx.speed * 0.425;
        root.setProperty('--plastic-sweep', (spdMul * 60).toFixed(1) + 'px');
        // time-based sweep position (slow diagonal drift)
        const timeSec = timestamp * 0.001;
        const sweepPhase = Math.sin(timeSec * 0.2 * spdMul) * 0.5 + 0.5;
        root.setProperty('--plastic-phase', sweepPhase.toFixed(3));
      }
    }

    // Diagnostic log every 5s
    const t = timestamp * 0.001;
    const sec = Math.floor(t);
    if (sec % 5 === 0 && sec !== _logTimer) {
      _logTimer = sec;
      console.log(`[Ambient] color=(${_curR.toFixed(2)}, ${_curG.toFixed(2)}, ${_curB.toFixed(2)}) polled=${_usePolledColor} received=${_hasReceivedColor}`);
    }
  }

  // ── Receive color from Electron main process ──
  function onColorUpdate(color) {
    if (!_hasReceivedColor) {
      console.log('[Ambient] First color received from Electron:', JSON.stringify(color));
    }
    _hasReceivedColor = true;
    _usePolledColor = false;
    _tgtR = color.r / 255;
    _tgtG = color.g / 255;
    _tgtB = color.b / 255;

    // Auto-enable if we get color data but the glow isn't on yet
    if (!_enabled) {
      console.log('[Ambient] Auto-enabling from IPC color data');
      _enabled = true;
      _curR = _tgtR; _curG = _tgtG; _curB = _tgtB;
      _rafId = requestAnimationFrame(render);
    }
  }

  // ══════════════════════════════════════════════════════════
  //  REGISTER IPC LISTENER IMMEDIATELY — don't wait for
  //  startAmbientLight(). The main process auto-starts
  //  capture 3s after window load, and we need to be
  //  listening when that data arrives.
  // ══════════════════════════════════════════════════════════
  if (window.k10 && window.k10.onAmbientColor) {
    window.k10.onAmbientColor(onColorUpdate);
    console.log('[Ambient] IPC listener registered on load (immediate)');
  }

  // ── Public API ──

  window.startAmbientLight = function() {
    if (_enabled) return;

    _enabled = true;
    _rafId = requestAnimationFrame(render);

    // Also tell main process to start capturing
    if (window.k10 && window.k10.ambientStart) {
      window.k10.ambientStart();
    }

    _usePolledColor = true;
    console.log('[Ambient] Started (polled until capture data arrives)');
  };

  // External color push
  window.setAmbientColor = function(r, g, b) {
    _hasReceivedColor = true;
    _usePolledColor = false;
    _tgtR = r;
    _tgtG = g;
    _tgtB = b;
  };

  window.stopAmbientLight = function() {
    _enabled = false;
    if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
    if (window.k10 && window.k10.ambientStop) window.k10.ambientStop();
    clearReflectionColor();
    _usePolledColor = false;
    _hasReceivedColor = false;
    console.log('[Ambient] Stopped');
  };

  window.isAmbientLightActive = function() {
    return _enabled;
  };

  // Expose color state for the settings preview
  window.getAmbientColor = function() {
    return {
      r: _curR, g: _curG, b: _curB,
      tr: _tgtR, tg: _tgtG, tb: _tgtB,
      enabled: _enabled,
      hasData: _hasReceivedColor,
      polled: _usePolledColor,
    };
  };

})();
