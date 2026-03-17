/**
 * config — utility functions from config.js
 * Constants and state are in constants.ts and state.ts.
 * This module exports helper functions that were also defined in config.js.
 */

import { MFR_MAP, CAR_NO_ADJUST } from '../constants'

/** Match a car model string to a manufacturer key */
export function detectMfr(model: string | null | undefined): string {
  if (!model) return 'none'
  const l = ('' + model).toLowerCase()
  for (const k in MFR_MAP) {
    if (l.indexOf(k) !== -1) return MFR_MAP[k]
  }
  return 'generic'
}

/** Check car model string against no-adjust list. Returns entry or null. */
export function getCarAdjustability(model: string | null | undefined): { noBB: boolean; noABS: boolean; noTC: boolean } | null {
  if (!model) return null
  const l = ('' + model).toLowerCase()
  for (const entry of CAR_NO_ADJUST) {
    if (l.indexOf(entry.match) !== -1) return entry
  }
  return null
}

/** Check if session type is a non-race session */
export function isNonRaceSession(sessionType: string | null | undefined): boolean {
  if (!sessionType) return false
  const s = sessionType.toLowerCase()
  return s.includes('practice') || s.includes('qualify') || s.includes('test') || s.includes('warmup') || s.includes('warm up')
}

/** Format lap time (seconds → m:ss.xxx) */
export function fmtLapTime(secs: number): string {
  if (secs <= 0) return '—'
  const m = Math.floor(secs / 60)
  const s = (secs % 60).toFixed(3)
  return m + ':' + (+s < 10 ? '0' : '') + s
}
