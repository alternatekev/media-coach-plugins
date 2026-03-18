/**
 * webgl-helpers.ts — WebGL visualization helpers
 * Includes tachometer, pedal histograms, traces, and commentary overlays.
 *
 * PARITY NOTE: This module must match the observable DOM behavior of
 * K10 Media Broadcaster/modules/js/webgl-helpers.js exactly, including
 * CSS class names and element IDs. Tests run against both builds.
 */

import { state } from '../state'
import { SIMHUB_URL } from '../constants'

// ========== TACHOMETER ==========
const TACH_SEGS = 11
const tachoBar = document.getElementById('tachoBar')
const rpmText = document.getElementById('rpmText')

if (tachoBar) {
  for (let i = 0; i < TACH_SEGS; i++) {
    const s = document.createElement('div')
    s.className = 'tacho-seg'
    tachoBar.appendChild(s)
  }
}

const RPM_COLORS: Record<string, string> = {
  green: 'var(--green)',
  yellow: 'var(--amber)',
  red: 'var(--red)',
  dim: 'var(--text-dim)',
}

let _prevLitCount = 0
let _rpmPulseTimer: any = null

export function updateTacho(pct: number) {
  if (!tachoBar) return

  pct = Math.max(0, Math.min(1, pct))
  const lit = Math.round(pct * TACH_SEGS)
  let topColor = 'dim'

  const segs = tachoBar.children
  for (let i = 0; i < TACH_SEGS; i++) {
    const seg = segs[i] as HTMLElement
    seg.className = 'tacho-seg'
    if (i < lit) {
      const f = i / TACH_SEGS
      if (f < 0.55) { seg.classList.add('lit-green'); topColor = 'green' }
      else if (f < 0.73) { seg.classList.add('lit-yellow'); topColor = 'yellow' }
      else if (f < 0.91) { seg.classList.add('lit-red'); topColor = 'red' }
      else { seg.classList.add('lit-redline'); topColor = 'red' }
      seg.style.height = '100%'
    } else {
      seg.style.height = '2px'
    }
  }

  if (rpmText) rpmText.style.color = RPM_COLORS[topColor]

  // Pulse the RPM text when a new segment lights up
  if (rpmText && lit > _prevLitCount && lit > 0) {
    const pulseClass = topColor === 'green' ? 'rpm-pulse-green'
      : topColor === 'yellow' ? 'rpm-pulse-yellow' : 'rpm-pulse-red'
    rpmText.classList.remove('rpm-pulse-green', 'rpm-pulse-yellow', 'rpm-pulse-red')
    void rpmText.offsetWidth
    rpmText.classList.add(pulseClass)
    if (_rpmPulseTimer) clearTimeout(_rpmPulseTimer)
    _rpmPulseTimer = setTimeout(() => {
      rpmText.classList.remove('rpm-pulse-green', 'rpm-pulse-yellow', 'rpm-pulse-red')
    }, 180)
  }
  _prevLitCount = lit
}

updateTacho(0)

// ========== PEDAL HISTOGRAMS ==========
const HIST_BARS = 20

function setupHist(id: string, cls: string) {
  const container = document.getElementById(id)
  if (!container) return
  container.innerHTML = ''
  for (let i = 0; i < HIST_BARS; i++) {
    const bar = document.createElement('div')
    bar.className = `pedal-hist-bar ${cls}`
    container.appendChild(bar)
  }
}

setupHist('throttleHist', 'throttle')
setupHist('brakeHist', 'brake')
setupHist('clutchHist', 'clutch')

export function renderHist(id: string, data: number[]) {
  const bars = document.getElementById(id)
  if (!bars) return

  for (let i = 0; i < data.length && i < bars.children.length; i++) {
    (bars.children[i] as HTMLElement).style.height = Math.max(1, data[i] * 100) + '%'
  }
}

// ========== PEDAL TRACE ==========
const _pedalTraceLen = 120
const _ptThr = new Float32Array(_pedalTraceLen)
const _ptBrk = new Float32Array(_pedalTraceLen)
const _ptClt = new Float32Array(_pedalTraceLen)
let _ptIdx = 0
let _ptCount = 0
const _ptCanvas = document.getElementById('pedalTraceCanvas') as HTMLCanvasElement | null
const _ptCtx = _ptCanvas ? _ptCanvas.getContext('2d') : null

