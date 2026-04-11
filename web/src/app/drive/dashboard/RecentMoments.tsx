'use client'

import {
  Trophy, Medal, Shield, TrendingUp, Star,
  MapPin, Car, Clock, Flame, HeartCrack, ArrowUpFromLine,
} from 'lucide-react'
import type { Moment } from '@/lib/moments'

// ── Lookups ───────────────────────────────────────────────────────────────────

interface BrandInfo {
  logoSvg: string | null
  logoPng: string | null
  brandColorHex: string | null
  manufacturerName: string
}

interface MomentLookups {
  trackMapLookup: Record<string, string>
  trackLogoLookup: Record<string, string>
  trackDisplayNameLookup: Record<string, string>
  brandLogoLookup: Record<string, BrandInfo>
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ICON: Record<string, (size: number) => React.ReactNode> = {
  win_streak:        (s) => <Trophy size={s} />,
  podium_streak:     (s) => <Medal size={s} />,
  clean_streak:      (s) => <Shield size={s} />,
  milestone_irating: (s) => <TrendingUp size={s} />,
  license_promotion: (s) => <ArrowUpFromLine size={s} />,
  comeback:          (s) => <Flame size={s} />,
  personal_best:     (s) => <Star size={s} />,
  new_track:         (s) => <MapPin size={s} />,
  new_car:           (s) => <Car size={s} />,
  century:           (s) => <Clock size={s} />,
  iron_man:          (s) => <Flame size={s} />,
  heartbreak:        (s) => <HeartCrack size={s} />,
}

const ACCENT: Record<string, string> = {
  win_streak:        '#ffd700',
  podium_streak:     '#ffd700',
  clean_streak:      '#43a047',
  milestone_irating: '#e53935',
  license_promotion: '#1e88e5',
  comeback:          '#ff9800',
  personal_best:     '#7c6cf0',
  new_track:         '#00acc1',
  new_car:           '#00acc1',
  century:           '#ffb300',
  iron_man:          '#ff5722',
  heartbreak:        '#e53935',
}

function formatRelative(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const days = Math.floor((now - then) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const trackKey = (name: string | undefined | null) => (name || '').toLowerCase()

// ── Card ──────────────────────────────────────────────────────────────────────

function MomentCard({ moment, lookups }: { moment: Moment; lookups: MomentLookups }) {
  const accent = ACCENT[moment.type] || '#888'
  const icon = ICON[moment.type]

  const tKey = trackKey(moment.trackName)
  const trackSvgPath = lookups.trackMapLookup[tKey] || null
  const trackLogoSvg = lookups.trackLogoLookup[tKey] || null
  const trackDisplayName = lookups.trackDisplayNameLookup[tKey] || moment.trackName
  const brandInfo = moment.carModel ? lookups.brandLogoLookup[moment.carModel] ?? null : null

  const brandLogoSrc = brandInfo?.logoSvg
    ? `data:image/svg+xml,${encodeURIComponent(brandInfo.logoSvg)}`
    : brandInfo?.logoPng
      ? `data:image/png;base64,${brandInfo.logoPng}`
      : null

  return (
    <div
      className="relative rounded-lg overflow-hidden flex items-stretch gap-0 w-[300px] shrink-0"
      style={{
        background: `linear-gradient(135deg, ${accent}18 0%, ${accent}06 100%)`,
        border: `1px solid ${accent}30`,
      }}
    >
      {/* Accent glow */}
      <div
        className="absolute top-0 left-0 w-12 h-12 rounded-full blur-xl opacity-30"
        style={{ background: accent }}
      />

      {/* Badge — full-height, context-aware: car moments prefer brand logo, track moments prefer track assets */}
      <div
        className="relative shrink-0 w-10 flex items-center justify-center overflow-hidden rounded-l-lg"
        style={{ background: `${accent}20`, color: accent }}
      >
        {(() => {
          const isCarMoment = moment.type === 'new_car'
          const isTrackMoment = moment.type === 'new_track'

          // Tint filter: make logo monochrome white with accent glow
          const tint = `brightness(0) invert(1) drop-shadow(0 0 3px ${accent})`
          // Zoomed + cropped to abstract the artwork
          const zoomStyle = { filter: tint, opacity: 0.7, transform: 'scale(2.8)', transformOrigin: 'center' }
          const zoomSvgStyle = { opacity: 0.7, transform: 'scale(2.4)', transformOrigin: 'center' }

          // Car moments: brand logo first
          if (isCarMoment && brandLogoSrc) {
            return <img src={brandLogoSrc} alt="" className="w-8 h-8 object-contain" style={zoomStyle} />
          }
          // Track moments: track map first, then track logo
          if (isTrackMoment) {
            if (trackSvgPath) return <svg viewBox="0 0 100 100" className="w-10 h-10" style={zoomSvgStyle}><path d={trackSvgPath} fill="none" stroke={accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
            if (trackLogoSvg) return <img src={`data:image/svg+xml,${encodeURIComponent(trackLogoSvg)}`} alt="" className="w-8 h-8 object-contain" style={zoomStyle} />
          }
          // Everything else: track map → track logo → brand logo → Lucide icon
          if (trackSvgPath) return <svg viewBox="0 0 100 100" className="w-10 h-10" style={zoomSvgStyle}><path d={trackSvgPath} fill="none" stroke={accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
          if (trackLogoSvg) return <img src={`data:image/svg+xml,${encodeURIComponent(trackLogoSvg)}`} alt="" className="w-8 h-8 object-contain" style={zoomStyle} />
          if (brandLogoSrc) return <img src={brandLogoSrc} alt="" className="w-8 h-8 object-contain" style={zoomStyle} />
          return icon ? icon(20) : <Star size={20} />
        })()}
      </div>

      {/* Content */}
      <div className="relative flex-1 min-w-0 p-3">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span
            className="text-lg font-bold leading-none"
            style={{ color: accent }}
          >
            {moment.title}
          </span>
          <span className="text-xs text-[var(--text-muted)] leading-none shrink-0">
            {formatRelative(moment.date)}
          </span>
        </div>
        <p className="text-md text-[var(--text-dim)] leading-tight line-clamp-2">
          {moment.description}
        </p>
       
      </div>
    </div>
  )
}

// ── Export ─────────────────────────────────────────────────────────────────────

export default function RecentMoments({
  moments,
  trackMapLookup,
  trackLogoLookup,
  trackDisplayNameLookup,
  brandLogoLookup,
}: { moments: Moment[] } & MomentLookups) {
  if (moments.length === 0) return null

  const lookups: MomentLookups = { trackMapLookup, trackLogoLookup, trackDisplayNameLookup, brandLogoLookup }

  return (
    <div className="flex gap-3 overflow-x-auto">
      {moments.map((m, i) => (
        <MomentCard key={`${m.type}-${m.date}-${i}`} moment={m} lookups={lookups} />
      ))}
    </div>
  )
}
