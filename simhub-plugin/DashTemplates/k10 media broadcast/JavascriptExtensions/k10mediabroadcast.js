// ═══════════════════════════════════════════════════════════════
// K10 Media Broadcast — SimHub JavascriptExtension
// Bridges SimHub properties → HTML dashboard DOM
// Called by SimHub on every frame (~60fps)
//
// Supports demo mode: when K10MediaCoach.Plugin.DemoMode == 1,
// reads from K10MediaCoach.Plugin.Demo.* instead of GameData.
// ═══════════════════════════════════════════════════════════════

// ─── STATE ───
var _frameCount = 0;
var _cycleFrames = 0;
var _cycleIntervalFrames = 45 * 60; // 45 seconds at 60fps
var _lastCarModel = '';
var _commentaryWasVisible = false;

// Pedal histogram ring buffers (20 samples each)
var _throttleHist = [];
var _brakeHist = [];
var _clutchHist = [];
var _histSize = 20;
for (var i = 0; i < _histSize; i++) {
  _throttleHist.push(0);
  _brakeHist.push(0);
  _clutchHist.push(0);
}

// Gap tracking for flash animations
var _lastDriverAhead = '';
var _lastDriverBehind = '';
var _lastPosition = 0;

// TC/ABS detection: track if we've ever seen a non-zero value
var _tcEverNonZero = false;
var _absEverNonZero = false;

// Manufacturer detection map (lowercase substrings → logo keys)
var _mfrMap = {
  'bmw': 'bmw',
  'mclaren': 'mclaren',
  'mazda': 'mazda',
  'mx-5': 'mazda',
  'miata': 'mazda',
  'nissan': 'nissan',
  'dallara': 'dallara',
  'ir-01': 'dallara',
  'ir01': 'dallara',
  'ferrari': 'ferrari',
  'porsche': 'porsche',
  '911': 'porsche',
  '718': 'porsche',
  '992': 'porsche'
};

// ─── HELPERS ───
function _detectManufacturer(carModel) {
  if (!carModel) return 'none';
  var lower = ('' + carModel).toLowerCase();
  var keys = Object.keys(_mfrMap);
  for (var i = 0; i < keys.length; i++) {
    if (lower.indexOf(keys[i]) !== -1) return _mfrMap[keys[i]];
  }
  return 'generic';
}

function _formatLapTime(timeSpan) {
  if (!timeSpan || timeSpan <= 0) return '—:——.———';
  var totalSec = typeof timeSpan === 'number' ? timeSpan : parseFloat(timeSpan);
  if (isNaN(totalSec) || totalSec <= 0) return '—:——.———';
  var mins = Math.floor(totalSec / 60);
  var secs = totalSec - (mins * 60);
  var secStr = secs < 10 ? '0' + secs.toFixed(3) : secs.toFixed(3);
  return mins + ':' + secStr;
}

function _formatGap(gap) {
  if (!gap || gap === 0) return '—';
  var val = typeof gap === 'number' ? gap : parseFloat(gap);
  if (isNaN(val) || val === 0) return '—';
  if (val > 0) return '+' + val.toFixed(1);
  return val.toFixed(1);
}

// ─── COLOR CONVERSION ───
function _colorToHue(hex) {
  if (!hex || hex.length < 7) return 0;
  var r, g, b;
  if (hex.length === 9) {
    r = parseInt(hex.substring(3, 5), 16) / 255;
    g = parseInt(hex.substring(5, 7), 16) / 255;
    b = parseInt(hex.substring(7, 9), 16) / 255;
  } else {
    r = parseInt(hex.substring(1, 3), 16) / 255;
    g = parseInt(hex.substring(3, 5), 16) / 255;
    b = parseInt(hex.substring(5, 7), 16) / 255;
  }
  var max = Math.max(r, g, b);
  var min = Math.min(r, g, b);
  var d = max - min;
  if (d === 0) return 0;
  var hue;
  if (max === r) hue = ((g - b) / d) % 6;
  else if (max === g) hue = (b - r) / d + 2;
  else hue = (r - g) / d + 4;
  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;
  return hue;
}

