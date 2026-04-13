'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts'
import { TrendingUp } from 'lucide-react'

interface LapTelemetryData {
  id: string
  lapNumber: number
  lapTime: number | null
  incidentCount: number
  rageScore: number | null
}

export default function LapTimeline({
  lapTelemetries,
}: {
  lapTelemetries: LapTelemetryData[]
}) {
  const chartData = useMemo(() => {
    return lapTelemetries.map((lt) => ({
      lap: lt.lapNumber,
      lapTime: lt.lapTime ? lt.lapTime : null,
      rageScore: lt.rageScore ? Math.min(lt.rageScore, 100) : 0,
      incidents: lt.incidentCount,
      hasIncident: lt.incidentCount > 0,
    }))
  }, [lapTelemetries])

  if (chartData.length === 0) return null

  const minLapTime = Math.min(
    ...chartData
      .filter((d) => d.lapTime !== null)
      .map((d) => d.lapTime as number),
  )
  const maxLapTime = Math.max(
    ...chartData
      .filter((d) => d.lapTime !== null)
      .map((d) => d.lapTime as number),
  )

  const formatLapTime = (seconds: number | null) => {
    if (!seconds || seconds <= 0) return '—'
    const m = Math.floor(seconds / 60)
    const s = seconds - m * 60
    return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2)
  }

  return (
    <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={20} className="text-emerald-400" />
        <h2 className="text-lg font-semibold text-[var(--text-secondary)]">Lap-by-Lap Timeline</h2>
      </div>

      {/* Chart */}
      <div className="bg-[var(--bg-panel)] rounded-lg p-4 mb-4" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="lapTimeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="rageGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
            />
            <XAxis
              dataKey="lap"
              stroke="var(--text-dim)"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              yAxisId="left"
              stroke="var(--text-dim)"
              tick={{ fontSize: 12 }}
              label={{ value: 'Lap Time (s)', angle: -90, position: 'insideLeft' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="var(--text-dim)"
              tick={{ fontSize: 12 }}
              label={{
                value: 'Rage Score',
                angle: 90,
                position: 'insideRight',
              }}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'var(--text)' }}
              formatter={(value, name) => {
                if (name === 'lapTime') {
                  return [formatLapTime(value as number), 'Lap Time']
                }
                if (name === 'rageScore') {
                  return [
                    ((value as number) ?? 0).toFixed(1),
                    'Rage Score',
                  ]
                }
                return [value, name]
              }}
            />

            {/* Lap Time Area */}
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="lapTime"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#lapTimeGradient)"
              name="Lap Time"
              isAnimationActive={false}
            />

            {/* Rage Score Line */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="rageScore"
              stroke="#f59e0b"
              strokeWidth={2}
              name="Rage Score"
              dot={false}
              isAnimationActive={false}
            />

            {/* Incident Markers */}
            {chartData
              .filter((d) => d.hasIncident)
              .map((d, idx) => (
                <ReferenceDot
                  key={`incident-${idx}`}
                  x={d.lap}
                  y={d.lapTime ?? undefined}
                  yAxisId="left"
                  r={6}
                  fill="#ef4444"
                  fillOpacity={0.7}
                />
              ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: '#10b981' }}
          />
          <span className="text-[var(--text-dim)]">Lap Time (primary)</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: '#f59e0b' }}
          />
          <span className="text-[var(--text-dim)]">Rage Score (secondary)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-[var(--text-dim)]">Incident Marker</span>
        </div>
      </div>

      {/* Insights */}
      <div className="mt-4 pt-4 border-t border-[var(--border)]">
        <p className="text-xs text-[var(--text-dim)]">
          Green area shows lap consistency. Orange line shows your composure
          (higher = more agitated). Red dots mark laps where incidents occurred.
        </p>
      </div>
    </div>
  )
}
