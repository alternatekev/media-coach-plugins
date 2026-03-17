/**
 * datastream.ts — Datastream visualization (G-force, yaw trail, incidents)
 * Renders real-time vehicle dynamics data.
 */

import { state } from '../state'

// ========== G-FORCE RENDERING ==========
const _dsCanvas = document.getElementById('dsGforceCanvas') as HTMLCanvasElement
const _dsCtx = _dsCanvas ? _dsCanvas.getContext('2d') : null

let _dsPeakG = 0
const _dsTrailLen = 40
const _dsTrailLat = new Float32Array(_dsTrailLen)
const _dsTrailLong = new Float32Array(_dsTrailLen)
let _dsTrailIdx = 0
let _dsTrailCount = 0
let _dsAbsFlash = 0

// ========== YAW TRAIL ==========
const _yawTrailLen = 80
const _yawTrail = new Float32Array(_yawTrailLen)
let _yawTrailIdx = 0
let _yawTrailCount = 0

const _yawTrailCanvas = document.getElementById('dsYawTrail') as HTMLCanvasElement
const _yawTrailCtx = _yawTrailCanvas ? _yawTrailCanvas.getContext('2d') : null

let _dsTcFlash = 0
let _dsPrevTrackTemp = 0
let _dsPrevIncidents = -1
let _dsPrevDeltaSign = 0

function renderYawTrail(yawRate: number) {
  if (!_yawTrailCtx || !_yawTrailCanvas) return

  _yawTrail[_yawTrailIdx] = Math.max(-1, Math.min(1, yawRate / 180))
  _yawTrailIdx = (_yawTrailIdx + 1) % _yawTrailLen
  _yawTrailCount = Math.min(_yawTrailCount + 1, _yawTrailLen)

  const w = _yawTrailCanvas.width
  const h = _yawTrailCanvas.height
  const mid = h / 2

  _yawTrailCtx.fillStyle = 'rgba(10, 10, 20, 0.9)'
  _yawTrailCtx.fillRect(0, 0, w, h)

  // Draw center line
  _yawTrailCtx.strokeStyle = 'rgba(80, 80, 100, 0.4)'
  _yawTrailCtx.lineWidth = 1
  _yawTrailCtx.beginPath()
  _yawTrailCtx.moveTo(0, mid)
  _yawTrailCtx.lineTo(w, mid)
  _yawTrailCtx.stroke()

  // Draw yaw trail
  _yawTrailCtx.strokeStyle = '#ff8822'
  _yawTrailCtx.lineWidth = 2
  _yawTrailCtx.beginPath()

  for (let i = 0; i < _yawTrailCount; i++) {
    const idx = (_yawTrailIdx - _yawTrailCount + i + _yawTrailLen) % _yawTrailLen
    const x = (i / _yawTrailLen) * w
    const y = mid - _yawTrail[idx] * mid
    if (i === 0) _yawTrailCtx.moveTo(x, y)
    else _yawTrailCtx.lineTo(x, y)
  }

  _yawTrailCtx.stroke()
}

function dsFlash(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  el.classList.add('flash')
  setTimeout(() => {
    el.classList.remove('flash')
  }, 200)
}

