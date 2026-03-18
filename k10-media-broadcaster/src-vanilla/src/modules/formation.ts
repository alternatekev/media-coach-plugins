/**
 * formation.ts — Formation lap and grid display management
 * Displays grid positions, start lights, country flags, and session state.
 */

import { state } from '../state'

let _countryFlags: Record<string, string[]> = {}

export async function loadCountryFlags() {
  try {
    const resp = await fetch('images/flags/flags.json')
    if (resp.ok) _countryFlags = await resp.json()
  } catch (e) {
    console.warn('Failed to load country flags:', e)
  }
}

let _gridStripLastHtml = ''

function _renderGridStrip(total: number, gridded: number, playerPos: number) {
  const container = document.getElementById('gridStrip')
  if (!container) return
  if (total <= 0) {
    container.innerHTML = ''
    _gridStripLastHtml = ''
    return
  }

  // Build dots — only rebuild DOM when content changes
  let html = ''
  for (let i = 1; i <= total; i++) {
    const isPlayer = i === playerPos
    const isGridded = i <= gridded
    let cls = 'grid-dot'
    if (isPlayer) cls += ' player'
    else if (isGridded) cls += ' gridded'
    html += '<div class="' + cls + '"></div>'
  }
  if (html !== _gridStripLastHtml) {
    container.innerHTML = html
    _gridStripLastHtml = html
  }
}

function updateStartLights(phase: number) {
  // phase: 1-5 = red lights building (one column per phase)
  //         6  = all red (hold)
  //         7  = green (GO!)
  const cols = [
    ['light1t', 'light1b'],
    ['light2t', 'light2b'],
    ['light3t', 'light3b'],
    ['light4t', 'light4b'],
    ['light5t', 'light5b']
  ]

  if (phase >= 1 && phase <= 5) {
    // Light columns 1..phase are red
    for (let i = 0; i < 5; i++) {
      const cls = i < phase ? 'lit-red' : ''
      cols[i].forEach(id => {
        const el = document.getElementById(id)
        if (el) {
          el.className = 'light-bulb' + (cls ? ' ' + cls : '')
        }
      })
    }
    document.getElementById('lightsGo')?.classList.remove('go-visible')
  } else if (phase === 6) {
    // All red
    cols.forEach(col =>
      col.forEach(id => {
        const el = document.getElementById(id)
        if (el) el.className = 'light-bulb lit-red'
      })
    )
    document.getElementById('lightsGo')?.classList.remove('go-visible')
  } else if (phase === 7) {
    // All green — GO!
    cols.forEach(col =>
      col.forEach(id => {
        const el = document.getElementById(id)
        if (el) el.className = 'light-bulb lit-green'
      })
    )
    document.getElementById('lightsGo')?.classList.add('go-visible')
  }
}

function resetLightBulbs() {
  for (let i = 1; i <= 5; i++) {
    ['t', 'b'].forEach(s => {
      const el = document.getElementById('light' + i + s)
      if (el) el.className = 'light-bulb'
    })
  }
  const go = document.getElementById('lightsGo')
  if (go) go.classList.remove('go-visible')
}

