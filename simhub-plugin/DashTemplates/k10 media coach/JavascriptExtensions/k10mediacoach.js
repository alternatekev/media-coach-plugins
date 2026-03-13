// ═══════════════════════════════════════════════════════════════
// K10 Media Coach — SimHub JavascriptExtension
// Bridges SimHub properties → HTML dashboard DOM
// Called by SimHub on every frame (~60fps)
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
var _lastGapAhead = '';
var _lastGapBehind = '';
var _lastDriverAhead = '';
var _lastDriverBehind = '';
var _lastPosition = 0;

// TC/ABS detection: track if we've ever seen a non-zero value
var _tcEverNonZero = false;
var _absEverNonZero = false;
var _sessionStarted = false;

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
  // SimHub TimeSpan comes as total seconds (float) or "mm:ss.fff" string
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

// ═══════════════════════════════════════════════════════════════
// MAIN UPDATE — called by SimHub every frame
// ═══════════════════════════════════════════════════════════════
function k10mediacoach() {
  var win = root.defaultView;
  if (!win || typeof win.updateTacho !== 'function') return ''; // HTML not ready

  _frameCount++;

  // ─── GAME STATE CHECK ───
  var gameRunning = $prop('DataCorePlugin.GameRunning');
  var gamePaused = $prop('DataCorePlugin.GamePaused');

  // ─── GEAR / SPEED / RPM ───
  var gear = $prop('DataCorePlugin.GameData.Gear');
  var rpm = $prop('DataCorePlugin.GameData.Rpms') || 0;
  var maxRpm = $prop('DataCorePlugin.GameData.CarSettings_MaxRPM') || 1;
  var speed = $prop('DataCorePlugin.GameData.SpeedMph') || 0;

  var gearEl = root.getElementById('gearText');
  var rpmEl = root.getElementById('rpmText');
  var speedEl = root.getElementById('speedText');

  if (gearEl) gearEl.textContent = gear || 'N';
  if (rpmEl) rpmEl.textContent = rpm > 0 ? Math.round(rpm) : '0';
  if (speedEl) speedEl.textContent = speed > 0 ? Math.round(speed) : '0';

  // Tachometer
  win.updateTacho(maxRpm > 0 ? Math.min(1, rpm / maxRpm) : 0);

  // ─── PEDALS ───
  var throttle = $prop('DataCorePlugin.GameData.Throttle') || 0;
  var brake = $prop('DataCorePlugin.GameData.Brake') || 0;
  var clutch = $prop('DataCorePlugin.GameData.Clutch') || 0;

  // Normalize: SimHub may send 0-100 or 0-1 depending on game
  // iRacing sends 0-100 via DataCorePlugin.GameData
  var thrNorm = throttle > 1 ? throttle / 100 : throttle;
  var brkNorm = brake > 1 ? brake / 100 : brake;
  var cltNorm = clutch > 1 ? clutch / 100 : clutch;

  // Shift history buffers (every 3rd frame for ~20Hz sampling at 60fps)
  if (_frameCount % 3 === 0) {
    _throttleHist.shift(); _throttleHist.push(thrNorm);
    _brakeHist.shift();    _brakeHist.push(brkNorm);
    _clutchHist.shift();   _clutchHist.push(cltNorm);

    win.renderHist('throttleHist', _throttleHist);
    win.renderHist('brakeHist', _brakeHist);
    win.renderHist('clutchHist', _clutchHist);
  }

  // Pedal percentage labels
  var pedalPcts = root.querySelectorAll('.pedal-pct');
  if (pedalPcts.length >= 3) {
    pedalPcts[0].textContent = Math.round(thrNorm * 100) + '%';
    pedalPcts[1].textContent = Math.round(brkNorm * 100) + '%';
    pedalPcts[2].textContent = Math.round(cltNorm * 100) + '%';
  }

  // ─── FUEL ───
  var fuel = $prop('DataCorePlugin.GameData.Fuel') || 0;
  var maxFuel = $prop('DataCorePlugin.GameData.MaxFuel') || 1;
  var fuelPct = maxFuel > 0 ? (fuel / maxFuel) * 100 : 0;

  var fuelRemEl = root.querySelector('.fuel-remaining');
  if (fuelRemEl) {
    fuelRemEl.innerHTML = fuel > 0
      ? fuel.toFixed(1) + ' <span class="unit">L</span>'
      : '— <span class="unit">L</span>';
  }

  win.updateFuelBar(fuelPct, 0); // TODO: compute pit marker from avg consumption

  // Fuel stats
  // SimHub / Dahl Design fuel properties (common community plugin)
  var fuelPerLap = $prop('DataCorePlugin.Computed.Fuel_LitersPerLap') || 0;
  var fuelLapsEst = fuelPerLap > 0 ? fuel / fuelPerLap : 0;
  var fuelStats = root.querySelectorAll('.fuel-stats .val');
  if (fuelStats.length >= 2) {
    fuelStats[0].textContent = fuelPerLap > 0 ? fuelPerLap.toFixed(2) : '—';
    fuelStats[1].textContent = fuelLapsEst > 0 ? fuelLapsEst.toFixed(1) : '—';
  }

  // Pit suggestion
  var pitSuggest = root.querySelector('.fuel-pit-suggest');
  if (pitSuggest) {
    var remainingLaps = $prop('DataCorePlugin.GameData.RemainingLaps') || 0;
    if (fuelLapsEst > 0 && remainingLaps > 0 && fuelLapsEst < remainingLaps) {
      var pitInLaps = Math.ceil(fuelLapsEst);
      pitSuggest.textContent = 'PIT in ~' + pitInLaps + ' laps';
    } else {
      pitSuggest.textContent = '';
    }
  }

  // ─── TYRES ───
  var tyreTempFL = $prop('DataCorePlugin.GameData.TyreTempFrontLeft') || 0;
  var tyreTempFR = $prop('DataCorePlugin.GameData.TyreTempFrontRight') || 0;
  var tyreTempRL = $prop('DataCorePlugin.GameData.TyreTempRearLeft') || 0;
  var tyreTempRR = $prop('DataCorePlugin.GameData.TyreTempRearRight') || 0;

  // Tyre wear: iRacing reports remaining life (1.0 = new, 0.0 = dead)
  var tyreWearFL = $prop('DataCorePlugin.GameData.TyreWearFrontLeft');
  var tyreWearFR = $prop('DataCorePlugin.GameData.TyreWearFrontRight');
  var tyreWearRL = $prop('DataCorePlugin.GameData.TyreWearRearLeft');
  var tyreWearRR = $prop('DataCorePlugin.GameData.TyreWearRearRight');
  tyreWearFL = (tyreWearFL != null) ? tyreWearFL * 100 : 100;
  tyreWearFR = (tyreWearFR != null) ? tyreWearFR * 100 : 100;
  tyreWearRL = (tyreWearRL != null) ? tyreWearRL * 100 : 100;
  tyreWearRR = (tyreWearRR != null) ? tyreWearRR * 100 : 100;

  win.updateTyreCell(0, tyreTempFL, tyreWearFL);
  win.updateTyreCell(1, tyreTempFR, tyreWearFR);
  win.updateTyreCell(2, tyreTempRL, tyreWearRL);
  win.updateTyreCell(3, tyreTempRR, tyreWearRR);

  // ─── CAR CONTROLS (BB / TC / ABS) ───
  var brakeBias = $prop('DataCorePlugin.GameRawData.Telemetry.dcBrakeBias') || 0;
  var tc = $prop('DataCorePlugin.GameRawData.Telemetry.dcTractionControl');
  var abs = $prop('DataCorePlugin.GameRawData.Telemetry.dcABS');

  // Detect availability: track if TC/ABS have ever been non-zero in this session
  if (tc != null && tc > 0) _tcEverNonZero = true;
  if (abs != null && abs > 0) _absEverNonZero = true;

  // Also check if TC/ABS values are -1 (explicitly unavailable)
  var tcAvailable = (tc != null && tc >= 0 && (_tcEverNonZero || tc > 0));
  var absAvailable = (abs != null && abs >= 0 && (_absEverNonZero || abs > 0));

  // If car model changes, reset detection
  var carModel = $prop('DataCorePlugin.GameData.CarModel') || '';
  if (carModel !== _lastCarModel) {
    _tcEverNonZero = false;
    _absEverNonZero = false;
    _lastCarModel = carModel;

    // Update car logo
    var mfr = _detectManufacturer(carModel);
    win.setCarLogo(mfr);
  }

  // Update control visibility
  win.setCtrlVisibility(true, tcAvailable, absAvailable);

  // Update control values
  var bbEl = root.querySelector('#ctrlBB .ctrl-value');
  var tcEl = root.querySelector('#ctrlTC .ctrl-value');
  var absEl = root.querySelector('#ctrlABS .ctrl-value');

  if (bbEl) {
    var bbVal = brakeBias > 0 ? brakeBias.toFixed(1) + '%' : '—';
    bbEl.textContent = bbVal;
    // BB fill bar: bias typically ranges 40-70%, normalize to 0-100
    var bbPct = brakeBias > 0 ? Math.min(100, ((brakeBias - 30) / 40) * 100) : 0;
    root.getElementById('ctrlBB').style.setProperty('--ctrl-pct', bbPct + '%');
  }
  if (tcEl && tcAvailable) {
    tcEl.textContent = Math.round(tc);
    // TC typically 0-12, normalize
    var tcMax = 12;
    var tcPct = Math.min(100, (tc / tcMax) * 100);
    root.getElementById('ctrlTC').style.setProperty('--ctrl-pct', tcPct + '%');
  }
  if (absEl && absAvailable) {
    absEl.textContent = Math.round(abs);
    var absMax = 12;
    var absPct = Math.min(100, (abs / absMax) * 100);
    root.getElementById('ctrlABS').style.setProperty('--ctrl-pct', absPct + '%');
  }

  // ─── POSITION / LAP / BEST LAP ───
  var position = $prop('DataCorePlugin.GameData.Position') || 0;
  var lap = $prop('DataCorePlugin.GameData.CurrentLap') || 0;
  var bestLap = $prop('DataCorePlugin.GameData.BestLapTime') || 0;
  var bestLapStr = _formatLapTime(bestLap);

  // Update both cycle-sizer and positionPage instances
  var posNumbers = root.querySelectorAll('.pos-number');
  for (var pi = 0; pi < posNumbers.length; pi++) {
    var posSpan = posNumbers[pi].querySelector('.skew-accent');
    if (posSpan) posSpan.textContent = position > 0 ? 'P' + position : 'P—';
  }

  var lapVals = root.querySelectorAll('.pos-meta-row .val');
  // First .val in each pos-meta is Lap, second is Best (purple)
  // There are two copies (cycle-sizer + positionPage)
  for (var li = 0; li < lapVals.length; li++) {
    if (lapVals[li].classList.contains('purple')) {
      lapVals[li].textContent = bestLapStr;
    } else {
      lapVals[li].textContent = lap > 0 ? lap : '—';
    }
  }

  // Flash on position change
  if (position !== _lastPosition && _lastPosition > 0 && position > 0) {
    var posEls = root.querySelectorAll('.pos-number');
    for (var fi = 0; fi < posEls.length; fi++) {
      win.flashElement(posEls[fi], position < _lastPosition ? 'ahead-changed' : 'behind-changed');
    }
  }
  _lastPosition = position;

  // ─── iRATING / SAFETY RATING ───
  // These come from iRacing Extra Properties or manual config
  var iRating = $prop('IRacingExtraProperties.iRacing_DriverInfo_IRating') || 0;
  var safetyRating = $prop('IRacingExtraProperties.iRacing_DriverInfo_SafetyRating') || 0;

  // Fallback: try alternate property paths
  if (iRating === 0) iRating = $prop('DataCorePlugin.GameData.IRacing_DriverInfo_IRating') || 0;
  if (safetyRating === 0) safetyRating = $prop('DataCorePlugin.GameData.IRacing_DriverInfo_SafetyRating') || 0;

  var ratingValues = root.querySelectorAll('.rating-value');
  if (ratingValues.length >= 2) {
    ratingValues[0].textContent = iRating > 0 ? iRating : '—';
    ratingValues[1].textContent = safetyRating > 0 ? safetyRating.toFixed(2) : '—';
  }

  win.updateIRBar(iRating);
  win.updateSRPie(safetyRating);

  // ─── GAPS (Ahead / Behind) ───
  var gapAhead = $prop('IRacingExtraProperties.iRacing_Opponent_Ahead_Gap') || 0;
  var gapBehind = $prop('IRacingExtraProperties.iRacing_Opponent_Behind_Gap') || 0;
  var driverAhead = $prop('IRacingExtraProperties.iRacing_Opponent_Ahead_Name') || '';
  var driverBehind = $prop('IRacingExtraProperties.iRacing_Opponent_Behind_Name') || '';
  var irAhead = $prop('IRacingExtraProperties.iRacing_Opponent_Ahead_IRating') || 0;
  var irBehind = $prop('IRacingExtraProperties.iRacing_Opponent_Behind_IRating') || 0;

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

  // Flash gap items on driver change (overtake/being overtaken)
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
  var severity = $prop('K10MediaCoach.Plugin.CommentarySeverity') || 0;

  if (commentaryVisible && !_commentaryWasVisible) {
    // Convert sentiment color #AARRGGBB → hue for our HSL-based commentary panel
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

// ─── COLOR CONVERSION ───
// Convert #AARRGGBB or #RRGGBB hex to approximate HSL hue (0-360)
function _colorToHue(hex) {
  if (!hex || hex.length < 7) return 0;
  var r, g, b;
  if (hex.length === 9) {
    // #AARRGGBB format
    r = parseInt(hex.substring(3, 5), 16) / 255;
    g = parseInt(hex.substring(5, 7), 16) / 255;
    b = parseInt(hex.substring(7, 9), 16) / 255;
  } else {
    // #RRGGBB format
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
