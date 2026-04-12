'use client'

import Link from 'next/link'
import { MapPin, Car } from 'lucide-react'
import type { TrackMastery, CarAffinity } from '@/lib/mastery'

interface BrandInfo {
  logoSvg: string | null
  logoPng: string | null
  brandColorHex: string | null
  manufacturerName: string
}

interface Props {
  tracks: TrackMastery[]
  cars: CarAffinity[]
  trackDisplayNameLookup: Record<string, string>
  brandLogoLookup: Record<string, BrandInfo>
}

const TIER_COLORS: Record<string, string> = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffd700',
  diamond: '#b9f2ff',
}

function ScoreBar({ score, color }: { score: number; color?: string }) {
  return (
    <div className="h-1 w-full rounded-full bg-[var(--border)]">
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${Math.min(100, Math.max(0, score))}%`,
          background: color || 'var(--k10-red)',
        }}
      />
    </div>
  )
}

function brandLogoSrc(info: BrandInfo): string | null {
  if (info.logoSvg) return `data:image/svg+xml,${encodeURIComponent(info.logoSvg)}`
  if (info.logoPng) return `data:image/png;base64,${info.logoPng}`
  return null
}

export default function TopTracksAndCars({ tracks, cars, trackDisplayNameLookup, brandLogoLookup }: Props) {
  const top3Tracks = tracks.slice(0, 3)
  const top3Cars = cars.slice(0, 3)

  if (top3Tracks.length === 0 && top3Cars.length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      {/* Top Tracks */}
      {top3Tracks.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] mb-3">
            <MapPin size={24} className="text-[var(--border-accent)]" />
            Top Tracks
          </div>
          <div className="flex flex-col gap-2">
            {top3Tracks.map((track, i) => {
              const displayName =
                trackDisplayNameLookup[track.trackName.toLowerCase()] || track.trackName
              return (
                <div
                  key={track.trackName}
                  className="rounded-xl p-3 border border-[var(--border)] bg-[var(--bg-elevated)]"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="text-xs font-bold tabular-nums"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold text-[var(--text-secondary)] truncate flex-1">
                      {displayName}
                    </span>
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: TIER_COLORS[track.masteryTier] }}
                      title={track.masteryTier}
                    />
                  </div>
                  <ScoreBar score={track.masteryScore} color={TIER_COLORS[track.masteryTier]} />
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-[var(--text-muted)]">
                    <span>{track.totalSessions} race{track.totalSessions !== 1 ? 's' : ''}</span>
                    {track.avgPosition != null && (
                      <span>P{track.avgPosition.toFixed(1)}</span>
                    )}
                    <span>{track.avgIncidents.toFixed(1)}x</span>
                  </div>
                </div>
              )
            })}
          </div>
          <Link
            href="/drive/tracks"
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-dim)] transition-colors text-right mt-2 block"
          >
            All tracks &rarr;
          </Link>
        </div>
      )}

      {/* Top Cars */}
      {top3Cars.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] mb-3">
            <Car size={24} className="text-[var(--border-accent)]" />
            Top Cars
          </div>
          <div className="flex flex-col gap-2">
            {top3Cars.map((car, i) => {
              // Find a brand logo by checking any of this manufacturer's car models
              const matchingModel = car.cars.find(c => brandLogoLookup[c.carModel])
              const brandInfo = matchingModel ? brandLogoLookup[matchingModel.carModel] : null
              const logoSrc = brandInfo ? brandLogoSrc(brandInfo) : null

              return (
                <div
                  key={car.brandKey}
                  className="rounded-xl p-3 border border-[var(--border)] bg-[var(--bg-elevated)]"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="text-xs font-bold tabular-nums"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {i + 1}
                    </span>
                    {logoSrc && (
                      <div className="w-5 h-4 flex-shrink-0 flex items-center justify-center">
                        <img
                          src={logoSrc}
                          alt={car.manufacturer}
                          className="max-w-full max-h-full object-contain opacity-60"
                        />
                      </div>
                    )}
                    <span className="text-sm font-semibold text-[var(--text-secondary)] truncate flex-1">
                      {car.manufacturer}
                    </span>
                  </div>
                  <ScoreBar score={car.affinityScore} color={brandInfo?.brandColorHex || undefined} />
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-[var(--text-muted)]">
                    <span>{car.totalSessions} race{car.totalSessions !== 1 ? 's' : ''}</span>
                    {car.avgPosition != null && (
                      <span>P{car.avgPosition.toFixed(1)}</span>
                    )}
                    <span>{car.cars.length} car{car.cars.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              )
            })}
          </div>
          <Link
            href="/drive/tracks"
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-dim)] transition-colors text-right mt-2 block"
          >
            All cars &rarr;
          </Link>
        </div>
      )}
    </div>
  )
}
