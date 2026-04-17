'use client'

import { TrendingUp, TrendingDown, Shield } from 'lucide-react'

interface CurrentRating {
  category: string
  iRating: number
  safetyRating: string
  license: string
}

interface SRTrend {
  delta: number
  percentage: string
  direction: 'up' | 'down' | 'neutral'
}

const CATEGORY_LABELS: Record<string, string> = {
  road: 'Sports Car',
  oval: 'Oval',
  dirt_road: 'Dirt Road',
  dirt_oval: 'Dirt Oval',
}

const LICENSE_LEVELS: Record<string, { label: string; order: number }> = {
  R: { label: 'Rookie', order: 0 },
  D: { label: 'D Class', order: 1 },
  C: { label: 'C Class', order: 2 },
  B: { label: 'B Class', order: 3 },
  A: { label: 'A Class', order: 4 },
  P: { label: 'Pro', order: 5 },
}

interface SROverviewCardsProps {
  category: string
  currentRating: CurrentRating
  srTrend: SRTrend | null
  allRatings: Record<string, CurrentRating | undefined>
}

export default function SROverviewCards({
  category,
  currentRating,
  srTrend,
  allRatings,
}: SROverviewCardsProps) {
  const srValue = parseFloat(currentRating.safetyRating)
  const licenseInfo = LICENSE_LEVELS[currentRating.license] || { label: currentRating.license, order: -1 }

  return (
    <div className="mb-8">
      {/* Primary SR Card */}
      <div
        className="rounded-xl p-8 mb-6"
        style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-[var(--text-dim)] mb-1">Current {CATEGORY_LABELS[category] || category} Safety Rating</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-emerald-400">{srValue.toFixed(2)}</span>
              <span className="text-xl text-[var(--text-dim)]">{licenseInfo.label}</span>
            </div>
          </div>
          <Shield size={40} className="text-emerald-500 opacity-60" />
        </div>

        {srTrend && (
          <div
            className={`flex items-center gap-2 text-sm ${
              srTrend.direction === 'up'
                ? 'text-emerald-400'
                : srTrend.direction === 'down'
                  ? 'text-rose-400'
                  : 'text-[var(--text-dim)]'
            }`}
          >
            {srTrend.direction === 'up' ? (
              <TrendingUp size={16} />
            ) : srTrend.direction === 'down' ? (
              <TrendingDown size={16} />
            ) : null}
            <span>
              {srTrend.direction !== 'neutral' && (srTrend.delta > 0 ? '+' : '')}
              {srTrend.delta.toFixed(2)} ({srTrend.percentage}%) from last 5 races
            </span>
          </div>
        )}
      </div>

      {/* Category Pills */}
      {Object.keys(allRatings).length > 1 && (
        <div className="flex flex-wrap gap-3">
          {Object.entries(allRatings)
            .filter(([, r]) => r)
            .map(([cat, rating]) => (
              <div
                key={cat}
                className="px-4 py-2 rounded-full text-sm"
                style={{
                  background: cat === category ? 'var(--bg-elevated)' : 'transparent',
                  border: `1px solid ${cat === category ? 'var(--border-active)' : 'var(--border)'}`,
                  color: cat === category ? 'var(--text-primary)' : 'var(--text-dim)',
                }}
              >
                <span className="font-medium">{CATEGORY_LABELS[cat] || cat}</span>
                {rating && (
                  <span className="ml-2 text-[var(--text-muted)]">
                    {parseFloat(rating.safetyRating).toFixed(2)} • {rating.license}
                  </span>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
