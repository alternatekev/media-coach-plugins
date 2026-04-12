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

// ── Compact row for stacked layout ───────────────────────────────────────────

function CompactMomentRow({ moment, lookups }: { moment: Moment; lookups: MomentLookups }) {
  const accent = ACCENT[moment.type] || '#888'
  const icon = ICON[moment.type]

  const tKey = trackKey(moment.trackName)
  const trackSvgPath = lookups.trackMapLookup[tKey] || null
  const trackLogoSvg = lookups.trackLogoLookup[tKey] || null
  const brandInfo = moment.carModel ? lookups.brandLogoLookup[moment.carModel] ?? null : null

  const brandLogoSrc = brandInfo?.logoSvg
    ? `data:image/svg+xml,${encodeURIComponent(brandInfo.logoSvg)}`
    : brandInfo?.logoPng
      ? `data:image/png;base64,${brandInfo.logoPng}`
      : null

  // Context-aware badge content
  const isCarMoment = moment.type === 'new_car'
  const isTrackMoment = moment.type === 'new_track'
  const tint = `brightness(0) invert(1) drop-shadow(0 0 2px ${accent})`

  function BadgeContent() {
    if (isCarMoment && brandLogoSrc) {
      return <img src={brandLogoSrc} alt="" className="w-5 h-5 object-contain" style={{ filter: tint, opacity: 0.8 }} />
    }
    if (isTrackMoment && trackSvgPath) {
      return (
        <svg viewBox="0 0 100 100" className="w-6 h-6" style={{ opacity: 0.8 }}>
          <path d={trackSvgPath} fill="none" stroke={accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    }
    if (trackSvgPath) {
      return (
        <svg viewBox="0 0 100 100" className="w-6 h-6" style={{ opacity: 0.8 }}>
          <path d={trackSvgPath} fill="none" stroke={accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    }
    if (trackLogoSvg) {
      return <img src={`data:image/svg+xml,${encodeURIComponent(trackLogoSvg)}`} alt="" className="w-5 h-5 object-contain" style={{ filter: tint, opacity: 0.8 }} />
    }
    if (brandLogoSrc) {
      return <img src={brandLogoSrc} alt="" className="w-5 h-5 object-contain" style={{ filter: tint, opacity: 0.8 }} />
    }
    return icon ? icon(14) : <Star size={14} />
  }

  return (
    <div
      className="relative flex items-center gap-2.5 px-3 py-2 rounded-lg overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${accent}12 0%, ${accent}04 100%)`,
        border: `1px solid ${accent}20`,
      }}
    >
      {/* Badge */}
      <div
        className="shrink-0 w-8 h-8 rounded-md flex items-center justify-center"
        style={{ background: `${accent}18`, color: accent }}
      >
        <BadgeContent />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className="text-sm font-bold leading-none truncate"
            style={{ color: accent }}
          >
            {moment.title}
          </span>
          <span className="text-xs text-[var(--text-muted)] leading-none shrink-0">
            {formatRelative(moment.date)}
          </span>
        </div>
        <p className="text-xs text-[var(--text-dim)] leading-tight truncate mt-0.5">
          {moment.description}
        </p>
      </div>
    </div>
  )
}

// ── Full card (original horizontal scroll layout) ────────────────────────────

function MomentCard({ moment, lookups }: { moment: Moment; lookups: MomentLookups }) {
  const accent = ACCENT[moment.type] || '#888'
  const icon = ICON[moment.type]

  const tKey = trackKey(moment.trackName)
  const trackSvgPath = lookups.trackMapLookup[tKey] || null
  const trackLogoSvg = lookups.trackLogoLookup[tKey] || null
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

      {/* Badge — full-height, context-aware */}
      <div
        className="relative shrink-0 w-10 flex items-center justify-center overflow-hidden rounded-l-lg"
        style={{ background: `${accent}20`, color: accent }}
      >
        {(() => {
          const isCarMoment = moment.type === 'new_car'
          const isTrackMoment = moment.type === 'new_track'
          const tint = `brightness(0) invert(1) drop-shadow(0 0 3px ${accent})`
          const zoomStyle = { filter: tint, opacity: 0.7, transform: 'scale(2.8)', transformOrigin: 'center' }
          const zoomSvgStyle = { opacity: 0.7, transform: 'scale(2.4)', transformOrigin: 'center' }

          if (isCarMoment && brandLogoSrc) {
            return <img src={brandLogoSrc} alt="" className="w-8 h-8 object-contain" style={zoomStyle} />
          }
          if (isTrackMoment) {
            if (trackSvgPath) return <svg viewBox="0 0 100 100" className="w-10 h-10" style={zoomSvgStyle}><path d={trackSvgPath} fill="none" stroke={accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
            if (trackLogoSvg) return <img src={`data:image/svg+xml,${encodeURIComponent(trackLogoSvg)}`} alt="" className="w-8 h-8 object-contain" style={zoomStyle} />
          }
          if (trackSvgPath) return <svg viewBox="0 0 100 100" className="w-10 h-10" style={zoomSvgStyle}><path d={trackSvgPath} fill="none" stroke={accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
          if (trackLogoSvg) return <img src={`data:image/svg+xml,${encodeURIComponent(trackLogoSvg)}`} alt="" className="w-8 h-8 object-contain" style={zoomStyle} />
          if (brandLogoSrc) return <img src={brandLogoSrc} alt="" className="w-8 h-8 object-contain" style={zoomStyle} />
          return icon ? icon(20) : <Star size={20} />
        })()}
      </div>

      {/* Content */}
      <div className="relative flex-1 min-w-0 p-3">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-lg font-bold leading-none" style={{ color: accent }}>
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

const HIGHLIGHT_GRADIENT: Record<string, string> = {
  win_streak:        'linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,215,0,0.05) 100%)',
  podium_streak:     'linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,215,0,0.05) 100%)',
  clean_streak:      'linear-gradient(135deg, rgba(67,160,71,0.15) 0%, rgba(67,160,71,0.05) 100%)',
  milestone_irating: 'linear-gradient(135deg, rgba(229,57,53,0.15) 0%, rgba(229,57,53,0.05) 100%)',
  license_promotion: 'linear-gradient(135deg, rgba(30,136,229,0.15) 0%, rgba(30,136,229,0.05) 100%)',
  comeback:          'linear-gradient(135deg, rgba(255,152,0,0.15) 0%, rgba(255,152,0,0.05) 100%)',
  iron_man:          'linear-gradient(135deg, rgba(255,87,34,0.15) 0%, rgba(255,87,34,0.05) 100%)',
}

function HighlightCard({ moment, lookups }: { moment: Moment; lookups: MomentLookups }) {
  const accent = ACCENT[moment.type] || '#888'
  const icon = ICON[moment.type]
  const bg = HIGHLIGHT_GRADIENT[moment.type] || 'var(--bg-elevated)'

  return (
    <div
      className="rounded-xl border p-4 overflow-hidden"
      style={{
        background: bg,
        borderColor: `${accent}30`,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center mt-0.5"
          style={{ background: `${accent}20`, color: accent }}
        >
          {icon ? icon(18) : <Star size={18} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-bold leading-tight truncate" style={{ color: accent }}>
              {moment.title}
            </span>
          </div>
          <p className="text-xs text-[var(--text-dim)] leading-snug line-clamp-2 mb-1.5">
            {moment.description}
          </p>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span>{formatRelative(moment.date)}</span>
            {moment.gameName && (
              <>
                <span className="opacity-40">·</span>
                <span>{moment.gameName}</span>
              </>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-xl font-bold leading-none" style={{ color: accent }}>
            {moment.significance}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RecentMoments({
  moments,
  highlights = [],
  trackMapLookup,
  trackLogoLookup,
  trackDisplayNameLookup,
  brandLogoLookup,
  compact = false,
}: { moments: Moment[]; highlights?: Moment[]; compact?: boolean } & MomentLookups) {
  if (moments.length === 0 && highlights.length === 0) return null

  const lookups: MomentLookups = { trackMapLookup, trackLogoLookup, trackDisplayNameLookup, brandLogoLookup }

  if (compact) {
    return (
      <div className="space-y-3">
        {/* Highlights */}
        {highlights.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-[var(--text-secondary)]" />
              <h3 className="text-sm font-semibold text-[var(--text-secondary)]">
                Highlights
              </h3>
            </div>
            <div className="flex flex-col gap-2">
              {highlights.map((m, i) => (
                <HighlightCard key={`hl-${m.type}-${m.date}-${i}`} moment={m} lookups={lookups} />
              ))}
            </div>
          </div>
        )}

        {/* Recent timeline */}
        {moments.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Star size={16} className="text-[var(--text-secondary)]" />
              <h3 className="text-sm font-semibold text-[var(--text-secondary)]">
                Recent Moments
              </h3>
            </div>
            <div className="flex flex-col gap-1">
              {moments.map((m, i) => (
                <CompactMomentRow key={`${m.type}-${m.date}-${i}`} moment={m} lookups={lookups} />
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex gap-3 overflow-x-auto">
      {moments.map((m, i) => (
        <MomentCard key={`${m.type}-${m.date}-${i}`} moment={m} lookups={lookups} />
      ))}
    </div>
  )
}
