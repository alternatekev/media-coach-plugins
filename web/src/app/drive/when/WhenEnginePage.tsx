'use client'

import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Clock, Calendar, Zap, Sun } from 'lucide-react'
import { computeWhenProfile, generateWhenInsights } from '@/lib/when-engine'

interface RaceSession {
  id: string
  userId: string
  carModel: string
  manufacturer?: string
  category: string
  gameName: string
  trackName?: string | null
  sessionType?: string | null
  finishPosition: number | null
  incidentCount: number | null
  metadata: Record<string, any> | null
  createdAt: Date | string
}

interface RatingHistoryEntry {
  id: string
  userId: string
  category: string
  iRating: number
  safetyRating: string
  license: string
  prevIRating: number | null
  prevSafetyRating?: string | null
  prevLicense?: string | null
  sessionType?: string | null
  trackName?: string | null
  carModel?: string | null
  createdAt: Date | string
}

interface HeatmapCell {
  day: number
  hour: number
  score: number
  count: number
}

interface TooltipState {
  visible: boolean
  x: number
  y: number
  day: number
  hour: number
  score: number
  count: number
  avgPosition: number | null
  avgDelta: number | null
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS_SHORT = ['12a', '1a', '2a', '3a', '4a', '5a', '6a', '7a', '8a', '9a', '10a', '11a',
  '12p', '1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p', '10p', '11p']

function getHeatColor(score: number, hasData: boolean): string {
  if (!hasData) return 'rgba(255,255,255,0.03)'
  if (score > 0.6) return `hsl(142, 50%, ${30 + (score - 0.5) * 40}%)`
  if (score < 0.4) return `hsl(0, 60%, ${30 + (0.5 - score) * 40}%)`
  return `hsl(0, 0%, ${25 + score * 10}%)`
}

export default function WhenEnginePage({ sessions, ratingHistory }: {
  sessions: RaceSession[]
  ratingHistory: RatingHistoryEntry[]
}) {
  const [tooltipState, setTooltipState] = useState<TooltipState | null>(null)

  const profile = useMemo(() => {
    return computeWhenProfile(sessions, ratingHistory)
  }, [sessions, ratingHistory])

  const insights = useMemo(() => {
    const baseInsights = generateWhenInsights(profile)
    return baseInsights
  }, [profile])

  const hasEnoughData = sessions.length >= 5

  if (!hasEnoughData) {
    return (
      <main className="min-h-screen px-6 py-12 bg-[var(--bg)]">
        <div className="max-w-4xl mx-auto">
          <div className="p-8 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-center">
            <Clock size={32} className="mx-auto mb-3 text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-dim)] mb-1">Race a few more times and we'll show you when you're at your best</p>
            <p className="text-xs text-[var(--text-muted)]">
              Complete at least {5 - sessions.length} more race{5 - sessions.length !== 1 ? 's' : ''} to unlock temporal analysis.
            </p>
          </div>
        </div>
      </main>
    )
  }

  const dayOfWeekChartData = profile.byDayOfWeek.map(d => ({
    name: d.label,
    value: d.avgIRatingDelta ?? 0,
    sessions: d.sessionCount,
  }))

  const sessionLengthData = profile.bySessionLength.map(s => ({
    name: s.label,
    sessions: s.sessionCount,
    position: s.avgPosition ?? 0,
    incidents: s.avgIncidents,
    podiumRate: s.podiumRate,
  }))

  const renderHeatmapCell = (cell: HeatmapCell) => {
    const hasData = cell.count > 0
    const color = getHeatColor(cell.score, hasData)

    return (
      <div
        key={`${cell.day}-${cell.hour}`}
        className="relative"
        style={{
          width: '32px',
          height: '32px',
          backgroundColor: color,
          border: '1px solid var(--border)',
          cursor: hasData ? 'pointer' : 'default',
        }}
        onMouseEnter={() => {
          if (hasData) {
            const hourData = profile.byHour[cell.hour]
            setTooltipState({
              visible: true,
              x: cell.day * 32 + 200,
              y: cell.hour * 32 + 100,
              day: cell.day,
              hour: cell.hour,
              score: cell.score,
              count: cell.count,
              avgPosition: hourData.avgPosition,
              avgDelta: hourData.avgIRatingDelta,
            })
          }
        }}
        onMouseLeave={() => setTooltipState(null)}
      />
    )
  }

  return (
    <main className="min-h-screen px-6 py-12 bg-[var(--bg)]">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Hero Section */}
        <div className="rounded-xl bg-[var(--bg-panel)] p-8 sm:p-12 overflow-hidden relative mb-16">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-tl from-purple-400 to-violet-400 rounded-full blur-3xl" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <Clock size={40} className="text-blue-400" />
              <h1 className="text-4xl sm:text-5xl font-bold" style={{ fontFamily: 'var(--ff-display)' }}>
                When Engine
              </h1>
            </div>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl">
              When do you race your best? Discover your peak performance windows.
            </p>
          </div>
        </div>

        {/* Heatmap */}
        <section>
          <h2 className="text-[var(--text-secondary)] text-2xl font-bold mb-6">Heatmap</h2>

          <div className="p-6 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]">
            <div className="flex">
              {/* Y-axis labels */}
              <div className="flex flex-col justify-between pr-3 pt-1 w-12">
                <span className="text-xs text-[var(--text-muted)]">12a</span>
                <span className="text-xs text-[var(--text-muted)]">3a</span>
                <span className="text-xs text-[var(--text-muted)]">6a</span>
                <span className="text-xs text-[var(--text-muted)]">9a</span>
                <span className="text-xs text-[var(--text-muted)]">12p</span>
                <span className="text-xs text-[var(--text-muted)]">3p</span>
                <span className="text-xs text-[var(--text-muted)]">6p</span>
                <span className="text-xs text-[var(--text-muted)]">9p</span>
              </div>

              {/* Heatmap grid and X-axis labels */}
              <div>
                {/* Grid */}
                <div className="mb-3">
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <div key={hour} className="flex gap-px">
                      {profile.heatmapData
                        .filter(d => d.hour === hour)
                        .sort((a, b) => a.day - b.day)
                        .map(cell => renderHeatmapCell(cell))}
                      {/* Pad empty days */}
                      {Array.from({ length: 7 - profile.heatmapData.filter(d => d.hour === hour).length }).map((_, i) => (
                        <div
                          key={`empty-${hour}-${i}`}
                          style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: 'var(--bg-panel)',
                            border: '1px solid var(--border)',
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>

                {/* X-axis labels */}
                <div className="flex gap-px">
                  {[0, 3, 6, 9, 12, 15, 18, 21].map(h => (
                    <div
                      key={h}
                      style={{
                        width: h === 0 ? '32px' : `${(h / 3) * 32}px`,
                        paddingLeft: h === 0 ? '0' : '2px',
                      }}
                    >
                      <span className="text-xs text-[var(--text-muted)]">{HOURS_SHORT[h]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Day labels */}
            <div className="flex gap-px ml-12 mt-2">
              {DAYS.map((day, idx) => {
                const dayData = profile.heatmapData.filter(d => d.day === idx)
                return (
                  <div
                    key={day}
                    className="flex-1 text-center"
                    style={{ width: '32px' }}
                  >
                    <span className="text-xs text-[var(--text-muted)]">{day}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Tooltip */}
          {tooltipState?.visible && (
            <div
              className="fixed bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-3 text-sm shadow-lg z-50"
              style={{
                left: `${tooltipState.x}px`,
                top: `${tooltipState.y}px`,
                pointerEvents: 'none',
              }}
            >
              <div className="font-semibold text-[var(--text-secondary)]">{HOURS_SHORT[tooltipState.hour]}, {DAYS[tooltipState.day]}</div>
              <div className="text-xs text-[var(--text-dim)] mt-1">
                <div>Sessions: {tooltipState.count}</div>
                {tooltipState.avgPosition !== null && <div>Avg Position: {tooltipState.avgPosition.toFixed(1)}</div>}
                {tooltipState.avgDelta !== null && <div>Avg iRating: {tooltipState.avgDelta > 0 ? '+' : ''}{tooltipState.avgDelta.toFixed(0)}</div>}
              </div>
            </div>
          )}
        </section>

        {/* Day of Week Chart */}
        <section>
          <h2 className="text-[var(--text-secondary)] text-lg font-bold mb-4 flex items-center gap-2">
            <Calendar size={24} className="text-[var(--text-dim)]" />
            Day of Week Performance
          </h2>
          <div className="p-6 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dayOfWeekChartData}>
                <XAxis dataKey="name" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.5rem',
                  }}
                  labelStyle={{ color: 'var(--text-secondary)' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {dayOfWeekChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.value >= 0 ? 'hsl(142, 50%, 45%)' : 'hsl(0, 60%, 45%)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Session Length Cards */}
        <section>
          <h2 className="text-[var(--text-secondary)] text-lg font-bold mb-4 flex items-center gap-2">
            <Zap size={24} className="text-[var(--text-dim)]" />
            Performance by Session Length
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {sessionLengthData.map((data, idx) => {
              const isLongest = Math.max(...sessionLengthData.map(d => d.sessions)) === data.sessions
              return (
                <div
                  key={data.name}
                  className={`p-6 rounded-xl border transition ${
                    isLongest
                      ? 'bg-[var(--bg-elevated)] border-[var(--k10-red)] shadow-sm'
                      : 'bg-[var(--bg-elevated)] border-[var(--border)]'
                  }`}
                >
                  <div className="text-sm font-bold text-[var(--text-secondary)] mb-4">{data.name} Races</div>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Sessions</div>
                      <div className="text-2xl font-black text-[var(--text-secondary)]">{data.sessions}</div>
                    </div>
                    {data.position > 0 && (
                      <div>
                        <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Avg Position</div>
                        <div className="text-lg font-bold text-[var(--text-dim)]">P{data.position.toFixed(1)}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Podium Rate</div>
                      <div className="text-lg font-bold text-green-500">{(data.podiumRate * 100).toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Avg Incidents</div>
                      <div className="text-lg font-bold text-[var(--text-dim)]">{data.incidents.toFixed(1)}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Insights */}
        {insights.length > 0 && (
          <section>
            <h2 className="text-[var(--text-secondary)] text-lg font-bold mb-4 flex items-center gap-2">
              <Sun size={24} className="text-[var(--text-dim)]" />
              Insights
            </h2>
            <div className="space-y-3">
              {insights.map((insight, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] border-l-4"
                  style={{
                    borderLeftColor:
                      insight.type === 'positive'
                        ? 'hsl(142, 50%, 45%)'
                        : insight.type === 'negative'
                          ? 'hsl(0, 60%, 45%)'
                          : 'hsl(0, 0%, 45%)',
                  }}
                >
                  <p className="text-sm text-[var(--text-secondary)]">{insight.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
