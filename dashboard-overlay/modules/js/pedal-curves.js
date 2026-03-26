// ═══════════════════════════════════════════════════════════════
// PEDAL CURVE VISUALIZATION
// Renders throttle/brake response curves from the active pedal
// profile onto a small overlay canvas in the pedals panel.
// Data flows from the C# PedalProfileManager via the HTTP bridge
// as K10Motorsports.Plugin.DS.PedalProfile (JSON object).
// ═══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  var _curveCanvas = null;
  var _curveCtx = null;
  var _profileLabel = null;
  var _lastProfileJson = '';
  var _currentProfile = null;

  // Colors matching the existing pedal histogram
  var THROTTLE_COLOR = '#4CAF50';
  var BRAKE_COLOR    = '#F44336';
  var CLUTCH_COLOR   = '#42A5F5';
  var GRID_COLOR     = 'rgba(255, 255, 255, 0.06)';
  var DIAG_COLOR     = 'rgba(255, 255, 255, 0.04)';

  // ── Init ────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    _curveCanvas = document.getElementById('pedalCurveCanvas');
    _profileLabel = document.getElementById('pedalProfileLabel');
    if (_curveCanvas) {
      _curveCtx = _curveCanvas.getContext('2d');
      // High-DPI rendering
      var dpr = window.devicePixelRatio || 1;
      var w = _curveCanvas.offsetWidth || 80;
      var h = _curveCanvas.offsetHeight || 80;
      _curveCanvas.width = w * dpr;
      _curveCanvas.height = h * dpr;
      _curveCtx.scale(dpr, dpr);
      _curveCanvas.style.width = w + 'px';
      _curveCanvas.style.height = h + 'px';
    }
  });

  // ── Called each poll frame from poll-engine.js ────────────────
  // p = full poll data object
  window.updatePedalCurves = function (p) {
    if (!_curveCtx) return;

    var profileData = p['K10Motorsports.Plugin.DS.PedalProfile'];
    if (!profileData || typeof profileData !== 'object') return;

    // Only re-render when the profile data changes (curves are static per profile)
    var json = JSON.stringify(profileData);
    if (json === _lastProfileJson) return;
    _lastProfileJson = json;
    _currentProfile = profileData;

    // Update label
    if (_profileLabel) {
      var name = profileData.profileName || '';
      var source = profileData.source || '';
      if (source === 'moza') name = '⚡ ' + name;
      _profileLabel.textContent = name;
      _profileLabel.title = profileData.carName || '';
    }

    renderCurves();
  };

  function renderCurves() {
    if (!_curveCtx || !_currentProfile) return;

    var ctx = _curveCtx;
    var dpr = window.devicePixelRatio || 1;
    var w = (_curveCanvas.offsetWidth || 80);
    var h = (_curveCanvas.offsetHeight || 80);
    var pad = 4; // padding
    var plotW = w - pad * 2;
    var plotH = h - pad * 2;

    ctx.clearRect(0, 0, w, h);

    // ── Background grid ──────────────────────────────────────
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 0.5;

    // 25% grid lines
    for (var i = 1; i <= 3; i++) {
      var gx = pad + (i / 4) * plotW;
      var gy = pad + (1 - i / 4) * plotH;
      ctx.beginPath();
      ctx.moveTo(gx, pad); ctx.lineTo(gx, pad + plotH);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pad, gy); ctx.lineTo(pad + plotW, gy);
      ctx.stroke();
    }

    // Diagonal reference (linear 1:1)
    ctx.strokeStyle = DIAG_COLOR;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(pad, pad + plotH);
    ctx.lineTo(pad + plotW, pad);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Draw each curve ──────────────────────────────────────
    var throttleCurve = _currentProfile.throttleCurve;
    var brakeCurve = _currentProfile.brakeCurve;
    var clutchCurve = _currentProfile.clutchCurve;

    if (clutchCurve && clutchCurve.length >= 2) {
      drawCurve(ctx, clutchCurve, CLUTCH_COLOR, 0.35, pad, plotW, plotH);
    }
    if (brakeCurve && brakeCurve.length >= 2) {
      drawCurve(ctx, brakeCurve, BRAKE_COLOR, 0.7, pad, plotW, plotH);
    }
    if (throttleCurve && throttleCurve.length >= 2) {
      drawCurve(ctx, throttleCurve, THROTTLE_COLOR, 0.85, pad, plotW, plotH);
    }

    // ── Deadzone indicators ──────────────────────────────────
    var thrDz = _currentProfile.throttleDeadzone || 0;
    var brkDz = _currentProfile.brakeDeadzone || 0;

    if (thrDz > 0.01) {
      var dzX = pad + thrDz * plotW;
      ctx.strokeStyle = THROTTLE_COLOR;
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(dzX, pad); ctx.lineTo(dzX, pad + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    if (brkDz > 0.01) {
      var dzX2 = pad + brkDz * plotW;
      ctx.strokeStyle = BRAKE_COLOR;
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(dzX2, pad); ctx.lineTo(dzX2, pad + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
  }

  function drawCurve(ctx, points, color, alpha, pad, plotW, plotH) {
    if (!points || points.length < 2) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = alpha;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.beginPath();
    for (var i = 0; i < points.length; i++) {
      var px = pad + points[i][0] * plotW;
      var py = pad + (1 - points[i][1]) * plotH; // Y is inverted (0 at bottom)
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // ── Expose for settings panel ────────────────────────────────
  window.getCurrentPedalProfile = function () {
    return _currentProfile;
  };
})();

// ═══════════════════════════════════════════════════════════════
// PEDAL SETTINGS PANEL — profile management + curve preview
// ═══════════════════════════════════════════════════════════════

var _pedalSettingsCanvas = null;
var _pedalSettingsCtx = null;
var _pedalProfilesLoaded = false;

function _initPedalSettingsCanvas() {
  if (_pedalSettingsCanvas) return;
  _pedalSettingsCanvas = document.getElementById('pedalSettingsCurveCanvas');
  if (!_pedalSettingsCanvas) return;
  _pedalSettingsCtx = _pedalSettingsCanvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;
  var w = _pedalSettingsCanvas.offsetWidth || 200;
  var h = _pedalSettingsCanvas.offsetHeight || 200;
  _pedalSettingsCanvas.width = w * dpr;
  _pedalSettingsCanvas.height = h * dpr;
  _pedalSettingsCtx.scale(dpr, dpr);
  _pedalSettingsCanvas.style.width = w + 'px';
  _pedalSettingsCanvas.style.height = h + 'px';
}

function renderPedalSettingsCurve() {
  _initPedalSettingsCanvas();
  var profile = window.getCurrentPedalProfile ? window.getCurrentPedalProfile() : null;
  if (!profile || !_pedalSettingsCtx) return;

  var ctx = _pedalSettingsCtx;
  var w = _pedalSettingsCanvas.offsetWidth || 200;
  var h = _pedalSettingsCanvas.offsetHeight || 200;
  var pad = 20;
  var plotW = w - pad * 2;
  var plotH = h - pad * 2;

  ctx.clearRect(0, 0, w, h);

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(0, 0, w, h);

  // Grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 0.5;
  for (var i = 0; i <= 4; i++) {
    var gx = pad + (i / 4) * plotW;
    var gy = pad + (i / 4) * plotH;
    ctx.beginPath(); ctx.moveTo(gx, pad); ctx.lineTo(gx, pad + plotH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad, gy); ctx.lineTo(pad + plotW, gy); ctx.stroke();
  }

  // Axis labels
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('0%', pad, h - 4);
  ctx.fillText('50%', pad + plotW / 2, h - 4);
  ctx.fillText('100%', pad + plotW, h - 4);
  ctx.textAlign = 'right';
  ctx.fillText('0%', pad - 4, pad + plotH);
  ctx.fillText('100%', pad - 4, pad + 3);

  // Diagonal reference
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(pad, pad + plotH);
  ctx.lineTo(pad + plotW, pad);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw curves
  function drawSettingsCurve(points, color) {
    if (!points || points.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (var j = 0; j < points.length; j++) {
      var px = pad + points[j][0] * plotW;
      var py = pad + (1 - points[j][1]) * plotH;
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  drawSettingsCurve(profile.clutchCurve, '#42A5F5');
  drawSettingsCurve(profile.brakeCurve, '#F44336');
  drawSettingsCurve(profile.throttleCurve, '#4CAF50');

  // Deadzone markers
  if (profile.throttleDeadzone > 0.01) {
    var tdx = pad + profile.throttleDeadzone * plotW;
    ctx.strokeStyle = 'rgba(76, 175, 80, 0.35)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(tdx, pad); ctx.lineTo(tdx, pad + plotH); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(76, 175, 80, 0.4)';
    ctx.fillRect(pad, pad, tdx - pad, plotH);
  }
  if (profile.brakeDeadzone > 0.01) {
    var bdx = pad + profile.brakeDeadzone * plotW;
    ctx.strokeStyle = 'rgba(244, 67, 54, 0.35)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(bdx, pad); ctx.lineTo(bdx, pad + plotH); ctx.stroke();
    ctx.setLineDash([]);
  }
}

function loadPedalProfiles() {
  var url = (window._simhubUrlOverride || SIMHUB_URL) + '?action=listPedalProfiles';
  fetch(url).then(function (r) { return r.json(); }).then(function (profiles) {
    var sel = document.getElementById('settingsPedalProfile');
    if (!sel) return;
    sel.innerHTML = '';
    profiles.forEach(function (p) {
      var opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name + (p.carName ? ' (' + p.carName + ')' : '');
      if (p.isActive) opt.selected = true;
      sel.appendChild(opt);
    });
    _pedalProfilesLoaded = true;
  }).catch(function () {
    // Plugin may not be running yet
  });
}

function switchPedalProfile(profileId) {
  if (!profileId) return;
  var url = (window._simhubUrlOverride || SIMHUB_URL) + '?action=setPedalProfile&id=' + encodeURIComponent(profileId);
  fetch(url).catch(function () {});
}

function bindPedalProfileToCar() {
  var sel = document.getElementById('settingsPedalProfile');
  if (!sel || !sel.value) return;
  var url = (window._simhubUrlOverride || SIMHUB_URL) + '?action=bindPedalProfile&id=' + encodeURIComponent(sel.value);
  fetch(url).then(function () {
    var btn = document.getElementById('pedalBindCarBtn');
    if (btn) { btn.textContent = 'Bound!'; setTimeout(function () { btn.textContent = 'Bind'; }, 2000); }
  }).catch(function () {});
}

function importMozaPedals() {
  var url = (window._simhubUrlOverride || SIMHUB_URL) + '?action=importMozaPedals';
  fetch(url).then(function (r) { return r.json(); }).then(function (result) {
    if (result.ok) {
      loadPedalProfiles(); // refresh the dropdown
      var btn = document.getElementById('mozaImportBtn');
      if (btn) { btn.textContent = 'Imported!'; setTimeout(function () { btn.textContent = 'Import from Moza'; }, 3000); }
    }
  }).catch(function () {});
}

// Detect Moza status and update UI when the Pedals tab loads
function updatePedalSettingsUI() {
  var profile = window.getCurrentPedalProfile ? window.getCurrentPedalProfile() : null;
  var statusLabel = document.getElementById('mozaStatusLabel');
  var importBtn = document.getElementById('mozaImportBtn');

  if (profile) {
    if (profile.mozaDetected) {
      if (statusLabel) statusLabel.textContent = 'Moza Pithouse detected';
      if (importBtn) importBtn.disabled = false;
    } else {
      if (statusLabel) statusLabel.textContent = 'Moza not detected';
      if (importBtn) importBtn.disabled = true;
    }
  }

  // Load profile list if not yet loaded
  if (!_pedalProfilesLoaded) loadPedalProfiles();

  // Render large curve preview
  renderPedalSettingsCurve();
}

// Hook into tab switch to refresh pedal settings
var _origSwitchSettingsTab = typeof switchSettingsTab === 'function' ? switchSettingsTab : null;
document.addEventListener('DOMContentLoaded', function () {
  // Override switchSettingsTab to detect when Pedals tab is shown
  if (_origSwitchSettingsTab) {
    var orig = switchSettingsTab;
    window.switchSettingsTab = function (tab) {
      orig(tab);
      if (tab.dataset && tab.dataset.tab === 'pedals') updatePedalSettingsUI();
    };
  }
});

