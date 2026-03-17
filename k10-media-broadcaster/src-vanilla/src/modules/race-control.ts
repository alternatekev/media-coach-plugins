/**
 * race-control — Race control message banner
 * Converted from race-control.js
 */

import { state } from '../state'

const RC_MESSAGES: Record<string, { title: string; detail: string }> = {
  yellow:    { title: 'CAUTION',          detail: 'Full course yellow — hold position' },
  red:       { title: 'RED FLAG',         detail: 'Session stopped — return to pits' },
  checkered: { title: 'CHECKERED FLAG',   detail: 'Race complete — cool down lap' },
  black:     { title: 'BLACK FLAG',       detail: 'Penalty — report to pit lane immediately' },
  meatball:  { title: 'MEATBALL FLAG',    detail: 'Mechanical issue — pit for required repairs' },
}

const RC_DISPLAY_MS = 8000

export function showRaceControl(flagType: string): void {
  const banner = document.getElementById('rcBanner')
  if (!banner) return
  const msg = RC_MESSAGES[flagType]
  if (!msg) return

  const titleEl = document.getElementById('rcTitle')
  const detailEl = document.getElementById('rcDetail')
  if (titleEl) titleEl.textContent = msg.title
  if (detailEl) detailEl.textContent = msg.detail

  banner.className = banner.className.replace(/\brc-flag-\S+/g, '').trim()
  banner.classList.add('rc-flag-' + flagType)
  banner.classList.add('rc-visible')
  state.rcVisible = true

  document.body.classList.add('rc-active')

  if (state.rcTimeout) clearTimeout(state.rcTimeout)
  state.rcTimeout = setTimeout(() => {
    hideRaceControl()
  }, RC_DISPLAY_MS)
}

export function hideRaceControl(): void {
  const banner = document.getElementById('rcBanner')
  if (!banner) return
  banner.classList.remove('rc-visible')
  state.rcVisible = false
  if (state.rcTimeout) { clearTimeout(state.rcTimeout); state.rcTimeout = null }

  document.body.classList.remove('rc-active')
}
