// Spotter messages

  // ═══════════════════════════════════════════════════════════════
  //  SPOTTER MESSAGES
  // ═══════════════════════════════════════════════════════════════
  let _spotterTimeout = null;
  let _spotterLastGapA = 0;        // previous gap ahead (seconds)
  let _spotterLastGapB = 0;        // previous gap behind (seconds)
  let _spotterLastMsg = '';
  let _spotterLastPosA = 0;        // previous position of car ahead
  let _spotterLastPosB = 0;        // previous position of car behind

  // SVG icons per severity (viewBox 0 0 24 24, stroke-based)
  const _spotterIcons = {
    default: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    'sp-warn': '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><circle cx="12" cy="16" r="1" fill="currentColor" stroke="none"/>',
    'sp-danger': '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><circle cx="12" cy="16" r="1" fill="currentColor" stroke="none"/>',
    'sp-clear': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>',
    // In-car adjustment icons
    'sp-bb':  '<circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M8 8h8"/><path d="M6 12h12"/>',
    'sp-tc':  '<path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10"/><path d="M12 8v8"/><path d="M8 12h8"/>',
    'sp-abs': '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 8v8"/><path d="M8 12h8"/>',
    // Lap timing icon (stopwatch)
    'sp-lap': '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M10 2h4"/><path d="M12 2v3"/>'
  };

  function _setSpotterIcon(severity) {
    const iconEl = document.querySelector('#spotterInner .sp-icon');
    if (!iconEl) return;
    const path = _spotterIcons[severity] || _spotterIcons.default;
    iconEl.innerHTML = path;
  }

  function _setSpotterHeader(text) {
    const hdr = document.querySelector('#spotterInner .sp-header');
    if (hdr) hdr.textContent = text;
  }

  function _showSpotterMsg(msg, severity, headerOverride) {
    const inner = document.getElementById('spotterInner');
    const msgEl = document.getElementById('spotterMsg');
    if (!inner || !msgEl || !msg || msg === _spotterLastMsg) return;
    _spotterLastMsg = msg;
    msgEl.textContent = msg;
    inner.className = 'sp-inner sp-active ' + severity;
    _setSpotterIcon(severity);
    if (headerOverride) _setSpotterHeader(headerOverride);
    else _setSpotterHeader('Spotter');
    if (window.setSpotterGlow) {
      const glowMap = { 'sp-warn': 'warn', 'sp-danger': 'danger', 'sp-clear': 'clear' };
      window.setSpotterGlow(glowMap[severity] || 'warn');
    }
    if (_spotterTimeout) clearTimeout(_spotterTimeout);
    _spotterTimeout = setTimeout(() => {
      inner.classList.remove('sp-active');
      _setSpotterIcon('default');
      _setSpotterHeader('Spotter');
      if (window.setSpotterGlow) window.setSpotterGlow('off');
      _spotterLastMsg = '';
      _spotterTimeout = null;
    }, 5000);
  }

  function updateSpotter(p, isDemo) {
    const inner = document.getElementById('spotterInner');
    const msgEl = document.getElementById('spotterMsg');
    if (!inner || !msgEl) return;

    // ═══════════════════════════════════════════════════════════
    //  RACE SESSIONS: gap-based proximity spotter
    // ═══════════════════════════════════════════════════════════
    // Read gap data
    const gAhead  = isDemo ? (+p['K10MediaBroadcaster.Plugin.Demo.GapAhead'] || 0)  : (+p['IRacingExtraProperties.iRacing_Opponent_Ahead_Gap'] || 0);
    const gBehind = isDemo ? (+p['K10MediaBroadcaster.Plugin.Demo.GapBehind'] || 0) : (+p['IRacingExtraProperties.iRacing_Opponent_Behind_Gap'] || 0);

    // Compute gap deltas (negative = gap shrinking = closing)
    const deltaA = _spotterLastGapA > 0 && gAhead > 0 ? gAhead - _spotterLastGapA : 0;
    const deltaB = _spotterLastGapB > 0 && gBehind > 0 ? gBehind - _spotterLastGapB : 0;

    let msg = '';
    let severity = '';

    // ═ Threat behind — car closing on us ═
    if (gBehind > 0 && gBehind <= 0.8) {
      msg = 'Car alongside — ' + gBehind.toFixed(1) + 's';
      severity = 'sp-danger';
    } else if (gBehind > 0 && gBehind <= 2.0) {
      if (deltaB < -0.03) {
        msg = 'Car closing — ' + gBehind.toFixed(1) + 's';
        severity = 'sp-warn';
      } else {
        msg = 'Car behind — ' + gBehind.toFixed(1) + 's';
        severity = 'sp-warn';
      }
    } else if (gBehind > 0 && gBehind <= 4.0 && deltaB < -0.03) {
      msg = 'Car reeling in — ' + gBehind.toFixed(1) + 's';
      severity = 'sp-warn';
    }

    // ═ Opportunity ahead — we're closing on the car ahead ═
    if (gAhead > 0 && gAhead <= 0.8) {
      msg = 'Car right there — ' + gAhead.toFixed(1) + 's';
      severity = 'sp-danger';
    } else if (gAhead > 0 && gAhead <= 2.0 && !msg) {
      if (deltaA < -0.03) {
        msg = 'Closing on car ahead — ' + gAhead.toFixed(1) + 's';
        severity = 'sp-clear';
      } else if (deltaA > 0.03) {
        msg = 'Car ahead pulling away — ' + gAhead.toFixed(1) + 's';
        severity = 'sp-warn';
      } else {
        msg = 'Car ahead — ' + gAhead.toFixed(1) + 's';
        severity = 'sp-clear';
      }
    } else if (gAhead > 0 && gAhead <= 4.0 && deltaA < -0.03 && !msg) {
      msg = 'Gaining on car ahead — ' + gAhead.toFixed(1) + 's';
      severity = 'sp-clear';
    }

    // ═ Pass events — position swaps ═
    if (_spotterLastGapA > 0 && _spotterLastGapA < 3.0 && gAhead > _spotterLastGapA + 2.0 && gBehind > 0 && gBehind < 3.0) {
      msg = 'Clear — position gained';
      severity = 'sp-clear';
    }
    if (_spotterLastGapB > 0 && _spotterLastGapB < 3.0 && gBehind > _spotterLastGapB + 2.0 && gAhead > 0 && gAhead < 3.0) {
      msg = 'Position lost';
      severity = 'sp-danger';
    }

    _spotterLastGapA = gAhead;
    _spotterLastGapB = gBehind;

    if (msg) _showSpotterMsg(msg, severity);
  }

  // ═══════════════════════════════════════════════════════════════
  //  IN-CAR ADJUSTMENT ANNOUNCEMENTS
  //  Called from poll-engine when BB / TC / ABS values change.
  //  Shows a brief spotter-style callout with the new value.
  // ═══════════════════════════════════════════════════════════════
  window.announceAdjustment = function(type, value, direction) {
    const inner = document.getElementById('spotterInner');
    const msgEl = document.getElementById('spotterMsg');
    if (!inner || !msgEl) return;

    const arrow = direction > 0 ? '\u25B2' : direction < 0 ? '\u25BC' : '';
    let label, icon;
    switch (type) {
      case 'bb':
        label = 'Brake Bias ' + arrow + ' ' + (typeof value === 'number' ? value.toFixed(1) : value);
        icon = 'sp-bb';
        break;
      case 'tc':
        label = 'TC ' + arrow + ' ' + Math.round(value);
        icon = 'sp-tc';
        break;
      case 'abs':
        label = 'ABS ' + arrow + ' ' + Math.round(value);
        icon = 'sp-abs';
        break;
      default:
        label = type + ' ' + arrow + ' ' + value;
        icon = 'default';
    }

    // Force-show even if same text (adjustments should always confirm)
    _spotterLastMsg = '';
    _showSpotterMsg(label, 'sp-clear', 'Adjustment');
    // Override icon to adjustment-specific one
    _setSpotterIcon(icon);
  };

  // ═══════════════════════════════════════════════════════════════
