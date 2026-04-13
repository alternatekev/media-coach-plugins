'use client'

import { useMemo, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import {
  Trophy,
  Medal,
  Shield,
  TrendingUp,
  Star,
  MapPin,
  Car,
  Clock,
  Flame,
  HeartCrack,
  ArrowUpFromLine,
  X,
} from 'lucide-react'
import { detectMoments, type Moment, type SessionRecord, type RatingRecord } from '@/lib/moments'

interface MomentsDrawerProps {
  sessions: SessionRecord[]
  ratingHistory: RatingRecord[]
}

const ICON_MAP: Record<string, React.ReactNode> = {
  win_streak: <Trophy size={16} />,
  podium_streak: <Medal size={16} />,
  clean_streak: <Shield size={16} />,
  milestone_irating: <TrendingUp size={16} />,
  license_promotion: <ArrowUpFromLine size={16} />,
  comeback: <Flame size={16} />,
  personal_best: <Star size={16} />,
  new_track: <MapPin size={16} />,
  new_car: <Car size={16} />,
  century: <Clock size={16} />,
  iron_man: <Flame size={16} />,
  heartbreak: <HeartCrack size={16} />,
}

const BORDER_COLOR_MAP: Record<string, string> = {
  win_streak: 'hsl(45, 100%, 51%)',
  podium_streak: 'hsl(45, 100%, 51%)',
  clean_streak: 'hsl(120, 35%, 45%)',
  milestone_irating: 'hsl(0, 80%, 55%)',
  license_promotion: 'hsl(215, 95%, 52%)',
  comeback: 'hsl(30, 100%, 50%)',
  personal_best: 'var(--border)',
  new_track: 'var(--border)',
  new_car: 'var(--border)',
  century: 'var(--border)',
  iron_man: 'hsl(10, 100%, 55%)',
  heartbreak: 'var(--border)',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function groupMomentsByMonth(moments: Moment[]): Map<string, Moment[]> {
  const grouped = new Map<string, Moment[]>()
  moments.forEach((moment) => {
    const date = new Date(moment.date)
    const key = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(moment)
  })
  return grouped
}

function hasRecentMoments(moments: Moment[]): boolean {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  return moments.some((m) => new Date(m.date) > sevenDaysAgo)
}

export default function MomentsDrawer({ sessions, ratingHistory }: MomentsDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const moments = useMemo(() => detectMoments(sessions, ratingHistory), [sessions, ratingHistory])

  const highlights = moments.slice(0, 5)
  const grouped = groupMomentsByMonth(moments)
  const hasRecent = hasRecentMoments(moments)

  useEffect(() => {
    setMounted(true)
  }, [])

  const drawerContent = (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full w-[420px] max-w-[90vw] bg-[var(--bg-elevated)] border-l border-[var(--border)] z-[70] flex flex-col transition-transform duration-300 ease-out"
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] flex-shrink-0">
          <h2 className="text-lg font-semibold text-[var(--text-secondary)]">Moments</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-center p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {moments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <Star size={32} className="text-[var(--text-muted)] opacity-40 mb-3" />
              <p className="text-sm text-[var(--text-muted)]">Keep racing to unlock your first milestone!</p>
            </div>
          )}

          {/* Highlights Section */}
          {highlights.length > 0 && (
            <div className="px-3 py-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">
                Highlights
              </h3>
              <div className="space-y-2">
                {highlights.map((moment, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-l-4 bg-[var(--bg-panel)] p-3 text-xs"
                    style={{
                      borderLeftColor: BORDER_COLOR_MAP[moment.type],
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 text-[var(--text-secondary)] mt-0.5">
                        {ICON_MAP[moment.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-[var(--text-secondary)] line-clamp-1">
                          {moment.title}
                        </h4>
                        <p className="text-[var(--text-dim)] mt-0.5 line-clamp-2">{moment.description}</p>
                        <div className="text-[var(--text-muted)] mt-1.5 flex flex-wrap gap-1">
                          <span>{formatDate(moment.date)}</span>
                          {moment.carModel && (
                            <>
                              <span>•</span>
                              <Link
                                href={`/drive/car/${encodeURIComponent(moment.carModel)}`}
                                className="hover:text-[var(--text-secondary)] transition-colors truncate"
                              >
                                {moment.carModel}
                              </Link>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline Section */}
          {moments.length > 0 && (
            <div className="px-3 py-4 border-t border-[var(--border)]">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">
                Timeline
              </h3>
              <div className="space-y-4">
                {Array.from(grouped.entries()).map(([month, monthMoments]) => (
                  <div key={month}>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
                      {month}
                    </h4>
                    <div className="space-y-2">
                      {monthMoments.map((moment, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-l-4 border-[var(--border)] bg-[var(--bg-panel)] p-2.5 flex items-start gap-2 text-xs"
                          style={{
                            borderLeftColor: BORDER_COLOR_MAP[moment.type],
                          }}
                        >
                          <div className="flex-shrink-0 text-[var(--text-secondary)] mt-0.5">
                            {ICON_MAP[moment.type]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-semibold text-[var(--text-secondary)] line-clamp-1">
                              {moment.title}
                            </h5>
                            <p className="text-[var(--text-dim)] mt-0.5 line-clamp-2">{moment.description}</p>
                          </div>
                          <div className="flex-shrink-0 text-right text-[var(--text-muted)] whitespace-nowrap text-[10px]">
                            <div>{formatDate(moment.date)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* View All Link */}
          {moments.length > 0 && (
            <div className="px-3 py-4 border-t border-[var(--border)]">
              <Link
                href="/drive/moments"
                className="inline-block w-full text-center px-3 py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] transition-colors"
                onClick={() => setIsOpen(false)}
              >
                View All Moments
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center p-2 rounded-md text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors relative flex-shrink-0"
        title="Moments"
      >
        <Star size={20} />
        {moments.length > 0 && hasRecent && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full" />
        )}
      </button>

      {/* Portal the drawer to document.body to escape header stacking context */}
      {mounted && createPortal(drawerContent, document.body)}
    </>
  )
}
