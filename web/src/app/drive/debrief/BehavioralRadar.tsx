'use client'

import { useMemo } from 'react'
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { Zap } from 'lucide-react'

interface LapTelemetryData {
  id: string
  lapNumber: number
  lapTime: number | null
  incidentCount: number
  rageScore: number | null
  throttleAggression: number | null
  steeringErraticism: number | null
  brakingAggression: number | null
  proximityChasing: number | null
}

interface BehavioralAverage {
  throttleAggression: number
  steeringErraticism: number
  brakingAggression: number
  proximityChasing: number
}

export default function BehavioralRadar({
  lapTelemetries,
  allTimeAverage,
}: {
  lapTelemetries: LapTelemetryData[]
  allTimeAverage: BehavioralAverage
}) {
  const { sessionAverage, radarData } = useMemo(() => {
    const avg = {
      throttleAggression: 0,
      steeringErraticism: 0,
      brakingAggression: 0,
      proximityChasing: 0,
    }

    if (lapTelemetries.length === 0) return { sessionAverage: avg, radarData: [] }

    let validLaps = 0
    lapTelemetries.forEach((lt) => {
      if (lt.throttleAggression !== null) {
        avg.throttleAggression += lt.throttleAggression
        avg.steeringErraticism += lt.steeringErraticism || 0
        avg.brakingAggression += lt.brakingAggression || 0
        avg.proximityChasing += lt.proximityChasing || 0
        validLaps++
      }
    })

    if (validLaps > 0) {
      avg.throttleAggression /= validLaps
      avg.steeringErraticism /= validLaps
      avg.brakingAggression /= validLaps
      avg.proximityChasing /= validLaps
    }

    // Normalize to 0-100 scale for radar
    const normalize = (value: number, max: number) =>
      Math.round((value / max) * 100)

    const data = [
      {
        dimension: 'Throttle Aggression',
        session: normalize(avg.throttleAggression, 25),
        allTime: normalize(allTimeAverage.throttleAggression, 25),
        fullMark: 100,
      },
      {
        dimension: 'Steering Erraticism',
        session: normalize(avg.steeringErraticism, 20),
        allTime: normalize(allTimeAverage.steeringErraticism, 20),
        fullMark: 100,
      },
      {
        dimension: 'Braking Aggression',
        session: normalize(avg.brakingAggression, 20),
        allTime: normalize(allTimeAverage.brakingAggression, 20),
        fullMark: 100,
      },
      {
        dimension: 'Proximity Chasing',
        session: normalize(avg.proximityChasing, 25),
        allTime: normalize(allTimeAverage.proximityChasing, 25),
        fullMark: 100,
      },
    ]

    return { sessionAverage: avg, radarData: data }
  }, [lapTelemetries, allTimeAverage])

  if (radarData.length === 0) return null

  return (
    <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Zap size={20} className="text-yellow-400" />
        <h2 className="text-lg font-semibold text-[var(--text-secondary)]">Behavioral Profile</h2>
      </div>

      {/* Radar Chart */}
      <div className="bg-[var(--bg-panel)] rounded-lg p-4" style={{ height: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}>
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: 'var(--text-dim)', fontSize: 12 }}
            />
            <PolarRadiusAxis
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'var(--text)' }}
            />
            {/* Current Session */}
            <Radar
              name="This Session"
              dataKey="session"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.25}
              isAnimationActive={false}
            />
            {/* All-Time Average */}
            <Radar
              name="All-Time Average"
              dataKey="allTime"
              stroke="#f59e0b"
              fill="#f59e0b"
              fillOpacity={0.1}
              strokeDasharray="5 5"
              isAnimationActive={false}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-[var(--text-dim)]">This Session</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{
              backgroundColor: '#f59e0b',
              borderRadius: 0,
              width: '6px',
            }}
          />
          <span className="text-[var(--text-dim)]">All-Time Avg (dashed)</span>
        </div>
      </div>

      {/* Insights */}
      <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-2">
        <p className="text-xs text-[var(--text-dim)] font-medium">Session Insights:</p>
        <ul className="text-xs text-[var(--text-dim)] space-y-1">
          <li>
            • Throttle aggression:{' '}
            <span className="text-[var(--text-secondary)]">
              {sessionAverage.throttleAggression.toFixed(1)}/25
            </span>
          </li>
          <li>
            • Steering erraticism:{' '}
            <span className="text-[var(--text-secondary)]">
              {sessionAverage.steeringErraticism.toFixed(1)}/20
            </span>
          </li>
          <li>
            • Braking aggression:{' '}
            <span className="text-[var(--text-secondary)]">
              {sessionAverage.brakingAggression.toFixed(1)}/20
            </span>
          </li>
          <li>
            • Proximity chasing:{' '}
            <span className="text-[var(--text-secondary)]">
              {sessionAverage.proximityChasing.toFixed(1)}/25
            </span>
          </li>
        </ul>
      </div>
    </div>
  )
}