// ═══════════════════════════════════════════════════════════════
// MAIN UPDATE — called by SimHub every frame
// ═══════════════════════════════════════════════════════════════
function k10mediabroadcast() {
  var win = root.defaultView;
  if (!win || typeof win.updateTacho !== 'function') return ''; // HTML not ready

  _frameCount++;

  // ─── DEMO MODE DETECTION ───
  // When demo mode is active, read from plugin's demo telemetry provider
  // instead of SimHub GameData (which is empty when no game is running)
  var _demo = $prop('K10MediaCoach.Plugin.DemoMode') || 0;

  // Helper: returns demo value when in demo mode, otherwise the live game value
  function _d(gameKey, demoKey) {
    if (_demo) return $prop('K10MediaCoach.Plugin.' + demoKey);
    return $prop(gameKey);
  }

  // ─── GEAR / SPEED / RPM ───
  var gear = _d('DataCorePlugin.GameData.Gear', 'Demo.Gear');
  var rpm = _d('DataCorePlugin.GameData.Rpms', 'Demo.Rpm') || 0;
  var maxRpm = _d('DataCorePlugin.GameData.CarSettings_MaxRPM', 'Demo.MaxRpm') || 1;
  var speed = _d('DataCorePlugin.GameData.SpeedMph', 'Demo.SpeedMph') || 0;

  var gearEl = root.getElementById('gearText');
  var rpmEl = root.getElementById('rpmText');
  var speedEl = root.getElementById('speedText');

  if (gearEl) gearEl.textContent = gear || 'N';
  if (rpmEl) rpmEl.textContent = rpm > 0 ? Math.round(rpm) : '0';
  if (speedEl) speedEl.textContent = speed > 0 ? Math.round(speed) : '0';

  win.updateTacho(maxRpm > 0 ? Math.min(1, rpm / maxRpm) : 0);

  // ─── PEDALS ───
  var throttle = _d('DataCorePlugin.GameData.Throttle', 'Demo.Throttle') || 0;
  var brake = _d('DataCorePlugin.GameData.Brake', 'Demo.Brake') || 0;
  var clutch = _d('DataCorePlugin.GameData.Clutch', 'Demo.Clutch') || 0;

  // Normalize: SimHub sends 0-100, demo provider also sends 0-100
  var thrNorm = throttle > 1 ? throttle / 100 : throttle;
  var brkNorm = brake > 1 ? brake / 100 : brake;
  var cltNorm = clutch > 1 ? clutch / 100 : clutch;

  if (_frameCount % 3 === 0) {
    _throttleHist.shift(); _throttleHist.push(thrNorm);
    _brakeHist.shift();    _brakeHist.push(brkNorm);
    _clutchHist.shift();   _clutchHist.push(cltNorm);

    win.renderHist('throttleHist', _throttleHist);
    win.renderHist('brakeHist', _brakeHist);
    win.renderHist('clutchHist', _clutchHist);
  }

  var pedalPcts = root.querySelectorAll('.pedal-pct');
  if (pedalPcts.length >= 3) {
    pedalPcts[0].textContent = Math.round(thrNorm * 100) + '%';
    pedalPcts[1].textContent = Math.round(brkNorm * 100) + '%';
    pedalPcts[2].textContent = Math.round(cltNorm * 100) + '%';
  }

  // ─── FUEL ───
  var fuel = _d('DataCorePlugin.GameData.Fuel', 'Demo.Fuel') || 0;
  var maxFuel = _d('DataCorePlugin.GameData.MaxFuel', 'Demo.MaxFuel') || 1;
  var fuelPct = maxFuel > 0 ? (fuel / maxFuel) * 100 : 0;

  var fuelRemEl = root.querySelector('.fuel-remaining');
  if (fuelRemEl) {
    fuelRemEl.innerHTML = fuel > 0
      ? fuel.toFixed(1) + ' <span class="unit">L</span>'
      : '— <span class="unit">L</span>';
  }

  win.updateFuelBar(fuelPct, 0);

  var fuelPerLap = _demo
    ? ($prop('K10MediaCoach.Plugin.Demo.FuelPerLap') || 0)
    : ($prop('DataCorePlugin.Computed.Fuel_LitersPerLap') || 0);
  var fuelLapsEst = fuelPerLap > 0 ? fuel / fuelPerLap : 0;
  var fuelStats = root.querySelectorAll('.fuel-stats .val');
  if (fuelStats.length >= 2) {
    fuelStats[0].textContent = fuelPerLap > 0 ? fuelPerLap.toFixed(2) : '—';
    fuelStats[1].textContent = fuelLapsEst > 0 ? fuelLapsEst.toFixed(1) : '—';
  }

  var pitSuggest = root.querySelector('.fuel-pit-suggest');
  if (pitSuggest) {
    var remainingLaps = _d('DataCorePlugin.GameData.RemainingLaps', 'Demo.RemainingLaps') || 0;
    if (fuelLapsEst > 0 && remainingLaps > 0 && fuelLapsEst < remainingLaps) {
      pitSuggest.textContent = 'PIT in ~' + Math.ceil(fuelLapsEst) + ' laps';
    } else {
      pitSuggest.textContent = '';
    }
  }

  // ─── TYRES ───
  var tyreTempFL = _d('DataCorePlugin.GameData.TyreTempFrontLeft', 'Demo.TyreTempFL') || 0;
  var tyreTempFR = _d('DataCorePlugin.GameData.TyreTempFrontRight', 'Demo.TyreTempFR') || 0;
  var tyreTempRL = _d('DataCorePlugin.GameData.TyreTempRearLeft', 'Demo.TyreTempRL') || 0;
  var tyreTempRR = _d('DataCorePlugin.GameData.TyreTempRearRight', 'Demo.TyreTempRR') || 0;

  // Tyre wear: iRacing reports remaining life 0.0-1.0; demo provider does the same
  var tyreWearFL, tyreWearFR, tyreWearRL, tyreWearRR;
  if (_demo) {
    tyreWearFL = ($prop('K10MediaCoach.Plugin.Demo.TyreWearFL') || 1) * 100;
    tyreWearFR = ($prop('K10MediaCoach.Plugin.Demo.TyreWearFR') || 1) * 100;
    tyreWearRL = ($prop('K10MediaCoach.Plugin.Demo.TyreWearRL') || 1) * 100;
    tyreWearRR = ($prop('K10MediaCoach.Plugin.Demo.TyreWearRR') || 1) * 100;
  } else {
    tyreWearFL = $prop('DataCorePlugin.GameData.TyreWearFrontLeft');
    tyreWearFR = $prop('DataCorePlugin.GameData.TyreWearFrontRight');
    tyreWearRL = $prop('DataCorePlugin.GameData.TyreWearRearLeft');
    tyreWearRR = $prop('DataCorePlugin.GameData.TyreWearRearRight');
    tyreWearFL = (tyreWearFL != null) ? tyreWearFL * 100 : 100;
    tyreWearFR = (tyreWearFR != null) ? tyreWearFR * 100 : 100;
    tyreWearRL = (tyreWearRL != null) ? tyreWearRL * 100 : 100;
    tyreWearRR = (tyreWearRR != null) ? tyreWearRR * 100 : 100;
  }

  win.updateTyreCell(0, tyreTempFL, tyreWearFL);
  win.updateTyreCell(1, tyreTempFR, tyreWearFR);
  win.updateTyreCell(2, tyreTempRL, tyreWearRL);
  win.updateTyreCell(3, tyreTempRR, tyreWearRR);

  // ─── CAR CONTROLS (BB / TC / ABS) ───
  var brakeBias = _d('DataCorePlugin.GameRawData.Telemetry.dcBrakeBias', 'Demo.BrakeBias') || 0;
  var tc = _demo ? $prop('K10MediaCoach.Plugin.Demo.TC') : $prop('DataCorePlugin.GameRawData.Telemetry.dcTractionControl');
  var abs = _demo ? $prop('K10MediaCoach.Plugin.Demo.ABS') : $prop('DataCorePlugin.GameRawData.Telemetry.dcABS');

  // In demo mode, TC/ABS are always available and positive
  if (_demo) {
    _tcEverNonZero = true;
    _absEverNonZero = true;
  } else {
    if (tc != null && tc > 0) _tcEverNonZero = true;
    if (abs != null && abs > 0) _absEverNonZero = true;
  }

  var tcAvailable = _demo || (tc != null && tc >= 0 && (_tcEverNonZero || tc > 0));
  var absAvailable = _demo || (abs != null && abs >= 0 && (_absEverNonZero || abs > 0));

  var carModel = _d('DataCorePlugin.GameData.CarModel', 'Demo.CarModel') || '';
  if (carModel !== _lastCarModel) {
    if (!_demo) { _tcEverNonZero = false; _absEverNonZero = false; }
    _lastCarModel = carModel;
    win.setCarLogo(_detectManufacturer(carModel));
  }

  win.setCtrlVisibility(true, tcAvailable, absAvailable);

  var bbEl = root.querySelector('#ctrlBB .ctrl-value');
  var tcEl = root.querySelector('#ctrlTC .ctrl-value');
  var absEl = root.querySelector('#ctrlABS .ctrl-value');

  if (bbEl) {
    bbEl.textContent = brakeBias > 0 ? brakeBias.toFixed(1) + '%' : '—';
    var bbPct = brakeBias > 0 ? Math.min(100, ((brakeBias - 30) / 40) * 100) : 0;
    root.getElementById('ctrlBB').style.setProperty('--ctrl-pct', bbPct + '%');
  }
  if (tcEl && tcAvailable) {
    tcEl.textContent = Math.round(tc);
    root.getElementById('ctrlTC').style.setProperty('--ctrl-pct', Math.min(100, (tc / 12) * 100) + '%');
  }
  if (absEl && absAvailable) {
    absEl.textContent = Math.round(abs);
    root.getElementById('ctrlABS').style.setProperty('--ctrl-pct', Math.min(100, (abs / 12) * 100) + '%');
  }

  // ─── POSITION / LAP / BEST LAP ───
  var position = _d('DataCorePlugin.GameData.Position', 'Demo.Position') || 0;
  var lap = _d('DataCorePlugin.GameData.CurrentLap', 'Demo.CurrentLap') || 0;
  var bestLap = _d('DataCorePlugin.GameData.BestLapTime', 'Demo.BestLapTime') || 0;
  var bestLapStr = _formatLapTime(bestLap);

  var posNumbers = root.querySelectorAll('.pos-number');
  for (var pi = 0; pi < posNumbers.length; pi++) {
    var posSpan = posNumbers[pi].querySelector('.skew-accent');
    if (posSpan) posSpan.textContent = position > 0 ? 'P' + position : 'P—';
  }

  var lapVals = root.querySelectorAll('.pos-meta-row .val');
  for (var li = 0; li < lapVals.length; li++) {
    if (lapVals[li].classList.contains('purple')) {
      lapVals[li].textContent = bestLapStr;
    } else {
      lapVals[li].textContent = lap > 0 ? lap : '—';
    }
  }

  if (position !== _lastPosition && _lastPosition > 0 && position > 0) {
    var posEls = root.querySelectorAll('.pos-number');
    for (var fi = 0; fi < posEls.length; fi++) {
      win.flashElement(posEls[fi], position < _lastPosition ? 'ahead-changed' : 'behind-changed');
    }
  }
  _lastPosition = position;

  // ─── iRATING / SAFETY RATING ───
  var iRating, safetyRating;
  if (_demo) {
    iRating = $prop('K10MediaCoach.Plugin.Demo.IRating') || 0;
    safetyRating = $prop('K10MediaCoach.Plugin.Demo.SafetyRating') || 0;
  } else {
    iRating = $prop('IRacingExtraProperties.iRacing_DriverInfo_IRating') || 0;
    safetyRating = $prop('IRacingExtraProperties.iRacing_DriverInfo_SafetyRating') || 0;
    if (iRating === 0) iRating = $prop('DataCorePlugin.GameData.IRacing_DriverInfo_IRating') || 0;
    if (safetyRating === 0) safetyRating = $prop('DataCorePlugin.GameData.IRacing_DriverInfo_SafetyRating') || 0;
  }

  var ratingValues = root.querySelectorAll('.rating-value');
  if (ratingValues.length >= 2) {
    ratingValues[0].textContent = iRating > 0 ? iRating : '—';
    ratingValues[1].textContent = safetyRating > 0 ? safetyRating.toFixed(2) : '—';
  }

  win.updateIRBar(iRating);
  win.updateSRPie(safetyRating);

  // ─── GAPS (Ahead / Behind) ───
  var gapAhead, gapBehind, driverAhead, driverBehind, irAhead, irBehind;
  if (_demo) {
    gapAhead     = $prop('K10MediaCoach.Plugin.Demo.GapAhead') || 0;
    gapBehind    = $prop('K10MediaCoach.Plugin.Demo.GapBehind') || 0;
    driverAhead  = $prop('K10MediaCoach.Plugin.Demo.DriverAhead') || '';
    driverBehind = $prop('K10MediaCoach.Plugin.Demo.DriverBehind') || '';
    irAhead      = $prop('K10MediaCoach.Plugin.Demo.IRAhead') || 0;
    irBehind     = $prop('K10MediaCoach.Plugin.Demo.IRBehind') || 0;
  } else {
    gapAhead     = $prop('IRacingExtraProperties.iRacing_Opponent_Ahead_Gap') || 0;
    gapBehind    = $prop('IRacingExtraProperties.iRacing_Opponent_Behind_Gap') || 0;
    driverAhead  = $prop('IRacingExtraProperties.iRacing_Opponent_Ahead_Name') || '';
    driverBehind = $prop('IRacingExtraProperties.iRacing_Opponent_Behind_Name') || '';
    irAhead      = $prop('IRacingExtraProperties.iRacing_Opponent_Ahead_IRating') || 0;
    irBehind     = $prop('IRacingExtraProperties.iRacing_Opponent_Behind_IRating') || 0;
  }

  var gapTimes = root.querySelectorAll('.gap-time');
  var gapDrivers = root.querySelectorAll('.gap-driver');
  var gapIRs = root.querySelectorAll('.gap-ir');
  var gapItems = root.querySelectorAll('.gap-item');

  if (gapTimes.length >= 2) {
    gapTimes[0].textContent = gapAhead ? _formatGap(-Math.abs(gapAhead)) : '—';
    gapTimes[1].textContent = gapBehind ? _formatGap(Math.abs(gapBehind)) : '—';
  }
  if (gapDrivers.length >= 2) {
    gapDrivers[0].textContent = driverAhead || '—';
    gapDrivers[1].textContent = driverBehind || '—';
  }
  if (gapIRs.length >= 2) {
    gapIRs[0].textContent = irAhead > 0 ? irAhead + ' iR' : '';
    gapIRs[1].textContent = irBehind > 0 ? irBehind + ' iR' : '';
  }

  if (gapItems.length >= 2) {
    if (driverAhead !== _lastDriverAhead && _lastDriverAhead !== '') {
      win.flashElement(gapItems[0], 'ahead-changed');
    }
    if (driverBehind !== _lastDriverBehind && _lastDriverBehind !== '') {
      win.flashElement(gapItems[1], 'behind-changed');
    }
  }
  _lastDriverAhead = driverAhead;
  _lastDriverBehind = driverBehind;

  // ─── K10 MEDIA COACH COMMENTARY ───
  var commentaryVisible = $prop('K10MediaCoach.Plugin.CommentaryVisible') || 0;
  var commentaryText = $prop('K10MediaCoach.Plugin.CommentaryText') || '';
  var commentaryTitle = $prop('K10MediaCoach.Plugin.CommentaryTopicTitle') || '';
  var commentaryCategory = $prop('K10MediaCoach.Plugin.CommentaryCategory') || '';
  var sentimentColor = $prop('K10MediaCoach.Plugin.CommentarySentimentColor') || '';

  if (commentaryVisible && !_commentaryWasVisible) {
    var hue = _colorToHue(sentimentColor);
    win.showCommentary(hue, commentaryTitle, commentaryText, commentaryCategory);
  } else if (!commentaryVisible && _commentaryWasVisible) {
    win.hideCommentary();
  }
  _commentaryWasVisible = !!commentaryVisible;

  // ─── CYCLING TIMER (Rating ↔ Position pages) ───
  _cycleFrames++;
  if (_cycleFrames >= _cycleIntervalFrames) {
    _cycleFrames = 0;
    win.cycleRatingPos();
  }

  return '';
}
