'use client'

import { useMemo } from 'react'
import { AlertTriangle, Lightbulb } from 'lucide-react'

interface RaceSession {
  id: string
  carModel: string
  manufacturer: string | null
  trackName: string | null
  finishPosition: number | null
  incidentCount: number | null
  sessionType: string | null
  category: string
  metadata: Record<string, any> | null
  createdAt: Date
}

interface SessionWithBehavior extends RaceSession {
  behavior?: {
    id: string
    incidentLocations: Array<{
      trackPosition: number
      lapNumber: number
      type: string
      points: number
    }> | null
  }
}

interface DetectedPattern {
  trackPosition: number
  count: number
  lapNumbers: number[]
  percentage: number
}

export default function PatternDetection({
  trackName,
  allSessions,
  currentSession,
}: {
  trackName: string
  allSessions: SessionWithBehavior[]
  currentSession: RaceSession
}) {
  const { patterns, hasPatterns } = useMemo(() => {
    const incidentMap = new Map<number, { laps: number[]; count: number }>()

    // Collect all incident locations from all sessions at this track
    allSessions.forEach((session) => {
      if (
        session.behavior?.incidentLocations &&
        Array.isArray(session.behavior.incidentLocations)
      ) {
        session.behavior.incidentLocations.forEach((incident) => {
          // Round to nearest 5% for grouping
          const bucketedPosition = Math.round(incident.trackPosition * 20) / 20

          if (!incidentMap.has(bucketedPosition)) {
            incidentMap.set(bucketedPosition, { laps: [], count: 0 })
          }

          const entry = incidentMap.get(bucketedPosition)!
          entry.count++
          entry.laps.push(incident.lapNumber)
        })
      }
    })

    // Convert to patterns array and filter for repeating locations
    const patterns: DetectedPattern[] = Array.from(incidentMap.entries())
      .filter(([_, data]) => data.count >= 2) // Only show if incident repeated 2+ times
      .map(([position, data]) => ({
        trackPosition: position,
        count: data.count,
        lapNumbers: data.laps.slice(0, 5), // Keep first 5 for display
        percentage: Math.round(position * 100),
      }))
      .sort((a, b) => b.count - a.count)

    return { patterns, hasPatterns: patterns.length > 0 }
  }, [allSessions])

  if (!hasPatterns) {
    return (
      <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb size={20} className="text-emerald-400" />
          <h2 className="text-lg font-semibold text-[var(--text-secondary)]">
            Pattern Detection
          </h2>
        </div>

        <div className="bg-[var(--bg-panel)] rounded-lg p-4 text-center">
          <p className="text-sm text-[var(--text-dim)]">
            No recurring incident patterns detected at {trackName}. Keep up the
            consistency!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={20} className="text-amber-400" />
        <h2 className="text-lg font-semibold text-[var(--text-secondary)]">
          Recurring Incident Locations
        </h2>
      </div>

      {/* Pattern List */}
      <div className="space-y-3">
        {patterns.map((pattern, idx) => (
          <div
            key={idx}
            className="bg-[var(--bg-panel)] rounded-lg p-4 border border-[var(--border)]"
          >
            {/* Top: Position + Count */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-[var(--text-secondary)]">
                  ~{pattern.percentage}% Around Track
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {pattern.trackPosition.toFixed(2)} track position
                </p>
              </div>

              <div className="text-right">
                <p className="text-2xl font-bold text-amber-400">
                  {pattern.count}x
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  in last {allSessions.length} races
                </p>
              </div>
            </div>

            {/* Lap breakdown */}
            <div className="mt-3 pt-3 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--text-dim)] font-medium mb-1.5">
                Occurred on laps:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {pattern.lapNumbers.map((lap, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300"
                  >
                    L{lap}
                  </span>
                ))}
                {pattern.lapNumbers.length < pattern.count && (
                  <span className="text-xs text-[var(--text-muted)]">
                    +{pattern.count - pattern.lapNumbers.length} more
                  </span>
                )}
              </div>
            </div>

            {/* Advice */}
            <div className="mt-3 pt-3 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--text-dim)]">
                Focus on your approach at this section. Consider: brake point
                consistency, line selection, or traffic management in this area.
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-[var(--border)]">
        <p className="text-xs text-[var(--text-dim)]">
          <span className="font-semibold text-[var(--text-secondary)]">Tip:</span> These
          recurring locations suggest areas where you can focus improvement
          efforts. Reviewing onboard footage of laps from this area might reveal
          technique adjustments.
        </p>
      </div>
    </div>
  )
}
