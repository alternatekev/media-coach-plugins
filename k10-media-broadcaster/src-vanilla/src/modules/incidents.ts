/**
 * incidents — Incident counter panel
 * Converted from incidents.js
 */

import { state } from '../state'

let _dsPrevIncidents = -1

export function updateIncidents(p: Record<string, any>, isDemo: boolean): void {
  const panel = document.getElementById('incidentsPanel')
  if (!panel || panel.classList.contains('section-hidden')) return
  const pre = isDemo ? 'K10MediaBroadcaster.Plugin.Demo.DS.' : 'K10MediaBroadcaster.Plugin.DS.'
  const incidentCount = +(p[pre + 'IncidentCount']) || 0

  const countEl = document.getElementById('incCount')
  if (!countEl) return
  countEl.textContent = String(incidentCount)

  if (_dsPrevIncidents >= 0 && incidentCount > _dsPrevIncidents) {
    countEl.classList.remove('inc-flash')
    void (countEl as any).offsetWidth
    countEl.classList.add('inc-flash')
  }
  _dsPrevIncidents = incidentCount

  let level: number
  if (incidentCount === 0) level = 0
  else if (incidentCount <= 2) level = 1
  else if (incidentCount <= 4) level = 2
  else if (incidentCount <= 6) level = 3
  else if (incidentCount <= 9) level = 4
  else level = 5

  for (let i = 0; i <= 5; i++) panel.classList.toggle('inc-level-' + i, i === level)

  const penLimit = state.settings.incPenalty || 17
  const dqLimit  = state.settings.incDQ || 25
  const toPen = Math.max(0, penLimit - incidentCount)
  const toDQ  = Math.max(0, dqLimit - incidentCount)

  const penEl = document.getElementById('incToPen')
  const dqEl  = document.getElementById('incToDQ')
  if (penEl) {
    penEl.textContent = toPen > 0 ? String(toPen) : 'PENALTY'
    penEl.className = 'inc-thresh-val' + (toPen === 0 ? ' thresh-hit' : toPen <= 3 ? ' thresh-crit' : toPen <= 6 ? ' thresh-near' : '')
  }
  if (dqEl) {
    dqEl.textContent = toDQ > 0 ? String(toDQ) : 'DQ'
    dqEl.className = 'inc-thresh-val' + (toDQ === 0 ? ' thresh-hit' : toDQ <= 3 ? ' thresh-crit' : toDQ <= 6 ? ' thresh-near' : '')
  }

  const barFill = document.getElementById('incBarFill') as HTMLElement | null
  const markerPen = document.getElementById('incMarkerPen') as HTMLElement | null
  const markerDQ = document.getElementById('incMarkerDQ') as HTMLElement | null
  if (barFill && markerPen && markerDQ) {
    const fillPct = Math.min(100, (incidentCount / dqLimit) * 100)
    barFill.style.width = fillPct + '%'
    const penPct = Math.min(100, (penLimit / dqLimit) * 100)
    markerPen.style.left = penPct + '%'
    markerDQ.style.left = '100%'
    markerPen.style.opacity = incidentCount >= penLimit ? '0.3' : '0.7'
  }

  if ((window as any).setIncidentsGL) {
    if (toDQ === 0) {
      ;(window as any).setIncidentsGL('dq')
    } else if (toPen === 0) {
      ;(window as any).setIncidentsGL('penalty')
    } else {
      ;(window as any).setIncidentsGL('')
    }
  }
}