export function updateGrid(p: Record<string, any>, isDemo: boolean) {
  const pre = isDemo ? 'K10MediaBroadcaster.Plugin.Demo.Grid.' : 'K10MediaBroadcaster.Plugin.Grid.'
  const sessionState = +(p[pre + 'SessionState'] || 0)
  const griddedCars = +(p[pre + 'GriddedCars'] || 0)
  const totalCars = +(p[pre + 'TotalCars'] || 0)
  const paceMode = +(p[pre + 'PaceMode'] || 0)
  const lightsPhase = +(p[pre + 'LightsPhase'] || 0)
  const startType = (p[pre + 'StartType'] || 'rolling').toLowerCase()

  const mod = document.getElementById('gridModule')
  const info = document.getElementById('gridInfo')
  const lights = document.getElementById('startLights')
  if (!mod || !info || !lights) return

  const isFormation = sessionState === 3 || sessionState === 2 || sessionState === 1
  const isLightsActive = lightsPhase >= 1 && lightsPhase <= 8
  const shouldShow = isFormation || isLightsActive

  if (!shouldShow && state.gridActive) {
    mod.classList.remove('grid-visible')
    mod.classList.add('grid-fadeout')
    document.body.classList.remove('grid-active')
    state.gridActive = false
    if ((window as any).setGridFlagGL) (window as any).setGridFlagGL(false)

    clearTimeout(state.gridFadeTimer)
    state.gridFadeTimer = setTimeout(() => {
      mod.classList.remove('grid-fadeout')
      resetLightBulbs()
      const flagElReset = document.getElementById('gridFlag')
      if (flagElReset) flagElReset.classList.remove('flag-active')
    }, 4000)
    return
  }

  if (!shouldShow) return

  if (!state.gridActive) {
    clearTimeout(state.gridFadeTimer)
    mod.classList.remove('grid-fadeout')
    mod.classList.add('grid-visible')
    document.body.classList.add('grid-active')
    state.gridActive = true
    if ((window as any).setGridFlagGL) (window as any).setGridFlagGL(true)
  }

  if (isLightsActive) {
    info.classList.add('info-hidden')
    lights.classList.add('lights-active')
    updateStartLights(lightsPhase)
    const flagElLights = document.getElementById('gridFlag')
    if (flagElLights) flagElLights.classList.remove('flag-active')
  } else {
    info.classList.remove('info-hidden')
    lights.classList.remove('lights-active')
    resetLightBulbs()

    const gridCarsGriddedEl = document.getElementById('gridCarsGridded')
    const gridCarsTotalEl = document.getElementById('gridCarsTotal')
    if (gridCarsGriddedEl) gridCarsGriddedEl.textContent = String(griddedCars)
    if (gridCarsTotalEl) gridCarsTotalEl.textContent = String(totalCars)

    const playerPos = isDemo
      ? +(p['K10MediaBroadcaster.Plugin.Demo.Position'] || 0)
      : +(p['DataCorePlugin.GameData.Position'] || 0)
    _renderGridStrip(totalCars, griddedCars, playerPos)

    const stEl = document.getElementById('gridStartType')
    if (stEl) {
      stEl.textContent = startType === 'standing' ? 'Standing Start' : 'Rolling Start'
      stEl.className = 'grid-start-type ' + startType
    }

    const countryCode = (p[pre + 'TrackCountry'] || '').toUpperCase()
    const flagEl = document.getElementById('gridFlag')
    const flagColors = _countryFlags[countryCode]

    if (flagEl && flagColors) {
      const stripe1 = document.getElementById('flagStripe1')
      const stripe2 = document.getElementById('flagStripe2')
      const stripe3 = document.getElementById('flagStripe3')
      if (stripe1) stripe1.style.background = flagColors[0]
      if (stripe2) stripe2.style.background = flagColors[1]
      if (stripe3) stripe3.style.background = flagColors[2]
      flagEl.classList.add('flag-active')
      if ((window as any).setGridFlagColors)
        (window as any).setGridFlagColors(flagColors[0], flagColors[1], flagColors[2])
    } else if (flagEl) {
      flagEl.classList.remove('flag-active')
    }

    const countdownEl = document.getElementById('gridCountdown')
    if (countdownEl) {
      if (paceMode === 1) countdownEl.textContent = 'GRID'
      else if (paceMode === 2) countdownEl.textContent = 'PACE'
      else if (paceMode === 3) countdownEl.textContent = 'READY'
      else if (sessionState === 1) countdownEl.textContent = 'PIT'
      else if (sessionState === 2) countdownEl.textContent = 'WARM'
      else countdownEl.textContent = 'FORM'
    }

    const titleEl = mod.querySelector('.grid-title')
    if (titleEl) {
      if (sessionState === 1) titleEl.textContent = 'Get In Car'
      else if (sessionState === 2) titleEl.textContent = 'Warm Up'
      else titleEl.textContent = 'Formation Lap'
    }
  }

  state.gridPrevSessionState = sessionState
  state.gridLightsPhase = lightsPhase
}
