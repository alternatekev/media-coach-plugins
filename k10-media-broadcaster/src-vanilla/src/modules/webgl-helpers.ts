/**
 * webgl-helpers.ts — WebGL visualization helpers
 * Includes tachometer, pedal histograms, traces, and commentary overlays.
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

const RPM_COLORS = {
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
  const litCount = Math.round(pct * TACH_SEGS)

  if (litCount !== _prevLitCount) {
    const segs = tachoBar.querySelectorAll('.tacho-seg')
    let redStart = Math.ceil(TACH_SEGS * 0.8)
    let yellowStart = Math.ceil(TACH_SEGS * 0.6)

    for (let i = 0; i < TACH_SEGS; i++) {
      const seg = segs[i] as HTMLElement
      if (i < litCount) {
        if (i >= redStart) seg.style.background = RPM_COLORS.red
        else if (i >= yellowStart) seg.style.background = RPM_COLORS.yellow
        else seg.style.background = RPM_COLORS.green
      } else {
        seg.style.background = RPM_COLORS.dim
      }
    }

    _prevLitCount = litCount
  }

  if (pct > 0.95) {
    if (_rpmPulseTimer) clearTimeout(_rpmPulseTimer)
    tachoBar.classList.add('pulse')
    _rpmPulseTimer = setTimeout(() => {
      tachoBar.classList.remove('pulse')
    }, 200)
  }
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
    bar.className = `hist-bar hist-${cls}`
    container.appendChild(bar)
  }
}

setupHist('throttleHist', 'throttle')
setupHist('brakeHist', 'brake')
setupHist('clutchHist', 'clutch')

export function renderHist(id: string, data: number[]) {
  const container = document.getElementById(id)
  if (!container) return

  const bars = container.querySelectorAll('.hist-bar')
  const max = Math.max(...Array.from(data))

  for (let i = 0; i < HIST_BARS && i < bars.length; i++) {
    const bar = bars[i] as HTMLElement
    const height = max > 0 ? (data[i] / max) * 100 : 0
    bar.style.height = height + '%'
  }
}

// ========== PEDAL TRACE ==========
export function renderPedalTrace(
  canvasId: string,
  thr: number[],
  brk: number[],
  clt: number[]
) {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const w = canvas.width
  const h = canvas.height
  const len = Math.min(thr.length, brk.length, clt.length)

  ctx.fillStyle = 'rgba(10, 10, 20, 0.8)'
  ctx.fillRect(0, 0, w, h)

  // Draw grid
  ctx.strokeStyle = 'rgba(100, 100, 120, 0.3)'
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const y = (h / 4) * i
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }

  // Draw traces
  const colors = ['#22dd88', '#dd2222', '#2288ff']
  const traces = [thr, brk, clt]
  const names = ['throttle', 'brake', 'clutch']

  traces.forEach((data, idx) => {
    ctx.strokeStyle = colors[idx]
    ctx.lineWidth = 2
    ctx.beginPath()

    for (let i = 0; i < len; i++) {
      const x = (i / len) * w
      const y = h - data[i] * h
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }

    ctx.stroke()
  })

  // Draw labels
  ctx.fillStyle = '#aaa'
  ctx.font = '11px monospace'
  names.forEach((name, idx) => {
    ctx.fillStyle = colors[idx]
    ctx.fillText(name, 5, 15 + idx * 12)
  })
}

// ========== COMMENTARY / OVERLAY ==========

let _hasRatingData = false

export function setHasRatingData(has: boolean) {
  _hasRatingData = has
}

const _commentaryIcons: Record<string, string> = {
  /* SVG icons would be stored here in the original JS */
}

export function showCommentary(
  hue: number,
  title: string,
  text: string,
  meta?: string,
  topicId?: string,
  severity?: number
) {
  const el = document.getElementById('commentary')
  if (!el) return

  const titleEl = el.querySelector('.commentary-title') as HTMLElement
  const textEl = el.querySelector('.commentary-text') as HTMLElement
  const metaEl = el.querySelector('.commentary-meta') as HTMLElement

  if (titleEl) titleEl.textContent = title
  if (textEl) textEl.textContent = text
  if (metaEl && meta) metaEl.textContent = meta

  el.style.setProperty('--hue', String(hue))
  el.classList.add('visible')
}

