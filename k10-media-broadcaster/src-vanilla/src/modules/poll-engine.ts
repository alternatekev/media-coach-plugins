/**
 * poll-engine.ts — SimHub HTTP API Polling Engine
 * Main update loop — fetches telemetry from the K10 plugin HTTP server and
 * dispatches to all UI modules each frame.
 * Converted from poll-engine.js
 */

import { state } from '../state'
import { SIMHUB_URL, POLL_MS, DEMO_MODELS } from '../constants'
import { detectGameId, isRallyGame, isGameAllowed, applyGameMode, fmtGap, fetchProps } from './game-detect'
import { fmtLapTime as _fmtLapTime, getCarAdjustability, detectMfr, isNonRaceSession as _isNonRaceSession } from './config'
import { loadCarLogos, cycleCarLogo, setCarLogo, carLogoOrder } from './car-logos'
import { updateLeaderboard } from './leaderboard'
import { updateIncidents } from './incidents'
import { updatePitLimiter } from './pit-limiter'
import { showRaceEnd, hideRaceEnd } from './race-end'
import { updateGrid, loadCountryFlags } from './formation'
import { updateSpotter } from './spotter'
import { updateRaceTimeline } from './race-timeline'
import { updateDatastream } from './datastream'
import { showRaceControl, hideRaceControl } from './race-control'
import { setApiFps, updateFps } from './fps'
import {
  updateTacho,
  renderHist,
  renderPedalTrace,
  showCommentary,
  hideCommentary,
  cycleRatingPos,
  showPositionPage,
  updateIRBar,
  updateSRPie,
  flashElement,
  flashCtrlBar,
  setCtrlVisibility,
  updateTyreCell,
  updateFuelBar,
  updateTrackMap,
  setHasRatingData,
} from './webgl-helpers'
import { loadSettings, applySettings, initSettingsListeners } from './settings'
import { initDiscordState } from './connections'
import { initKeyboard } from './keyboard'

const _cycleIntervalFrames = 300

