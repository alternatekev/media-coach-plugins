'use client'

import { useRouter } from 'next/navigation'
import { Calendar, Map, Car, Trophy } from 'lucide-react'

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

export default function SessionSelector({
  sessions,
  selectedSessionId,
}: {
  sessions: RaceSession[]
  selectedSessionId: string
}) {
  const router = useRouter()

  const handleSelectSession = (sessionId: string) => {
    router.push(`/drive/debrief?session=${sessionId}`)
  }

  const selectedSession = sessions.find((s) => s.id === selectedSessionId)

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getPositionLabel = (pos: number | null, isDNF: boolean) => {
    if (isDNF) return 'DNF'
    if (!pos) return '—'
    if (pos === 1) return '1st'
    if (pos === 2) return '2nd'
    if (pos === 3) return '3rd'
    return `${pos}th`
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-[var(--text-secondary)]">
        Select Session
      </label>
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {sessions.map((session) => {
          const isDNF = !session.finishPosition || session.finishPosition === 0
          const isSelected = session.id === selectedSessionId
          const incidents = session.incidentCount ?? 0

          return (
            <button
              key={session.id}
              onClick={() => handleSelectSession(session.id)}
              className={`
                w-full text-left p-3 rounded-lg border transition-all
                ${
                  isSelected
                    ? 'bg-[var(--bg-elevated)] border-[var(--border)] ring-2 ring-emerald-500'
                    : 'bg-[var(--bg-panel)] border-[var(--border)] hover:border-[var(--border)] hover:bg-[var(--bg-elevated)]'
                }
              `}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {/* Track + Car */}
                  <div className="flex items-center gap-2 mb-1">
                    <Map size={14} className="text-[var(--text-dim)] flex-shrink-0" />
                    <span className="text-sm font-medium text-[var(--text-secondary)] truncate">
                      {session.trackName || 'Unknown Track'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <Car size={14} className="text-[var(--text-dim)] flex-shrink-0" />
                    <span className="text-xs text-[var(--text-dim)] truncate">
                      {session.carModel}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <Calendar size={13} />
                    {formatDate(session.createdAt)}
                  </div>
                </div>

                {/* Finish Position + Incidents (right side) */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <div className="flex items-center gap-1">
                    <Trophy size={14} className="text-[var(--text-dim)]" />
                    <span
                      className={`text-sm font-semibold ${
                        isDNF
                          ? 'text-rose-400'
                          : session.finishPosition === 1
                            ? 'text-amber-300'
                            : 'text-[var(--text-dim)]'
                      }`}
                    >
                      {getPositionLabel(session.finishPosition, isDNF)}
                    </span>
                  </div>

                  {incidents > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                      {incidents} incident{incidents !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
