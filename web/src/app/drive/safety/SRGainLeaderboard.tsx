'use client'

import { useMemo, useState } from 'react'
import { TrendingUp, ChevronDown, ChevronUp } from 'lucide-react'

interface RatingHistoryEntry {
  category: string
  iRating: number
  safetyRating: string
  license: string
  prevSafetyRating: string | null
  prevIRating: number | null
  trackName: string | null
  carModel: string | null
  createdAt: string
}

interface SRGainLeaderboardProps {
  ratingHistory: RatingHistoryEntry[]
}

interface TrackCarCombo {
  track: string
  car: string
  racesCompleted: number
  avgSRGain: number
  avgIncidents: number
  maxGain: number
  minGain: number
}

type SortField = 'avgSRGain' | 'racesCompleted' | 'avgIncidents'
type SortDirection = 'asc' | 'desc'

export default function SRGainLeaderboard({ ratingHistory }: SRGainLeaderboardProps) {
  const [sortField, setSortField] = useState<SortField>('avgSRGain')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')

  const gainData = useMemo(() => {
    const combos = new Map<string, TrackCarCombo>()

    ratingHistory.forEach((entry) => {
      if (!entry.trackName || !entry.carModel) return

      const prevSR = entry.prevSafetyRating ? parseFloat(entry.prevSafetyRating) : 0
      const currentSR = parseFloat(entry.safetyRating)
      const srDelta = currentSR - prevSR

      // Skip races with no SR change or negative changes (focus on gains)
      if (srDelta <= 0) return

      const key = `${entry.trackName}|${entry.carModel}`
      const existing = combos.get(key) || {
        track: entry.trackName,
        car: entry.carModel,
        racesCompleted: 0,
        avgSRGain: 0,
        avgIncidents: 0,
        maxGain: 0,
        minGain: 0,
      }

      existing.racesCompleted += 1
      existing.maxGain = Math.max(existing.maxGain, srDelta)
      existing.minGain = Math.min(existing.minGain, srDelta)
      existing.avgSRGain = (existing.avgSRGain + srDelta) / existing.racesCompleted
      combos.set(key, existing)
    })

    return Array.from(combos.values())
  }, [ratingHistory])

  const sortedData = useMemo(() => {
    const sorted = [...gainData]
    sorted.sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]

      if (sortDir === 'desc') {
        return bVal - aVal
      } else {
        return aVal - bVal
      }
    })

    return sorted.slice(0, 10)
  }, [gainData, sortField, sortDir])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  return (
    <div
      className="rounded-xl p-6"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp size={20} className="text-emerald-500" />
        <h2 className="text-xl font-semibold">SR Gain Leaderboard</h2>
      </div>

      {gainData.length === 0 ? (
        <div className="text-center py-8 text-[var(--text-dim)]">
          <p>No SR gains yet. Complete races with positive SR changes to see data here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-3 px-4 font-medium text-[var(--text-dim)]">Track</th>
                <th className="text-left py-3 px-4 font-medium text-[var(--text-dim)]">Car</th>
                <th
                  className="text-right py-3 px-4 font-medium text-[var(--text-dim)] cursor-pointer hover:text-[var(--text-secondary)] transition-colors"
                  onClick={() => toggleSort('racesCompleted')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Races
                    {sortField === 'racesCompleted' ? (
                      sortDir === 'asc' ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )
                    ) : (
                      <span className="opacity-30">⬍</span>
                    )}
                  </div>
                </th>
                <th
                  className="text-right py-3 px-4 font-medium text-[var(--text-dim)] cursor-pointer hover:text-[var(--text-secondary)] transition-colors"
                  onClick={() => toggleSort('avgSRGain')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Avg Gain
                    {sortField === 'avgSRGain' ? (
                      sortDir === 'asc' ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )
                    ) : (
                      <span className="opacity-30">⬍</span>
                    )}
                  </div>
                </th>
                <th className="text-right py-3 px-4 font-medium text-[var(--text-dim)]">Range</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((combo, idx) => (
                <tr
                  key={`${combo.track}|${combo.car}`}
                  className="border-b border-[var(--border)] hover:bg-[var(--bg-panel)] transition-colors"
                >
                  <td className="py-3 px-4 text-[var(--text-secondary)]">{combo.track}</td>
                  <td className="py-3 px-4 text-[var(--text-secondary)]">{combo.car}</td>
                  <td className="py-3 px-4 text-right text-[var(--text-dim)]">{combo.racesCompleted}</td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-emerald-400 font-medium">+{combo.avgSRGain.toFixed(2)}</span>
                  </td>
                  <td className="py-3 px-4 text-right text-[var(--text-muted)] text-xs">
                    {combo.minGain.toFixed(2)} to +{combo.maxGain.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
