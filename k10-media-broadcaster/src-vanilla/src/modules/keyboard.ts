/**
 * keyboard — Global keyboard shortcut handlers via Electron IPC
 * Converted from keyboard.js
 */

import { SIMHUB_URL } from '../constants'

export function initKeyboard(): void {
  const k10 = (window as any).k10

  // Ctrl+Shift+D — restart demo
  if (k10 && k10.onRestartDemo) {
    k10.onRestartDemo(function() {
      const baseUrl = (window as any)._simhubUrlOverride || SIMHUB_URL
      const sep = baseUrl.indexOf('?') === -1 ? '?' : '&'
      fetch(baseUrl + sep + 'action=restartdemo')
        .then(function(r) {
          if (r.ok) console.log('[K10] Demo restarted')
          else console.warn('[K10] Demo restart failed:', r.status)
        })
        .catch(function(err) { console.warn('[K10] Demo restart error:', err) })
    })
  }

  // Ctrl+Shift+M — reset track map
  if (k10 && k10.onResetTrackmap) {
    k10.onResetTrackmap(function() {
      if (typeof (window as any).resetTrackMap === 'function') {
        ;(window as any).resetTrackMap()
      }
    })
  }
}
