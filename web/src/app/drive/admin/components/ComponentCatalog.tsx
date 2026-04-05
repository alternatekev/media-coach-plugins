'use client'

import { useState, ReactNode } from 'react'
import { SearchFilterBar, GameBadge, StatCard } from '@/app/drive/admin/components'
import IRatingSparkline from '@/app/drive/dashboard/IRatingSparkline'

// ── Component registry ─────────────────────────────────────────────

type Platform = 'web' | 'overlay'
type Category = 'admin' | 'dashboard' | 'shared' | 'driving' | 'race-info' | 'pit-strategy' | 'commentary' | 'visualization' | 'marketing'

interface ComponentEntry {
  name: string
  element?: string
  file: string
  platform: Platform
  category: Category
  description: string
  storyId?: string         // Storybook story path for deep link
  preview?: () => ReactNode // live render
}

// ── Storybook base URL ──
const SB = 'http://localhost:6006/?path=/story/'

// ── Registry with live previews ──

const components: ComponentEntry[] = [
  // ── Web: Admin ──
  {
    name: 'GameBadge',
    file: 'web/src/app/drive/admin/components.tsx',
    platform: 'web',
    category: 'admin',
    description: 'Colored pill badge showing game name with semi-transparent tinted background.',
    storyId: 'admin-gamebadge--all-games',
    preview: () => (
      <div className="flex gap-2">
        <GameBadge game="iracing" />
        <GameBadge game="lmu" />
        <GameBadge game="acc" />
      </div>
    ),
  },
  {
    name: 'StatCard',
    file: 'web/src/app/drive/admin/components.tsx',
    platform: 'web',
    category: 'admin',
    description: 'Stat display with label and value. Supports color variants for positive/negative states.',
    storyId: 'admin-statcard--stats-row',
    preview: () => (
      <div className="grid grid-cols-4 gap-2">
        <StatCard label="Total" value={1247} />
        <StatCard label="OK" value={1221} color="green" />
        <StatCard label="Failed" value={26} color="red" />
        <StatCard label="Avg" value="142ms" color="muted" />
      </div>
    ),
  },
  {
    name: 'SearchFilterBar',
    file: 'web/src/app/drive/admin/components.tsx',
    platform: 'web',
    category: 'admin',
    description: 'Search input with game filter dropdown and sort options. Used across Track Maps and Car Brands.',
    storyId: 'admin-searchfilterbar--default',
    preview: () => (
      <SearchFilterBar
        search=""
        onSearch={() => {}}
        game=""
        onGame={() => {}}
        sort="name-asc"
        onSort={() => {}}
      />
    ),
  },
  {
    name: 'OverviewCards',
    file: 'web/src/app/drive/admin/OverviewCards.tsx',
    platform: 'web',
    category: 'admin',
    description: 'Admin dashboard overview with 4 summary cards. Hero artwork from commentary photos, small multiples (SVG tracks, logo circles, user avatars, log success bars).',
  },
  {
    name: 'TrackCard',
    file: 'web/src/app/drive/admin/tracks/TracksSection.tsx',
    platform: 'web',
    category: 'admin',
    description: 'Track management card with SVG preview, editable display name, sector count toggle (3 ↔ 7), game badges, and delete action.',
  },
  {
    name: 'LogoCard',
    file: 'web/src/app/drive/admin/brands/BrandsSection.tsx',
    platform: 'web',
    category: 'admin',
    description: 'Brand logo card with SVG/PNG preview, color picker, game badges, opacity-tinted background, and clear-logo action.',
  },
  {
    name: 'MissingLogoCard',
    file: 'web/src/app/drive/admin/brands/BrandsSection.tsx',
    platform: 'web',
    category: 'admin',
    description: 'Empty-state brand card for brands without uploaded logos. Shows brand name over color background with file upload.',
  },
  {
    name: 'AdminNav',
    file: 'web/src/app/drive/admin/AdminNav.tsx',
    platform: 'web',
    category: 'admin',
    description: 'Tab navigation with active route highlighting. Left-aligned data pages, right-aligned tool pages.',
  },

  // ── Web: Dashboard ──
  {
    name: 'IRatingSparkline',
    file: 'web/src/app/drive/dashboard/IRatingSparkline.tsx',
    platform: 'web',
    category: 'dashboard',
    description: 'Tiny SVG sparkline chart showing iRating trend. Color-coded: green (up), red (down), gray (flat).',
    storyId: 'dashboard-iratingsparkline--multiple-sparklines',
    preview: () => (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-muted)] w-12">Road</span>
          <IRatingSparkline values={[1850, 1870, 1890, 1920, 1960, 2010]} />
          <span className="text-xs text-[var(--green)] font-mono">2010</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-muted)] w-12">Oval</span>
          <IRatingSparkline values={[1500, 1480, 1460, 1440, 1420, 1400]} />
          <span className="text-xs text-red-400 font-mono">1400</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-muted)] w-12">Dirt</span>
          <IRatingSparkline values={[1200, 1210, 1205, 1208, 1202, 1206]} />
          <span className="text-xs text-[var(--text-dim)] font-mono">1206</span>
        </div>
      </div>
    ),
  },
  {
    name: 'RaceCard',
    file: 'web/src/app/drive/dashboard/RaceCard.tsx',
    platform: 'web',
    category: 'dashboard',
    description: 'Session history card with track photo background, SVG track outline, position badge (P1–P3 podium colors, DNF red), best lap, incidents, and iRating sparkline.',
  },
  {
    name: 'LogoCustomizer',
    file: 'web/src/app/drive/dashboard/LogoCustomizer.tsx',
    platform: 'web',
    category: 'dashboard',
    description: 'User-facing logo URL editor for custom overlay branding. Live preview, HTTPS validation, reset to default.',
  },

  // ── Web: Marketing / Shared ──
  {
    name: 'FeatureShowcase',
    file: 'web/src/components/telemetry/FeatureShowcase.tsx',
    platform: 'web',
    category: 'marketing',
    description: 'Auto-cycling feature carousel showing 13 overlay modules with screenshots and descriptions. 8-second cycle with manual selection.',
  },
  {
    name: 'TelemetryStatus',
    file: 'web/src/components/telemetry/TelemetryStatus.tsx',
    platform: 'web',
    category: 'shared',
    description: 'Live telemetry connection status with connection indicator, latency, track/car info, and real-time value grid.',
  },
  {
    name: 'ChannelBanner',
    file: 'web/src/components/youtube/ChannelBanner.tsx',
    platform: 'web',
    category: 'marketing',
    description: 'YouTube channel header with thumbnail, title, subscriber/video/view counts, and subscribe button.',
  },
  {
    name: 'VideoGrid',
    file: 'web/src/components/youtube/VideoGrid.tsx',
    platform: 'web',
    category: 'marketing',
    description: 'Responsive video grid with type filtering (Videos/Shorts/Live). Cards show thumbnail, title, duration, view count.',
  },

  // ── Overlay: Driving ──
  {
    name: 'Tachometer',
    element: 'racecor-tachometer',
    file: 'racecor-overlay/modules/components/tachometer.js',
    platform: 'overlay',
    category: 'driving',
    description: 'RPM gauge with segmented color bar (green/yellow/red zones), large gear display, speed readout. Flashes at 91%+ RPM.',
  },
  {
    name: 'DriveHUD',
    element: 'racecor-drive-hud',
    file: 'racecor-overlay/modules/components/drive-hud.js',
    platform: 'overlay',
    category: 'driving',
    description: '3-column driving display: track map with player/opponent dots, position/lap delta/sector times, incident counter. Supports 3 or 7 sectors.',
  },
  {
    name: 'PedalCurves',
    element: 'racecor-pedal-curves',
    file: 'racecor-overlay/modules/components/pedal-curves.js',
    platform: 'overlay',
    category: 'driving',
    description: 'Canvas-based pedal input visualization with throttle/brake/clutch curves, histogram overlay, and response curve display.',
  },
  {
    name: 'Datastream',
    element: 'racecor-datastream',
    file: 'racecor-overlay/modules/components/datastream.js',
    platform: 'overlay',
    category: 'driving',
    description: 'Telemetry readout panel with G-force diamond, yaw rate waveform, steering torque, track temperature, lap delta.',
  },
  {
    name: 'SectorHUD',
    element: 'racecor-sector-hud',
    file: 'racecor-overlay/modules/components/sector-hud.js',
    platform: 'overlay',
    category: 'driving',
    description: 'Sector time display with color coding: green (faster), amber (slower), red (much slower), purple (personal best).',
  },

  // ── Overlay: Race Info ──
  {
    name: 'Leaderboard',
    element: 'racecor-leaderboard',
    file: 'racecor-overlay/modules/components/leaderboard.js',
    platform: 'overlay',
    category: 'race-info',
    description: 'Full standings table with driver names, positions, gaps, iRating, and Canvas-rendered sparkline history.',
  },
  {
    name: 'PositionCard',
    element: 'racecor-position-card',
    file: 'racecor-overlay/modules/components/position-card.js',
    platform: 'overlay',
    category: 'race-info',
    description: 'Current position display (P1, P2, etc.) with iRating and Safety Rating. Cycles through rating categories.',
  },
  {
    name: 'GapDisplay',
    element: 'racecor-gap-display',
    file: 'racecor-overlay/modules/components/gap-display.js',
    platform: 'overlay',
    category: 'race-info',
    description: 'Time gap to car ahead/behind with driver names. Color-coded: green shrinking, red growing.',
  },
  {
    name: 'Incidents',
    element: 'racecor-incidents',
    file: 'racecor-overlay/modules/components/incidents.js',
    platform: 'overlay',
    category: 'race-info',
    description: 'Incident counter with penalty and disqualification threshold indicators. Flashes on new incidents.',
  },
  {
    name: 'RaceEnd',
    element: 'racecor-race-end',
    file: 'racecor-overlay/modules/components/race-end.js',
    platform: 'overlay',
    category: 'race-info',
    description: 'Post-race results screen: finishing position, best lap, incidents, iRating/SR delta. Auto-hides after 30s.',
  },

  // ── Overlay: Pit & Strategy ──
  {
    name: 'Pitbox',
    element: 'racecor-pitbox',
    file: 'racecor-overlay/modules/components/pitbox.js',
    platform: 'overlay',
    category: 'pit-strategy',
    description: 'Tabbed pit strategy panel: Fuel, Tires, Strategy tabs. Fuel consumption, tire wear/selection, pit window timing.',
  },
  {
    name: 'FuelGauge',
    element: 'racecor-fuel-gauge',
    file: 'racecor-overlay/modules/components/fuel-gauge.js',
    platform: 'overlay',
    category: 'pit-strategy',
    description: 'Fuel level with consumption rate per lap and laps remaining estimate. Color transitions green → amber → red.',
  },
  {
    name: 'TireGrid',
    element: 'racecor-tire-grid',
    file: 'racecor-overlay/modules/components/tire-grid.js',
    platform: 'overlay',
    category: 'pit-strategy',
    description: '2×2 tire grid: temperature, wear percentage, and compound indicator for each wheel position.',
  },

  // ── Overlay: Commentary & Status ──
  {
    name: 'Commentary',
    element: 'racecor-commentary',
    file: 'racecor-overlay/modules/components/commentary.js',
    platform: 'overlay',
    category: 'commentary',
    description: 'AI commentary text panel with dynamic sentiment coloring (hue-based). Auto-shows on new messages with slide-in animation.',
  },
  {
    name: 'CommentaryViz',
    element: 'racecor-commentary-viz',
    file: 'racecor-overlay/modules/components/commentary-viz.js',
    platform: 'overlay',
    category: 'commentary',
    description: 'Enhanced commentary with Canvas-based telemetry visualization charts and backdrop track image.',
  },
  {
    name: 'RaceControl',
    element: 'racecor-race-control',
    file: 'racecor-overlay/modules/components/race-control.js',
    platform: 'overlay',
    category: 'commentary',
    description: 'Full-width flag banner (yellow, red, checkered, black, meatball) with animated stripe pattern and auto-dismiss.',
  },

  // ── Overlay: Visualization ──
  {
    name: 'DriverProfile',
    element: 'racecor-driver-profile',
    file: 'racecor-overlay/modules/components/driver-profile.js',
    platform: 'overlay',
    category: 'visualization',
    description: 'Driver analytics panel with iRating/SR trend sparklines and session statistics.',
  },
  {
    name: 'RaceTimeline',
    element: 'racecor-race-timeline',
    file: 'racecor-overlay/modules/components/race-timeline.js',
    platform: 'overlay',
    category: 'visualization',
    description: 'Position history heat-map strip showing position changes throughout the race.',
  },
  {
    name: 'WebGL FX',
    element: 'racecor-webgl-fx',
    file: 'racecor-overlay/modules/components/webgl-fx.js',
    platform: 'overlay',
    category: 'visualization',
    description: 'WebGL2 effects engine for glow, bloom, and ambient lighting post-processing.',
  },
]

