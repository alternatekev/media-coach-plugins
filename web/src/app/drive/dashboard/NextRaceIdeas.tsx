'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Clock, Target, AlertTriangle, Flame, Shield, Zap, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import { resolveIRacingTrackId } from '@/data/iracing-track-map'
import { useElectron } from '@/hooks/useElectron'
import type { BrandInfo } from '@/types/brand'

// ── Types ─────────────────────────────────────────────────────────────────────

export type StrategyType = 'pitlane' | 'conservative' | 'careful' | 'form' | 'steady'

export interface RaceSuggestion {
  seriesName: string
  trackName: string
  trackConfig?: string
  category: string
  license: string
  official: boolean
  fixed: boolean
  score: number
  strategy: StrategyType
  commentary: string
  startsAtUtc: string
  carClassNames?: string[]
  seasonId?: number
  seriesId?: number
}

export interface RaceLookups {
  trackMapLookup: Record<string, string>
  trackLogoLookup: Record<string, string>
  trackImageLookup: Record<string, string | null>
  trackDisplayNameLookup: Record<string, string>
  carImageLookup: Record<string, string | null>
  brandLogoLookup: Record<string, BrandInfo>
}

interface NextRaceIdeasProps {
  suggestions: RaceSuggestion[]
  lookups: RaceLookups
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CAT_LABEL: Record<string, string> = {
  road: 'Road',
  formula: 'Formula',
  oval: 'Oval',
  dirt_road: 'Dirt Road',
  dirt_oval: 'Dirt Oval',
}

const CAT_COLOR: Record<string, string> = {
  road: '#e53935',
  formula: '#00bcd4',
  oval: '#1e88e5',
  dirt_road: '#43a047',
  dirt_oval: '#ff9800',
}

const SCORE_COLOR: Record<string, string> = {
  high: '#43a047',
  lime: '#7cb342',
  amber: '#ffb300',
  orange: '#ff7043',
}

function getScoreColor(score: number): string {
  if (score >= 80) return SCORE_COLOR.high
  if (score >= 60) return SCORE_COLOR.lime
  if (score >= 40) return SCORE_COLOR.amber
  return SCORE_COLOR.orange
}

const STRATEGY_COLOR: Record<StrategyType, string> = {
  pitlane: '#e53935',
  conservative: '#ffb300',
  careful: '#ff9800',
  form: '#43a047',
  steady: '#78909c',
}

const STRATEGY_ICON: Record<StrategyType, React.ReactNode> = {
  pitlane: <Shield size={12} />,
  conservative: <Target size={12} />,
  careful: <AlertTriangle size={12} />,
  form: <Flame size={12} />,
  steady: <Zap size={12} />,
}

const STRATEGY_LABEL: Record<StrategyType, string> = {
  pitlane: 'Pitlane',
  conservative: 'Conservative',
  careful: 'Careful',
  form: 'On Form',
  steady: 'Steady',
}

// ── Time formatting ───────────────────────────────────────────────────────────

function formatTimeUntilStart(startsAtUtc: string): string {
  const now = Date.now()
  const startTime = new Date(startsAtUtc).getTime()
  const diffMs = startTime - now

  if (diffMs <= 0) return 'Started'

  const totalMinutes = Math.floor(diffMs / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

// ── Lookup helpers ────────────────────────────────────────────────────────────

function trackKeys(trackName: string, configName?: string): string[] {
  const keys = [trackName.toLowerCase()]
  const resolved = resolveIRacingTrackId(trackName, configName)
  if (resolved && resolved !== trackName.toLowerCase()) {
    keys.push(resolved)
  }
  return keys
}

function lookupTrackMap(lookups: RaceLookups, trackName: string, trackConfig?: string): string | null {
  for (const key of trackKeys(trackName, trackConfig ?? undefined)) {
    if (lookups.trackMapLookup[key]) return lookups.trackMapLookup[key]
  }
  return null
}

function lookupTrackLogo(lookups: RaceLookups, trackName: string, trackConfig?: string): string | null {
  for (const key of trackKeys(trackName, trackConfig ?? undefined)) {
    if (lookups.trackLogoLookup[key]) return lookups.trackLogoLookup[key]
  }
  return null
}

function lookupTrackDisplayName(lookups: RaceLookups, trackName: string, trackConfig?: string): string | null {
  for (const key of trackKeys(trackName, trackConfig ?? undefined)) {
    if (lookups.trackDisplayNameLookup[key]) return lookups.trackDisplayNameLookup[key]
  }
  return null
}

function lookupTrackImage(lookups: RaceLookups, trackName: string, trackConfig?: string): string | null {
  if (lookups.trackImageLookup[trackName]) return lookups.trackImageLookup[trackName]
  for (const key of trackKeys(trackName, trackConfig ?? undefined)) {
    if (lookups.trackImageLookup[key]) return lookups.trackImageLookup[key]
  }
  return null
}

function lookupCarImage(lookups: RaceLookups, carClassNames: string[]): string | null {
  for (const name of carClassNames) {
    const img = lookups.carImageLookup[name]
    if (img) return img
  }
  return null
}

function lookupAllBrands(lookups: RaceLookups, carClassNames: string[]): BrandInfo[] {
  const brands: BrandInfo[] = []
  const seen = new Set<string>()
  for (const name of carClassNames) {
    const brand = lookups.brandLogoLookup[name]
    if (brand && !seen.has(brand.manufacturerName)) {
      seen.add(brand.manufacturerName)
      brands.push(brand)
    }
  }
  return brands
}

// ── Compact suggestion card (used in list view per category) ─────────────────

function SuggestionCard({
  suggestion,
  lookups,
  showRegister,
}: {
  suggestion: RaceSuggestion
  lookups: RaceLookups
  showRegister: boolean
}) {
  const accentColor = getScoreColor(suggestion.score)
  const strategyColor = STRATEGY_COLOR[suggestion.strategy]
  const strategyIcon = STRATEGY_ICON[suggestion.strategy]
  const strategyLabel = STRATEGY_LABEL[suggestion.strategy]
  const timeUntilStart = formatTimeUntilStart(suggestion.startsAtUtc)
  const carClassNames = suggestion.carClassNames ?? []

  const trackSvgPath = lookupTrackMap(lookups, suggestion.trackName, suggestion.trackConfig)
  const trackLogoSvg = lookupTrackLogo(lookups, suggestion.trackName, suggestion.trackConfig)
  const trackDisplayName = lookupTrackDisplayName(lookups, suggestion.trackName, suggestion.trackConfig)
  const trackImage = lookupTrackImage(lookups, suggestion.trackName, suggestion.trackConfig)
  const carImage = lookupCarImage(lookups, carClassNames)
  const allBrands = lookupAllBrands(lookups, carClassNames)

  const trackDisplay = suggestion.trackConfig
    ? `${trackDisplayName || suggestion.trackName} — ${suggestion.trackConfig}`
    : (trackDisplayName || suggestion.trackName)

  const suggestionHref = `/drive/suggestion?track=${encodeURIComponent(suggestion.trackName)}${suggestion.seriesName ? `&series=${encodeURIComponent(suggestion.seriesName)}` : ''}${carClassNames.length > 0 ? `&cars=${encodeURIComponent(carClassNames.join(','))}` : ''}`

  return (
    <Link
      href={suggestionHref}
      className="relative rounded-lg overflow-hidden bg-[var(--bg-elevated)] border border-[var(--border)] hover:border-[var(--border-accent)] transition-colors flex flex-col cursor-pointer"
    >
      {/* ── Image header ──────────────────────────────────────────────── */}
      <div className="relative h-28 bg-[var(--bg-panel)] overflow-hidden flex-shrink-0">
        {trackImage && (
          <img
            src={trackImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none"
          />
        )}
        {!trackImage && carImage && (
          <img
            src={carImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
          />
        )}
        {trackSvgPath && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg viewBox="0 0 100 100" className="w-3/4 h-3/4" preserveAspectRatio="xMidYMid meet">
              <path
                d={trackSvgPath}
                fill="none"
                stroke="var(--border-accent)"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-12 pointer-events-none card-header-gradient" />

        {/* Time chip */}
        <div
          className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1"
          style={{
            background: `${accentColor}cc`,
            borderRadius: 'var(--corner-r-sm)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <Clock size={11} color="#fff" />
          <span className="text-xs font-bold leading-none text-white tracking-wide">
            {timeUntilStart}
          </span>
        </div>

        {/* Score chip */}
        <div
          className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full"
          style={{ background: 'var(--bg-panel-overlay)', border: '1px solid var(--border-subtle)', backdropFilter: 'blur(6px)' }}
        >
          <span className="text-[10px] font-medium leading-none text-white/60">Match</span>
          <span className="text-xs font-bold leading-none" style={{ color: accentColor }}>
            {suggestion.score}
          </span>
        </div>

        {/* Brand chips */}
        {allBrands.length > 0 && (
          <div className="absolute bottom-0 left-0 m-2 flex items-center gap-1">
            {allBrands.map((brand) => {
              const color = brand.brandColorHex
              const src = brand.logoSvg
                ? `data:image/svg+xml,${encodeURIComponent(brand.logoSvg)}`
                : brand.logoPng
                  ? `data:image/png;base64,${brand.logoPng}`
                  : null
              return (
                <div
                  key={brand.manufacturerName}
                  className="brand-chip flex items-center gap-1 px-1.5 py-1"
                  style={{
                    background: color ? `${color}55` : 'var(--bg-panel-overlay)',
                    border: `1px solid ${color ? `${color}99` : 'var(--border-subtle)'}`,
                    backdropFilter: 'blur(6px)',
                    borderRadius: 'var(--corner-r-sm)',
                  } as React.CSSProperties}
                >
                  {src ? (
                    <img src={src} alt={brand.manufacturerName} className="h-5 w-auto object-contain flex-shrink-0" />
                  ) : color ? (
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Card body ─────────────────────────────────────────────────── */}
      <div className="p-3 flex flex-col gap-2">
        {/* Track name */}
        <div className="flex items-start gap-1.5 min-w-0">
          {trackLogoSvg && (
            <img
              src={`data:image/svg+xml,${encodeURIComponent(trackLogoSvg)}`}
              alt=""
              className="w-4 h-4 flex-shrink-0 mt-0.5"
            />
          )}
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-[var(--text)] truncate leading-tight" style={{ fontFamily: 'var(--ff-display)' }}>
              {trackDisplay}
            </h4>
            <p className="text-xs text-[var(--text-dim)] truncate">
              {suggestion.seriesName}
            </p>
          </div>
        </div>

        {/* Meta: license + tags */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="text-[10px] px-1.5 py-0.5 rounded leading-none font-semibold"
            style={{ color: '#fff', background: accentColor, opacity: 0.8 }}
          >
            {suggestion.license}
          </span>
          {suggestion.official && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded leading-none"
              style={{ color: '#fff', background: accentColor, opacity: 0.6 }}
            >
              Official
            </span>
          )}
          {suggestion.fixed && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded leading-none"
              style={{ color: '#fff', background: accentColor, opacity: 0.6 }}
            >
              Fixed
            </span>
          )}
        </div>

        {/* Strategy */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full leading-none shrink-0"
            style={{ color: '#fff', background: strategyColor }}
          >
            {strategyIcon}
            {strategyLabel}
          </div>
          <p className="text-[11px] text-[var(--text-muted)] leading-snug line-clamp-2 min-w-0">
            {suggestion.commentary}
          </p>
        </div>

        {/* Register button */}
        {showRegister && suggestion.seasonId && (
          <a
            href={`https://members.iracing.com/membersite/member/SeriesSchedule.do?season=${suggestion.seasonId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all hover:brightness-110"
            style={{ background: accentColor, color: '#fff' }}
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={12} />
            Register &amp; Join
          </a>
        )}
      </div>
    </Link>
  )
}

// ── Paginated Category Column ─────────────────────────────────────────────────

function CategoryColumn({
  category,
  items,
  lookups,
  showRegister,
}: {
  category: string
  items: RaceSuggestion[]
  lookups: RaceLookups
  showRegister: boolean
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const current = items[activeIndex]
  const hasPrev = activeIndex > 0
  const hasNext = activeIndex < items.length - 1

  return (
    <div className="flex flex-col gap-2">
      {/* Column header */}
      <div className="flex items-center gap-2 pb-1 border-b" style={{ borderColor: CAT_COLOR[category] || 'var(--border)' }}>
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: CAT_COLOR[category] || '#888' }}
        />
        <span
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: CAT_COLOR[category] || 'var(--text-secondary)' }}
        >
          {CAT_LABEL[category] || category}
        </span>
      </div>

      {/* Active card */}
      <SuggestionCard
        suggestion={current}
        lookups={lookups}
        showRegister={showRegister}
      />

      {/* Pagination */}
      {items.length > 1 && (
        <div className="flex items-center justify-between">
          {/* Page dots */}
          <div className="flex items-center gap-1">
            {items.map((s, i) => (
              <button
                key={`${s.seriesId ?? s.seriesName}-${i}`}
                onClick={() => setActiveIndex(i)}
                className="rounded-full transition-all duration-200"
                style={{
                  width: i === activeIndex ? 16 : 5,
                  height: 5,
                  background: i === activeIndex
                    ? (CAT_COLOR[category] || getScoreColor(s.score))
                    : 'var(--border)',
                }}
                aria-label={`Show suggestion ${i + 1}: ${s.seriesName}`}
              />
            ))}
          </div>

          {/* Prev / Next */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setActiveIndex(i => Math.max(0, i - 1))}
              disabled={!hasPrev}
              className="p-0.5 rounded transition-colors"
              style={{
                color: hasPrev ? 'var(--text-secondary)' : 'var(--text-muted)',
                opacity: hasPrev ? 1 : 0.4,
              }}
              aria-label="Previous suggestion"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-[10px] text-[var(--text-muted)] tabular-nums">
              {activeIndex + 1}/{items.length}
            </span>
            <button
              onClick={() => setActiveIndex(i => Math.min(items.length - 1, i + 1))}
              disabled={!hasNext}
              className="p-0.5 rounded transition-colors"
              style={{
                color: hasNext ? 'var(--text-secondary)' : 'var(--text-muted)',
                opacity: hasNext ? 1 : 0.4,
              }}
              aria-label="Next suggestion"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Export ─────────────────────────────────────────────────────────────────────

// Preferred category display order
const CAT_ORDER = ['road', 'formula', 'oval', 'dirt_road', 'dirt_oval']

export default function NextRaceIdeas({ suggestions, lookups }: NextRaceIdeasProps) {
  const { isElectron, isWindows } = useElectron()
  const showRegister = isElectron && isWindows

  // Group suggestions by category
  const columns = useMemo(() => {
    const byCategory = new Map<string, RaceSuggestion[]>()
    for (const s of suggestions) {
      const cat = s.category || 'road'
      if (!byCategory.has(cat)) byCategory.set(cat, [])
      byCategory.get(cat)!.push(s)
    }
    // Return in preferred order
    return CAT_ORDER
      .filter(cat => byCategory.has(cat))
      .map(cat => ({ category: cat, items: byCategory.get(cat)! }))
  }, [suggestions])

  if (columns.length === 0) return null

  return (
    <section className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <Clock size={16} className="text-[var(--text-secondary)]" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-[var(--text-secondary)]" style={{ fontFamily: 'var(--ff-display)' }}>
          Next Race Ideas
        </h2>
      </div>

      {/* Category columns — each with its own pagination */}
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
        }}
      >
        {columns.map(({ category, items }) => (
          <CategoryColumn
            key={category}
            category={category}
            items={items}
            lookups={lookups}
            showRegister={showRegister}
          />
        ))}
      </div>
    </section>
  )
}
