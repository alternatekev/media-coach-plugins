/**
 * game-detect — Game/session detection, connection management, fetch engine
 * Converted from game-detect.js
 */

import { state } from '../state'
import { SIMHUB_URL, GAME_FEATURES } from '../constants'

// ─── Game detection ───

export function detectGameId(name: string | null | undefined): string {
  if (!name) return 'iracing'
  const g = name.toLowerCase()
  if (g.includes('iracing')) return 'iracing'
  if (g.includes('assettocorsacompetizione') || g === 'acc') return 'acc'
  if (g.includes('assettocorsaevo')) return 'acevo'
  if (g.includes('assettocorsarally')) return 'acrally'
  if (g.includes('assettocorsa') || g === 'ac') return 'ac'
  if (g.includes('lemans') || g.includes('lmu') || g.includes('rfactor')) return 'lmu'
  if (g.includes('raceroom') || g === 'rrre' || g === 'r3e') return 'raceroom'
  if (g.includes('wrc') || g.includes('eawrc')) return 'eawrc'
  if (g.includes('forza')) return 'forza'
  return 'iracing'
}

export function getGameFeatures() {
  return GAME_FEATURES[state.currentGameId] || GAME_FEATURES.iracing
}

export function isGameAllowed(): boolean {
  if (state.currentGameId === 'iracing') return true
  return !!state.discordUser
}

export function isRallyGame(): boolean {
  return state.currentGameId === 'eawrc' || state.currentGameId === 'acrally'
}

export function fmtLap(t: number): string {
  if (!t || t <= 0) return '—:——.———'
  const m = Math.floor(t / 60), s = t - m * 60
  return m + ':' + (s < 10 ? '0' : '') + s.toFixed(3)
}

export function fmtGap(g: number): string {
  if (!g || g === 0) return '—'
  return g > 0 ? '+' + g.toFixed(1) : g.toFixed(1)
}

export function colorToHue(hex: string): number {
  if (!hex || hex.length < 7) return 0
  let r, g, b
  if (hex.length === 9) {
    r = parseInt(hex.substr(3, 2), 16) / 255; g = parseInt(hex.substr(5, 2), 16) / 255; b = parseInt(hex.substr(7, 2), 16) / 255
  } else {
    r = parseInt(hex.substr(1, 2), 16) / 255; g = parseInt(hex.substr(3, 2), 16) / 255; b = parseInt(hex.substr(5, 2), 16) / 255
  }
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  if (d === 0) return 0
  let h
  if (mx === r) h = ((g - b) / d) % 6
  else if (mx === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h = Math.round(h * 60)
  if (h < 0) h += 360
  return h
}

// ─── Connection status indicator ───

let _connBannerDismissed = false

export function updateConnStatus(connState: string): void {
  const el = document.getElementById('connStatus')
  if (!el) return
  el.className = 'conn-status ' + connState
  const titles: Record<string, string> = {
    connected: 'Connected to plugin server',
    disconnected: 'Cannot reach plugin server — is the K10 Media Broadcaster plugin loaded in SimHub?',
    connecting: 'Connecting to plugin server...'
  }
  el.title = titles[connState] || ''

  const settingsWarn = document.getElementById('settingsConnWarn')
  const settingsWarnUrl = document.getElementById('settingsConnWarnUrl')

  if (connState === 'connected') {
    state.hasEverConnected = true
    const banner = document.getElementById('connBanner')
    if (banner && banner.classList.contains('visible')) {
      banner.classList.remove('visible')
    }
    if (settingsWarn) settingsWarn.classList.remove('warn-visible')
    if (state.logoCycleTimer) { clearInterval(state.logoCycleTimer); state.logoCycleTimer = null }
    if (state.settingsForcedByDisconnect) {
      state.settingsForcedByDisconnect = false
      const overlay = document.getElementById('settingsOverlay')
      if (overlay && overlay.classList.contains('open')) {
        ;(window as any).toggleSettings?.()
      }
    }
  }

  if (connState === 'disconnected' && state.connFails >= 2) {
    if (settingsWarn) {
      settingsWarn.classList.add('warn-visible')
      if (settingsWarnUrl) settingsWarnUrl.textContent = (window as any)._simhubUrlOverride || SIMHUB_URL
    }
  }

  if (connState === 'disconnected' && !state.hasEverConnected && state.connFails >= 3 && !state.settingsForcedByDisconnect) {
    state.settingsForcedByDisconnect = true
    const overlay = document.getElementById('settingsOverlay')
    if (overlay && !overlay.classList.contains('open')) {
      overlay.classList.add('open')
      document.body.classList.add('settings-active')
      ;(window as any).k10?.requestInteractive?.()
    }
  }

  if (typeof (window as any).updateSimhubConnectionCard === 'function') {
    ;(window as any).updateSimhubConnectionCard()
  }
}

export function applyConnBanner(): void {
  const inp = document.getElementById('connBannerUrl') as HTMLInputElement | null
  if (!inp) return
  let host = inp.value.trim()
  if (!host) return
  host = host.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:.*$/, '')
  const newUrl = `http://${host}:8889/k10mediabroadcaster/`
  ;(window as any)._simhubUrlOverride = newUrl
  state.settings.simhubUrl = newUrl
  ;(window as any).saveSettings?.()
  const urlInput = document.getElementById('settingsSimhubUrl') as HTMLInputElement | null
  if (urlInput) urlInput.value = newUrl
  state.connFails = 0
  state.backoffUntil = 0
  state.hasEverConnected = false
  _connBannerDismissed = false
  updateConnStatus('connecting')
  const banner = document.getElementById('connBanner')
  if (banner) banner.classList.remove('visible')
  ;(window as any).k10?.releaseInteractive?.()
  console.log('[K10 Media Broadcaster] SimHub URL changed to ' + newUrl)
}