// ── Category metadata ──

const categoryMeta: Record<Category, { label: string; color: string }> = {
  admin: { label: 'Admin', color: 'bg-red-500/20 text-red-400' },
  dashboard: { label: 'Dashboard', color: 'bg-blue-500/20 text-blue-400' },
  shared: { label: 'Shared', color: 'bg-green-500/20 text-green-400' },
  marketing: { label: 'Marketing', color: 'bg-amber-500/20 text-amber-400' },
  driving: { label: 'Driving', color: 'bg-cyan-500/20 text-cyan-400' },
  'race-info': { label: 'Race Info', color: 'bg-purple-500/20 text-purple-400' },
  'pit-strategy': { label: 'Pit & Strategy', color: 'bg-orange-500/20 text-orange-400' },
  commentary: { label: 'Commentary', color: 'bg-pink-500/20 text-pink-400' },
  visualization: { label: 'Visualization', color: 'bg-indigo-500/20 text-indigo-400' },
}

// ── Render ──

function PlatformBadge({ platform }: { platform: Platform }) {
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
      platform === 'web' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
    }`}>
      {platform === 'web' ? 'React' : 'Web Component'}
    </span>
  )
}

function CategoryBadge({ category }: { category: Category }) {
  const meta = categoryMeta[category]
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${meta.color}`}>
      {meta.label}
    </span>
  )
}

