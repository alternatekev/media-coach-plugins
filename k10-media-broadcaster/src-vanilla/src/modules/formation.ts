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

function _renderGridStrip(total: number, gridded: number, playerPos: number) {
  const strip = document.getElementById('gridStrip')
  if (!strip) return

  strip.innerHTML = ''
  const itemW = 100 / Math.max(total, 1)
  const playerRelX = playerPos * itemW + itemW / 2

  for (let i = 0; i < Math.max(total, 1); i++) {
    const item = document.createElement('div')
    item.className = 'grid-item'
    item.style.width = itemW + '%'
    if (i < gridded) item.classList.add('gridded')
    if (i === playerPos - 1) item.classList.add('player')
    strip.appendChild(item)
  }
}

function updateStartLights(phase: number) {
  const lights = document.getElementById('startLights')
  if (!lights) return

  for (let i = 1; i <= 5; i++) {
    const bulb = document.getElementById(`lightBulb${i}`)
    if (bulb) bulb.classList.toggle('on', i <= phase)
  }
}

function resetLightBulbs() {
  for (let i = 1; i <= 5; i++) {
    const bulb = document.getElementById(`lightBulb${i}`)
    if (bulb) bulb.classList.remove('on')
  }
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
