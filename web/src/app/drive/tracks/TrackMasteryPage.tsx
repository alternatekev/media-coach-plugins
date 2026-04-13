'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { computeTrackMastery, type TrackMastery } from '@/lib/mastery'

interface RaceSession {
  id: string
  carModel: string
  manufacturer: string
  trackName: string
  finishPosition: number | null
  incidentCount: number
  metadata: Record<string, any> | null
  createdAt: string
  gameName: string
}

interface Props {
  sessions: RaceSession[]
  heroImageUrl: string | null
  heroSvgPath: string | null
}

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  const diffWeek = Math.floor(diffDay / 7)

  if (diffSec < 60) return 'now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return `${diffWeek}w ago`
}

function formatPosition(pos: number): string {
  return `P${pos.toFixed(1)}`
}

const TIER_COLORS: Record<string, string> = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffd700',
  diamond: '#b9f2ff'
}

function TierBadge({ tier }: { tier: TrackMastery['masteryTier'] }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[var(--text-secondary)] bg-[rgba(255,255,255,0.05)] border border-[var(--border)]">
      <div
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: TIER_COLORS[tier] }}
      />
      <span>{tier.charAt(0).toUpperCase() + tier.slice(1)}</span>
    </div>
  )
}

function MasteryProgressRing({ score, color }: { score: number; color: string }) {
  const circumference = 2 * Math.PI * 18
  const offset = circumference - (score / 100) * circumference

  return (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <circle
        cx="24"
        cy="24"
        r="18"
        fill="none"
        stroke="var(--border)"
        strokeWidth="3"
      />
      <circle
        cx="24"
        cy="24"
        r="18"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 24 24)"
      />
      <text
        x="24"
        y="24"
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--text-secondary)"
        fontSize="11"
        fontWeight="bold"
      >
        {score}
      </text>
    </svg>
  )
}

function TrendIndicator({ trend }: { trend: string }) {
  let arrow = '→'
  let label = 'Stable'

  if (trend === 'improving') {
    arrow = '↑'
    label = 'Improving'
  } else if (trend === 'declining') {
    arrow = '↓'
    label = 'Declining'
  } else if (trend === 'new') {
    arrow = '●'
    label = 'New'
  }

  return (
    <div className="flex items-center gap-1.5 text-sm text-[var(--text-dim)]">
      <span>{arrow}</span>
      <span>{label}</span>
    </div>
  )
}

function TrackCard({ track, color }: { track: TrackMastery; color: string }) {
  return (
    <Link
      href={`/drive/track/${encodeURIComponent(track.trackName)}`}
      className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 flex flex-col gap-4 transition-colors hover:border-[var(--border-accent)]"
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div className="flex justify-between items-start gap-4">
        <h3 className="text-base font-semibold text-[var(--text-secondary)] flex-1">{track.trackName}</h3>
        <TierBadge tier={track.masteryTier} />
      </div>

      <div className="flex gap-4 items-start">
        <MasteryProgressRing
          score={track.masteryScore}
          color={TIER_COLORS[track.masteryTier]}
        />
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-[var(--text-dim)]">Sessions</span>
            <span className="text-sm font-semibold text-[var(--text-secondary)]">{track.totalSessions}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-[var(--text-dim)]">Avg Position</span>
            <span className="text-sm font-semibold text-[var(--text-secondary)]">
              {track.avgPosition !== null ? formatPosition(track.avgPosition) : '—'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-[var(--text-dim)]">Incidents/Race</span>
            <span className="text-sm font-semibold text-[var(--text-secondary)]">{track.avgIncidents.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {track.gameNames.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {track.gameNames.map(game => (
            <span key={game} className="px-2 py-1 bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] rounded-full text-xs text-[var(--text-secondary)] font-medium">
              {game}
            </span>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center pt-3 border-t border-[var(--border)] text-xs">
        <TrendIndicator trend={track.trend} />
        <span className="text-xs text-[var(--text-dim)]">
          {formatRelativeTime(track.lastRaced)}
        </span>
      </div>
    </Link>
  )
}

export default function TrackMasteryPage({ sessions, heroImageUrl, heroSvgPath }: Props) {
  const tracks = useMemo(() => {
    const converted = sessions.map(s => ({
      ...s,
      createdAt: new Date(s.createdAt)
    }))
    return computeTrackMastery(converted)
  }, [sessions])

  const totalSessions = sessions.length
  const uniqueTracks = new Set(sessions.map(s => s.trackName)).size

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      {/* Hero */}
      <div className="relative overflow-hidden bg-[var(--bg-panel)]">
        {heroImageUrl && (
          <img src={heroImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none" />
        )}
        {heroSvgPath && (
          <div className="absolute inset-0 flex items-center justify-end pointer-events-none opacity-30 pr-16">
            <svg viewBox="0 0 100 100" className="w-[500px] h-[500px]" preserveAspectRatio="xMidYMid meet">
              <path d={heroSvgPath} fill="none" stroke="var(--border-accent)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-panel)] via-[var(--bg-panel)]/80 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[var(--bg)] to-transparent pointer-events-none" />

        <div className="relative z-10 px-6 pt-8 pb-10 max-w-6xl mx-auto">
          <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-[var(--text)]" style={{ fontFamily: 'var(--ff-display)' }}>
            Track Mastery
          </h1>
          <p className="text-sm text-[var(--text-dim)] mt-2 max-w-xl">
            Master the circuits. See your progression at every track.
          </p>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-6">
            <div className="text-center">
              <div className="text-3xl font-black text-[var(--text)]" style={{ fontFamily: 'var(--ff-display)' }}>{uniqueTracks}</div>
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Tracks</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-[var(--text)]" style={{ fontFamily: 'var(--ff-display)' }}>{totalSessions}</div>
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Sessions</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {tracks.length === 0 ? (
          <div className="py-12 px-8 text-center bg-[var(--bg-elevated)] border border-dashed border-[var(--border)] rounded-xl text-[var(--text-secondary)]">
            <p>Hit the track and your mastery profile will build automatically</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tracks.map(track => (
              <TrackCard key={track.trackName} track={track} color={TIER_COLORS[track.masteryTier]} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
