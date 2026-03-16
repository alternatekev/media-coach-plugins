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
    'sp-clear': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>'
  };

  function _setSpotterIcon(severity) {
    const iconEl = document.querySelector('#spotterInner .sp-icon');
    if (!iconEl) return;
    const path = _spotterIcons[severity] || _spotterIcons.default;
    iconEl.innerHTML = path;
  }

  function updateSpotter(p, isDemo) {
    const inner = document.getElementById('spotterInner');
    const msgEl = document.getElementById('spotterMsg');
    if (!inner || !msgEl) return;

    // Read gap + driver data
    const gAhead  = isDemo ? (+p['K10MediaBroadcaster.Plugin.Demo.GapAhead'] || 0)  : (+p['IRacingExtraProperties.iRacing_Opponent_Ahead_Gap'] || 0);
    const gBehind = isDemo ? (+p['K10MediaBroadcaster.Plugin.Demo.GapBehind'] || 0) : (+p['IRacingExtraProperties.iRacing_Opponent_Behind_Gap'] || 0);
    const dAhead  = isDemo ? (p['K10MediaBroadcaster.Plugin.Demo.DriverAhead'] || '')  : (p['IRacingExtraProperties.iRacing_Opponent_Ahead_Name'] || '');
    const dBehind = isDemo ? (p['K10MediaBroadcaster.Plugin.Demo.DriverBehind'] || '') : (p['IRacingExtraProperties.iRacing_Opponent_Behind_Name'] || '');

    // Shorten driver name: "John Smith" → "Smith", "J. Smith" → "Smith"
    const shortName = (n) => {
      if (!n) return '';
      const parts = n.trim().split(/\s+/);
      return parts.length > 1 ? parts[parts.length - 1] : parts[0];
    };

    // Compute gap deltas (negative = gap shrinking = closing)
    const deltaA = _spotterLastGapA > 0 && gAhead > 0 ? gAhead - _spotterLastGapA : 0;
    const deltaB = _spotterLastGapB > 0 && gBehind > 0 ? gBehind - _spotterLastGapB : 0;

    let msg = '';
    let severity = '';

    // ═ Threat behind — car closing on us ═
    if (gBehind > 0 && gBehind < 0.8) {
      // Alongside / very close
      const who = shortName(dBehind);
      msg = who ? who + ' alongside — ' + gBehind.toFixed(1) + 's' : 'Car alongside — ' + gBehind.toFixed(1) + 's';
      severity = 'sp-danger';
    } else if (gBehind > 0 && gBehind < 2.0) {
      // Close behind — is the gap shrinking?
      const who = shortName(dBehind);
      if (deltaB < -0.05) {
        msg = (who || 'Car') + ' closing — ' + gBehind.toFixed(1) + 's';
        severity = 'sp-warn';
      } else {
        msg = (who || 'Car') + ' behind — ' + gBehind.toFixed(1) + 's';
        severity = 'sp-warn';
      }
    } else if (gBehind > 0 && gBehind < 3.5 && deltaB < -0.08) {
      // Further back but closing fast
      const who = shortName(dBehind);
      msg = (who || 'Car') + ' reeling in — ' + gBehind.toFixed(1) + 's';
      severity = 'sp-warn';
    }

    // ═ Opportunity ahead — we're closing on the car ahead ═
    if (gAhead > 0 && gAhead < 0.8) {
      const who = shortName(dAhead);
      msg = who ? who + ' right there — ' + gAhead.toFixed(1) + 's' : 'Car ahead — ' + gAhead.toFixed(1) + 's';
      severity = 'sp-danger';
    } else if (gAhead > 0 && gAhead < 2.0 && !msg) {
      const who = shortName(dAhead);
      if (deltaA < -0.05) {
        msg = 'Closing on ' + (who || 'car ahead') + ' — ' + gAhead.toFixed(1) + 's';
        severity = 'sp-clear';
      } else if (deltaA > 0.05) {
        msg = (who || 'Car ahead') + ' pulling away — ' + gAhead.toFixed(1) + 's';
        severity = 'sp-warn';
      }
    } else if (gAhead > 0 && gAhead < 3.5 && deltaA < -0.08 && !msg) {
      const who = shortName(dAhead);
      msg = 'Gaining on ' + (who || 'car ahead') + ' — ' + gAhead.toFixed(1) + 's';
      severity = 'sp-clear';
    }

    // ═ Pass events — position swaps ═
    // Detect when the car that was ahead is now behind (we passed them)
    if (_spotterLastGapA > 0 && _spotterLastGapA < 3.0 && gAhead > _spotterLastGapA + 2.0 && gBehind > 0 && gBehind < 3.0) {
      msg = 'Clear — position gained';
      severity = 'sp-clear';
    }
    // Detect when the car that was behind is now ahead (they passed us)
    if (_spotterLastGapB > 0 && _spotterLastGapB < 3.0 && gBehind > _spotterLastGapB + 2.0 && gAhead > 0 && gAhead < 3.0) {
      msg = 'Position lost';
      severity = 'sp-danger';
    }

    _spotterLastGapA = gAhead;
    _spotterLastGapB = gBehind;

    if (msg && msg !== _spotterLastMsg) {
      _spotterLastMsg = msg;
      msgEl.textContent = msg;
      inner.className = 'sp-inner sp-active ' + severity;
      _setSpotterIcon(severity);
      // Activate WebGL glow matching severity
      if (window.setSpotterGlow) {
        const glowMap = { 'sp-warn': 'warn', 'sp-danger': 'danger', 'sp-clear': 'clear' };
        window.setSpotterGlow(glowMap[severity] || 'warn');
      }
      if (_spotterTimeout) clearTimeout(_spotterTimeout);
      _spotterTimeout = setTimeout(() => {
        inner.classList.remove('sp-active');
        _setSpotterIcon('default');
        if (window.setSpotterGlow) window.setSpotterGlow('off');
        _spotterLastMsg = '';
        _spotterTimeout = null;
      }, 5000);  // 5s display for readability during racing
    }
  }

  // ═══════════════════════════════════════════════════════════════
