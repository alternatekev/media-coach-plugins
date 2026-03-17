/**
 * race-timeline — Race timeline position strip
 * Converted from race-timeline.js
 */

const RT_MAX_SAMPLES = 310

interface RtSample {
  delta: number
  p1: boolean
  checkered: boolean
  event: string | null
}

const _rtHistory: RtSample[] = []
let _rtStartPos = 0
let _rtLastLap = 0
let _rtLastPos = 0
let _rtLastDelta: number | null = null
let _rtFinished = false
let _rtLastIncident = 0
let _rtWasInPit = false

function rtColor(sample: RtSample): string {
  if (sample.checkered) return ''
  if (sample.p1) {
    const heat = Math.min(Math.abs(sample.delta), 5)
    const alpha = 0.26 + heat * 0.11
    const lit = 58 + heat * 4
    return 'hsla(42, 72%, ' + lit + '%, ' + alpha.toFixed(2) + ')'
  }
  const d = sample.delta
  if (d === 0) return 'hsla(210, 42%, 54%, 0.24)'
  if (d < 0) {
    const heat = Math.min(Math.abs(d), 5)
    const alpha = 0.22 + heat * 0.12
    const sat = 38 + heat * 8
    const lit = 46 + heat * 5
    return 'hsla(145, ' + sat + '%, ' + lit + '%, ' + alpha.toFixed(2) + ')'
  }
  const heat = Math.min(d, 5)
  const alpha = 0.22 + heat * 0.12
  const sat = 38 + heat * 8
  const lit = 48 + heat * 5
  return 'hsla(0, ' + sat + '%, ' + lit + '%, ' + alpha.toFixed(2) + ')'
}

export function updateRaceTimeline(
  position: number, currentLap: number, flagState: string,
  incidentCount: number, isInPit: boolean
): void {
  if (!position || position <= 0) return
  if (_rtStartPos <= 0 && position > 0) _rtStartPos = position

  const delta = position - _rtStartPos

  let event: string | null = null
  if (isInPit && !_rtWasInPit) {
    event = 'pit'
  } else if (incidentCount > _rtLastIncident && _rtLastIncident > 0) {
    const inc = incidentCount - _rtLastIncident
    event = inc >= 4 ? 'damage' : 'offtrack'
  }
  _rtWasInPit = !!isInPit
  if (incidentCount > 0) _rtLastIncident = incidentCount

  const sample: RtSample = {
    delta,
    p1: position === 1,
    checkered: flagState === 'checkered',
    event,
  }
  if (sample.checkered) _rtFinished = true

  const lapChanged = currentLap > 0 && currentLap !== _rtLastLap
  const posChanged = position !== _rtLastPos && _rtLastPos > 0
  const hasEvent = event !== null
  if (lapChanged || posChanged || hasEvent) {
    _rtHistory.push(sample)
    _rtLastLap = currentLap
    _rtLastDelta = delta
  } else if (_rtHistory.length === 0) {
    _rtHistory.push(sample)
    _rtLastDelta = delta
  }
  _rtLastPos = position
  if (_rtHistory.length > RT_MAX_SAMPLES) _rtHistory.shift()

  renderTimeline()
}

const RT_EVENT_COLORS: Record<string, string> = {
  pit:      'hsla(210, 80%, 65%, 0.9)',
  offtrack: 'hsla(35, 90%, 55%, 0.9)',
  damage:   'hsla(0, 85%, 55%, 0.9)',
}

function renderTimeline(): void {
  const canvas = document.getElementById('rtCanvas') as HTMLCanvasElement | null
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  const w = canvas.width
  const h = canvas.height
  ctx.clearRect(0, 0, w, h)

  const len = _rtHistory.length
  if (len === 0) return

  const sliceW = Math.max(1, w / len)

  for (let i = 0; i < len; i++) {
    const sample = _rtHistory[i]
    const x = Math.floor(i * sliceW)
    const nextX = Math.floor((i + 1) * sliceW)
    const sw = nextX - x

    if (sample.checkered) {
      const sqSize = 2
      for (let cy = 0; cy < h; cy += sqSize) {
        for (let cx = x; cx < x + sw; cx += sqSize) {
          const row = Math.floor(cy / sqSize)
          const col = Math.floor((cx - x) / sqSize)
          ctx.fillStyle = (row + col) % 2 === 0 ? 'hsla(0,0%,100%,0.15)' : 'hsla(0,0%,100%,0.04)'
          ctx.fillRect(cx, cy, Math.min(sqSize, x + sw - cx), Math.min(sqSize, h - cy))
        }
      }
    } else {
      ctx.fillStyle = rtColor(sample)
      ctx.fillRect(x, 0, sw, h)
    }
  }

  for (let i = 0; i < len; i++) {
    const sample = _rtHistory[i]
    if (!sample.event) continue
    const x = Math.floor(i * sliceW + sliceW / 2)
    const color = RT_EVENT_COLORS[sample.event] || 'hsla(0,0%,100%,0.5)'

    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(x - 3, 0)
    ctx.lineTo(x + 3, 0)
    ctx.lineTo(x, 5)
    ctx.closePath()
    ctx.fill()

    ctx.strokeStyle = color.replace(/[\d.]+\)$/, '0.4)')
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, 5)
    ctx.lineTo(x, h)
    ctx.stroke()
  }
}

export function resetTimeline(): void {
  _rtHistory.length = 0
  _rtStartPos = 0
  _rtLastLap = 0
  _rtLastPos = 0
  _rtLastDelta = null
  _rtFinished = false
  const canvas = document.getElementById('rtCanvas') as HTMLCanvasElement | null
  if (canvas) canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
}
