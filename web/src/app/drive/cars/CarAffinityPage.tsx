'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { computeCarAffinity, type CarAffinity } from '@/lib/mastery'

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

interface BrandLogo {
  name: string
  logoSvg: string | null
  logoPng: string | null
  color: string | null
}

interface Props {
  sessions: RaceSession[]
  brandColors: Record<string, string>
  brandLogos: Record<string, BrandLogo>
  heroImageUrl: string | null
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

function CarAffinityCard({
  affinity,
  brandColor,
  brandLogo
}: {
  affinity: CarAffinity
  brandColor?: string
  brandLogo?: BrandLogo | null
}) {
  const [expanded, setExpanded] = useState(true)

  const bgColor = brandColor ? `${brandColor}14` : 'transparent'
  const borderColor = brandColor || 'var(--border)'

  const logoSrc = brandLogo?.logoSvg
    ? `data:image/svg+xml,${encodeURIComponent(brandLogo.logoSvg)}`
    : brandLogo?.logoPng
      ? `data:image/png;base64,${brandLogo.logoPng}`
      : null

  return (
    <div
      id={affinity.brandKey}
      className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 flex flex-col gap-4 scroll-mt-20"
      style={{
        backgroundColor: bgColor,
        borderLeftWidth: '3px',
        borderLeftColor: borderColor
      }}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {logoSrc && (
            <img src={logoSrc} alt="" className="h-8 w-auto object-contain flex-shrink-0" />
          )}
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-secondary)] m-0">{affinity.manufacturer}</h3>
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mt-1.5">
              <span>{affinity.totalSessions} sessions</span>
              <span className="text-[var(--text-dim)]">•</span>
              <span>
                {affinity.avgPosition !== null ? formatPosition(affinity.avgPosition) : '—'}
                {' '}avg
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Affinity</span>
            <span className="text-2xl font-bold text-[var(--text-secondary)]">{affinity.affinityScore}</span>
          </div>
          <TrendIndicator trend={affinity.trend} />
        </div>
      </div>

      <div className="h-1.5 bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${affinity.affinityScore}%`,
            backgroundColor: brandColor || 'var(--text-secondary)'
          }}
        />
      </div>

      <div className="grid grid-cols-3 gap-4 py-3 px-0 border-t border-b border-[var(--border)]">
        <div className="flex flex-col items-center text-center">
          <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Best</span>
          <span className="text-base font-bold text-[var(--text-secondary)]">
            {affinity.bestPosition !== null ? `P${affinity.bestPosition}` : '—'}
          </span>
        </div>
        <div className="flex flex-col items-center text-center">
          <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Incidents</span>
          <span className="text-base font-bold text-[var(--text-secondary)]">{affinity.avgIncidents.toFixed(1)}</span>
        </div>
        <div className="flex flex-col items-center text-center">
          <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Laps</span>
          <span className="text-base font-bold text-[var(--text-secondary)]">{affinity.totalLaps}</span>
        </div>
      </div>

      {affinity.cars.length > 0 && (
        <div className="flex flex-col gap-2">
          <button
            className="bg-transparent border-none cursor-pointer flex items-center gap-2 text-sm text-[var(--text-dim)] hover:text-[var(--text-secondary)] transition-colors p-0"
            onClick={() => setExpanded(!expanded)}
          >
            <span className="text-xs">
              {expanded ? '▼' : '▶'}
            </span>
            {affinity.cars.length} car{affinity.cars.length !== 1 ? 's' : ''}
          </button>
          {expanded && (
            <div className="flex flex-col gap-2 py-2">
              {affinity.cars.map(car => (
                <Link
                  key={car.carModel}
                  href={`/drive/car/${encodeURIComponent(car.carModel)}`}
                  className="flex justify-between items-center text-sm px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] transition-colors"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <span className="text-[var(--text-secondary)] font-medium">{car.carModel}</span>
                  <span className="text-xs text-[var(--text-dim)]">
                    {car.sessionCount} session{car.sessionCount !== 1 ? 's' : ''} in {car.gameName}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function CarAffinityPage({ sessions, brandColors, brandLogos, heroImageUrl }: Props) {
  const affinities = useMemo(() => {
    const converted = sessions.map(s => ({
      ...s,
      createdAt: new Date(s.createdAt)
    }))
    return computeCarAffinity(converted)
  }, [sessions])

  const totalSessions = sessions.length
  const uniqueCars = new Set(sessions.map(s => s.carModel)).size

  // Build brand chips from computed affinities (sorted by session count)
  const brandChips = useMemo(() => {
    return affinities.map(a => {
      const logo = brandLogos[a.brandKey]
      const logoSrc = logo?.logoSvg
        ? `data:image/svg+xml,${encodeURIComponent(logo.logoSvg)}`
        : logo?.logoPng
          ? `data:image/png;base64,${logo.logoPng}`
          : null
      return {
        manufacturer: a.manufacturer,
        brandKey: a.brandKey,
        sessions: a.totalSessions,
        cars: a.cars.length,
        color: brandColors[a.brandKey] || null,
        logoSrc,
      }
    })
  }, [affinities, brandLogos, brandColors])

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      {/* Hero */}
      <div className="relative overflow-hidden bg-[var(--bg-panel)]">
        {heroImageUrl && (
          <img src={heroImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-15 pointer-events-none" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-panel)] via-[var(--bg-panel)]/80 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[var(--bg)] to-transparent pointer-events-none" />

        <div className="relative z-10 px-6 pt-8 pb-10 max-w-6xl mx-auto">
          <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-[var(--text)]" style={{ fontFamily: 'var(--ff-display)' }}>
            Car Affinity
          </h1>
          <p className="text-sm text-[var(--text-dim)] mt-2 max-w-xl">
            Discover which machinery suits your driving style
          </p>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-6">
            <div className="text-center">
              <div className="text-3xl font-black text-[var(--text)]" style={{ fontFamily: 'var(--ff-display)' }}>{uniqueCars}</div>
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Cars</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-[var(--text)]" style={{ fontFamily: 'var(--ff-display)' }}>{totalSessions}</div>
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Sessions</div>
            </div>
          </div>

          {/* Brand Chips */}
          {brandChips.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {brandChips.map(chip => (
                <a
                  key={chip.brandKey}
                  href={`#${chip.brandKey}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105"
                  style={{
                    background: chip.color ? `${chip.color}18` : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${chip.color ? chip.color + '40' : 'var(--border)'}`,
                    color: chip.color || 'var(--text-secondary)',
                  }}
                >
                  {chip.logoSrc && (
                    <img src={chip.logoSrc} alt="" className="h-4 w-auto object-contain" />
                  )}
                  <span>{chip.manufacturer}</span>
                  <span className="opacity-50">{chip.sessions}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {affinities.length === 0 ? (
          <div className="py-12 px-8 text-center bg-[var(--bg-elevated)] border border-dashed border-[var(--border)] rounded-xl text-[var(--text-secondary)]">
            <p>Your car affinity develops as you race different machinery</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {affinities.map(affinity => (
              <CarAffinityCard
                key={affinity.manufacturer}
                affinity={affinity}
                brandColor={brandColors[affinity.brandKey]}
                brandLogo={brandLogos[affinity.brandKey]}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
