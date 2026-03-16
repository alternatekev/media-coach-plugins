// Commentary Data Visualizations

  // ═══════════════════════════════════════════════════════════════
  //  COMMENTARY DATA VISUALIZATIONS
  //  Canvas-based mini visualizations that appear beneath the
  //  commentary text, driven by the topicId that triggered the
  //  commentary event. Live-updating while the commentary is visible.
  // ═══════════════════════════════════════════════════════════════

  const _vizCanvas = document.getElementById('commentaryVizCanvas');
  const _vizCtx = _vizCanvas ? _vizCanvas.getContext('2d') : null;
  const _vizContainer = document.getElementById('commentaryViz');
  const _vizValueEl = document.getElementById('commentaryVizValue');
  const _vizLabelEl = document.getElementById('commentaryVizLabel');

  let _vizActive = false;
  let _vizTopicId = '';
  let _vizHue = 0;
  let _vizHistory = [];       // rolling data buffer for live line charts
  const _VIZ_HIST_LEN = 60;  // ~2 seconds of samples at 30fps poll rate

  // ── Viz type definitions ──
  // Each topicId maps to a visualization type and configuration.
  // 'gauge'   — arc gauge showing a single value 0-1
  // 'bar'     — horizontal bar with label
  // 'line'    — rolling line chart with history buffer
  // 'gforce'  — 2D g-force dot (lat vs long)
  // 'quad'    — four-corner display (tyres)
  // 'delta'   — +/- delta bar centered at zero
  // 'counter' — simple large numeric display (no canvas)
  const _vizConfig = {
    // ── Car response ──
    spin_catch:            { type: 'gforce',  label: 'G-Force',        unit: 'g' },
    high_cornering_load:   { type: 'gforce',  label: 'Cornering Load', unit: 'g' },
    heavy_braking:         { type: 'line',    label: 'Brake Pressure', unit: '%',    src: 'brake' },
    car_balance_sustained: { type: 'gforce',  label: 'Car Balance',    unit: 'g' },
    rapid_gear_change:     { type: 'line',    label: 'RPM',            unit: '',     src: 'rpm' },
    wall_contact:          { type: 'counter', label: 'Incidents',      src: 'incidents' },
    off_track:             { type: 'counter', label: 'Incidents',      src: 'incidents' },
    kerb_hit:              { type: 'gforce',  label: 'Impact',         unit: 'g' },

    // ── Hardware ──
    abs_activation:        { type: 'line',    label: 'Brake + ABS',    unit: '%',    src: 'brake' },
    tc_intervention:       { type: 'line',    label: 'Throttle + TC',  unit: '%',    src: 'throttle' },
    ffb_torque_spike:      { type: 'line',    label: 'Steer Torque',   unit: '',     src: 'steerTorque' },
    brake_bias_change:     { type: 'gauge',   label: 'Brake Bias',     unit: '%',    src: 'brakeBias', min: 40, max: 65 },
    tc_setting_change:     { type: 'gauge',   label: 'TC Level',       unit: '',     src: 'tc', min: 0, max: 12 },
    abs_setting_change:    { type: 'gauge',   label: 'ABS Level',      unit: '',     src: 'abs', min: 0, max: 12 },
    arb_front_change:      { type: 'bar',     label: 'Front ARB',      unit: '',     src: 'tc' },
    arb_rear_change:       { type: 'bar',     label: 'Rear ARB',       unit: '',     src: 'abs' },

    // ── Game feel ──
    qualifying_push:       { type: 'delta',   label: 'Lap Delta',      unit: 's',    src: 'lapDelta' },
    personal_best:         { type: 'delta',   label: 'Lap Delta',      unit: 's',    src: 'lapDelta' },
    long_stint:            { type: 'counter', label: 'Laps',           src: 'laps' },
    session_time_low:      { type: 'counter', label: 'Remaining',      src: 'sessionTime' },
    drs_active:            { type: 'line',    label: 'Speed',          unit: 'mph',  src: 'speed' },
    ers_low:               { type: 'gauge',   label: 'ERS Battery',    unit: '%',    src: 'fuel', min: 0, max: 100 },

    // ── Racing experience ──
    close_battle:          { type: 'delta',   label: 'Gap',            unit: 's',    src: 'gapAhead' },
    position_gained:       { type: 'counter', label: 'Position',       src: 'position' },
    position_lost:         { type: 'counter', label: 'Position',       src: 'position' },
    incident_spike:        { type: 'counter', label: 'Incidents',      src: 'incidents' },
    low_fuel:              { type: 'gauge',   label: 'Fuel',           unit: 'L',    src: 'fuel', min: 0, max: 100 },
    hot_tyres:             { type: 'quad',    label: 'Tyre Temps',     unit: '°C',   src: 'tyreTemp' },
    tyre_wear_high:        { type: 'quad',    label: 'Tyre Wear',      unit: '%',    src: 'tyreWear' },
    track_temp_hot:        { type: 'counter', label: 'Track Temp',     src: 'trackTemp' },
    track_temp_cold:       { type: 'counter', label: 'Track Temp',     src: 'trackTemp' },
    wet_track:             { type: 'counter', label: 'Track Temp',     src: 'trackTemp' },

    // Catch-all for topics that appear in demo
    pit_entry:             { type: 'counter', label: 'Laps',           src: 'laps' },
    race_start:            { type: 'counter', label: 'Position',       src: 'position' },
    formation_lap:         { type: 'counter', label: 'Position',       src: 'position' },
    yellow_flag:           { type: 'counter', label: 'Incidents',      src: 'incidents' },
    black_flag:            { type: 'counter', label: 'Incidents',      src: 'incidents' },
    debris_on_track:       { type: 'counter', label: 'Incidents',      src: 'incidents' },
  };

  // ── Latest telemetry snapshot (updated by poll engine) ──
  let _vizTelemetry = {};

  // Public: called by poll-engine each frame to push fresh data
  window.updateCommentaryVizData = function(data) {
    _vizTelemetry = data;
    if (_vizActive) _renderVizFrame();
  };

  // Public: activate a viz for the given topicId
  window.showCommentaryViz = function(topicId, hue) {
    const cfg = _vizConfig[topicId];
    if (!cfg || !_vizContainer) {
      if (_vizContainer) _vizContainer.classList.remove('viz-active');
      _vizActive = false;
      return;
    }
    _vizTopicId = topicId;
    _vizHue = hue;
    _vizHistory = [];
    _vizActive = true;
    _vizContainer.classList.add('viz-active');
    _vizContainer.setAttribute('data-viz-type', cfg.type);
    if (_vizLabelEl) _vizLabelEl.textContent = cfg.label;
    if (_vizValueEl) _vizValueEl.textContent = '';
    _renderVizFrame();
  };

  // Public: deactivate
  window.hideCommentaryViz = function() {
    _vizActive = false;
    _vizHistory = [];
    if (_vizContainer) _vizContainer.classList.remove('viz-active');
  };

  // ── Resolve a data value from the telemetry snapshot ──
  function _getVizValue(src) {
    const t = _vizTelemetry;
    switch (src) {
      case 'brake':       return t.brake || 0;
      case 'throttle':    return t.throttle || 0;
      case 'rpm':         return t.rpmRatio || 0;
      case 'speed':       return t.speed || 0;
      case 'brakeBias':   return t.brakeBias || 0;
      case 'tc':          return t.tc || 0;
      case 'abs':         return t.abs || 0;
      case 'fuel':        return t.fuelPct || 0;
      case 'lapDelta':    return t.lapDelta || 0;
      case 'gapAhead':    return t.gapAhead || 0;
      case 'steerTorque': return t.steerTorque || 0;
      case 'position':    return t.position || 0;
      case 'incidents':   return t.incidents || 0;
      case 'laps':        return t.lap || 0;
      case 'sessionTime': return t.sessionTime || '';
      case 'trackTemp':   return t.trackTemp || 0;
      case 'tyreTemp':    return t.tyreTemps || [0,0,0,0];
      case 'tyreWear':    return t.tyreWears || [0,0,0,0];
      default:            return 0;
    }
  }

  // ── Master render dispatcher ──
  function _renderVizFrame() {
    const cfg = _vizConfig[_vizTopicId];
    if (!cfg) return;

    switch (cfg.type) {
      case 'line':    _renderLine(cfg);    break;
      case 'gauge':   _renderGauge(cfg);   break;
      case 'gforce':  _renderGForce(cfg);  break;
      case 'bar':     _renderBar(cfg);     break;
      case 'delta':   _renderDelta(cfg);   break;
      case 'quad':    _renderQuad(cfg);    break;
      case 'counter': _renderCounter(cfg); break;
    }
  }

  // ── Canvas setup helper ──
  function _prepCanvas() {
    if (!_vizCanvas || !_vizCtx) return null;
    const rect = _vizCanvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (w < 2 || h < 2) return null;
    if (_vizCanvas.width !== w || _vizCanvas.height !== h) {
      _vizCanvas.width = w;
      _vizCanvas.height = h;
    }
    _vizCtx.clearRect(0, 0, w, h);
    return { ctx: _vizCtx, w, h, dpr };
  }

  function _hslStr(h, s, l, a) {
    return `hsla(${h}, ${s}%, ${l}%, ${a})`;
  }

  // ════════════════════════════════════════════
  //  LINE — rolling waveform with glow
  // ════════════════════════════════════════════
  function _renderLine(cfg) {
    const val = _getVizValue(cfg.src);
    // Normalize to 0-1 for line chart
    let norm = val;
    if (cfg.src === 'speed') norm = Math.min(1, val / 200);
    else if (cfg.src === 'steerTorque') norm = Math.min(1, Math.abs(val) / 50);
    else if (cfg.src === 'rpm') norm = val; // already 0-1

    _vizHistory.push(norm);
    if (_vizHistory.length > _VIZ_HIST_LEN) _vizHistory.shift();

    const c = _prepCanvas();
    if (!c) return;
    const { ctx, w, h } = c;
    const count = _vizHistory.length;
    if (count < 2) return;

    // Fill area under curve
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let i = 0; i < count; i++) {
      const x = (i / (count - 1)) * w;
      const y = h - _vizHistory[i] * (h - 4) - 2;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    const fillGrad = ctx.createLinearGradient(0, 0, 0, h);
    fillGrad.addColorStop(0, _hslStr(_vizHue, 60, 55, 0.25));
    fillGrad.addColorStop(1, _hslStr(_vizHue, 60, 55, 0.02));
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // Stroke line
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const x = (i / (count - 1)) * w;
      const y = h - _vizHistory[i] * (h - 4) - 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, _hslStr(_vizHue, 50, 60, 0.15));
    grad.addColorStop(0.5, _hslStr(_vizHue, 60, 65, 0.6));
    grad.addColorStop(1, _hslStr(_vizHue, 60, 65, 0.9));
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Live dot at leading edge
    const lastY = h - _vizHistory[count - 1] * (h - 4) - 2;
    ctx.beginPath();
    ctx.arc(w - 1, lastY, 3, 0, Math.PI * 2);
    ctx.fillStyle = _hslStr(_vizHue, 60, 70, 0.9);
    ctx.fill();

    // Value display
    const displayVal = cfg.src === 'speed' ? Math.round(val) :
                       cfg.src === 'steerTorque' ? val.toFixed(1) :
                       Math.round(val * 100);
    if (_vizValueEl) _vizValueEl.textContent = displayVal + (cfg.unit ? ' ' + cfg.unit : '');
  }

  // ════════════════════════════════════════════
  //  GAUGE — arc gauge with animated fill
  // ════════════════════════════════════════════
  function _renderGauge(cfg) {
    const rawVal = _getVizValue(cfg.src);
    const min = cfg.min || 0;
    const max = cfg.max || 100;
    const pct = Math.max(0, Math.min(1, (rawVal - min) / (max - min)));

    const c = _prepCanvas();
    if (!c) return;
    const { ctx, w, h } = c;

    const cx = w / 2;
    const cy = h * 0.7;
    const r = Math.min(cx, cy) * 0.85;
    const startAngle = Math.PI * 0.8;
    const endAngle = Math.PI * 2.2;
    const fillAngle = startAngle + (endAngle - startAngle) * pct;

    // Background arc
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle, false);
    ctx.strokeStyle = _hslStr(_vizHue, 20, 25, 0.3);
    ctx.lineWidth = Math.max(6, r * 0.12);
    ctx.lineCap = 'round';
    ctx.stroke();

    // Filled arc
    if (pct > 0.01) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, fillAngle, false);
      const arcGrad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
      arcGrad.addColorStop(0, _hslStr(_vizHue, 55, 50, 0.7));
      arcGrad.addColorStop(1, _hslStr(_vizHue, 65, 65, 0.95));
      ctx.strokeStyle = arcGrad;
      ctx.lineWidth = Math.max(6, r * 0.12);
      ctx.lineCap = 'round';
      ctx.stroke();

      // Glow at tip
      const tipX = cx + Math.cos(fillAngle) * r;
      const tipY = cy + Math.sin(fillAngle) * r;
      const glow = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, r * 0.2);
      glow.addColorStop(0, _hslStr(_vizHue, 60, 65, 0.5));
      glow.addColorStop(1, _hslStr(_vizHue, 60, 65, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(tipX - r * 0.2, tipY - r * 0.2, r * 0.4, r * 0.4);
    }

    if (_vizValueEl) {
      const fmt = cfg.src === 'brakeBias' ? rawVal.toFixed(1) : Math.round(rawVal);
      _vizValueEl.textContent = fmt + (cfg.unit ? ' ' + cfg.unit : '');
    }
  }

  // ════════════════════════════════════════════
  //  G-FORCE — 2D dot (lateral vs longitudinal)
  // ════════════════════════════════════════════
  function _renderGForce(cfg) {
    const latG = _vizTelemetry.latG || 0;
    const longG = _vizTelemetry.longG || 0;
    const totalG = Math.sqrt(latG * latG + longG * longG);

    const c = _prepCanvas();
    if (!c) return;
    const { ctx, w, h } = c;

    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.min(cx, cy) * 0.85;

    // Background rings
    for (let ring = 1; ring <= 3; ring++) {
      ctx.beginPath();
      ctx.arc(cx, cy, (maxR / 3) * ring, 0, Math.PI * 2);
      ctx.strokeStyle = _hslStr(_vizHue, 20, 30, 0.15);
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(cx - maxR, cy); ctx.lineTo(cx + maxR, cy);
    ctx.moveTo(cx, cy - maxR); ctx.lineTo(cx, cy + maxR);
    ctx.strokeStyle = _hslStr(_vizHue, 20, 40, 0.12);
    ctx.lineWidth = 1;
    ctx.stroke();

    // G-force dot — normalize to 3g range
    const scale = maxR / 3;
    const dotX = cx + (latG * scale);
    const dotY = cy - (longG * scale); // up = positive longG (accel)

    // Trail (store positions)
    if (!_vizHistory.length || _vizHistory[0].x !== undefined) {
      // ok
    } else {
      _vizHistory = [];
    }
    _vizHistory.push({ x: dotX, y: dotY });
    if (_vizHistory.length > 20) _vizHistory.shift();

    // Draw trail
    for (let i = 0; i < _vizHistory.length - 1; i++) {
      const alpha = (i / _vizHistory.length) * 0.3;
      ctx.beginPath();
      ctx.arc(_vizHistory[i].x, _vizHistory[i].y, 2, 0, Math.PI * 2);
      ctx.fillStyle = _hslStr(_vizHue, 55, 60, alpha);
      ctx.fill();
    }

    // Main dot with glow
    const glowR = 8 + totalG * 4;
    const glow = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, glowR);
    glow.addColorStop(0, _hslStr(_vizHue, 65, 65, 0.7));
    glow.addColorStop(0.5, _hslStr(_vizHue, 60, 60, 0.2));
    glow.addColorStop(1, _hslStr(_vizHue, 60, 60, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(dotX - glowR, dotY - glowR, glowR * 2, glowR * 2);

    ctx.beginPath();
    ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
    ctx.fillStyle = _hslStr(_vizHue, 60, 70, 0.95);
    ctx.fill();

    if (_vizValueEl) _vizValueEl.textContent = totalG.toFixed(2) + ' g';
  }

  // ════════════════════════════════════════════
  //  BAR — simple horizontal filled bar
  // ════════════════════════════════════════════
  function _renderBar(cfg) {
    const rawVal = _getVizValue(cfg.src);
    const pct = Math.max(0, Math.min(1, rawVal / 12)); // 0-12 range for TC/ABS

    const c = _prepCanvas();
    if (!c) return;
    const { ctx, w, h } = c;

    const barH = Math.max(8, h * 0.35);
    const barY = (h - barH) / 2;
    const radius = barH / 2;

    // Background
    _roundRect(ctx, 0, barY, w, barH, radius);
    ctx.fillStyle = _hslStr(_vizHue, 20, 20, 0.3);
    ctx.fill();

    // Fill
    if (pct > 0.01) {
      const fillW = Math.max(barH, w * pct);
      _roundRect(ctx, 0, barY, fillW, barH, radius);
      const grad = ctx.createLinearGradient(0, 0, fillW, 0);
      grad.addColorStop(0, _hslStr(_vizHue, 55, 45, 0.7));
      grad.addColorStop(1, _hslStr(_vizHue, 65, 60, 0.95));
      ctx.fillStyle = grad;
      ctx.fill();
    }

    if (_vizValueEl) _vizValueEl.textContent = Math.round(rawVal) + (cfg.unit ? ' ' + cfg.unit : '');
  }

  function _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ════════════════════════════════════════════
  //  DELTA — centered +/- bar (lap delta, gap)
  // ════════════════════════════════════════════
  function _renderDelta(cfg) {
    const rawVal = _getVizValue(cfg.src);
    // Clamp to ±5 seconds for display range
    const clamped = Math.max(-5, Math.min(5, rawVal));
    const pct = clamped / 5; // -1 to +1

    const c = _prepCanvas();
    if (!c) return;
    const { ctx, w, h } = c;

    const barH = Math.max(8, h * 0.35);
    const barY = (h - barH) / 2;
    const midX = w / 2;

    // Background bar
    _roundRect(ctx, 0, barY, w, barH, barH / 2);
    ctx.fillStyle = _hslStr(0, 0, 25, 0.2);
    ctx.fill();

    // Center line
    ctx.beginPath();
    ctx.moveTo(midX, barY - 2);
    ctx.lineTo(midX, barY + barH + 2);
    ctx.strokeStyle = _hslStr(0, 0, 60, 0.4);
    ctx.lineWidth = 1;
    ctx.stroke();

    // Delta fill
    if (Math.abs(pct) > 0.005) {
      const isNeg = pct < 0;
      const hue = isNeg ? 145 : 0; // green for negative (gaining), red for positive (losing)
      const fillW = Math.abs(pct) * (w / 2);
      const fillX = isNeg ? midX - fillW : midX;

      ctx.beginPath();
      ctx.rect(fillX, barY, fillW, barH);
      ctx.fillStyle = _hslStr(hue, 60, 50, 0.7);
      ctx.fill();
    }

    // Value display
    const sign = rawVal > 0.005 ? '+' : rawVal < -0.005 ? '' : '';
    if (_vizValueEl) _vizValueEl.textContent = sign + rawVal.toFixed(3) + ' ' + cfg.unit;
    if (_vizValueEl) _vizValueEl.style.color = rawVal < -0.005 ? 'hsl(145, 60%, 60%)' : rawVal > 0.005 ? 'hsl(0, 60%, 65%)' : '';
  }

  // ════════════════════════════════════════════
  //  QUAD — four-corner display (tyres)
  // ════════════════════════════════════════════
  function _renderQuad(cfg) {
    const vals = _getVizValue(cfg.src);
    const arr = Array.isArray(vals) ? vals : [0, 0, 0, 0];

    const c = _prepCanvas();
    if (!c) return;
    const { ctx, w, h, dpr } = c;

    const gap = 4 * dpr;
    const cellW = (w - gap) / 2;
    const cellH = (h - gap) / 2;
    const positions = [
      [0, 0],                  // FL
      [cellW + gap, 0],        // FR
      [0, cellH + gap],        // RL
      [cellW + gap, cellH + gap] // RR
    ];
    const labels = ['FL', 'FR', 'RL', 'RR'];

    for (let i = 0; i < 4; i++) {
      const [x, y] = positions[i];
      const val = arr[i] || 0;

      // Heat color: blue(cold) → green(ok) → yellow → red(hot)
      let hue;
      if (cfg.src === 'tyreTemp') {
        // Temp range ~50-130°C
        const norm = Math.max(0, Math.min(1, (val - 50) / 80));
        hue = (1 - norm) * 200; // 200 (blue) → 0 (red)
      } else {
        // Wear: 100% = good → 0% = bad
        hue = Math.max(0, Math.min(120, val * 1.2));
      }

      // Cell background
      _roundRect(ctx, x, y, cellW, cellH, 4 * dpr);
      ctx.fillStyle = `hsla(${hue}, 50%, 20%, 0.5)`;
      ctx.fill();

      // Border
      _roundRect(ctx, x, y, cellW, cellH, 4 * dpr);
      ctx.strokeStyle = `hsla(${hue}, 55%, 45%, 0.5)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Value text
      ctx.fillStyle = `hsla(${hue}, 55%, 70%, 0.9)`;
      ctx.font = `bold ${11 * dpr}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const dispVal = cfg.src === 'tyreTemp' ? Math.round(val) + '°' : Math.round(val) + '%';
      ctx.fillText(dispVal, x + cellW / 2, y + cellH / 2 - 2 * dpr);

      // Corner label
      ctx.fillStyle = `hsla(${hue}, 40%, 60%, 0.5)`;
      ctx.font = `${7 * dpr}px system-ui, sans-serif`;
      ctx.fillText(labels[i], x + cellW / 2, y + cellH / 2 + 10 * dpr);
    }

    if (_vizValueEl) _vizValueEl.textContent = '';
  }

  // ════════════════════════════════════════════
  //  COUNTER — simple large numeric (no canvas)
  // ════════════════════════════════════════════
  function _renderCounter(cfg) {
    const rawVal = _getVizValue(cfg.src);
    // Clear canvas
    if (_vizCtx && _vizCanvas) _vizCtx.clearRect(0, 0, _vizCanvas.width, _vizCanvas.height);

    let display;
    if (cfg.src === 'position' && rawVal > 0) display = 'P' + Math.round(rawVal);
    else if (cfg.src === 'sessionTime' && typeof rawVal === 'string') display = rawVal;
    else if (cfg.src === 'trackTemp') display = rawVal.toFixed(1) + '°C';
    else display = Math.round(rawVal);

    if (_vizValueEl) {
      _vizValueEl.textContent = display;
      _vizValueEl.style.color = '';
    }
  }

  // ═══════════════════════════════════════════════════════════════
