// Recharts theme constants matching RaceCor design system
import { COLORS } from './constants'

export const CHART_COLORS = {
  primary: COLORS.k10Red,       // '#e53935'
  secondary: COLORS.blue,       // '#1e88e5'
  tertiary: COLORS.purple,      // '#7c6cf0'
  positive: COLORS.green,       // '#43a047'
  negative: COLORS.k10Red,      // '#e53935'
  neutral: COLORS.textDim,      // 'rgba(255, 255, 255, 0.55)'
  palette: [
    COLORS.k10Red,
    COLORS.blue,
    COLORS.green,
    COLORS.amber,
    COLORS.purple,
    COLORS.cyan,
  ],
}

export const CHART_AXIS_STYLE = {
  stroke: 'rgba(255, 255, 255, 0.14)',
  tick: { fill: 'rgba(255, 255, 255, 0.45)', fontSize: 11 },
  axisLine: { stroke: 'rgba(255, 255, 255, 0.14)' },
}

export const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: 'rgba(16, 16, 32, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    borderRadius: '8px',
    color: '#e8e8f0',
    fontSize: '12px',
    padding: '8px 12px',
  },
  cursor: { stroke: 'rgba(255, 255, 255, 0.2)' },
}

export const CHART_GRID_STYLE = {
  strokeDasharray: '3 3',
  stroke: 'rgba(255, 255, 255, 0.06)',
}

/**
 * Format iRating with + prefix for gains
 */
export function formatIRatingDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : String(delta)
}

/**
 * Format lap time from seconds
 */
export function formatLapTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds - m * 60
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(3)}`
}
