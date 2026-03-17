/**
 * spotter.ts — Spotter commentary for nearby vehicle positions
 * Announces gap and position changes to vehicles ahead and behind.
 */

import { state } from '../state'

let _spotterLastGapA = 0
let _spotterLastGapB = 0
let _spotterLastMsg = ''
let _spotterLastPosA = 0
let _spotterLastPosB = 0

export function updateSpotter(
  p: Record<string, any>,
  isDemo: boolean,
  fmtGap: (gap: number, isLap: boolean) => string
) {
  const pre = isDemo ? 'K10MediaBroadcaster.Plugin.Demo.' : 'K10MediaBroadcaster.Plugin.'
  const driverAhead = p[pre + 'DriverAhead'] || ''
  const driverBehind = p[pre + 'DriverBehind'] || ''
  const posAhead = +(p[pre + 'PositionAhead'] || 0)
  const posBehind = +(p[pre + 'PositionBehind'] || 0)
  const gapAhead = +(p[pre + 'GapAhead'] || 0)
  const gapBehind = +(p[pre + 'GapBehind'] || 0)
  const sessionLaps = +(p[pre + 'SessionLaps'] || 0)
  const currentLap = +(p[pre + 'CurrentLap'] || 0)
  const isLapRace = sessionLaps > 0 && currentLap <= sessionLaps

  const spotterEl = document.getElementById('spotter')
  if (!spotterEl) return

  // Detect changes and build message
  let msg = ''
  let changed = false

  if (driverAhead && posAhead > 0) {
    if (posAhead !== _spotterLastPosA || Math.abs(gapAhead - _spotterLastGapA) > 0.1) {
      changed = true
      const gapStr = fmtGap(gapAhead, isLapRace)
      msg += `${driverAhead} ahead by ${gapStr}`
      _spotterLastPosA = posAhead
      _spotterLastGapA = gapAhead
    }
  }

  if (driverBehind && posBehind > 0) {
    if (msg) msg += ' • '
    if (posBehind !== _spotterLastPosB || Math.abs(gapBehind - _spotterLastGapB) > 0.1) {
      changed = true
      const gapStr = fmtGap(gapBehind, isLapRace)
      msg += `${driverBehind} behind by ${gapStr}`
      _spotterLastPosB = posBehind
      _spotterLastGapB = gapBehind
    }
  }

  if (changed || msg !== _spotterLastMsg) {
    _spotterLastMsg = msg
    spotterEl.textContent = msg
    spotterEl.classList.toggle('visible', msg.length > 0)

    if (msg && (window as any).announceAdjustment) {
      (window as any).announceAdjustment(msg, 'spotter')
    }
  }
}

export function announceAdjustment(text: string, source: string) {
  // Placeholder for text-to-speech or logging
  console.log(`[${source}] ${text}`)
}

// Register on window for external calls
;(window as any).announceAdjustment = announceAdjustment