export function dismissConnBanner(): void {
  _connBannerDismissed = true
  const banner = document.getElementById('connBanner')
  if (banner) banner.classList.remove('visible')
  ;(window as any).k10?.releaseInteractive?.()
}

// ─── Fetch with timeout ───

export function fetchWithTimeout(url: string, opts: RequestInit, ms: number): Promise<Response> {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), ms)
  return fetch(url, { ...opts, signal: ac.signal }).finally(() => clearTimeout(timer))
}

// ─── Fetch properties from SimHub HTTP API ───

export async function fetchProps(): Promise<Record<string, any> | null> {
  if (state.backoffUntil > Date.now()) return null

  const TIMEOUT_MS = 2000
  const url = (window as any)._simhubUrlOverride || SIMHUB_URL
  try {
    const resp = await fetchWithTimeout(url, {}, TIMEOUT_MS)
    if (resp.ok) {
      const data = await resp.json()
      state.connFails = 0
      updateConnStatus('connected')
      return data
    }
  } catch (e) { /* unreachable */ }

  state.connFails++
  state.backoffUntil = Date.now() + Math.min(1000 * Math.pow(2, state.connFails - 1), 10000)
  updateConnStatus('disconnected')
  if (state.connFails <= 3) {
    console.warn(`[K10 Media Broadcaster] Plugin server unreachable at ${(window as any)._simhubUrlOverride || SIMHUB_URL} — fail #${state.connFails}`)
  }
  return null
}

// ─── Apply game mode styling ───

export function applyGameMode(): void {
  const feat = getGameFeatures()

  document.querySelectorAll('.ir-only').forEach((el: Element) => {
    (el as HTMLElement).style.display = feat.hasIRating ? '' : 'none'
  })
  document.querySelectorAll('.incident-only').forEach((el: Element) => {
    (el as HTMLElement).style.display = feat.hasIncidents ? '' : 'none'
  })
  document.querySelectorAll('.rally-only').forEach((el: Element) => {
    (el as HTMLElement).style.display = state.isRally ? '' : 'none'
  })
  document.querySelectorAll('.circuit-only').forEach((el: Element) => {
    (el as HTMLElement).style.display = state.isRally ? 'none' : ''
  })

  document.body.classList.toggle('game-iracing', state.isIRacing)
  document.body.classList.toggle('game-rally', state.isRally)
  document.body.classList.toggle('game-acc', state.currentGameId === 'acc')
  document.body.classList.toggle('game-lmu', state.currentGameId === 'lmu')
}

// Register globals for HTML onclick handlers
;(window as any).applyConnBanner = applyConnBanner
;(window as any).dismissConnBanner = dismissConnBanner
