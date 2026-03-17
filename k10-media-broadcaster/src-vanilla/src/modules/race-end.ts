/**
 * race-end — Race end screen
 * Converted from race-end.js
 */

import { state } from '../state'

function fmtLapTimeSecs(seconds: number): string {
  if (!seconds || seconds <= 0 || !isFinite(seconds)) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds - m * 60
  return m + ':' + (s < 10 ? '0' : '') + s.toFixed(3)
}

function fmtIR(ir: number): string {
  if (!ir || ir <= 0) return '—'
  return ir >= 1000 ? (ir / 1000).toFixed(1) + 'k' : String(ir)
}

export function showRaceEnd(p: Record<string, any>, isDemo: boolean): void {
  const screen = document.getElementById('raceEndScreen')
  if (!screen || state.raceEndVisible) return

  const pos = isDemo
    ? +(p['K10MediaBroadcaster.Plugin.Demo.Position']) || 0
    : +(p['DataCorePlugin.GameData.Position']) || 0
  const dsPre = isDemo ? 'K10MediaBroadcaster.Plugin.Demo.DS.' : 'K10MediaBroadcaster.Plugin.DS.'
  const incidents = +(p[dsPre + 'IncidentCount']) || 0
  const completedLaps = +(p[dsPre + 'CompletedLaps']) || 0
  const totalLaps = isDemo
    ? +(p['K10MediaBroadcaster.Plugin.Demo.TotalLaps']) || 0
    : +(p['DataCorePlugin.GameData.TotalLaps']) || 0
  const bestLap = isDemo
    ? +(p['K10MediaBroadcaster.Plugin.Demo.BestLapTime']) || 0
    : +(p['DataCorePlugin.GameData.BestLapTime']) || 0
  const iRating = isDemo
    ? +(p['K10MediaBroadcaster.Plugin.Demo.IRating']) || 0
    : +(p['IRacingExtraProperties.iRacing_DriverInfo_IRating']) || 0

  const isDNF = pos === 0 || (completedLaps > 0 && totalLaps > 0 && completedLaps < Math.max(1, Math.floor(totalLaps * 0.5)))

  let finishType: string
  if (isDNF) finishType = 'dnf'
  else if (pos >= 1 && pos <= 3) finishType = 'podium'
  else if (pos >= 4 && pos <= 10) finishType = 'strong'
  else finishType = 'midpack'

  let title: string, subtitle: string | null = null, tint: string
  if (isDNF) {
    title = 'TOUGH BREAK'; subtitle = 'Every lap is a lesson. Regroup and go again.'; tint = 'purple'
  } else if (finishType === 'podium') {
    title = pos === 1 ? 'VICTORY!' : 'PODIUM FINISH!'
    tint = pos === 1 ? 'gold' : pos === 2 ? 'silver' : 'bronze'
  } else if (finishType === 'strong') {
    title = 'STRONG FINISH'; tint = 'green'
  } else {
    title = 'RACE COMPLETE'; tint = 'neutral'
  }

  const dash = document.getElementById('dashboard')
  if (dash) {
    const r = dash.getBoundingClientRect()
    screen.style.top = Math.max(0, r.top - 12) + 'px'
    screen.style.left = Math.max(0, r.left - 12) + 'px'
    screen.style.width = (r.width + 24) + 'px'
    screen.style.height = (r.height + 24) + 'px'
  } else {
    screen.style.top = '10px'; screen.style.right = '10px'
    screen.style.width = '500px'; screen.style.height = '260px'
  }

  screen.className = 'race-end-screen re-visible re-tint-' + tint

  const posEl = document.getElementById('rePosition')
  const titleEl = document.getElementById('reTitle')
  const subEl = document.getElementById('reSubtitle') as HTMLElement | null
  const cleanEl = document.getElementById('reCleanBadge') as HTMLElement | null
  const statPos = document.getElementById('reStatPos')
  const statInc = document.getElementById('reStatInc')
  const statLap = document.getElementById('reStatLap')
  const statIR = document.getElementById('reStatIR')

  if (posEl) posEl.textContent = !isDNF && pos > 0 ? 'P' + pos : '—'
  if (titleEl) titleEl.textContent = title
  if (subEl) { subEl.textContent = subtitle || ''; subEl.style.display = subtitle ? '' : 'none' }
  if (cleanEl) cleanEl.style.display = incidents <= 4 ? '' : 'none'
  if (statPos) statPos.textContent = !isDNF && pos > 0 ? 'P' + pos : 'DNF'
  if (statInc) statInc.textContent = String(incidents)
  if (statLap) statLap.textContent = fmtLapTimeSecs(bestLap)
  if (statIR) statIR.textContent = fmtIR(iRating)

  const confetti = document.getElementById('reConfetti')
  if (confetti) {
    confetti.innerHTML = ''
    if (finishType === 'podium') {
      for (let i = 0; i < 14; i++) {
        const dot = document.createElement('div')
        dot.className = 're-confetti-dot'
        dot.style.left = (5 + i * 6.8) + '%'
        dot.style.animationDelay = (i * 0.12) + 's'
        dot.style.animationDuration = (2.5 + Math.random() * 2) + 's'
        confetti.appendChild(dot)
      }
    }
  }

  state.raceEndVisible = true

  if (state.raceEndTimer) clearTimeout(state.raceEndTimer)
  state.raceEndTimer = setTimeout(hideRaceEnd, 30000)
}

export function hideRaceEnd(): void {
  const screen = document.getElementById('raceEndScreen')
  if (screen) screen.classList.remove('re-visible')
  state.raceEndVisible = false
  if (state.raceEndTimer) { clearTimeout(state.raceEndTimer); state.raceEndTimer = null }
}