function drawGforceDiamond(latG: number, longG: number) {
  if (!_dsCtx || !_dsCanvas) return

  const w = _dsCanvas.width
  const h = _dsCanvas.height
  const centerX = w / 2
  const centerY = h / 2
  const scale = Math.min(w, h) / 3

  _dsCtx.fillStyle = 'rgba(10, 10, 20, 0.8)'
  _dsCtx.fillRect(0, 0, w, h)

  // Draw grid
  _dsCtx.strokeStyle = 'rgba(80, 80, 100, 0.3)'
  _dsCtx.lineWidth = 1
  for (let i = 1; i < 3; i++) {
    const offset = (scale / 3) * i
    _dsCtx.strokeRect(centerX - offset, centerY - offset, offset * 2, offset * 2)
  }

  // Draw G vector
  const x = centerX + latG * scale
  const y = centerY + longG * scale
  const peakG = Math.sqrt(latG * latG + longG * longG)

  if (peakG > _dsPeakG) {
    _dsPeakG = peakG
  } else {
    _dsPeakG *= 0.98 // Decay peak
  }

  // Draw current position
  _dsCtx.fillStyle = peakG > 1.2 ? '#ff4444' : peakG > 0.8 ? '#ffaa44' : '#44aa44'
  _dsCtx.beginPath()
  _dsCtx.arc(x, y, 4, 0, Math.PI * 2)
  _dsCtx.fill()

  // Draw peak marker
  _dsCtx.fillStyle = 'rgba(200, 100, 100, 0.5)'
  const peakX = centerX + Math.sign(latG) * Math.min(Math.abs(latG), _dsPeakG) * scale
  const peakY = centerY + Math.sign(longG) * Math.min(Math.abs(longG), _dsPeakG) * scale
  _dsCtx.beginPath()
  _dsCtx.arc(peakX, peakY, 3, 0, Math.PI * 2)
  _dsCtx.fill()

  // Draw labels
  _dsCtx.fillStyle = '#aaa'
  _dsCtx.font = '12px monospace'
  _dsCtx.fillText('LAT', 10, 20)
  _dsCtx.fillText('LONG', w - 50, h - 5)
  _dsCtx.fillText(`Peak: ${_dsPeakG.toFixed(2)}G`, 10, h - 5)
}

export function updateDatastream(p: Record<string, any>, isDemo: boolean) {
  const pre = isDemo ? 'K10MediaBroadcaster.Plugin.Demo.' : 'K10MediaBroadcaster.Plugin.'

  // G-force rendering
  const latG = +(p[pre + 'LateralG'] || 0)
  const longG = +(p[pre + 'LongitudinalG'] || 0)

  _dsTrailLat[_dsTrailIdx] = latG
  _dsTrailLong[_dsTrailIdx] = longG
  _dsTrailIdx = (_dsTrailIdx + 1) % _dsTrailLen
  _dsTrailCount = Math.min(_dsTrailCount + 1, _dsTrailLen)

  drawGforceDiamond(latG, longG)

  // Yaw trail rendering
  const yawRate = +(p[pre + 'YawRate'] || 0)
  renderYawTrail(yawRate)

  // ABS/TC flash
  const absActive = +(p[pre + 'ABSActive'] || 0)
  const tcActive = +(p[pre + 'TCActive'] || 0)

  if (absActive && _dsAbsFlash <= 0) {
    dsFlash('dsAbsIndicator')
    _dsAbsFlash = 0.3
  }
  _dsAbsFlash = Math.max(0, _dsAbsFlash - 0.016)

  if (tcActive && _dsTcFlash <= 0) {
    dsFlash('dsTcIndicator')
    _dsTcFlash = 0.3
  }
  _dsTcFlash = Math.max(0, _dsTcFlash - 0.016)

  // Track temp
  const trackTemp = +(p[pre + 'TrackTemp'] || 0)
  if (Math.abs(trackTemp - _dsPrevTrackTemp) > 1) {
    const tempEl = document.getElementById('dsTrackTemp')
    if (tempEl) {
      tempEl.textContent = Math.round(trackTemp) + '°'
    }
    _dsPrevTrackTemp = trackTemp
  }

  // Incidents
  const incidents = +(p[pre + 'Incidents'] || 0)
  if (incidents !== _dsPrevIncidents) {
    const incEl = document.getElementById('dsIncidents')
    if (incEl) {
      incEl.textContent = String(incidents)
    }
    _dsPrevIncidents = incidents
  }

  // Delta sign flash
  const delta = +(p[pre + 'DeltaToLeader'] || 0)
  const deltaSign = Math.sign(delta)
  if (deltaSign !== _dsPrevDeltaSign && deltaSign !== 0) {
    const deltaEl = document.getElementById('dsDelta')
    if (deltaEl) {
      deltaEl.classList.toggle('delta-gaining', deltaSign > 0)
      deltaEl.classList.toggle('delta-losing', deltaSign < 0)
    }
    _dsPrevDeltaSign = deltaSign
  }
}
