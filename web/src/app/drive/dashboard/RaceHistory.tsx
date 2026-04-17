'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Car, LayoutGrid, List, Flag, Cone, Timer } from 'lucide-react'
import RaceCard from './RaceCard'
import RaceListView from './RaceListView'
import type { BrandInfo } from '@/types/brand'

// ── Types (mirrored from page.tsx) ────────────────────────────────────────────

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

interface DisplayCard {
  session: RaceSession
  practiceSession?: RaceSession
  qualifyingSession?: RaceSession
}

interface CardLookups {
  trackMapLookup: Record<string, string>
  carImageLookup: Record<string, string | null>
  trackImageLookup: Record<string, string | null>
  trackLogoLookup: Record<string, string>
  trackDisplayNameLookup: Record<string, string>
  brandLogoLookup: Record<string, BrandInfo>
  iRatingHistory: number[]
}

type ViewMode = 'cards' | 'list'
type SessionTab = 'races' | 'practices' | 'time_trials'

const VIEW_STORAGE_KEY = 'k10-race-history-view'
const TAB_STORAGE_KEY = 'k10-race-history-tab'

function readSavedView(): ViewMode {
  if (typeof window === 'undefined') return 'cards'
  const saved = localStorage.getItem(VIEW_STORAGE_KEY)
  return saved === 'list' ? 'list' : 'cards'
}

function readSavedTab(): SessionTab {
  if (typeof window === 'undefined') return 'races'
  const saved = localStorage.getItem(TAB_STORAGE_KEY)
  if (saved === 'practices' || saved === 'time_trials') return saved
  return 'races'
}

// ── Session type helpers ─────────────────────────────────────────────────────

function getSessionCategory(s: RaceSession): SessionTab {
  const t = (s.sessionType || s.category || '').toLowerCase()
  if (t.includes('practice') || t.includes('warmup') || t.includes('qual')) return 'practices'
  if (t.includes('time trial') || t.includes('time_trial') || t.includes('timetrial') || t.includes('lone qual')) return 'time_trials'
  return 'races'
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RaceHistory({
  displayCards,
  lookups,
}: {
  displayCards: DisplayCard[]
  lookups: CardLookups
}) {
  const [view, setView] = useState<ViewMode>('cards')
  const [tab, setTab] = useState<SessionTab>('races')

  // Restore saved preferences on mount
  useEffect(() => {
    setView(readSavedView())
    setTab(readSavedTab())
  }, [])

  const changeView = useCallback((mode: ViewMode) => {
    setView(mode)
    localStorage.setItem(VIEW_STORAGE_KEY, mode)
  }, [])

  const changeTab = useCallback((t: SessionTab) => {
    setTab(t)
    localStorage.setItem(TAB_STORAGE_KEY, t)
  }, [])

  const trackKey = (name: string | null) => (name || '').toLowerCase()

  // Split cards by session type
  const { races, practices, timeTrials } = useMemo(() => {
    const races: DisplayCard[] = []
    const practices: DisplayCard[] = []
    const timeTrials: DisplayCard[] = []

    for (const card of displayCards) {
      const cat = getSessionCategory(card.session)
      if (cat === 'practices') practices.push(card)
      else if (cat === 'time_trials') timeTrials.push(card)
      else races.push(card)
    }

    return { races, practices, timeTrials }
  }, [displayCards])

  const activeCards = tab === 'practices' ? practices : tab === 'time_trials' ? timeTrials : races

  const tabs: { key: SessionTab; label: string; icon: typeof Flag; count: number }[] = [
    { key: 'races', label: 'Races', icon: Flag, count: races.length },
    { key: 'practices', label: 'Practice', icon: Cone, count: practices.length },
    { key: 'time_trials', label: 'Time Trials', icon: Timer, count: timeTrials.length },
  ]

  return (
    <section className="mb-8">
      {/* Header with tabs + view toggle */}
      <div className="flex items-center justify-between mb-4">
        <h2
          className="font-bold flex items-center gap-2"
          style={{ fontSize: 'var(--fs-2xl)', fontFamily: 'var(--ff-display)' }}
        >
          <Car size={24} className="text-[var(--border-accent)]" />
          Race History
        </h2>

        <div className="flex items-center gap-3">
          {/* Session type tabs */}
          <div className="flex items-center rounded-lg border border-[var(--border)] overflow-hidden">
            {tabs.map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                onClick={() => changeTab(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  tab === key
                    ? 'bg-white/10 text-[var(--text)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-panel)]'
                }`}
              >
                <Icon size={13} />
                {label}
                {count > 0 && (
                  <span className={`text-[10px] ml-0.5 tabular-nums ${tab === key ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border border-[var(--border)] overflow-hidden">
            <button
              onClick={() => changeView('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                view === 'cards'
                  ? 'bg-white/10 text-[var(--text)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-panel)]'
              }`}
            >
              <LayoutGrid size={14} />
              Cards
            </button>
            <button
              onClick={() => changeView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                view === 'list'
                  ? 'bg-white/10 text-[var(--text)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-panel)]'
              }`}
            >
              <List size={14} />
              List
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {activeCards.length > 0 ? (
        view === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {activeCards.map(({ session: s, practiceSession, qualifyingSession }) => (
              <RaceCard
                key={s.id}
                session={s}
                practiceSession={practiceSession}
                qualifyingSession={qualifyingSession}
                trackSvgPath={lookups.trackMapLookup[trackKey(s.trackName)] || null}
                carImageUrl={lookups.carImageLookup[s.carModel] || null}
                trackImageUrl={lookups.trackImageLookup[s.trackName ?? ''] || null}
                trackLogoSvg={lookups.trackLogoLookup[trackKey(s.trackName)] || null}
                trackDisplayName={lookups.trackDisplayNameLookup[trackKey(s.trackName)] || null}
                brandInfo={lookups.brandLogoLookup[s.carModel] ?? null}
                iRatingHistory={lookups.iRatingHistory}
              />
            ))}
          </div>
        ) : (
          <RaceListView cards={activeCards} lookups={lookups} />
        )
      ) : (
        <div className="p-8 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-center">
          <Car size={32} className="mx-auto mb-3 text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-dim)] mb-1">
            {tab === 'races' && 'No races recorded yet'}
            {tab === 'practices' && 'No practice sessions recorded yet'}
            {tab === 'time_trials' && 'No time trials recorded yet'}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Your session data will appear here after your next {tab === 'races' ? 'race' : tab === 'practices' ? 'practice' : 'time trial'} with data sync enabled.
          </p>
        </div>
      )}
    </section>
  )
}