// ─── Main update loop ───
async function pollUpdate() {
  if (state.pollActive) return
  state.pollActive = true
  try {

  const p = await fetchProps()
  if (!p) { state.pollActive = false; return }

  state.pollFrame++
  state.cycleFrameCount++

  // Diagnostic logging (first 3 frames + every 300 frames ~10s)
  if (state.pollFrame <= 3 || state.pollFrame % 300 === 0) {
    const keys = Object.keys(p).filter(k => p[k] != null && p[k] !== 0 && p[k] !== '')
    console.log(`[K10 poll #${state.pollFrame}] Got ${Object.keys(p).length} keys, ${keys.length} non-empty. DemoMode=${p['K10MediaBroadcaster.Plugin.DemoMode']}, GameRunning=${p['DataCorePlugin.GameRunning']}`)
    if (state.pollFrame === 1) console.log('[K10 poll] Sample values:', JSON.stringify(Object.fromEntries(keys.slice(0, 10).map(k => [k, p[k]]))))
  }

  // Plugin version check
  if (state.pollFrame === 1 && !p['DataCorePlugin.GameRunning'] && p['DataCorePlugin.GameRunning'] !== 0) {
    const dbg = document.createElement('div')
    dbg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(20,20,28,0.95);color:#ff8;font:12px/1.6 system-ui,sans-serif;padding:20px 28px;z-index:99999;border-radius:10px;max-width:420px;text-align:center;border:1px solid rgba(255,255,255,0.12);'
    dbg.innerHTML = '<div style="font-size:14px;font-weight:600;color:#fff;margin-bottom:8px">Plugin needs rebuild</div>' +
      '<div style="color:#aaa;font-size:11px;line-height:1.6">The SimHub plugin is an older version that doesn\'t serve telemetry data via HTTP.<br><br>' +
      'Rebuild the C# project in Visual Studio and restart SimHub.<br>' +
      `<span style="color:#666;font-size:10px">Got ${Object.keys(p).length} keys, expected 50+</span></div>`
    document.body.appendChild(dbg)
    setTimeout(() => dbg.remove(), 15000)
  }

  const v = (k: string) => p[k] != null ? p[k] : 0
  const vs = (k: string) => p[k] != null ? '' + p[k] : ''

  // Demo mode
  const _demo = +v('K10MediaBroadcaster.Plugin.DemoMode') || 0
  const d = (gameKey: string, demoKey: string) => _demo ? v('K10MediaBroadcaster.Plugin.' + demoKey) : v(gameKey)
  const ds = (gameKey: string, demoKey: string) => _demo ? vs('K10MediaBroadcaster.Plugin.' + demoKey) : vs(gameKey)

  // ─── Idle State Detection ───
  const gameRunning = +v('DataCorePlugin.GameRunning') || 0
  const sessionPre = _demo ? 'K10MediaBroadcaster.Plugin.Demo.Grid.' : 'K10MediaBroadcaster.Plugin.Grid.'
  const dsPre = _demo ? 'K10MediaBroadcaster.Plugin.Demo.DS.' : 'K10MediaBroadcaster.Plugin.DS.'
  const sessNum = parseInt(vs(sessionPre + 'SessionState')) || 0
  const _inPitLane = +(p[dsPre + 'IsInPitLane']) > 0

  // Detect game and apply feature gating
  const rawGameId = v('K10MediaBroadcaster.Plugin.GameId') || ''
  const newGameId = detectGameId(rawGameId)
  if (newGameId !== state.currentGameId) {
    state.currentGameId = newGameId
    state.isIRacing = (state.currentGameId === 'iracing')
    state.isRally = isRallyGame() || state.rallyModeEnabled
    applyGameMode()
  }

  // Block non-iRacing games unless Discord connected
  if (!isGameAllowed()) return

  const nowIdle = !_demo && (!gameRunning || sessNum <= 1)
  const idleLogo = document.getElementById('idleLogo')
  if (nowIdle !== state.isIdle) {
    state.isIdle = nowIdle
    if (nowIdle) {
      document.body.classList.add('idle-state')
      if (idleLogo) idleLogo.classList.add('idle-visible')
    } else {
      document.body.classList.remove('idle-state')
      if (idleLogo) idleLogo.classList.remove('idle-visible')
    }
  }
  if (state.isIdle) { state.pollActive = false; return }

  // ─── Gear / Speed / RPM ───
  const gear = ds('DataCorePlugin.GameData.Gear', 'Demo.Gear') || 'N'
  const rpm = +d('DataCorePlugin.GameData.Rpms', 'Demo.Rpm') || 0
  const maxRpm = +d('DataCorePlugin.GameData.CarSettings_MaxRPM', 'Demo.MaxRpm') || 1
  const speed = +d('DataCorePlugin.GameData.SpeedMph', 'Demo.SpeedMph') || 0

  const gearEl = document.getElementById('gearText')
  const rpmEl = document.getElementById('rpmText')
  const speedEl = document.getElementById('speedText')
  if (gearEl) gearEl.textContent = gear
  if (rpmEl) rpmEl.textContent = rpm > 0 ? Math.round(rpm).toString() : '0'
  if (speedEl) speedEl.textContent = speed > 0 ? Math.round(speed).toString() : '0'
  const rpmRatio = +(p[dsPre + 'RpmRatio']) || (maxRpm > 0 ? Math.min(1, rpm / maxRpm) : 0)
  updateTacho(rpmRatio)
  const tachoBlock = document.querySelector('.tacho-block')
  if (tachoBlock) {
    if (rpmRatio >= 0.91) (tachoBlock as HTMLElement).classList.add('tacho-redline')
    else (tachoBlock as HTMLElement).classList.remove('tacho-redline')
  }

  // ─── Pedals ───
  let thr = +(p[dsPre + 'ThrottleNorm'])
  let brk = +(p[dsPre + 'BrakeNorm'])
  let clt = +(p[dsPre + 'ClutchNorm'])
  if (!(thr >= 0)) {
    thr = +d('DataCorePlugin.GameData.Throttle', 'Demo.Throttle') || 0
    while (thr > 1.01) thr /= 100
    thr = Math.min(1, Math.max(0, thr))
  }
  if (!(brk >= 0)) {
    brk = +d('DataCorePlugin.GameData.Brake', 'Demo.Brake') || 0
    while (brk > 1.01) brk /= 100
    brk = Math.min(1, Math.max(0, brk))
  }
  if (!(clt >= 0)) {
    clt = +d('DataCorePlugin.GameData.Clutch', 'Demo.Clutch') || 0
    while (clt > 1.01) clt /= 100
    clt = Math.min(1, Math.max(0, clt))
  }

  // Auto-hide clutch
  if (clt > 0.03) state.clutchSeenActive = true
  if (!state.clutchSeenActive && state.pollFrame > 60 && speed > 10) {
    if (!state.clutchHidden) {
      state.clutchHidden = true
      const cltLabel = document.getElementById('clutchLabelGroup')
      const cltLayer = document.querySelector('.clutch-layer')
      if (cltLabel) (cltLabel as HTMLElement).style.display = 'none'
      if (cltLayer) (cltLayer as HTMLElement).style.display = 'none'
    }
  } else if (state.clutchSeenActive && state.clutchHidden) {
    state.clutchHidden = false
    const cltLabel = document.getElementById('clutchLabelGroup')
    const cltLayer = document.querySelector('.clutch-layer')
    if (cltLabel) (cltLabel as HTMLElement).style.display = ''
    if (cltLayer) (cltLayer as HTMLElement).style.display = ''
  }

  if (state.pollFrame % 2 === 0) {
    state.thrHist.shift(); state.thrHist.push(thr)
    state.brkHist.shift(); state.brkHist.push(brk)
    state.cltHist.shift(); state.cltHist.push(clt)
    renderHist('throttleHist', state.thrHist)
    renderHist('brakeHist', state.brkHist)
    if (!state.clutchHidden) renderHist('clutchHist', state.cltHist)
    renderPedalTrace('pedalTraceCanvas', state.thrHist, state.brkHist, state.clutchHidden ? new Array(20).fill(0) : state.cltHist)
  }
  const pcts = document.querySelectorAll('.pedal-pct')
  if (pcts.length >= 3) {
    (pcts[0] as HTMLElement).textContent = (Math.round(thr * 100) | 0) + '%';
    (pcts[1] as HTMLElement).textContent = (Math.round(brk * 100) | 0) + '%';
    (pcts[2] as HTMLElement).textContent = (Math.round(clt * 100) | 0) + '%'
  }

  // ─── WebGL FX update ───
  if ((window as any).updateGLFX) (window as any).updateGLFX(rpmRatio, thr, brk, clt)

  // ─── Fuel ───
  const fuel = +d('DataCorePlugin.GameData.Fuel', 'Demo.Fuel') || 0
  const fuelPct = +(p[dsPre + 'FuelPct']) || 0
  const fuelRem = document.querySelector('.fuel-remaining')
  if (fuelRem) fuelRem.innerHTML = fuel > 0 ? fuel.toFixed(1) + ' <span class="unit">L</span>' : '— <span class="unit">L</span>'
  updateFuelBar(fuelPct, 0)

  const fuelPerLap = _demo ? (+v('K10MediaBroadcaster.Plugin.Demo.FuelPerLap') || 0) : (+v('DataCorePlugin.Computed.Fuel_LitersPerLap') || 0)
  const fuelLapsEst = +(p[dsPre + 'FuelLapsRemaining']) || (fuelPerLap > 0 ? fuel / fuelPerLap : 0)
  const fuelVals = document.querySelectorAll('.fuel-stats .val')
  if (fuelVals.length >= 2) {
    (fuelVals[0] as HTMLElement).textContent = fuelPerLap > 0 ? fuelPerLap.toFixed(2) : '—';
    (fuelVals[1] as HTMLElement).textContent = fuelLapsEst > 0 ? fuelLapsEst.toFixed(1) : '—'
  }
  const pitSug = document.querySelector('.fuel-pit-suggest')
  if (pitSug) {
    const remLaps = +d('DataCorePlugin.GameData.RemainingLaps', 'Demo.RemainingLaps') || 0;
    (pitSug as HTMLElement).textContent = (fuelLapsEst > 0 && remLaps > 0 && fuelLapsEst < remLaps)
      ? 'PIT in ~' + Math.ceil(fuelLapsEst) + ' laps' : ''
  }

  // ─── Tyres ───
  if (_demo) {
    updateTyreCell(0, +v('K10MediaBroadcaster.Plugin.Demo.TyreTempFL'), (+v('K10MediaBroadcaster.Plugin.Demo.TyreWearFL') || 1) * 100)
    updateTyreCell(1, +v('K10MediaBroadcaster.Plugin.Demo.TyreTempFR'), (+v('K10MediaBroadcaster.Plugin.Demo.TyreWearFR') || 1) * 100)
    updateTyreCell(2, +v('K10MediaBroadcaster.Plugin.Demo.TyreTempRL'), (+v('K10MediaBroadcaster.Plugin.Demo.TyreWearRL') || 1) * 100)
    updateTyreCell(3, +v('K10MediaBroadcaster.Plugin.Demo.TyreTempRR'), (+v('K10MediaBroadcaster.Plugin.Demo.TyreWearRR') || 1) * 100)
  } else {
    updateTyreCell(0, +v('DataCorePlugin.GameData.TyreTempFrontLeft'), (p['DataCorePlugin.GameData.TyreWearFrontLeft'] != null ? +p['DataCorePlugin.GameData.TyreWearFrontLeft'] * 100 : 100))
    updateTyreCell(1, +v('DataCorePlugin.GameData.TyreTempFrontRight'), (p['DataCorePlugin.GameData.TyreWearFrontRight'] != null ? +p['DataCorePlugin.GameData.TyreWearFrontRight'] * 100 : 100))
    updateTyreCell(2, +v('DataCorePlugin.GameData.TyreTempRearLeft'), (p['DataCorePlugin.GameData.TyreWearRearLeft'] != null ? +p['DataCorePlugin.GameData.TyreWearRearLeft'] * 100 : 100))
    updateTyreCell(3, +v('DataCorePlugin.GameData.TyreTempRearRight'), (p['DataCorePlugin.GameData.TyreWearRearRight'] != null ? +p['DataCorePlugin.GameData.TyreWearRearRight'] * 100 : 100))
  }

  // ─── Controls (BB / TC / ABS) ───
  const bb = _demo ? +v('K10MediaBroadcaster.Plugin.Demo.BrakeBias') : (+v('DataCorePlugin.GameRawData.Telemetry.dcBrakeBias') || 0)
  const tc = _demo ? +v('K10MediaBroadcaster.Plugin.Demo.TC') : p['DataCorePlugin.GameRawData.Telemetry.dcTractionControl']
  const abs = _demo ? +v('K10MediaBroadcaster.Plugin.Demo.ABS') : p['DataCorePlugin.GameRawData.Telemetry.dcABS']
  const carModel = ds('DataCorePlugin.GameData.CarModel', 'Demo.CarModel')
  if (carModel !== state.lastCarModel) {
    state.tcSeen = false; state.absSeen = false
    state.lastCarModel = carModel
    state.carAdj = getCarAdjustability(carModel)
    setCarLogo(detectMfr(carModel), carModel)
  }
  if (_demo) { state.tcSeen = true; state.absSeen = true } else {
    if (tc != null && +tc >= 0) state.tcSeen = true
    if (abs != null && +abs >= 0) state.absSeen = true
  }
  const tcOk = !!(!!_demo || (state.carAdj && state.carAdj.noTC ? false : state.tcSeen))
  const absOk = !!(!!_demo || (state.carAdj && state.carAdj.noABS ? false : state.absSeen))
  const bbOk = !!(!!_demo || (state.carAdj && state.carAdj.noBB ? false : (bb > 0)))
  setCtrlVisibility(bbOk, tcOk, absOk)

  const bbEl = document.querySelector('#ctrlBB .ctrl-value')
  if (bbEl && bbOk) { (bbEl as HTMLElement).textContent = bb > 0 ? bb.toFixed(1) : '—'; document.getElementById('ctrlBB')!.style.setProperty('--ctrl-pct', (bb > 0 ? Math.min(100, ((bb-30)/40)*100) : 0) + '%') }
  if (tcOk) {
    const el = document.querySelector('#ctrlTC .ctrl-value') as HTMLElement
    const tcBox = document.getElementById('ctrlTC')
    if (el) {
      if (+tc === 0) { el.textContent = 'fixed'; el.classList.add('ctrl-value-fixed'); tcBox!.style.setProperty('--ctrl-pct', '0%') }
      else { el.textContent = Math.round(+tc).toString(); el.classList.remove('ctrl-value-fixed'); tcBox!.style.setProperty('--ctrl-pct', Math.min(100, (+tc/12)*100) + '%') }
    }
  }
  if (absOk) {
    const el = document.querySelector('#ctrlABS .ctrl-value') as HTMLElement
    const absBox = document.getElementById('ctrlABS')
    if (el) {
      if (+abs === 0) { el.textContent = 'fixed'; el.classList.add('ctrl-value-fixed'); absBox!.style.setProperty('--ctrl-pct', '0%') }
      else { el.textContent = Math.round(+abs).toString(); el.classList.remove('ctrl-value-fixed'); absBox!.style.setProperty('--ctrl-pct', Math.min(100, (+abs/12)*100) + '%') }
    }
  }

  // Flash on value change + announce via spotter
  if (state.prevBB >= 0 && bb > 0 && Math.abs(bb - state.prevBB) > 0.05) {
    flashCtrlBar('ctrlBB')
    if ((window as any).announceAdjustment) (window as any).announceAdjustment('bb', bb, bb > state.prevBB ? 1 : -1)
  }
  if (state.prevTC >= 0 && +tc !== state.prevTC) {
    flashCtrlBar('ctrlTC')
    if ((window as any).announceAdjustment) (window as any).announceAdjustment('tc', +tc, +tc > state.prevTC ? 1 : -1)
  }
  if (state.prevABS >= 0 && +abs !== state.prevABS) {
    flashCtrlBar('ctrlABS')
    if ((window as any).announceAdjustment) (window as any).announceAdjustment('abs', +abs, +abs > state.prevABS ? 1 : -1)
  }
  if (bb > 0) state.prevBB = bb
  if (tcOk) state.prevTC = +tc
  if (absOk) state.prevABS = +abs

  // ─── Position / Lap / Best Lap ───
  const _vizSnapPrevPos = state.lastPosition
  const pos = +d('DataCorePlugin.GameData.Position', 'Demo.Position') || 0
  const lap = +d('DataCorePlugin.GameData.CurrentLap', 'Demo.CurrentLap') || 0
  const bestLap = +d('DataCorePlugin.GameData.BestLapTime', 'Demo.BestLapTime') || 0
  document.querySelectorAll('.pos-number').forEach(el => {
    const sp = el.querySelector('.skew-accent')
    if (sp) sp.textContent = pos > 0 ? 'P' + pos : 'P—'
  })
  document.querySelectorAll('.pos-meta-row .val').forEach(el => {
    if ((el as HTMLElement).classList.contains('purple')) (el as HTMLElement).textContent = _fmtLapTime(bestLap)
    else (el as HTMLElement).textContent = lap > 0 ? lap.toString() : '—'
  })
  if (pos !== state.lastPosition && state.lastPosition > 0 && pos > 0) {
    document.querySelectorAll('.pos-number').forEach(el => flashElement(el as HTMLElement, pos < state.lastPosition ? 'ahead-changed' : 'behind-changed'))
    if ((window as any).triggerLBEvent) {
      if (pos === 1 && pos < state.lastPosition) (window as any).triggerLBEvent('p1')
      else (window as any).triggerLBEvent(pos < state.lastPosition ? 'gain' : 'lose')
    }
  }
  const serverStartPos = +(p[dsPre + 'StartPosition']) || 0
  if (serverStartPos > 0) state.startPosition = serverStartPos
  else if (state.startPosition === 0 && pos > 0) state.startPosition = pos
  state.lastPosition = pos
  document.querySelectorAll('.pos-delta').forEach(el => {
    const delta = +(p[dsPre + 'PositionDelta']) || (state.startPosition > 0 && pos > 0 ? state.startPosition - pos : 0)
    if (delta > 0) { (el as HTMLElement).textContent = '▲ ' + delta; el.className = 'pos-delta visible delta-up' }
    else if (delta < 0) { (el as HTMLElement).textContent = '▼ ' + Math.abs(delta); el.className = 'pos-delta visible delta-down' }
    else { (el as HTMLElement).textContent = ''; el.className = 'pos-delta delta-same' }
  })
  if ((window as any).setLBHighlightMode) {
    if (pos === 1) (window as any).setLBHighlightMode(3)
    else if (state.startPosition > 0 && pos > 0) {
      if (pos < state.startPosition) (window as any).setLBHighlightMode(1)
      else if (pos > state.startPosition) (window as any).setLBHighlightMode(2)
      else (window as any).setLBHighlightMode(0)
    } else (window as any).setLBHighlightMode(0)
  }

  // ─── Race Timer + Last Lap + End-of-Race Logic ───
  const sessionTime = +d('DataCorePlugin.GameData.SessionTimeSpan', 'Demo.SessionTime') || 0
  const lastLapTime = +d('DataCorePlugin.GameData.LastLapTime', 'Demo.LastLapTime') || 0
  const remTime = +d('DataCorePlugin.GameData.RemainingTime', 'Demo.RemainingTime') || 0
  const totalLaps = +d('DataCorePlugin.GameData.TotalLaps', 'Demo.TotalLaps') || 0
  const remLaps = +d('DataCorePlugin.GameData.RemainingLaps', 'Demo.RemainingLaps') || 0
  const timerEl = document.getElementById('raceTimerValue')
  const timerRow = document.querySelector('.timer-row') as HTMLElement
  const isLapRace = totalLaps > 0 && totalLaps <= 9999 && !(+(p[dsPre + 'IsTimedRace']) > 0)
  if (timerEl) {
    if (isLapRace && remLaps >= 0) {
      if (remLaps === 1) timerEl.textContent = 'Final Lap'
      else if (remLaps === 0) timerEl.textContent = 'Finish'
      else timerEl.textContent = remLaps + (remLaps === 1 ? ' Lap' : ' Laps')
    } else {
      const serverFmt = p[dsPre + 'RemainingTimeFormatted'] || ''
      if (serverFmt) {
        timerEl.textContent = serverFmt
      } else {
        const displayTime = remTime > 0 ? remTime : sessionTime
        if (displayTime > 0) {
          const h = Math.floor(displayTime / 3600)
          const m = Math.floor((displayTime % 3600) / 60)
          const s = Math.floor(displayTime % 60)
          timerEl.textContent = h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s
        } else { timerEl.textContent = '0:00:00' }
      }
    }
  }
  const lastLapEl = document.getElementById('lastLapTimeValue')
  if (lastLapEl) lastLapEl.textContent = _fmtLapTime(lastLapTime)

  if (lap > 0 && lap !== state.prevLap && state.prevLap > 0 && timerRow) {
    timerRow.classList.add('timer-visible')
    showPositionPage()
    if (state.timerHideTimeout) clearTimeout(state.timerHideTimeout)
    if (!state.timerPinned) {
      state.timerHideTimeout = setTimeout(() => {
        if (!state.timerPinned) timerRow.classList.remove('timer-visible')
      }, 30000)
    }
  }
  state.prevLap = lap

  const serverEndOfRace = +(p[dsPre + 'IsEndOfRace']) > 0
  const isEndOfRace = serverEndOfRace || (isLapRace
    ? (remLaps > 0 && remLaps <= 3)
    : (remTime > 0 && remTime <= 300))
  if (isEndOfRace && timerRow) {
    state.timerPinned = true
    showPositionPage()
    if (state.timerHideTimeout) { clearTimeout(state.timerHideTimeout); state.timerHideTimeout = null }
    timerRow.classList.add('timer-visible')
  } else if (state.timerPinned && !isEndOfRace) {
    state.timerPinned = false
  }

  // ─── iRating / Safety ───
  const ir = _demo ? (+v('K10MediaBroadcaster.Plugin.Demo.IRating') || 0) : (+v('IRacingExtraProperties.iRacing_DriverInfo_IRating') || 0)
  const sr = _demo ? (+v('K10MediaBroadcaster.Plugin.Demo.SafetyRating') || 0) : (+v('IRacingExtraProperties.iRacing_DriverInfo_SafetyRating') || 0)
  setHasRatingData(ir > 0 || sr > 0)
  const ratVals = document.querySelectorAll('.rating-value')
  if (ratVals.length >= 2) { (ratVals[0] as HTMLElement).textContent = ir > 0 ? ir.toString() : '—'; (ratVals[1] as HTMLElement).textContent = sr > 0 ? sr.toFixed(2) : '—' }
  updateIRBar(ir)
  updateSRPie(sr)

  // ─── Gaps / Lap Timing ───
  const nonRace = +(p[dsPre + 'IsNonRaceSession']) > 0 || _isNonRaceSession(
    _demo ? (p['K10MediaBroadcaster.Plugin.Demo.SessionTypeName'] || '')
          : (p['K10MediaBroadcaster.Plugin.SessionTypeName'] || ''))

  const gapLabels = document.querySelectorAll('.panel-label')
  const gapTimes = document.querySelectorAll('.gap-time')
  const gapDrivers = document.querySelectorAll('.gap-driver')
  const gapIRs = document.querySelectorAll('.gap-ir')
  const gapItems = document.querySelectorAll('.gap-item')

  if (nonRace) {
    const bestLapNR = _demo ? (+(p['K10MediaBroadcaster.Plugin.Demo.BestLapTime']) || 0) : (+(p['DataCorePlugin.GameData.BestLapTime']) || 0)
    const lastLapNR = _demo ? (+(p['K10MediaBroadcaster.Plugin.Demo.LastLapTime']) || 0) : (+(p['DataCorePlugin.GameData.LastLapTime']) || 0)
    const curLapNR = _demo ? (+(p['K10MediaBroadcaster.Plugin.Demo.CurrentLap']) || 0) : (+(p['DataCorePlugin.GameData.CurrentLap']) || 0)
    if (lastLapNR > 0 && lastLapNR !== state.gapsLastLap) {
      state.gapsLastLap = lastLapNR
      if (lastLapNR > state.gapsWorstLap) state.gapsWorstLap = lastLapNR
    }
    state.gapsBestLap = bestLapNR
    state.gapsLapNum = curLapNR
    if (gapLabels.length >= 2) { (gapLabels[0] as HTMLElement).textContent = 'Best Lap'; (gapLabels[1] as HTMLElement).textContent = 'Last Lap' }
    if (gapTimes.length >= 2) {
      (gapTimes[0] as HTMLElement).textContent = bestLapNR > 0 ? _fmtLapTime(bestLapNR) : '—';
      (gapTimes[1] as HTMLElement).textContent = lastLapNR > 0 ? _fmtLapTime(lastLapNR) : '—'
    }
    if (gapDrivers.length >= 2) {
      (gapDrivers[0] as HTMLElement).textContent = curLapNR > 0 ? 'Lap ' + curLapNR : ''
      if (lastLapNR > 0 && bestLapNR > 0) {
        const delta = lastLapNR - bestLapNR;
        (gapDrivers[1] as HTMLElement).textContent = delta <= 0.001 ? 'Personal Best' : '+' + delta.toFixed(3)
      } else (gapDrivers[1] as HTMLElement).textContent = ''
    }
    if (gapIRs.length >= 2) { (gapIRs[0] as HTMLElement).textContent = ''; (gapIRs[1] as HTMLElement).textContent = '' }
    state.gapsNonRaceMode = true
  } else {
    if (state.gapsNonRaceMode) {
      if (gapLabels.length >= 2) { (gapLabels[0] as HTMLElement).textContent = 'Ahead'; (gapLabels[1] as HTMLElement).textContent = 'Behind' }
      state.gapsNonRaceMode = false
      state.gapsWorstLap = 0; state.gapsLastLap = 0
    }
    const gAhead  = _demo ? (+v('K10MediaBroadcaster.Plugin.Demo.GapAhead') || 0)  : (+v('IRacingExtraProperties.iRacing_Opponent_Ahead_Gap') || 0)
    const gBehind = _demo ? (+v('K10MediaBroadcaster.Plugin.Demo.GapBehind') || 0) : (+v('IRacingExtraProperties.iRacing_Opponent_Behind_Gap') || 0)
    const dAhead  = _demo ? vs('K10MediaBroadcaster.Plugin.Demo.DriverAhead')  : vs('IRacingExtraProperties.iRacing_Opponent_Ahead_Name')
    const dBehind = _demo ? vs('K10MediaBroadcaster.Plugin.Demo.DriverBehind') : vs('IRacingExtraProperties.iRacing_Opponent_Behind_Name')
    const irA     = _demo ? (+v('K10MediaBroadcaster.Plugin.Demo.IRAhead') || 0)   : (+v('IRacingExtraProperties.iRacing_Opponent_Ahead_IRating') || 0)
    const irB     = _demo ? (+v('K10MediaBroadcaster.Plugin.Demo.IRBehind') || 0)  : (+v('IRacingExtraProperties.iRacing_Opponent_Behind_IRating') || 0)
    if (gapTimes.length >= 2) { (gapTimes[0] as HTMLElement).textContent = gAhead ? fmtGap(-Math.abs(gAhead)) : '—'; (gapTimes[1] as HTMLElement).textContent = gBehind ? fmtGap(Math.abs(gBehind)) : '—' }
    if (gapDrivers.length >= 2) { (gapDrivers[0] as HTMLElement).textContent = dAhead || '—'; (gapDrivers[1] as HTMLElement).textContent = dBehind || '—' }
    if (gapIRs.length >= 2) { (gapIRs[0] as HTMLElement).textContent = irA > 0 ? irA + ' iR' : ''; (gapIRs[1] as HTMLElement).textContent = irB > 0 ? irB + ' iR' : '' }
    if (gapItems.length >= 2) {
      if (dAhead !== state.lastDriverAhead && state.lastDriverAhead) flashElement(gapItems[0] as HTMLElement, 'ahead-changed')
      if (dBehind !== state.lastDriverBehind && state.lastDriverBehind) flashElement(gapItems[1] as HTMLElement, 'behind-changed')
    }
    state.lastDriverAhead = dAhead; state.lastDriverBehind = dBehind
  }

  // ─── Flag Status → Gaps Block ───
  const flagState = (state.forceFlagState && _demo) ? state.forceFlagState : (vs('currentFlagState') || 'none')
  const gapsBlock = document.getElementById('gapsBlock')
  if (gapsBlock) {
    const flagLabels: Record<string, string> = { yellow: 'CAUTION', red: 'RED FLAG', blue: 'BLUE FLAG', white: 'LAST LAP', debris: 'DEBRIS', checkered: 'FINISH', black: 'BLACK FLAG', green: 'GREEN', meatball: 'MEATBALL', orange: 'LAPPED CAR' }
    const flagContexts: Record<string, string> = { yellow: 'Full course caution — hold position', red: 'Session stopped — return to pits', blue: 'Faster car approaching — yield', white: 'Last lap — push to the line', debris: 'Debris on track — stay alert', checkered: 'Checkered flag — race complete', black: 'Penalty — report to pit lane', green: 'Green flag — racing resumes', meatball: 'Repair required — pit immediately', orange: 'Car ahead must yield — make the pass' }
    const FLAG_HOLD_MS: Record<string, number> = { yellow: 8000, red: 10000, blue: 4000, white: 6000, debris: 5000, checkered: 10000, black: 8000, green: 5000, meatball: 10000, orange: 4000 }

    let showFlag = flagState
    const now = Date.now()
    if (flagState !== 'none' && flagState !== state.flagHoldState) {
      state.flagHoldState = flagState
      state.flagHoldUntil = now + (FLAG_HOLD_MS[flagState] || 5000)
    }
    if (flagState === 'green' && state.lastFlagState !== 'green' && state.lastFlagState !== 'none') {
      if (state.greenFlagTimeout) clearTimeout(state.greenFlagTimeout)
      state.greenFlagTimeout = setTimeout(() => {
        const gb = document.getElementById('gapsBlock')
        if (gb) gb.className = gb.className.replace(/\bflag-\S+/g, '').trim() + ' panel gaps-block'
        if ((window as any).setFlagGLColors) (window as any).setFlagGLColors(null)
        state.greenFlagTimeout = null
        state.flagHoldState = 'none'
      }, FLAG_HOLD_MS.green)
    } else if (flagState === 'green' && !state.greenFlagTimeout) {
      showFlag = 'none'
    } else if (flagState === 'none') {
      if (now < state.flagHoldUntil && state.flagHoldState !== 'none') {
        showFlag = state.flagHoldState
      } else {
        if (state.greenFlagTimeout) { clearTimeout(state.greenFlagTimeout); state.greenFlagTimeout = null }
        showFlag = 'none'
        state.flagHoldState = 'none'
      }
    }

    gapsBlock.className = gapsBlock.className.replace(/\bflag-\S+/g, '').trim()
    if (showFlag !== 'none') {
      gapsBlock.classList.add('flag-active', 'flag-' + showFlag)
      const lbl = flagLabels[showFlag] || showFlag.toUpperCase()
      const ctx = flagContexts[showFlag] || ''
      const fl1 = document.getElementById('flagLabel1')
      const fc1 = document.getElementById('flagCtx1')
      if (fl1) fl1.textContent = lbl
      if (fc1) fc1.textContent = ctx
      if ((window as any).setFlagGLColors) (window as any).setFlagGLColors(showFlag)
    } else {
      if ((window as any).setFlagGLColors) (window as any).setFlagGLColors(null)
    }
    const RC_FLAGS: Record<string, boolean> = { red: true, black: true, yellow: true, checkered: true, meatball: true }
    if (flagState !== state.lastFlagState) {
      if (RC_FLAGS[flagState]) showRaceControl(flagState)
      else if ((flagState === 'none' || !RC_FLAGS[flagState]) && now >= state.flagHoldUntil) hideRaceControl()
    }
    if (flagState !== state.lastFlagState && (window as any).triggerLBEvent) {
      if (flagState === 'green' && state.lastFlagState !== 'green' && state.lastFlagState !== 'none') (window as any).triggerLBEvent('green')
      if (flagState === 'checkered' && state.lastFlagState !== 'checkered') (window as any).triggerLBEvent('finish')
    }
    state.lastFlagState = flagState
  }

  // ─── Commentary ───
  const cmVis = +v('K10MediaBroadcaster.Plugin.CommentaryVisible') || 0
  if (cmVis && !state.commentaryWasVisible) {
    const cmTopicId = vs('K10MediaBroadcaster.Plugin.CommentaryTopicId')
    const pitAllowedTopics = ['pit_entry', 'low_fuel', 'tyre_wear_high']
    const suppressInPit = _inPitLane && !pitAllowedTopics.includes(cmTopicId)
    if (!suppressInPit) {
      const hue = (window as any).colorToHue ? (window as any).colorToHue(vs('K10MediaBroadcaster.Plugin.CommentarySentimentColor')) : 210
      const severity = +v('K10MediaBroadcaster.Plugin.CommentarySeverity') || 0
      showCommentary(hue, vs('K10MediaBroadcaster.Plugin.CommentaryTopicTitle'), vs('K10MediaBroadcaster.Plugin.CommentaryText'), vs('K10MediaBroadcaster.Plugin.CommentaryCategory'), cmTopicId, severity)
    }
  } else if (!cmVis && state.commentaryWasVisible) {
    hideCommentary()
  }
  state.commentaryWasVisible = !!cmVis

  // Commentary viz data feed
  if (cmVis && (window as any).updateCommentaryVizData) {
    (window as any).updateCommentaryVizData({
      brake: brk, throttle: thr, rpmRatio, speed, brakeBias: bb,
      tc: +(tc || 0), abs: +(abs || 0), fuelPct,
      lapDelta: +(v(dsPre + 'LapDelta') || 0),
      gapAhead: _demo ? +(v('K10MediaBroadcaster.Plugin.Demo.GapAhead') || 0) : +(v('IRacingExtraProperties.iRacing_Opponent_Ahead_Gap') || 0),
      latG: +(v(dsPre + 'LatG') || 0), longG: +(v(dsPre + 'LongG') || 0),
      steerTorque: +(v(dsPre + 'SteerTorque') || 0),
      position: pos, prevPosition: _vizSnapPrevPos || 0, startPosition: state.startPosition || 0,
      totalCars: +(v(sessionPre + 'TotalCars')) || 0,
      incidents: +(v(dsPre + 'IncidentCount') || 0),
      lap, sessionTime: vs('DataCorePlugin.GameData.RemainingTime') || '',
      trackTemp: +(v(dsPre + 'TrackTemp') || 0),
      tyreTemps: _demo
        ? [+v('K10MediaBroadcaster.Plugin.Demo.TyreTempFL'), +v('K10MediaBroadcaster.Plugin.Demo.TyreTempFR'), +v('K10MediaBroadcaster.Plugin.Demo.TyreTempRL'), +v('K10MediaBroadcaster.Plugin.Demo.TyreTempRR')]
        : [+v('DataCorePlugin.GameData.TyreTempFrontLeft'), +v('DataCorePlugin.GameData.TyreTempFrontRight'), +v('DataCorePlugin.GameData.TyreTempRearLeft'), +v('DataCorePlugin.GameData.TyreTempRearRight')],
      tyreWears: _demo
        ? [(+v('K10MediaBroadcaster.Plugin.Demo.TyreWearFL') || 1) * 100, (+v('K10MediaBroadcaster.Plugin.Demo.TyreWearFR') || 1) * 100, (+v('K10MediaBroadcaster.Plugin.Demo.TyreWearRL') || 1) * 100, (+v('K10MediaBroadcaster.Plugin.Demo.TyreWearRR') || 1) * 100]
        : [(p['DataCorePlugin.GameData.TyreWearFrontLeft'] != null ? +p['DataCorePlugin.GameData.TyreWearFrontLeft'] * 100 : 100), (p['DataCorePlugin.GameData.TyreWearFrontRight'] != null ? +p['DataCorePlugin.GameData.TyreWearFrontRight'] * 100 : 100), (p['DataCorePlugin.GameData.TyreWearRearLeft'] != null ? +p['DataCorePlugin.GameData.TyreWearRearLeft'] * 100 : 100), (p['DataCorePlugin.GameData.TyreWearRearRight'] != null ? +p['DataCorePlugin.GameData.TyreWearRearRight'] * 100 : 100)]
    })
  }

  // ─── Driver display name ───
  const dfn = vs('K10MediaBroadcaster.Plugin.DriverFirstName') || ''
  const dln = vs('K10MediaBroadcaster.Plugin.DriverLastName') || ''
  if (dfn || dln) state.driverDisplayName = (dfn && dln) ? dfn.charAt(0) + '. ' + dln : (dfn || dln)

  // ─── Track map ───
  const mapReady = +v('K10MediaBroadcaster.Plugin.TrackMap.Ready') || 0
  if (mapReady) {
    updateTrackMap(
      vs('K10MediaBroadcaster.Plugin.TrackMap.SvgPath'),
      +v('K10MediaBroadcaster.Plugin.TrackMap.PlayerX') || 50,
      +v('K10MediaBroadcaster.Plugin.TrackMap.PlayerY') || 50,
      vs('K10MediaBroadcaster.Plugin.TrackMap.Opponents')
    )
  }

  // ─── Sub-module updates ───
  const isDemo = !!_demo
  try { updateDatastream(p, isDemo) } catch(e) { console.error('[K10] Datastream error:', e) }
  try { updateIncidents(p, isDemo) } catch(e) { console.error('[K10] Incidents error:', e) }
  try { updateLeaderboard(p) } catch(e) { console.error('[K10] Leaderboard error:', e) }
  try { updatePitLimiter(p, isDemo) } catch(e) { console.error('[K10] Pit limiter error:', e) }

  // Race end screen
  try {
    const isCheckered = flagState === 'checkered'
    if (isCheckered && !state.prevCheckered) showRaceEnd(p, isDemo)
    else if (!isCheckered && state.prevCheckered && state.raceEndVisible) hideRaceEnd()
    state.prevCheckered = isCheckered
  } catch(e) { console.error('[K10] Race end error:', e) }

  try { updateGrid(p, isDemo) } catch(e) { console.error('[K10] Grid error:', e) }
  try { if (!_inPitLane) updateSpotter(p, isDemo, fmtGap) } catch(e) { console.error('[K10] Spotter error:', e) }

  try {
    const rtIncidents = +(v('K10MediaBroadcaster.Plugin.DS.IncidentCount')) || 0
    const rtInPit = +(v('K10MediaBroadcaster.Plugin.DS.IsInPitLane')) > 0
    updateRaceTimeline(pos, lap, flagState, rtIncidents, rtInPit)
  } catch(e) { console.error('[K10] Timeline error:', e) }

  // ─── Cycling timer ───
  const _timerShowing = timerRow && timerRow.classList.contains('timer-visible')
  if (state.cycleFrameCount >= _cycleIntervalFrames) { state.cycleFrameCount = 0; if (!_timerShowing) cycleRatingPos() }

  // ─── FPS counter ───
  setApiFps(+v('DataCorePlugin.GameRawData.Telemetry.FrameRate') || 0)
  updateFps()

  } catch (err) {
    console.error('[K10 poll] Error in poll frame #' + state.pollFrame + ':', err)
  } finally {
    state.pollActive = false
  }
}

export async function initPollEngine(): Promise<void> {
  // Load settings first
  await loadSettings()
  initSettingsListeners()

  // Initialize Discord state
  await initDiscordState()

  // Initialize keyboard shortcuts
  initKeyboard()

  // Load assets
  await Promise.all([loadCarLogos(), loadCountryFlags()])

  console.log('[K10 Media Broadcaster] Assets loaded, polling SimHub HTTP API at ' + SIMHUB_URL)

  // Start logo cycle timer (cycles while not connected)
  state.logoCycleTimer = setInterval(() => {
    if (!state.hasEverConnected) cycleCarLogo()
  }, 3000)
  setCarLogo(carLogoOrder[0], (DEMO_MODELS as any)[carLogoOrder[0]])

  // Start polling
  setInterval(pollUpdate, POLL_MS)
}
