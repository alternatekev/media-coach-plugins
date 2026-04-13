'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { AlertCircle } from 'lucide-react'

interface SessionBehavior {
  sessionId: string
  cleanLaps: number | null
  totalLaps: number | null
  incidentsByPhase: Record<string, number> | null
  incidentLocations: unknown[] | null
}

interface IncidentPhaseChartProps {
  sessionBehaviors: SessionBehavior[]
}

export default function IncidentPhaseChart({ sessionBehaviors }: IncidentPhaseChartProps) {
  const chartData = useMemo(() => {
    if (sessionBehaviors.length === 0) {
      return {
        phases: [
          { phase: 'Early', incidents: 0 },
          { phase: 'Mid', incidents: 0 },
          { phase: 'Late', incidents: 0 },
        ],
        stats: { early: 0, mid: 0, late: 0 },
      }
    }

    let earlyCount = 0
    let midCount = 0
    let lateCount = 0
    let totalSessions = 0

    sessionBehaviors.forEach((behavior) => {
      if (behavior.incidentsByPhase) {
        totalSessions += 1
        const phases = behavior.incidentsByPhase as Record<string, number>
        earlyCount += phases.early || 0
        midCount += phases.mid || 0
        lateCount += phases.late || 0
      }
    })

    const avgEarly = totalSessions > 0 ? earlyCount / totalSessions : 0
    const avgMid = totalSessions > 0 ? midCount / totalSessions : 0
    const avgLate = totalSessions > 0 ? lateCount / totalSessions : 0

    return {
      phases: [
        { phase: 'Start Line', incidents: parseFloat(avgEarly.toFixed(2)) },
        { phase: 'Mid-Race', incidents: parseFloat(avgMid.toFixed(2)) },
        { phase: 'Closing Laps', incidents: parseFloat(avgLate.toFixed(2)) },
      ],
      stats: { early: avgEarly, mid: avgMid, late: avgLate },
    }
  }, [sessionBehaviors])

  const hasData = sessionBehaviors.some((b) => b.incidentsByPhase)

  return (
    <div
      className="rounded-xl p-6"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center gap-2 mb-6">
        <AlertCircle size={20} className="text-rose-500" />
        <h2 className="text-xl font-semibold">Incident Rate by Race Phase</h2>
      </div>

      {!hasData ? (
        <div className="text-center py-8 text-[var(--text-dim)]">
          <p>No behavior data available. This data populates as you race.</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.phases}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="phase" tick={{ fontSize: 12, fill: 'var(--text-dim)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-dim)' }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                }}
                formatter={(value: any) => typeof value === 'number' ? value.toFixed(2) : value}
              />
              <Bar dataKey="incidents" fill="#f87171" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-rose-400 mb-1">
                {chartData.stats.early.toFixed(2)}
              </div>
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Start Line</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-rose-400 mb-1">{chartData.stats.mid.toFixed(2)}</div>
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Mid-Race</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-rose-400 mb-1">{chartData.stats.late.toFixed(2)}</div>
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Closing Laps</div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