export function hideCommentary() {
  const el = document.getElementById('commentary')
  if (el) el.classList.remove('visible')
}

export function cycleRatingPos() {
  // Cycle through rating display positions
  const el = document.getElementById('ratingPanel')
  if (!el) return
  state.ratingPos = ((state.ratingPos || 0) + 1) % 3
  el.classList.toggle('pos-left', state.ratingPos === 0)
  el.classList.toggle('pos-center', state.ratingPos === 1)
  el.classList.toggle('pos-right', state.ratingPos === 2)
}

export function showPositionPage() {
  const el = document.getElementById('positionPanel')
  if (el) el.classList.add('visible')
}

export function updateIRBar(iRating: number) {
  const bar = document.getElementById('irBar')
  if (!bar) return
  // Scale iRating to 0-100 (typical range 0-5000)
  const pct = Math.min(100, (iRating / 5000) * 100)
  bar.style.width = pct + '%'
}

export function updateSRPie(sr: number) {
  const pie = document.getElementById('srPie')
  if (!pie) return
  // SR 0-4.99, scale to degrees
  const deg = (sr / 5) * 360
  pie.style.setProperty('--conic-angle', deg + 'deg')
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

export function setCtrlVisibility(hasBB: boolean, hasTC: boolean, hasABS: boolean) {
  const bbEl = document.getElementById('ctrlBB')
  const tcEl = document.getElementById('ctrlTC')
  const absEl = document.getElementById('ctrlABS')

  if (bbEl) bbEl.style.display = hasBB ? '' : 'none'
  if (tcEl) tcEl.style.display = hasTC ? '' : 'none'
  if (absEl) absEl.style.display = hasABS ? '' : 'none'
}

export function updateTyreCell(index: number, tempF: number, wearPct: number) {
  const cell = document.getElementById(`tyre${index}`)
  if (!cell) return

  const tempEl = cell.querySelector('.tyre-temp') as HTMLElement
  const wearEl = cell.querySelector('.tyre-wear') as HTMLElement

  if (tempEl) {
    tempEl.textContent = Math.round(tempF) + '°'
    const tempClass = getTyreTempClass(tempF)
    cell.className = `tyre-cell ${tempClass}`
  }

  if (wearEl) {
    wearEl.textContent = Math.round(wearPct) + '%'
  }
}

export function getTyreTempClass(tempF: number): string {
  if (tempF < 80) return 'tyre-cold'
  if (tempF < 100) return 'tyre-warm'
  if (tempF < 120) return 'tyre-hot'
  return 'tyre-critical'
}

export function updateFuelBar(pct: number, pitLapPct?: number) {
  const bar = document.getElementById('fuelBar') as HTMLElement
  if (!bar) return
  bar.style.width = Math.max(0, Math.min(100, pct)) + '%'

  if (pitLapPct !== undefined) {
    const pitMarker = document.getElementById('fuelPitMarker') as HTMLElement
    if (pitMarker) {
      pitMarker.style.left = Math.max(0, Math.min(100, pitLapPct)) + '%'
      pitMarker.style.display = pitLapPct > 0 && pitLapPct < 100 ? '' : 'none'
    }
  }
}

export function resetTrackMap() {
  const svg = document.getElementById('trackMapSvg') as unknown as SVGElement
  if (svg) {
    const playerPath = svg.querySelector('#mapPlayer')
    const opponentPath = svg.querySelector('#mapOpponents')
    if (playerPath) (playerPath as SVGElement).style.display = 'none'
    if (opponentPath) (opponentPath as SVGElement).style.display = 'none'
  }
}

export function updateTrackMap(svgPath: string, playerX: number, playerY: number, opponentStr?: string) {
  const svg = document.getElementById('trackMapSvg') as unknown as SVGElement
  if (!svg) return

  const pathEl = svg.querySelector('path[d]') as SVGPathElement
  if (pathEl) pathEl.setAttribute('d', svgPath)

  const playerCircle = svg.querySelector('#mapPlayer') as SVGCircleElement
  if (playerCircle) {
    playerCircle.setAttribute('cx', String(playerX))
    playerCircle.setAttribute('cy', String(playerY))
    playerCircle.style.display = ''
  }
}

// Register on window
;(window as any).resetTrackMap = resetTrackMap
// Note: updateCommentaryVizData is registered by commentary-viz.ts
