'use client'

import { MessageSquare } from 'lucide-react'

interface CommentaryEntry {
  lap: number
  topic: string
  severity: number
  sentiment?: string
  text: string
}

const severityConfig = {
  1: { bg: 'bg-[var(--bg-panel)]', text: 'text-[var(--text-dim)]', label: 'Info' },
  2: { bg: 'bg-blue-700', text: 'text-blue-300', label: 'Notice' },
  3: { bg: 'bg-amber-700', text: 'text-amber-300', label: 'Warning' },
  4: { bg: 'bg-orange-700', text: 'text-orange-300', label: 'Alert' },
  5: { bg: 'bg-rose-700', text: 'text-rose-300', label: 'Critical' },
}

export default function CommentaryReplay({
  commentaryLog,
}: {
  commentaryLog: CommentaryEntry[]
}) {
  const sortedEntries = [...commentaryLog].sort((a, b) => a.lap - b.lap)

  const getSeverityStyle = (severity: number) => {
    const config =
      severityConfig[
        Math.max(1, Math.min(5, severity)) as keyof typeof severityConfig
      ]
    return config || severityConfig[3]
  }

  return (
    <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare size={20} className="text-blue-400" />
        <h2 className="text-lg font-semibold text-[var(--text-secondary)]">Commentary Replay</h2>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {sortedEntries.map((entry, idx) => {
          const style = getSeverityStyle(entry.severity)

          return (
            <div
              key={idx}
              className="flex gap-3 pb-3 border-b border-[var(--border)] last:border-0"
            >
              {/* Left: Lap marker */}
              <div className="flex-shrink-0 pt-0.5">
                <div className="w-10 h-10 rounded-full bg-[var(--bg-panel)] flex items-center justify-center">
                  <span className="text-sm font-semibold text-[var(--text-dim)]">
                    L{entry.lap}
                  </span>
                </div>
              </div>

              {/* Right: Content */}
              <div className="flex-1 min-w-0">
                {/* Topic + Severity */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-sm font-semibold text-[var(--text-secondary)]">
                    {entry.topic}
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${style.bg} ${style.text} flex-shrink-0`}
                  >
                    {getSeverityStyle(entry.severity).label}
                  </span>
                </div>

                {/* Commentary text */}
                <p className="text-sm text-[var(--text-dim)] leading-relaxed">
                  {entry.text}
                </p>

                {/* Sentiment (if available) */}
                {entry.sentiment && (
                  <p className="text-xs text-[var(--text-muted)] mt-1.5">
                    Sentiment: {entry.sentiment}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-[var(--border)]">
        <p className="text-xs text-[var(--text-dim)]">
          {sortedEntries.length} event{sortedEntries.length !== 1 ? 's' : ''}{' '}
          detected during the session. Higher severity events may indicate
          behavioral patterns worth reviewing.
        </p>
      </div>
    </div>
  )
}
