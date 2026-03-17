/**
 * car-logos — Car manufacturer logo loading and display
 * Converted from car-logos.js
 */

import { state } from '../state'
import { MFR_BRAND_COLORS, DEFAULT_LOGO_BG, DEMO_MODELS } from '../constants'

export const CAR_LOGO_KEYS = [
  'bmw','mclaren','mazda','nissan','dallara','ferrari','porsche','audi',
  'mercedes','lamborghini','chevrolet','ford','toyota','hyundai','cadillac','astonmartin',
  'lotus','honda','honda_white','ligier','generic','none'
]

export const carLogos: Record<string, string> = {}

export const carLogoOrder = [
  'bmw', 'mclaren', 'mazda', 'nissan', 'dallara', 'ferrari', 'porsche', 'audi',
  'mercedes', 'lamborghini', 'chevrolet', 'ford', 'toyota', 'hyundai', 'cadillac',
  'astonmartin', 'lotus', 'honda', 'ligier'
]

export async function loadCarLogos(): Promise<void> {
  await Promise.allSettled(
    CAR_LOGO_KEYS.map(async key => {
      const resp = await fetch('images/logos/' + key + '.svg')
      if (resp.ok) carLogos[key] = await resp.text()
    })
  )
}

export function cycleCarLogo(): void {
  state.currentCarLogoIdx = (state.currentCarLogoIdx + 1) % carLogoOrder.length
  const key = carLogoOrder[state.currentCarLogoIdx]
  const svg = (key === 'honda') ? carLogos.honda_white : carLogos[key]
  const iconEl = document.getElementById('carLogoIcon')
  const labelEl = document.getElementById('carModelLabel')
  if (iconEl) iconEl.innerHTML = svg || ''
  if (labelEl) labelEl.textContent = DEMO_MODELS[key] || ''
  const sq = document.getElementById('carLogoSquare') as HTMLElement | null
  if (sq) sq.style.background = MFR_BRAND_COLORS[key] || DEFAULT_LOGO_BG
  state.currentCarLogo = ''
}

const BRAND_STRIPS = [
  'aston martin', 'astonmartin', 'lamborghini', 'mercedes-benz', 'mercedes',
  'chevrolet', 'mclaren', 'ferrari', 'porsche', 'hyundai', 'cadillac',
  'dallara', 'nissan', 'toyota', 'mazda', 'honda', 'lotus', 'ligier', 'ford',
  'audi', 'bmw'
]

export function stripBrand(model: string | undefined | null): string {
  if (!model) return ''
  let s = model.trim()
  const l = s.toLowerCase()
  for (const b of BRAND_STRIPS) {
    if (l.startsWith(b)) { s = s.substring(b.length).trim(); break }
  }
  return s
}

export function setCarLogo(key: string, modelName?: string): void {
  if (key === state.currentCarLogo && modelName === undefined) return
  state.currentCarLogo = key
  const svg = (key === 'honda') ? (carLogos.honda_white || carLogos.honda) : (carLogos[key] || carLogos.generic)
  const iconEl = document.getElementById('carLogoIcon')
  const labelEl = document.getElementById('carModelLabel')
  if (iconEl) iconEl.innerHTML = svg || ''
  if (labelEl) labelEl.textContent = stripBrand(modelName)
  const sq = document.getElementById('carLogoSquare') as HTMLElement | null
  if (sq) sq.style.background = MFR_BRAND_COLORS[key] || DEFAULT_LOGO_BG
}

// Register globally for HTML event handlers
;(window as any).cycleCarLogo = cycleCarLogo
