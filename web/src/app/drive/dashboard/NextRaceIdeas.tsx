'use client'

import { Clock, Target, AlertTriangle, Flame, Shield, Zap } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

export type StrategyType = 'pitlane' | 'conservative' | 'careful' | 'form' | 'steady'

export interface RaceSuggestion {
  seriesName: string
  trackName: string
  trackConfig?: string
  license: string
  official: boolean
  fixed: boolean
  score: number
  strategy: StrategyType
  commentary: string
  startsAtUtc: string
}

interface NextRaceIdeasProps {
  suggestions: RaceSuggestion[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SCORE_COLOR: Record<string, string> = {
  high: '#43a047',      // green
  lime: '#7cb342',      // lime
  amber: '#ffb300',     // amber
  orange: '#ff7043',    // orange
}

function getScoreColor(score: number): string {
  if (score >= 80) return SCORE_COLOR.high
  if (score >= 60) return SCORE_COLOR.lime
  if (score >= 40) return SCORE_COLOR.amber
  return SCORE_COLOR.orange
}

const STRATEGY_COLOR: Record<StrategyType, string> = {
  pitlane: '#e53935',      // red
  conservative: '#ffb300',  // amber
  careful: '#ff9800',       // orange
  form: '#43a047',          // green
  steady: '#78909c',        // blue-gray
}

const STRATEGY_ICON: Record<StrategyType, React.ReactNode> = {
  pitlane: <Shield size={16} />,
  conservative: <Target size={16} />,
  careful: <AlertTriangle size={16} />,
  form: <Flame size={16} />,
  steady: <Zap size={16} />,
}

const STRATEGY_LABEL: Record<StrategyType, string> = {
  pitlane: 'Pitlane',
  conservative: 'Conservative',
  careful: 'Careful',
  form: 'Form',
  steady: 'Steady',
}

// ── Time formatting ───────────────────────────────────────────────────────────

function formatTimeUntilStart(startsAtUtc: string): string {
  const now = Date.now()
  const startTime = new Date(startsAtUtc).getTime()
  const diffMs = startTime - now

  if (diffMs <= 0) {
    return 'Started'
  }

  const totalMinutes = Math.floor(diffMs / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) {
    return `Starts in ${minutes}m`
  }

  if (minutes === 0) {
    return `Starts in ${hours}h`
  }

  return `Starts in ${hours}h ${minutes}m`
}

// ── Card ──────────────────────────────────────────────────────────────────────

function RaceCard({ suggestion }: { suggestion: RaceSuggestion }) {
  const accentColor = getScoreColor(suggestion.score)
  const strategyColor = STRATEGY_COLOR[suggestion.strategy]
  const strategyIcon = STRATEGY_ICON[suggestion.strategy]
  const strategyLabel = STRATEGY_LABEL[suggestion.strategy]
  const timeUntilStart = formatTimeUntilStart(suggestion.startsAtUtc)

  const trackDisplay = suggestion.trackConfig
    ? `${suggestion.trackName} — ${suggestion.trackConfig}`
    : suggestion.trackName

  return (
    <div
      className="relative rounded-lg overflow-hidden flex flex-col gap-0 w-[320px] shrink-0 p-3"
      style={{
        background: `linear-gradient(135deg, ${accentColor}18 0%, ${accentColor}06 100%)`,
        border: `1px solid ${accentColor}30`,
      }}
    >
      {/* Accent glow */}
      <div
        className="absolute top-0 left-0 w-12 h-12 rounded-full blur-xl opacity-30"
        style={{ background: accentColor }}
      />

      {/* Content */}
      <div className="relative flex flex-col gap-2.5">
        {/* Header row: Series name + score badge */}
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-lg font-bold leading-none"
            style={{ color: accentColor }}
          >
            {suggestion.seriesName}
          </span>
          <span
            className="text-xs font-semibold px-2 py-1 rounded-full leading-none shrink-0"
            style={{ color: '#fff', background: accentColor }}
          >
            {suggestion.score}
          </span>
        </div>

        {/* Track name */}
        <p className="text-sm text-[var(--text-secondary)] leading-tight">
          {trackDisplay}
        </p>

        {/* Meta row: License badge + tags + time */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="text-xs px-1.5 py-0.5 rounded leading-none shrink-0"
            style={{ color: '#fff', background: accentColor, opacity: 0.8 }}
          >
            {suggestion.license}
          </span>
          {suggestion.official && (
            <span
              className="text-xs px-1.5 py-0.5 rounded leading-none shrink-0"
              style={{ color: '#fff', background: accentColor, opacity: 0.7 }}
            >
              Official
            </span>
          )}
          {suggestion.fixed && (
            <span
              className="text-xs px-1.5 py-0.5 rounded leading-none shrink-0"
              style={{ color: '#fff', background: accentColor, opacity: 0.7 }}
            >
              Fixed
            </span>
          )}
          <span className="text-xs text-[var(--text-muted)] leading-none ml-auto">
            {timeUntilStart}
          </span>
        </div>

        {/* Strategy pill */}
        <div
          className="flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full leading-none w-fit"
          style={{ color: '#fff', background: strategyColor }}
        >
          {strategyIcon}
          {strategyLabel}
        </div>

        {/* Commentary */}
        <p className="text-sm text-[var(--text-dim)] leading-tight line-clamp-2">
          {suggestion.commentary}
        </p>
      </div>
    </div>
  )
}

// ── Export ─────────────────────────────────────────────────────────────────────

export default function NextRaceIdeas({ suggestions }: NextRaceIdeasProps) {
  if (suggestions.length === 0) return null

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2 px-0">
        <Clock size={18} className="text-[var(--text-secondary)]" />
        <h3 className="text-sm font-semibold text-[var(--text-secondary)]">
          Next Race Ideas
        </h3>
      </div>

      {/* Scrolling cards */}
      <div className="flex gap-3 overflow-x-auto">
        {suggestions.map((suggestion, i) => (
          <RaceCard key={`${suggestion.seriesName}-${suggestion.trackName}-${i}`} suggestion={suggestion} />
        ))}
      </div>
    </div>
  )
}
