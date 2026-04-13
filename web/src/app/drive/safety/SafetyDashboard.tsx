'use client'

import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Shield, Zap, AlertCircle, Target } from 'lucide-react'
import SROverviewCards from './SROverviewCards'
import CleanStreakTracker from './CleanStreakTracker'
import SRGainLeaderboard from './SRGainLeaderboard'
import IncidentPhaseChart from './IncidentPhaseChart'
import IncidentHotspots from './IncidentHotspots'
import SRProjection from './SRProjection'

interface CurrentRating {
  category: string
  iRating: number
  safetyRating: string
  license: string
}

interface RaceSession {
  id: string
  carModel: string
  manufacturer: string | null
  category: string
  trackName: string
  sessionType: string | null
  finishPosition: number | null
  incidentCount: number
  createdAt: string
  metadata: Record<string, unknown> | null
}

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

interface LapTelemetryEntry {
  id: string
  sessionId: string
  lapNumber: number
  isCleanLap: boolean | null
  incidentCount: number
  createdAt: string
}

interface SessionBehavior {
  sessionId: string
  cleanLaps: number | null
  totalLaps: number | null
  incidentsByPhase: Record<string, number> | null
  incidentLocations: unknown[] | null
}

interface SafetyDashboardProps {
  currentRatings: CurrentRating[]
  raceSessions: RaceSession[]
  ratingHistory: RatingHistoryEntry[]
  lapTelemetry: LapTelemetryEntry[]
  sessionBehaviors: SessionBehavior[]
}

export default function SafetyDashboard({
  currentRatings,
  raceSessions,
  ratingHistory,
  lapTelemetry,
  sessionBehaviors,
}: SafetyDashboardProps) {
  // Group data by category for multi-series support
  const ratingsByCategory = useMemo(() => {
    const grouped: Record<string, CurrentRating | undefined> = {}
    currentRatings.forEach((r) => {
      grouped[r.category] = r
    })
    return grouped
  }, [currentRatings])

  // Get primary category (default to 'road' if available, else first category)
  const primaryCategory = useMemo(() => {
    if (ratingsByCategory['road']) return 'road'
    return Object.keys(ratingsByCategory)[0] || 'road'
  }, [ratingsByCategory])

  const primaryRating = ratingsByCategory[primaryCategory]

  // Calculate SR trend from last 5 races
  const srTrend = useMemo(() => {
    const last5 = ratingHistory
      .filter((r) => r.category === primaryCategory)
      .slice(0, 5)
    if (last5.length < 2) return null

    const first = parseFloat(last5[last5.length - 1].safetyRating)
    const last = parseFloat(last5[0].safetyRating)
    const delta = last - first

    return {
      delta,
      percentage: first > 0 ? ((delta / first) * 100).toFixed(1) : '0',
      direction: (delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral') as 'up' | 'down' | 'neutral',
    }
  }, [ratingHistory, primaryCategory])

  const hasData = raceSessions.length > 0 || ratingHistory.length > 0

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="rounded-xl bg-[var(--bg-panel)] p-8 sm:p-12 overflow-hidden relative mb-16">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-emerald-400 to-green-400 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-tl from-cyan-400 to-teal-400 rounded-full blur-3xl" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <Shield size={40} className="text-emerald-400" />
              <h1
                className="text-4xl sm:text-5xl font-bold"
                style={{ fontFamily: 'var(--ff-display)' }}
              >
                Safety Rating
              </h1>
            </div>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl">
              Improve your iRacing Safety Rating with data-driven insights
            </p>
          </div>
        </div>

        {!hasData ? (
          // Empty state
          <div
            className="rounded-lg p-12 text-center"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
            }}
          >
            <AlertCircle size={48} className="mx-auto mb-4 text-[var(--text-muted)]" />
            <h2 className="text-xl font-semibold mb-2">No racing data yet</h2>
            <p className="text-[var(--text-dim)] mb-6">
              Import your iRacing results to get started with Safety Rating analysis.
            </p>
            <a
              href="/drive/iracing"
              className="inline-flex items-center px-6 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition-colors"
            >
              <Zap size={18} className="mr-2" />
              Import iRacing Data
            </a>
          </div>
        ) : (
          <>
            {/* Overview Cards */}
            {primaryRating && (
              <SROverviewCards
                category={primaryCategory}
                currentRating={primaryRating}
                srTrend={srTrend}
                allRatings={ratingsByCategory}
              />
            )}

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Clean Streak Tracker */}
              <CleanStreakTracker lapTelemetry={lapTelemetry} raceSessions={raceSessions} />

              {/* SR Projection */}
              <SRProjection
                currentSafetyRating={parseFloat(primaryRating?.safetyRating || '0')}
                currentLicense={primaryRating?.license || 'R'}
                ratingHistory={ratingHistory.filter((r) => r.category === primaryCategory)}
              />
            </div>

            {/* Phase-based incident analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <IncidentPhaseChart sessionBehaviors={sessionBehaviors} />

              {/* Hotspots */}
              <IncidentHotspots
                raceSessions={raceSessions}
                ratingHistory={ratingHistory.filter((r) => r.category === primaryCategory)}
              />
            </div>

            {/* SR Gain Leaderboard - full width */}
            <SRGainLeaderboard ratingHistory={ratingHistory.filter((r) => r.category === primaryCategory)} />
          </>
        )}
      </div>
    </main>
  )
}
