'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
} from 'recharts'
import { TrendingUp, TrendingDown, Zap, Heart } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

type SessionWithBehavior = {
  id: string
  createdAt: Date
  incidentCount: number
  metadata: {
    preRaceSR?: number
    postRaceSR?: number
    preRaceIRating?: number
    postRaceIRating?: number
    completedLaps?: number
    startedAt?: string
    seriesName?: string
  }
  behavior: {
    avgRageScore: number
    rageSpikes: number
    cooldownsTriggered: number
    cleanLaps: number
    totalLaps: number
    closePassCount: number
    offTrackCount: number
    tailgatingSeconds: number
    retaliationAttempts: number
    totalRageRecoverySeconds: number
  }
  trackName?: string | null
}

type Props = {
  sessions: SessionWithBehavior[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getComposureScore(rageScore: number): number {
  // Invert rage score to composure: 100 - rageScore
  return Math.max(0, Math.min(100, 100 - rageScore))
}

function getComposureColor(score: number): string {
  if (score >= 70) return '#10b981' // green
  if (score >= 40) return '#f59e0b' // amber
  return '#f43f5e' // red
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const minutes = Math.round(seconds / 60)
  return `${minutes}m`
}

// ── Component ────────────────────────────────────────────────────────────────

export function ComposureTrendsClient({ sessions }: Props) {
  // Sort chronologically (oldest first for charts)
  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    [sessions]
  )

  // Build composure score chart data
  const composureChartData = useMemo(() => {
    return sortedSessions.map((s, idx) => ({
      name: `R${idx + 1}`,
      composure: getComposureScore(s.behavior.avgRageScore),
      srDelta: (s.metadata.postRaceSR ?? 0) - (s.metadata.preRaceSR ?? 0),
      rageScore: s.behavior.avgRageScore,
      trackName: s.trackName,
    }))
  }, [sortedSessions])

  // Build rage spikes chart data
  const rageSpikeChartData = useMemo(() => {
    return sortedSessions.map((s, idx) => ({
      name: `R${idx + 1}`,
      spikes: s.behavior.rageSpikes,
      cooldowns: s.behavior.cooldownsTriggered,
      trackName: s.trackName,
    }))
  }, [sortedSessions])

  // Build scatter plot data
  const scatterData = useMemo(() => {
    return sortedSessions.map(s => ({
      composure: getComposureScore(s.behavior.avgRageScore),
      srDelta: (s.metadata.postRaceSR ?? 0) - (s.metadata.preRaceSR ?? 0),
      name: s.trackName || 'Unknown',
    }))
  }, [sortedSessions])

  // Build behavioral trends
  const behavioralChartData = useMemo(() => {
    return sortedSessions.map((s, idx) => {
      const cleanLapPercent = s.behavior.totalLaps > 0
        ? (s.behavior.cleanLaps / s.behavior.totalLaps) * 100
        : 0

      return {
        name: `R${idx + 1}`,
        closePasses: s.behavior.closePassCount,
        offTracks: s.behavior.offTrackCount,
        tailgatingMin: s.behavior.tailgatingSeconds / 60,
        cleanLapPercent,
        trackName: s.trackName,
      }
    })
  }, [sortedSessions])

  // Calculate insights
  const insights = useMemo(() => {
    if (sortedSessions.length === 0) return null

    // Overall composure trend
    const composureScores = sortedSessions.map(s =>
      getComposureScore(s.behavior.avgRageScore)
    )
    const firstHalf = composureScores.slice(0, Math.floor(composureScores.length / 2))
    const secondHalf = composureScores.slice(Math.floor(composureScores.length / 2))

    const avgFirstHalf = firstHalf.length > 0
      ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
      : 0
    const avgSecondHalf = secondHalf.length > 0
      ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
      : 0

    const composureTrend = avgSecondHalf - avgFirstHalf

    // SR correlation: sessions with high composure vs SR delta
    const highComposureSessions = sortedSessions.filter(
      s => getComposureScore(s.behavior.avgRageScore) > 70
    )
    const lowComposureSessions = sortedSessions.filter(
      s => getComposureScore(s.behavior.avgRageScore) <= 70
    )

    const highComposureAvgSRDelta = highComposureSessions.length > 0
      ? highComposureSessions.reduce(
          (sum, s) => sum + ((s.metadata.postRaceSR ?? 0) - (s.metadata.preRaceSR ?? 0)),
          0
        ) / highComposureSessions.length
      : 0

    const lowComposureAvgSRDelta = lowComposureSessions.length > 0
      ? lowComposureSessions.reduce(
          (sum, s) => sum + ((s.metadata.postRaceSR ?? 0) - (s.metadata.preRaceSR ?? 0)),
          0
        ) / lowComposureSessions.length
      : 0

    // Retaliation rate
    const totalRetaliation = sortedSessions.reduce(
      (sum, s) => sum + s.behavior.retaliationAttempts,
      0
    )
    const totalIncidents = sortedSessions.reduce((sum, s) => sum + s.incidentCount, 0)
    const retaliationRate = totalIncidents > 0 ? (totalRetaliation / totalIncidents) * 100 : 0

    // Avg recovery time
    const totalRecoveryTime = sortedSessions.reduce(
      (sum, s) => sum + s.behavior.totalRageRecoverySeconds,
      0
    )
    const avgRecoveryTime = sortedSessions.length > 0 ? totalRecoveryTime / sortedSessions.length : 0

    // Cooldown effectiveness
    const totalCooldowns = sortedSessions.reduce((sum, s) => sum + s.behavior.cooldownsTriggered, 0)
    const totalSpikes = sortedSessions.reduce((sum, s) => sum + s.behavior.rageSpikes, 0)
    const cooldownEffectiveness = totalSpikes > 0 ? (totalCooldowns / totalSpikes) * 100 : 0

    return {
      composureTrend,
      composureTrendDirection: composureTrend > 0 ? 'up' : composureTrend < 0 ? 'down' : 'stable',
      highComposureAvgSRDelta,
      lowComposureAvgSRDelta,
      srDeltaMultiplier: lowComposureAvgSRDelta !== 0
        ? Math.abs(highComposureAvgSRDelta / lowComposureAvgSRDelta)
        : 1,
      retaliationRate,
      avgRecoveryTime,
      cooldownEffectiveness,
      totalRaces: sortedSessions.length,
    }
  }, [sortedSessions])

  if (sortedSessions.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-12 text-center">
        <Heart size={40} className="mx-auto text-[var(--text-muted)] mb-4" />
        <p className="text-lg font-semibold text-[var(--text)]">No Composure Data Yet</p>
        <p className="text-sm text-[var(--text-dim)] mt-2">
          Complete some races to see your composure trends and behavioral analytics
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Hero Header */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[var(--border-accent)] to-transparent rounded-full blur-3xl"></div>
        </div>
        <div className="relative z-10">
          <div className="flex items-start gap-4 mb-4">
            <div className="rounded-lg p-3 bg-[var(--bg-elevated)] border border-[var(--border)]">
              <Heart size={24} className="text-[var(--border-accent)]" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-[var(--text)] mb-2" style={{ fontFamily: 'var(--ff-display)' }}>
                Composure Trends
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Analyze your emotional control and composure patterns across {insights?.totalRaces} {insights?.totalRaces === 1 ? 'race' : 'races'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Insights Cards */}
      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider" style={{ fontFamily: 'var(--ff-display)' }}>
              Composure Trend
            </p>
            <p className="text-xl font-bold text-[var(--text)] mt-3" style={{ fontFamily: 'var(--ff-mono)' }}>
              {Math.abs(insights.composureTrend).toFixed(1)}%
            </p>
            <p className="text-xs text-[var(--text-dim)] mt-2 flex items-center gap-2">
              {insights.composureTrendDirection === 'up' && (
                <>
                  <TrendingUp size={14} className="text-emerald-500" />
                  Improving
                </>
              )}
              {insights.composureTrendDirection === 'down' && (
                <>
                  <TrendingDown size={14} className="text-rose-500" />
                  Declining
                </>
              )}
              {insights.composureTrendDirection === 'stable' && (
                <>
                  <Heart size={14} className="text-[var(--border-accent)]" />
                  Steady
                </>
              )}
            </p>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider" style={{ fontFamily: 'var(--ff-display)' }}>
              SR Correlation
            </p>
            <p className="text-xl font-bold text-[var(--text)] mt-3" style={{ fontFamily: 'var(--ff-mono)' }}>
              {insights.srDeltaMultiplier.toFixed(1)}x
            </p>
            <p className="text-xs text-[var(--text-dim)] mt-2">
              Better SR at composure &gt;70
            </p>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider" style={{ fontFamily: 'var(--ff-display)' }}>
              Avg Recovery Time
            </p>
            <p className="text-xl font-bold text-[var(--text)] mt-3" style={{ fontFamily: 'var(--ff-mono)' }}>
              {formatTime(insights.avgRecoveryTime)}
            </p>
            <p className="text-xs text-[var(--text-dim)] mt-2">
              After rage spike
            </p>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider" style={{ fontFamily: 'var(--ff-display)' }}>
              Retaliation Rate
            </p>
            <p className="text-xl font-bold text-[var(--text)] mt-3" style={{ fontFamily: 'var(--ff-mono)' }}>
              {insights.retaliationRate.toFixed(1)}%
            </p>
            <p className="text-xs text-[var(--text-dim)] mt-2">
              Of incidents
            </p>
          </div>
        </div>
      )}

      {/* 1. Composure Score Over Time */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Heart size={18} className="text-[var(--border-accent)]" />
          <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider" style={{ fontFamily: 'var(--ff-display)' }}>Composure Score Over Time</h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={composureChartData} margin={{ top: 8, right: 12, left: -16, bottom: 16 }}>
            <defs>
              <linearGradient id="grad-composure" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="name"
              tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
              stroke="rgba(255,255,255,0.1)"
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
              stroke="rgba(255,255,255,0.1)"
              domain={[0, 100]}
              label={{ value: 'Composure (0-100)', angle: -90, position: 'insideLeft' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
              stroke="rgba(255,255,255,0.1)"
              label={{ value: 'SR Delta', angle: 90, position: 'insideRight' }}
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(10,10,20,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={((value: any, name?: string) => {
                if (name === 'composure') return [value.toFixed(1), 'Composure']
                if (name === 'srDelta') return [value > 0 ? `+${value}` : value, 'SR Delta']
                return [value, name ?? '']
              }) as any}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="composure"
              name="composure"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#grad-composure)"
              dot={{ r: 3, fill: '#10b981' }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="srDelta"
              name="srDelta"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              strokeDasharray="4 4"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 2. Rage Spike Frequency */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={18} className="text-[var(--border-accent)]" />
          <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider" style={{ fontFamily: 'var(--ff-display)' }}>Rage Spike Frequency</h3>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={rageSpikeChartData} margin={{ top: 8, right: 12, left: -16, bottom: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="name"
              tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
              stroke="rgba(255,255,255,0.1)"
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
              stroke="rgba(255,255,255,0.1)"
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(10,10,20,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }} />
            <Bar dataKey="spikes" stackId="a" fill="#f43f5e" name="Rage Spikes" />
            <Bar dataKey="cooldowns" stackId="a" fill="#10b981" name="Cooldowns Triggered" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 3. Composure vs SR Delta Scatter */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-[var(--border-accent)]" />
          <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider" style={{ fontFamily: 'var(--ff-display)' }}>Composure vs SR Gain</h3>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ top: 8, right: 12, left: -16, bottom: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="composure"
              name="Composure"
              type="number"
              tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
              stroke="rgba(255,255,255,0.1)"
              domain={[0, 100]}
            />
            <YAxis
              dataKey="srDelta"
              name="SR Delta"
              tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
              stroke="rgba(255,255,255,0.1)"
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(10,10,20,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: any) => {
                if (typeof value === 'number') return value.toFixed(2)
                return value
              }}
              labelFormatter={(label: any) => label}
            />
            <Scatter name="Sessions" data={scatterData} fill="#06b6d4" />
          </ScatterChart>
        </ResponsiveContainer>
        <p className="text-xs text-[var(--text-dim)] mt-2">
          Shows correlation between composure score and SR change per session
        </p>
      </div>

      {/* 4. Behavioral Trends */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown size={18} className="text-[var(--border-accent)]" />
          <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider" style={{ fontFamily: 'var(--ff-display)' }}>Behavioral Trends</h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={behavioralChartData} margin={{ top: 8, right: 12, left: -16, bottom: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="name"
              tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
              stroke="rgba(255,255,255,0.1)"
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
              stroke="rgba(255,255,255,0.1)"
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(10,10,20,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={((value: any, name?: string) => {
                if (name === 'cleanLapPercent') return [`${value.toFixed(1)}%`, 'Clean Lap %']
                if (name === 'tailgatingMin') return [value.toFixed(1), 'Tailgating (min)']
                return [Math.round(value), name ?? '']
              }) as any}
            />
            <Legend wrapperStyle={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }} />
            <Line
              type="monotone"
              dataKey="closePasses"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              name="Close Passes"
            />
            <Line
              type="monotone"
              dataKey="offTracks"
              stroke="#f43f5e"
              strokeWidth={2}
              dot={false}
              name="Off Tracks"
            />
            <Line
              type="monotone"
              dataKey="tailgatingMin"
              stroke="#06b6d4"
              strokeWidth={2}
              dot={false}
              name="Tailgating (min)"
            />
            <Line
              type="monotone"
              dataKey="cleanLapPercent"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              name="Clean Lap %"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recovery Stats */}
      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider" style={{ fontFamily: 'var(--ff-display)' }}>
              Cooldown Effectiveness
            </p>
            <p className="text-xl font-bold text-[var(--text)] mt-3" style={{ fontFamily: 'var(--ff-mono)' }}>
              {insights.cooldownEffectiveness.toFixed(1)}%
            </p>
            <p className="text-xs text-[var(--text-dim)] mt-2">
              Cooldowns triggered as % of rage spikes
            </p>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider" style={{ fontFamily: 'var(--ff-display)' }}>
              High Composure SR
            </p>
            <p className="text-xl font-bold text-[var(--text)] mt-3" style={{ fontFamily: 'var(--ff-mono)' }}>
              {insights.highComposureAvgSRDelta > 0 ? '+' : ''}
              {insights.highComposureAvgSRDelta.toFixed(2)}
            </p>
            <p className="text-xs text-[var(--text-dim)] mt-2">
              Avg SR delta when composure &gt; 70
            </p>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider" style={{ fontFamily: 'var(--ff-display)' }}>
              Low Composure SR
            </p>
            <p className="text-xl font-bold text-[var(--text)] mt-3" style={{ fontFamily: 'var(--ff-mono)' }}>
              {insights.lowComposureAvgSRDelta > 0 ? '+' : ''}
              {insights.lowComposureAvgSRDelta.toFixed(2)}
            </p>
            <p className="text-xs text-[var(--text-dim)] mt-2">
              Avg SR delta when composure ≤ 70
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
