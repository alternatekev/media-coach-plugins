/**
 * fps — FPS counter display
 * Converted from fps.js
 */

let _apiFps = 0
let _fpsLastUpdate = 0

export function setApiFps(val: number): void {
  _apiFps = val
}

export function updateFps(): void {
  const now = performance.now()
  if (now - _fpsLastUpdate < 1000) return
  _fpsLastUpdate = now
  const el = document.getElementById('dsFps')
  if (el) el.textContent = _apiFps > 0 ? String(Math.round(_apiFps)) : '—'
}