function ComponentCard({ entry }: { entry: ComponentEntry }) {
  const storyUrl = entry.storyId ? `${SB}${entry.storyId}` : null

  return (
    <div className="border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] hover:border-[var(--border-accent)] transition-colors overflow-hidden">
      {/* Live preview */}
      {entry.preview && (
        <div className="border-b border-[var(--border-subtle)] bg-[var(--bg)] p-4">
          {entry.preview()}
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-base font-bold text-[var(--text)]">{entry.name}</h3>
            {entry.element && (
              <code className="text-[10px] text-[var(--text-muted)] font-mono">&lt;{entry.element}&gt;</code>
            )}
          </div>
          <div className="flex gap-1.5">
            <PlatformBadge platform={entry.platform} />
            <CategoryBadge category={entry.category} />
          </div>
        </div>

        <p className="text-xs text-[var(--text-dim)] mb-3 leading-relaxed">{entry.description}</p>

        <div className="flex items-center justify-between">
          <code className="text-[10px] text-[var(--text-muted)] font-mono truncate">{entry.file}</code>
          {storyUrl && (
            <a
              href={storyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-medium text-[var(--purple)] hover:underline ml-3 shrink-0"
            >
              Open in Storybook ↗
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

type Filter = 'all' | 'web' | 'overlay'

export default function ComponentCatalog() {
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')

  const filtered = components.filter(c => {
    if (filter !== 'all' && c.platform !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        (c.element && c.element.toLowerCase().includes(q))
      )
    }
    return true
  })

  // Group by category
  const grouped = new Map<Category, ComponentEntry[]>()
  for (const c of filtered) {
    const list = grouped.get(c.category) || []
    list.push(c)
    grouped.set(c.category, list)
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex gap-1 border-b border-[var(--border)]">
          {([
            { id: 'all' as Filter, label: 'All', count: components.length },
            { id: 'web' as Filter, label: 'Web', count: components.filter(c => c.platform === 'web').length },
            { id: 'overlay' as Filter, label: 'Overlay', count: components.filter(c => c.platform === 'overlay').length },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 text-sm font-medium tracking-wide uppercase transition-colors border-b-2 -mb-[1px] ${
                filter === tab.id
                  ? 'text-[var(--text)] border-[var(--text)]'
                  : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-dim)]'
              }`}
            >
              {tab.label} <span className="text-[10px] text-[var(--text-muted)] ml-1">{tab.count}</span>
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search components…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="ml-auto px-3 py-1.5 rounded-md bg-[var(--bg-panel)] border border-[var(--border)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--border-accent)] w-64"
        />
      </div>

      {/* Storybook link */}
      <div className="flex items-center justify-between mb-8">
        <div className="text-xs text-[var(--text-muted)]">
          <strong className="text-[var(--text)]">{filtered.length}</strong> components
          {' · '}
          <strong className="text-blue-400">{filtered.filter(c => c.platform === 'web').length}</strong> React
          {' · '}
          <strong className="text-purple-400">{filtered.filter(c => c.platform === 'overlay').length}</strong> Web Components
        </div>
        <a
          href="http://localhost:6006"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-[var(--purple)] hover:underline"
        >
          Open Storybook ↗
        </a>
      </div>

      {/* Grouped cards */}
      {Array.from(grouped.entries()).map(([category, entries]) => (
        <section key={category} className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <CategoryBadge category={category} />
            <span className="text-xs text-[var(--text-muted)]">{entries.length} components</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {entries.map(entry => (
              <ComponentCard key={`${entry.name}-${entry.platform}`} entry={entry} />
            ))}
          </div>
        </section>
      ))}

      {filtered.length === 0 && (
        <p className="text-sm text-[var(--text-muted)] italic py-12 text-center">
          No components match your search.
        </p>
      )}
    </div>
  )
}
