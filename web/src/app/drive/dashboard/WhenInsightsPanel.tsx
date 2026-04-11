'use client'

import { Sun } from 'lucide-react'
import type { WhenInsight } from '@/lib/when-engine'

export default function WhenInsightsPanel({ insights }: { insights: WhenInsight[] }) {
  if (insights.length === 0) return null

  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
        <Sun size={14} className="text-[var(--border-accent)]" />
        Insights
      </h2>
      <div className="space-y-1.5">
        {insights.map((insight, idx) => (
          <div
            key={idx}
            className="px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border-l-3 text-sm text-[var(--text-secondary)] leading-snug"
            style={{
              borderLeftWidth: 3,
              borderLeftStyle: 'solid',
              borderLeftColor:
                insight.type === 'positive'
                  ? 'hsl(142, 50%, 45%)'
                  : insight.type === 'negative'
                    ? 'hsl(0, 60%, 45%)'
                    : 'hsl(0, 0%, 45%)',
            }}
          >
            {insight.text}
          </div>
        ))}
      </div>
    </div>
  )
}
