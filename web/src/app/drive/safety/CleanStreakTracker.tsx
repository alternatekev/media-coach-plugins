'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Flame, Target } from 'lucide-react'

interface LapTelemetryEntry {
  id: string
  sessionId: string
  lapNumber: number
  isCleanLap: boolean | null
  incidentCount: number
  createdAt: string
}

interface RaceSession {
  id: string
  carModel: string
  trackName: string
  createdAt: string
}

interface CleanStreakTrackerProps {
  lapTelemetry: LapTelemetryEntry[]
  raceSessions: RaceSession[]
}

export default function CleanStreakTracker({ lapTelemetry, raceSessions }: CleanStreakTrackerProps) {
  // Create a map of sessionId to session info for quick lookups
  const sessionMap = useMemo(() => {
    const map = new Map<string, RaceSession>()
    raceSessions.forEach((s) => {
      map.set(s.id, s)
    })
    return map
  }, [raceSessions])

  // Calculate current streak (most recent consecutive clean laps)
  const currentStreak = useMemo(() => {
    if (lapTelemetry.length === 0) return 0
    let streak = 0
    for (const lap of lapTelemetry) {
      if (lap.isCleanLap) {
        streak++
      } else {
        break
      }
    }
    return streak
  }, [lapTelemetry])

  // Calculate best ever streak
  const bestStreak = useMemo(() => {
    if (lapTelemetry.length === 0) return 0
    let currentCount = 0
    let maxCount = 0

    for (const lap of [...lapTelemetry].reverse()) {
      if (lap.isCleanLap) {
        currentCount++
        maxCount = Math.max(maxCount, currentCount)
      } else {
        currentCount = 0
      }
    }
    return maxCount
  }, [lapTelemetry])

  // Calculate clean lap percentage
  const cleanLapPercentage = useMemo(() => {
    if (lapTelemetry.length === 0) return 0
    const cleanCount = lapTelemetry.filter((l) => l.isCleanLap).length
    return (cleanCount / lapTelemetry.length) * 100
  }, [lapTelemetry])

  // Group clean/incident laps by session for chart
  const streakChartData = useMemo(() => {
    if (raceSessions.length === 0) return []

    return raceSessions.slice(0, 15).map((session) => {
      const sessionLaps = lapTelemetry.filter((l) => l.sessionId === session.id)
      const cleanCount = sessionLaps.filter((l) => l.isCleanLap).length
      const incidentCount = sessionLaps.length - cleanCount

      return {
        name: session.trackName.substring(0, 8),
        clean: cleanCount,
        incidents: incidentCount,
      }
    })
  }, [raceSessions, lapTelemetry])

  return (
    <div
      className="rounded-xl p-6"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center gap-2 mb-6">
        <Flame size={20} className="text-orange-400" />
        <h2 className="text-xl font-semibold">Clean Lap Streak Tracker</h2>
      </div>

      {lapTelemetry.length === 0 ? (
        <div className="text-center py-8 text-[var(--text-dim)]">
          <Target size={32} className="mx-auto mb-2 opacity-50" />
          <p>No lap data yet. Complete a race to track your clean streak.</p>
        </div>
      ) : (
        <>
          {/* Streak Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-400 mb-1">{currentStreak}</div>
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Current Streak</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-400 mb-1">{bestStreak}</div>
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Best Streak</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-400 mb-1">{cleanLapPercentage.toFixed(0)}%</div>
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Clean Laps</div>
            </div>
          </div>

          {/* Mini Chart */}
          {streakChartData.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[var(--text-dim)] mb-3">Clean vs Incident Laps by Session</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={streakChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-dim)' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--text-dim)' }} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <Bar dataKey="clean" stackId="laps" fill="#10b981" />
                  <Bar dataKey="incidents" stackId="laps" fill="#f87171" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}
