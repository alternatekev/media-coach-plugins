/**
 * pit-limiter — Pit lane speed limiter visualization
 * Converted from pit-limiter.js
 */

import { state } from '../state'

let _bonkersActive = false
let _sparkTimer: ReturnType<typeof setInterval> | null = null

export function updatePitLimiter(p: Record<string, any>, isDemo: boolean): void {
  const pre = isDemo ? 'K10MediaBroadcaster.Plugin.Demo.DS.' : 'K10MediaBroadcaster.Plugin.DS.'
  const inPitLane = +(p[pre + 'IsInPitLane']) > 0
  const speedKmh = +(p[pre + 'SpeedKmh']) || 0
  const pitLimiterOn = +(p[pre + 'PitLimiterOn']) > 0
  const pitLimitKmh = +(p[pre + 'PitSpeedLimitKmh']) || 0

  const banner = document.getElementById('pitBanner')
  const speedEl = document.getElementById('pitSpeed') as HTMLElement | null
  const limitEl = document.getElementById('pitLimit') as HTMLElement | null
  const labelEl = banner ? banner.querySelector('.pit-label') as HTMLElement | null : null
  if (!banner) return

  if (inPitLane) {
    banner.classList.add('pit-visible')
    document.body.classList.add('pit-mode')

    if (speedEl) {
      const mph = Math.round(+(p[pre + 'SpeedMph']) || speedKmh * 0.621371)
      speedEl.textContent = mph > 0 ? mph + ' mph' : ''
    }
    if (limitEl) {
      if (pitLimitKmh > 0) {
        const limitMph = Math.round(+(p[pre + 'PitSpeedLimitMph']) || pitLimitKmh * 0.621371)
        limitEl.textContent = '/ ' + limitMph + ' limit'
      } else {
        limitEl.textContent = ''
      }
    }

    const isSpeeding = +(p[pre + 'IsPitSpeeding']) > 0 || (pitLimitKmh > 0 && speedKmh > pitLimitKmh)

    if (isSpeeding) {
      banner.classList.add('pit-bonkers')
      banner.classList.remove('pit-warning')
      if (labelEl) labelEl.textContent = 'SPEEDING'
      if (state.settings.showBonkers !== false) {
        if (!_bonkersActive) _startBonkersSparks(banner)
        ;(window as any).setBonkersGL?.(true)
      }
    } else if (!pitLimiterOn) {
      banner.classList.add('pit-warning')
      banner.classList.remove('pit-bonkers')
      if (labelEl) labelEl.textContent = 'PIT LIMITER OFF'
      if (_bonkersActive) _stopBonkersSparks(banner)
      ;(window as any).setBonkersGL?.(false)
    } else {
      banner.classList.remove('pit-warning', 'pit-bonkers')
      if (labelEl) labelEl.textContent = 'Pit Limiter'
      if (_bonkersActive) _stopBonkersSparks(banner)
      ;(window as any).setBonkersGL?.(false)
    }
  } else {
    banner.classList.remove('pit-visible', 'pit-warning', 'pit-bonkers')
    document.body.classList.remove('pit-mode')
    if (labelEl) labelEl.textContent = 'Pit Limiter'
    if (_bonkersActive) _stopBonkersSparks(banner)
    ;(window as any).setBonkersGL?.(false)
  }
}

function _startBonkersSparks(container: HTMLElement): void {
  if (_bonkersActive) return
  _bonkersActive = true
  const inner = container.querySelector('.pit-inner') as HTMLElement | null
  if (!inner) return
  _sparkTimer = setInterval(() => {
    if (!_bonkersActive) return
    const count = 3 + Math.floor(Math.random() * 3)
    for (let i = 0; i < count; i++) _spawnSpark(inner)
  }, 40)
}

function _stopBonkersSparks(container: HTMLElement): void {
  _bonkersActive = false
  if (_sparkTimer) { clearInterval(_sparkTimer); _sparkTimer = null }
  const inner = container.querySelector('.pit-inner')
  if (inner) inner.querySelectorAll('.pit-spark').forEach((s: Element) => s.remove())
}

function _spawnSpark(parent: HTMLElement): void {
  const spark = document.createElement('div')
  spark.className = 'pit-spark'

  const angle = -Math.PI * 0.1 + Math.random() * -Math.PI * 0.8
  const speed = 40 + Math.random() * 80
  const dx = Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1)
  const dy = Math.sin(angle) * speed
  const size = 1.5 + Math.random() * 2.5
  const hue = Math.random() * 55
  const life = 300 + Math.random() * 400
  const brightness = 55 + Math.random() * 15

  spark.style.cssText =
    'position:absolute;border-radius:50%;pointer-events:none;z-index:10;' +
    'width:' + size + 'px;height:' + size + 'px;' +
    'background:hsl(' + hue + ',100%,' + brightness + '%);' +
    'box-shadow:0 0 ' + (size * 3) + 'px hsl(' + hue + ',100%,50%),' +
               '0 0 ' + (size * 6) + 'px hsla(' + hue + ',100%,50%,0.4);' +
    'left:' + (50 + (Math.random() - 0.5) * 60) + '%;' +
    'top:50%;' +
    '--spark-dx:' + dx + 'px;--spark-dy:' + dy + 'px;' +
    'animation:pit-spark-fly ' + life + 'ms ease-out forwards;'

  parent.appendChild(spark)
  setTimeout(() => { if (spark.parentNode) spark.remove() }, life + 50)
}