export function renderPedalTrace(thr: number, brk: number, clt: number) {
  _ptThr[_ptIdx] = thr
  _ptBrk[_ptIdx] = brk
  _ptClt[_ptIdx] = clt
  _ptIdx = (_ptIdx + 1) % _pedalTraceLen
  _ptCount++

  if (!_ptCtx) return
  const c = _ptCanvas!
  // Match canvas resolution to display size
  const rect = c.getBoundingClientRect()
  if (c.width !== Math.round(rect.width) || c.height !== Math.round(rect.height)) {
    c.width = Math.round(rect.width)
    c.height = Math.round(rect.height)
  }
  const w = c.width, h = c.height
  const ctx = _ptCtx
  ctx.clearRect(0, 0, w, h)

  const count = Math.min(_ptCount, _pedalTraceLen)
  if (count < 3) return

  // Draw each pedal trace as a smooth line with gradient fade
  const traces = [
    { buf: _ptThr, color: [76, 175, 80],  label: 'thr' },   // green
    { buf: _ptBrk, color: [244, 67, 54],   label: 'brk' },   // red
    { buf: _ptClt, color: [66, 165, 245],   label: 'clt' },   // blue
  ]

  for (const tr of traces) {
    ctx.beginPath()
    for (let i = 0; i < count; i++) {
      const idx = (_ptIdx - count + i + _pedalTraceLen) % _pedalTraceLen
      const x = (i / (count - 1)) * w
      const y = h - tr.buf[idx] * (h - 2) - 1
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    // Gradient stroke: fades in from left (oldest) to right (newest)
    const grad = ctx.createLinearGradient(0, 0, w, 0)
    const [r, g, b] = tr.color
    grad.addColorStop(0, `rgba(${r},${g},${b},0.0)`)
    grad.addColorStop(0.3, `rgba(${r},${g},${b},0.08)`)
    grad.addColorStop(0.7, `rgba(${r},${g},${b},0.2)`)
    grad.addColorStop(1, `rgba(${r},${g},${b},0.45)`)
    ctx.strokeStyle = grad
    ctx.lineWidth = 1.5
    ctx.lineJoin = 'round'
    ctx.stroke()

    // Subtle glow at the leading edge (newest sample)
    const lastIdx = (_ptIdx - 1 + _pedalTraceLen) % _pedalTraceLen
    const lastVal = tr.buf[lastIdx]
    if (lastVal > 0.02) {
      const lx = w - 1
      const ly = h - lastVal * (h - 2) - 1
      ctx.beginPath()
      ctx.arc(lx, ly, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${r},${g},${b},0.6)`
      ctx.fill()
    }
  }
}

// ========== COMMENTARY / OVERLAY ==========
// Match original: operates on #commentaryCol, #commentaryTitle, #commentaryText, #commentaryMeta

let _hasRatingData = false

export function setHasRatingData(has: boolean) {
  _hasRatingData = has
}

const _heatTopics: Record<string, boolean> = {
  tyre_temp_high: true, tyre_temp_critical: true,
  brake_temp_high: true, brake_temp_critical: true,
}
const _wearTopics: Record<string, boolean> = {
  tyre_wear_high: true, tyre_degradation: true,
}
const _bestTopics: Record<string, boolean> = {
  personal_best: true, position_gained: true,
}

export function showCommentary(
  hue: number,
  title: string,
  text: string,
  meta?: string,
  topicId?: string,
  severity?: number
) {
  const col = document.getElementById('commentaryCol')
  const dash = document.getElementById('dashboard')
  if (!col) return

  // Resolve topic for hue overrides
  const resolvedTopic = topicId || ''
  if (_heatTopics[resolvedTopic]) {
    hue = (severity && severity >= 3) ? 0 : 30
  } else if (_wearTopics[resolvedTopic]) {
    hue = 30
  } else if (_bestTopics[resolvedTopic]) {
    hue = 145
  }

  const inner = col.querySelector('.commentary-inner') as HTMLElement
  if (inner) {
    inner.style.background = `hsla(${hue}, 50%, 13%, 0.96)`
    inner.style.borderColor = `hsla(${hue}, 50%, 27%, 0.50)`
  }

  const titleEl = document.getElementById('commentaryTitle')
  const textEl = document.getElementById('commentaryText')
  const metaEl = document.getElementById('commentaryMeta')

  if (titleEl) {
    titleEl.textContent = title
    titleEl.style.color = `hsl(${hue},55%,65%)`
  }
  if (textEl) textEl.textContent = text
  if (metaEl && meta) metaEl.textContent = meta

  col.classList.add('visible')

  if (dash) {
    dash.style.setProperty('--sentiment-h', String(hue))
    dash.style.setProperty('--sentiment-s', '40%')
    dash.style.setProperty('--sentiment-l', '12%')
    dash.style.setProperty('--sentiment-alpha', '0.06')
  }
}

export function hideCommentary() {
  const col = document.getElementById('commentaryCol')
  const dash = document.getElementById('dashboard')
  if (col) col.classList.remove('visible')
  if (dash) dash.style.setProperty('--sentiment-alpha', '0')
  if ((window as any).hideCommentaryViz) (window as any).hideCommentaryViz()
  if ((window as any).setCommentaryTrailGL) (window as any).setCommentaryTrailGL(false)
}

// ========== RATING / POSITION PAGE CYCLING ==========
// Match original: toggles .active/.inactive on #ratingPage, #positionPage, #dotRating, #dotPos

let _ratingActive = true

export function cycleRatingPos() {
  _ratingActive = !_ratingActive
  const ratingPage = document.getElementById('ratingPage')
  const positionPage = document.getElementById('positionPage')
  const dotRating = document.getElementById('dotRating')
  const dotPos = document.getElementById('dotPos')

  if (ratingPage) {
    ratingPage.classList.toggle('active', _ratingActive)
    ratingPage.classList.toggle('inactive', !_ratingActive)
  }
  if (positionPage) {
    positionPage.classList.toggle('active', !_ratingActive)
    positionPage.classList.toggle('inactive', _ratingActive)
  }
  if (dotRating) dotRating.classList.toggle('active', _ratingActive)
  if (dotPos) dotPos.classList.toggle('active', !_ratingActive)
}

export function showPositionPage() {
  const el = document.getElementById('positionPanel')
  if (el) el.classList.add('visible')
}

// ========== iRATING BAR ==========
// Match original: sets #irBarFill style.width

export function updateIRBar(iRating: number) {
  const maxIR = 5000
  const pct = Math.min(100, (iRating / maxIR) * 100)
  const fill = document.getElementById('irBarFill')
  if (fill) fill.style.width = pct + '%'
}
updateIRBar(0)

// ========== SAFETY RATING PIE ==========
// Match original: sets #srPieFill stroke-dashoffset and stroke attribute

export function updateSRPie(srValue: number) {
  const pct = Math.min(1, srValue / 4.0)
  const circ = 2 * Math.PI * 15 // ~94.25
  const offset = circ * (1 - pct)
  const fill = document.getElementById('srPieFill')
  if (!fill) return
  fill.setAttribute('stroke-dashoffset', String(offset))
  // Color: green if >= 3.0, amber if >= 2.0, red if lower
  if (srValue >= 3.0) fill.setAttribute('stroke', 'var(--green)')
  else if (srValue >= 2.0) fill.setAttribute('stroke', 'var(--amber)')
  else fill.setAttribute('stroke', 'var(--red)')
}

export function flashElement(el: HTMLElement, className: string) {
  if (!el) return
  el.classList.add(className)
  setTimeout(() => {
    el.classList.remove(className)
  }, 300)
}

export function flashCtrlBar(id: string) {
  const el = document.getElementById(id)
  if (el) flashElement(el, 'flash')
}

// ========== CONTROL VISIBILITY ==========
// Match original: toggles .ctrl-hidden class

export function setCtrlVisibility(hasBB: boolean, hasTC: boolean, hasABS: boolean) {
  const bbEl = document.getElementById('ctrlBB')
  const tcEl = document.getElementById('ctrlTC')
  const absEl = document.getElementById('ctrlABS')

  if (bbEl) bbEl.classList.toggle('ctrl-hidden', !hasBB)
  if (tcEl) tcEl.classList.toggle('ctrl-hidden', !hasTC)
  if (absEl) absEl.classList.toggle('ctrl-hidden', !hasABS)
}

// ========== TYRE TEMPERATURE ==========
// Match original thresholds: cold (<150°F), optimal (150-230), hot (230-270), danger (>270)

export function getTyreTempClass(tempF: number): string {
  if (tempF <= 0) return ''
  if (tempF < 150) return 'cold'
  if (tempF < 230) return 'optimal'
  if (tempF < 270) return 'hot'
  return 'danger'
}

export function updateTyreCell(index: number, tempF: number, wearPct: number) {
  const cells = document.querySelectorAll('.tyre-cell')
  const wearFills = document.querySelectorAll('.tyre-wear-fill')
  if (index >= cells.length) return
  const cell = cells[index] as HTMLElement
  cell.textContent = tempF > 0 ? Math.round(tempF) + '°' : '—'
  cell.className = 'tyre-cell ' + getTyreTempClass(tempF)

  // Wear bar
  if (index < wearFills.length) {
    const fill = wearFills[index] as HTMLElement
    fill.style.width = Math.max(0, Math.min(100, wearPct)) + '%'
    // Color wear bar: green > 50%, amber > 25%, red below
    if (wearPct > 50) fill.style.background = 'var(--green)'
    else if (wearPct > 25) fill.style.background = 'var(--amber)'
    else fill.style.background = 'var(--red)'
  }
}

// ========== FUEL BAR ==========
// Match original: sets .fuel-bar-inner width + healthy/caution/critical classes

export function updateFuelBar(pct: number, pitLapPct?: number) {
  const bar = document.querySelector('.fuel-bar-inner') as HTMLElement
  if (!bar) return
  bar.style.width = Math.max(0, Math.min(100, pct)) + '%'
  bar.className = 'fuel-bar-inner'
  if (pct > 40) bar.classList.add('healthy')
  else if (pct > 15) bar.classList.add('caution')
  else bar.classList.add('critical')

  // Pit marker
  const marker = document.querySelector('.fuel-bar-pit-marker') as HTMLElement
  if (marker && pitLapPct !== undefined && pitLapPct > 0) {
    marker.style.left = Math.min(100, pitLapPct) + '%'
    marker.style.display = ''
  } else if (marker) {
    marker.style.display = 'none'
  }
}

// ========== TRACK MAP ==========
let _mapLastPath = ''
let _mapSmoothedX = 0, _mapSmoothedY = 0
let _mapHasInit = false
const _SVG_NS = 'http://www.w3.org/2000/svg'
const _MAP_MAX_OPPONENTS = 63

function _ensureOpponentDots(parent: Element, count: number, radius: number) {
  while (parent.children.length < count) {
    const c = document.createElementNS(_SVG_NS, 'circle')
    c.classList.add('map-opponent')
    c.setAttribute('r', String(radius))
    parent.appendChild(c)
  }
  while (parent.children.length > count) {
    parent.removeChild(parent.lastChild!)
  }
}

function _isClose(px: number, py: number, ox: number, oy: number): boolean {
  const dx = px - ox, dy = py - oy
  return (dx * dx + dy * dy) < 64 // ~8 SVG units
}

export function resetTrackMap() {
  fetch((window as any)._simhubUrlOverride || SIMHUB_URL + '?action=resetmap').catch(() => {})
  _mapLastPath = ''
  _mapHasInit = false
  const fullTrack = document.getElementById('fullMapTrack')
  const zoomTrack = document.getElementById('zoomMapTrack')
  if (fullTrack) fullTrack.setAttribute('d', '')
  if (zoomTrack) zoomTrack.setAttribute('d', '')
  // Clear opponent dots
  const fg = document.getElementById('fullMapOpponents')
  const zg = document.getElementById('zoomMapOpponents')
  if (fg) fg.innerHTML = ''
  if (zg) zg.innerHTML = ''
}

export function updateTrackMap(svgPath: string, playerX: number, playerY: number, opponentStr?: string) {
  // Update track outline (only when path changes — new track or first load)
  if (svgPath && svgPath !== _mapLastPath) {
    _mapLastPath = svgPath
    _mapHasInit = false // reset smoothing on track change
    const fullTrack = document.getElementById('fullMapTrack')
    const zoomTrack = document.getElementById('zoomMapTrack')
    if (fullTrack) fullTrack.setAttribute('d', svgPath)
    if (zoomTrack) zoomTrack.setAttribute('d', svgPath)

    // Position start/finish marker at the first point of the path (LapDistPct=0)
    const sfMatch = svgPath.match(/^M\s*([\d.]+)[,\s]+([\d.]+)/)
    if (sfMatch) {
      const sfX = +sfMatch[1], sfY = +sfMatch[2]
      const fullSF = document.getElementById('fullMapSF')
      const zoomSF = document.getElementById('zoomMapSF')
      if (fullSF) {
        fullSF.setAttribute('transform', 'translate(' + sfX.toFixed(1) + ',' + sfY.toFixed(1) + ')')
        fullSF.style.display = ''
      }
      if (zoomSF) {
        zoomSF.setAttribute('transform', 'translate(' + sfX.toFixed(1) + ',' + sfY.toFixed(1) + ')')
        zoomSF.style.display = ''
      }
    }
  }

  // Sanity: clamp coordinates to 0–100 SVG range
  playerX = Math.max(0, Math.min(100, playerX))
  playerY = Math.max(0, Math.min(100, playerY))

  // Smoothing: reject large jumps, low-pass filter coordinates
  if (!_mapHasInit) {
    _mapSmoothedX = playerX
    _mapSmoothedY = playerY
    _mapHasInit = true
  } else {
    const dx = playerX - _mapSmoothedX
    const dy = playerY - _mapSmoothedY
    const jump = Math.sqrt(dx * dx + dy * dy)
    // If jump is huge (>20 SVG units), blend slowly (glitch recovery)
    const alpha = jump > 20 ? 0.08 : 0.45
    _mapSmoothedX += dx * alpha
    _mapSmoothedY += dy * alpha
  }

  const sx = _mapSmoothedX
  const sy = _mapSmoothedY

  // Update player dot
  const fullPlayer = document.getElementById('fullMapPlayer')
  const zoomPlayer = document.getElementById('zoomMapPlayer')
  if (fullPlayer) {
    fullPlayer.setAttribute('cx', sx.toFixed(1))
    fullPlayer.setAttribute('cy', sy.toFixed(1))
  }
  if (zoomPlayer) {
    zoomPlayer.setAttribute('cx', sx.toFixed(1))
    zoomPlayer.setAttribute('cy', sy.toFixed(1))
  }

  // Update zoom map viewBox to track the player (±15 unit window) — use smoothed position
  const zoomSvg = document.getElementById('zoomMapSvg')
  if (zoomSvg) {
    const zr = 15 // zoom radius
    const vx = Math.max(0, Math.min(100 - zr * 2, sx - zr))
    const vy = Math.max(0, Math.min(100 - zr * 2, sy - zr))
    zoomSvg.setAttribute('viewBox', vx.toFixed(1) + ' ' + vy.toFixed(1) + ' ' + (zr * 2) + ' ' + (zr * 2))
  }

  // Parse and render opponents
  const fullG = document.getElementById('fullMapOpponents')
  const zoomG = document.getElementById('zoomMapOpponents')
  if (!fullG || !zoomG) return

  // Parse "x,y,pit;x,y,pit;..." format
  const parts = opponentStr ? opponentStr.split(';') : []
  const count = Math.min(parts.length, _MAP_MAX_OPPONENTS)

  // Ensure we have enough circle elements (create/remove as needed)
  _ensureOpponentDots(fullG, count, 2.5)
  _ensureOpponentDots(zoomG, count, 1.5)

  // Update positions
  const fullDots = fullG.children
  const zoomDots = zoomG.children
  for (let i = 0; i < count; i++) {
    const seg = parts[i].split(',')
    if (seg.length < 2) continue
    // Clamp opponent coords to 0–100
    const ox = Math.max(0, Math.min(100, +seg[0]))
    const oy = Math.max(0, Math.min(100, +seg[1]))
    const inPit = seg[2] === '1'

    (fullDots[i] as SVGCircleElement).setAttribute('cx', String(ox))
    ;(fullDots[i] as SVGCircleElement).setAttribute('cy', String(oy))
    ;(fullDots[i] as HTMLElement).style.display = inPit ? 'none' : ''
    ;(fullDots[i] as HTMLElement).classList.toggle('close', _isClose(sx, sy, ox, oy))

    ;(zoomDots[i] as SVGCircleElement).setAttribute('cx', String(ox))
    ;(zoomDots[i] as SVGCircleElement).setAttribute('cy', String(oy))
    ;(zoomDots[i] as HTMLElement).style.display = inPit ? 'none' : ''
    ;(zoomDots[i] as HTMLElement).classList.toggle('close', _isClose(sx, sy, ox, oy))
  }
}

// Register on window
;(window as any).resetTrackMap = resetTrackMap
// Note: updateCommentaryVizData is registered by commentary-viz.ts
