'use client'

import { useMemo } from 'react'
import { Target } from 'lucide-react'

interface RatingHistoryEntry {
  category: string
  iRating: number
  safetyRating: string
  license: string
  prevSafetyRating: string | null
  createdAt: string
}

interface SRProjectionProps {
  currentSafetyRating: number
  currentLicense: string
  ratingHistory: RatingHistoryEntry[]
}

// License thresholds for iRacing
const LICENSE_THRESHOLDS: Record<string, { sr: number; nextLicense: string }> = {
  R: { sr: 2.0, nextLicense: 'D' },
  D: { sr: 3.0, nextLicense: 'C' },
  C: { sr: 4.0, nextLicense: 'B' },
  B: { sr: 4.5, nextLicense: 'A' },
  A: { sr: 5.0, nextLicense: 'Pro' },
  P: { sr: 5.0, nextLicense: 'Pro' }, // Max level
}

export default function SRProjection({
  currentSafetyRating,
  currentLicense,
  ratingHistory,
}: SRProjectionProps) {
  const projection = useMemo(() => {
    const threshold = LICENSE_THRESHOLDS[currentLicense]
    if (!threshold || currentLicense === 'P') {
      return {
        nextLicense: 'Max',
        srNeeded: 0,
        avgGainPerRace: 0,
        racesNeeded: 0,
      }
    }

    // Calculate average SR gain per race
    let totalGain = 0
    let raceCount = 0

    ratingHistory.forEach((entry) => {
      if (entry.prevSafetyRating) {
        const delta = parseFloat(entry.safetyRating) - parseFloat(entry.prevSafetyRating)
        if (delta > 0) {
          totalGain += delta
          raceCount += 1
        }
      }
    })

    const avgGainPerRace = raceCount > 0 ? totalGain / raceCount : 0.1 // Default 0.1 if no positive races
    const srNeeded = Math.max(0, threshold.sr - currentSafetyRating)
    const racesNeeded = avgGainPerRace > 0 ? Math.ceil(srNeeded / avgGainPerRace) : 999

    return {
      nextLicense: threshold.nextLicense,
      srNeeded,
      avgGainPerRace,
      racesNeeded: Math.min(racesNeeded, 999),
    }
  }, [currentSafetyRating, currentLicense, ratingHistory])

  const progress = useMemo(() => {
    const threshold = LICENSE_THRESHOLDS[currentLicense]
    if (!threshold) return 100

    const currentRange = currentSafetyRating - (currentLicense === 'R' ? 0 : 0.5)
    const targetRange = threshold.sr - (currentLicense === 'R' ? 0 : 0.5)
    const percent = Math.max(0, Math.min(100, (currentRange / targetRange) * 100))
    return percent
  }, [currentSafetyRating, currentLicense])

  return (
    <div
      className="rounded-xl p-6"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center gap-2 mb-6">
        <Target size={20} className="text-cyan-500" />
        <h2 className="text-xl font-semibold">License Projection</h2>
      </div>

      {currentLicense === 'P' ? (
        <div className="text-center py-8 text-[var(--text-dim)]">
          <p className="mb-2 text-lg font-medium text-emerald-400">You've reached Pro!</p>
          <p>Maintain your SR above 5.0 to keep your Pro status.</p>
        </div>
      ) : (
        <>
          {/* Next License Target */}
          <div className="mb-6">
            <div className="flex items-end justify-between mb-2">
              <div>
                <p className="text-sm text-[var(--text-dim)] mb-1">Next License Level</p>
                <p className="text-2xl font-bold text-cyan-400">{projection.nextLicense}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-[var(--text-dim)] mb-1">Current SR</p>
                <p className="text-2xl font-bold text-[var(--text-secondary)]">{currentSafetyRating.toFixed(2)}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-[var(--bg-panel)] rounded-full h-3 overflow-hidden mb-2">
              <div
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Target Value */}
            <p className="text-xs text-[var(--text-muted)] text-right">
              Target: {LICENSE_THRESHOLDS[currentLicense]?.sr || 0} SR
            </p>
          </div>

          {/* Projection Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-cyan-400 mb-1">
                {projection.srNeeded.toFixed(2)}
              </div>
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide">SR Needed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-cyan-400 mb-1">
                {projection.avgGainPerRace.toFixed(2)}
              </div>
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Avg Gain/Race</div>
            </div>
          </div>

          {/* Races Needed */}
          <div className="mt-6 p-4 rounded-lg bg-[var(--bg-panel)] text-center">
            <p className="text-sm text-[var(--text-dim)] mb-2">
              {projection.racesNeeded >= 999
                ? 'No recent SR gains to project'
                : `At your current pace, approximately `}
            </p>
            {projection.racesNeeded < 999 && (
              <p className="text-xl font-bold text-emerald-400">
                {projection.racesNeeded} clean {projection.racesNeeded === 1 ? 'race' : 'races'}
              </p>
            )}
            {projection.racesNeeded < 999 && (
              <p className="text-xs text-[var(--text-muted)] mt-2">to reach {projection.nextLicense} class</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
