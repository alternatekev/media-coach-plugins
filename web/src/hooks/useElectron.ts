'use client'

import { useMemo } from 'react'

interface ElectronEnv {
  /** True when the app is running inside the RaceCor Electron shell */
  isElectron: boolean
  /** True when the host OS is Windows (only meaningful when isElectron is true) */
  isWindows: boolean
}

/**
 * Detect the RaceCor Electron shell via user-agent string.
 *
 * The Electron wrapper appends "RaceCor/" to navigator.userAgent.
 * Windows detection uses the standard "Windows" token in the UA.
 */
export function useElectron(): ElectronEnv {
  return useMemo(() => {
    if (typeof navigator === 'undefined') {
      return { isElectron: false, isWindows: false }
    }
    const ua = navigator.userAgent
    return {
      isElectron: /RaceCor\//i.test(ua),
      isWindows: /Windows/i.test(ua),
    }
  }, [])
}
