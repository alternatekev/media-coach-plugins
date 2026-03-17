/**
 * leaderboard — Live leaderboard renderer
 * Converted from leaderboard.js
 */

import { state } from '../state'

const _sparkHistory: Record<string, number[]> = {}
const SPARK_MAX = 12
let _lbLastJson = ''

export function updateLeaderboard(p: Record<string, any>): void {
  const lbPanel = document.getElementById('leaderboardPanel')
  if (!lbPanel || lbPanel.classList.contains('section-hidden')) return

  let raw = p['K10MediaBroadcaster.Plugin.Leaderboard']
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw) } catch (e) {
      console.warn('[K10 LB] Failed to parse leaderboard string:', e); return
    }
  }
  if (state.pollFrame <= 3) {
    console.log('[K10 LB] raw type:', typeof raw, 'isArray:', Array.isArray(raw),
      'length:', raw ? raw.length : 0, 'sample:', raw ? JSON.stringify(raw).slice(0, 200) : 'null')
  }
  if (!raw || !Array.isArray(raw) || raw.length === 0) return

  const json = JSON.stringify(raw)
  if (json === _lbLastJson) return
  _lbLastJson = json

  const container = document.getElementById('lbRows')
  if (!container) return

  let sessionBest = Infinity
  for (const e of raw) {
    const b = +e[3]
    if (b > 0 && b < sessionBest) sessionBest = b
  }
  if (sessionBest === Infinity) sessionBest = 0

  let html = ''
  for (const entry of raw) {
    const [pos, name, ir, best, last, gap, pit, isPlayer] = entry
    const classes = ['lb-row']
    if (isPlayer) {
      classes.push('lb-player')
      if (pos === 1) classes.push('lb-p1')
      else if (state.startPosition > 0 && pos < state.startPosition) classes.push('lb-ahead')
      else if (state.startPosition > 0 && pos > state.startPosition) classes.push('lb-behind')
      else classes.push('lb-same')
    }
    if (!isPlayer && state.startPosition > 0 && pos === state.startPosition && state.lastPosition !== state.startPosition) {
      classes.push('lb-start-pos')
    }
    if (pit) classes.push('lb-pit')

    let gapStr = '', gapClass = 'gap-player'
    if (isPlayer) {
      gapStr = ''
    } else if (gap < 0) {
      gapStr = '-' + Math.abs(gap).toFixed(1) + 's'; gapClass = 'gap-ahead'
    } else if (gap > 0) {
      gapStr = '+' + gap.toFixed(1) + 's'; gapClass = 'gap-behind'
    } else {
      gapStr = '0.0s'
    }

    const irStr = ir > 0 ? (ir >= 1000 ? (ir / 1000).toFixed(1) + 'k' : '' + ir) : ''

    const lastNum = +last
    if (lastNum > 0) {
      if (!_sparkHistory[name]) _sparkHistory[name] = []
      const h = _sparkHistory[name]
      if (h.length === 0 || h[h.length - 1] !== lastNum) {
        h.push(lastNum)
        if (h.length > SPARK_MAX) h.shift()
      }
    }

    let sparkSvg = ''
    const hist = _sparkHistory[name] ? _sparkHistory[name].filter(v => v > 0) : null
    if (hist && hist.length >= 2) {
      const mn = Math.min(...hist), mx = Math.max(...hist)
      const range = mx - mn || 1
      const w = 44, h2 = 14
      let pts = ''
      for (let i = 0; i < hist.length; i++) {
        const x = (i / (hist.length - 1)) * w
        const y = h2 - ((hist[i] - mn) / range) * h2
        if (i === 0) {
          pts += x.toFixed(1) + ',' + y.toFixed(1)
        } else {
          const prevY = h2 - ((hist[i - 1] - mn) / range) * h2
          pts += ' ' + x.toFixed(1) + ',' + prevY.toFixed(1)
          pts += ' ' + x.toFixed(1) + ',' + y.toFixed(1)
        }
      }
      const lastY = h2 - ((hist[hist.length - 1] - mn) / range) * h2
      let col = 'hsla(0,0%,100%,0.3)'
      if (isPlayer) {
        if (pos === 1) col = 'hsla(42,80%,55%,1)'
        else if (state.startPosition > 0 && pos < state.startPosition) col = 'hsla(145,75%,50%,1)'
        else if (state.startPosition > 0 && pos > state.startPosition) col = 'hsla(0,75%,50%,1)'
        else col = 'hsla(210,75%,55%,1)'
      }
      sparkSvg = '<svg class="lb-spark" viewBox="0 0 ' + w + ' ' + h2 + '" preserveAspectRatio="none"><polyline points="' + pts + '" fill="none" stroke="' + col + '" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="' + w.toFixed(1) + '" cy="' + lastY.toFixed(1) + '" r="1.5" fill="' + col + '"/></svg>'
    }

    let lapStr = '', lapClass = ''
    if (last > 0) {
      const m = Math.floor(last / 60), s = last - m * 60
      lapStr = m + ':' + (s < 10 ? '0' : '') + s.toFixed(1)
      if (sessionBest > 0 && Math.abs(last - sessionBest) < 0.05) lapClass = 'lap-pb'
      else if (best > 0 && Math.abs(last - best) < 0.05) lapClass = 'lap-fast'
      else lapClass = 'lap-slow'
    }

    html += '<div class="' + classes.join(' ') + '">'
      + '<div class="lb-pos">' + pos + '</div>'
      + '<div class="lb-name">' + escHtml(isPlayer ? state.driverDisplayName : name) + '</div>'
      + '<div class="lb-lap ' + lapClass + '">' + lapStr + '</div>'
      + '<div class="lb-ir">' + irStr + '</div>'
      + '<div class="lb-gap ' + gapClass + '">' + gapStr + '</div>'
      + sparkSvg
      + '</div>'
  }
  container.innerHTML = html

  requestAnimationFrame(function() {
    ;(window as any).updateLBPlayerPos?.()
  })
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
