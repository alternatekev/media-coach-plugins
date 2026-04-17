'use client'

import React from 'react'
import Link from 'next/link'
import { MapPin, Trophy, Shield, Gauge, Car, Clock, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from 'recharts'
import IncidentHeatmap from '../../components/IncidentHeatmap'

// ── Types ───────────────────────────────────────────────────────────────────────

interface TrackDetailClientProps {
  trackName: string
  trackDisplayName: string | null
  trackSvgPath: string | null
  trackLogoSvg: string | null
  trackImageUrl: string | null
  trackLocation: { country: string; flag: string; city: string } | null
  sectorBoundaries?: number[]
  incidentLocations: Array<{ trackPosition: number; count: number; type?: string }>
  mastery: {
    masteryScore: number
    masteryTier: 'bronze' | 'silver' | 'gold' | 'diamond'
    trend: 'improving' | 'declining' | 'stable' | 'new'
  } | null
  stats: {
    totalRaces: number
    totalLaps: number
    avgPosition: number | null
    bestPosition: number | null
    avgIncidents: number
    totalIncidents: number
    wins: number
    podiums: number
    cleanRaces: number
  }
  positionHistory: Array<{ date: string; position: number; incidents: number; carModel: string }>
  lapTimeHistory: Array<{ date: string; bestLapTime: number; carModel: string }>
  irHistory: Array<{ date: string; iRating: number; delta: number }>
  carsUsed: Array<{ car: string; count: number }>
  brandLookup: Record<string, { logoSvg: string | null; logoPng: string | null; brandColor: string | null }>
  recentSessions: Array<{
    id: string; carModel: string; finishPosition: number | null
    incidentCount: number; sessionType: string; date: string; irDelta: number | null
  }>
  narrativeSummary: string
}

const tierConfig = {
  bronze:  { color: 'hsl(30,50%,55%)',  bg: 'hsla(30,50%,55%,0.15)',  label: 'Bronze' },
  silver:  { color: 'hsl(0,0%,72%)',    bg: 'hsla(0,0%,72%,0.15)',    label: 'Silver' },
  gold:    { color: 'hsl(45,90%,55%)',   bg: 'hsla(45,90%,55%,0.15)',   label: 'Gold' },
  diamond: { color: 'hsl(200,90%,65%)',  bg: 'hsla(200,90%,65%,0.15)',  label: 'Diamond' },
}

const trendIcons = {
  improving: <TrendingUp size={14} className="text-emerald-400" />,
  declining: <TrendingDown size={14} className="text-rose-400" />,
  stable: <Minus size={14} className="text-blue-400" />,
  new: <Sparkles size={14} className="text-purple-400" />,
}

const CAR_COLORS = ['#e53935', '#42a5f5', '#ffb300', '#7c6cf0', '#00acc1', '#43a047', '#ff7043', '#ab47bc']

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatLapTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return mins > 0 ? `${mins}:${secs.toFixed(2).padStart(5, '0')}` : `${secs.toFixed(2)}s`
}

// ── Car Legend with brand logos ──────────────────────────────────────────────────

function CarLegend({
  carNames, colorMap, brandLookup, statLabel,
}: {
  carNames: string[]
  colorMap: Record<string, string>
  brandLookup: Record<string, { logoSvg: string | null; logoPng: string | null; brandColor: string | null }>
  statLabel: (car: string) => string
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3">
      {carNames.map(car => {
        const brand = brandLookup[car]
        const color = colorMap[car]
        const logoSrc = brand?.logoSvg
          ? `data:image/svg+xml,${encodeURIComponent(brand.logoSvg)}`
          : brand?.logoPng
            ? `data:image/png;base64,${brand.logoPng}`
            : null

        return (
          <div key={car} className="flex items-center gap-2">
            {/* Circular logo badge */}
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              style={{ background: `${color}30`, border: `1.5px solid ${color}` }}
            >
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt=""
                  className="w-3.5 h-3.5 object-contain"
                  style={{ filter: 'brightness(0) invert(1)', opacity: 0.85 }}
                />
              ) : (
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              )}
            </div>
            <span className="text-sm text-[var(--text-secondary)]">{car}</span>
            <span className="text-xs text-[var(--text-muted)]" style={{ fontFamily: 'var(--ff-mono)' }}>
              ({statLabel(car)})
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Component ───────────────────────────────────────────────────────────────────

export default function TrackDetailClient(props: TrackDetailClientProps) {
  const {
    trackName, trackDisplayName, trackSvgPath, trackLogoSvg,
    trackImageUrl, trackLocation, sectorBoundaries, incidentLocations,
    mastery, stats, positionHistory, lapTimeHistory, irHistory, carsUsed,
    recentSessions, narrativeSummary, brandLookup,
  } = props

  const tier = mastery ? tierConfig[mastery.masteryTier] : null
  const label = trackDisplayName || trackName

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-[var(--bg-panel)]">
        {trackImageUrl && (
          <img src={trackImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none" />
        )}
        {trackSvgPath && (
          <div className="absolute inset-0 flex items-center justify-end pointer-events-none opacity-30 pr-16">
            <svg viewBox="0 0 100 100" className="w-[500px] h-[500px]" preserveAspectRatio="xMidYMid meet">
              <path d={trackSvgPath} fill="none" stroke="var(--border-accent)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-panel)] via-[var(--bg-panel)]/80 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[var(--bg)] to-transparent pointer-events-none" />

        <div className="relative z-10 px-6 pt-4 pb-8 max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                {trackLogoSvg && (
                  <img src={`data:image/svg+xml,${encodeURIComponent(trackLogoSvg)}`} alt="" className="w-10 h-10 flex-shrink-0" />
                )}
                <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-[var(--text)]" style={{ fontFamily: 'var(--ff-display)' }}>
                  {label}
                </h1>
              </div>
              {trackLocation && (
                <div className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] mt-1">
                  <MapPin size={14} />
                  {trackLocation.city}, {trackLocation.country} {trackLocation.flag}
                </div>
              )}
              <p className="text-sm text-[var(--text-dim)] mt-3 max-w-xl">{narrativeSummary}</p>
            </div>

            {/* Mastery badge */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              {mastery && tier && (
                <div className="flex flex-col items-end">
                  <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Mastery</div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: tier.bg, border: `1px solid ${tier.color}44` }}>
                    <span className="text-3xl font-black" style={{ color: tier.color, fontFamily: 'var(--ff-display)' }}>
                      {mastery.masteryScore}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold" style={{ color: tier.color }}>{tier.label}</span>
                      <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                        {trendIcons[mastery.trend]}
                        {mastery.trend === 'new' ? 'New' : mastery.trend.charAt(0).toUpperCase() + mastery.trend.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: 'Races', value: stats.totalRaces, color: 'text-[var(--text)]' },
            { label: 'Laps', value: stats.totalLaps, color: 'text-[var(--text)]' },
            { label: 'Avg Pos', value: stats.avgPosition ? `P${stats.avgPosition.toFixed(1)}` : '—', color: 'text-[var(--text)]' },
            { label: 'Best', value: stats.bestPosition ? `P${stats.bestPosition}` : '—', color: 'text-emerald-400' },
            { label: 'Wins', value: stats.wins, color: 'text-yellow-400' },
            { label: 'Podiums', value: stats.podiums, color: 'text-amber-400' },
            { label: 'Avg Inc', value: stats.avgIncidents.toFixed(1), color: stats.avgIncidents <= 3 ? 'text-emerald-400' : 'text-amber-400' },
            { label: 'Clean', value: stats.cleanRaces, color: 'text-emerald-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-3">
              <div className="text-xs text-[var(--text-muted)] mb-1">{label}</div>
              <div className={`text-xl font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Position History — unified full-width chart, one line per car */}
        {positionHistory.length > 1 && (() => {
          const carNames = carsUsed.map(c => c.car)
          const colorMap = Object.fromEntries(carNames.map((name, i) => {
            const brand = brandLookup[name]
            return [name, brand?.brandColor || CAR_COLORS[i % CAR_COLORS.length]]
          }))
          const multiCar = carsUsed.length > 1

          // Pivot: one row per date, each car's position as its own key
          const byDate = new Map<string, Record<string, any>>()
          for (const p of positionHistory) {
            let row = byDate.get(p.date)
            if (!row) { row = { date: p.date }; byDate.set(p.date, row) }
            row[p.carModel] = p.position
          }
          const chartData = Array.from(byDate.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

          return (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
              <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Trophy size={16} className="text-[var(--border-accent)]" /> Position History
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickFormatter={formatDate} tickLine={false} axisLine={false} />
                  <YAxis reversed domain={[1, 'auto']} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(10,10,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                    labelFormatter={(v: any) => formatDate(v)}
                    formatter={(v: any, name: string) => [`P${v}`, name]}
                  />
                  {stats.avgPosition && <ReferenceLine y={stats.avgPosition} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />}
                  {carNames.map(car => (
                    <Line
                      key={car}
                      type="monotone"
                      dataKey={car}
                      stroke={colorMap[car]}
                      strokeWidth={2}
                      dot={{ fill: colorMap[car], r: 3 }}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              {multiCar && (
                <CarLegend carNames={carNames} colorMap={colorMap} brandLookup={brandLookup}
                  statLabel={(car) => {
                    const entries = positionHistory.filter(p => p.carModel === car)
                    return `avg P${(entries.reduce((s, e) => s + e.position, 0) / entries.length).toFixed(1)}`
                  }}
                />
              )}
            </div>
          )
        })()}

        {/* Lap Time History — best lap per session, one line per car */}
        {lapTimeHistory.length > 1 && (() => {
          const carNames = carsUsed.map(c => c.car)
          const colorMap = Object.fromEntries(carNames.map((name, i) => {
            const brand = brandLookup[name]
            return [name, brand?.brandColor || CAR_COLORS[i % CAR_COLORS.length]]
          }))
          const multiCar = carsUsed.length > 1

          // Pivot lap times by date
          const byDate = new Map<string, Record<string, any>>()
          for (const p of lapTimeHistory) {
            let row = byDate.get(p.date)
            if (!row) { row = { date: p.date }; byDate.set(p.date, row) }
            row[p.carModel] = p.bestLapTime
          }
          const chartData = Array.from(byDate.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          const carsWithData = carNames.filter(car => lapTimeHistory.some(l => l.carModel === car))

          return (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
              <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Clock size={16} className="text-[var(--border-accent)]" /> Best Lap Times
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickFormatter={formatDate} tickLine={false} axisLine={false} />
                  <YAxis
                    reversed
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                    tickFormatter={(v: number) => formatLapTime(v)}
                    tickLine={false} axisLine={false} width={55}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    contentStyle={{ background: 'rgba(10,10,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                    labelFormatter={(v: any) => formatDate(v)}
                    formatter={(v: any, name: string) => [formatLapTime(v), name]}
                  />
                  {carsWithData.map(car => (
                    <Line
                      key={car}
                      type="monotone"
                      dataKey={car}
                      stroke={colorMap[car]}
                      strokeWidth={2}
                      dot={{ fill: colorMap[car], r: 3 }}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              {multiCar && (
                <CarLegend carNames={carsWithData} colorMap={colorMap} brandLookup={brandLookup}
                  statLabel={(car) => {
                    const entries = lapTimeHistory.filter(l => l.carModel === car)
                    const best = Math.min(...entries.map(e => e.bestLapTime))
                    return formatLapTime(best)
                  }}
                />
              )}
            </div>
          )
        })()}

        {/* iRating at this track */}
        {irHistory.length > 1 && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
            <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Gauge size={16} className="text-[var(--border-accent)]" /> iRating at This Track
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={irHistory} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickFormatter={formatDate} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                <Tooltip
                  contentStyle={{ background: 'rgba(10,10,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                  labelFormatter={(v: any) => formatDate(v)}
                  formatter={(v: any) => [v >= 0 ? `+${v}` : v, 'iR Delta']}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                <Bar dataKey="delta" radius={[3, 3, 0, 0]} fill="#42a5f5">
                  {irHistory.map((entry, idx) => (
                    <rect key={idx} fill={entry.delta >= 0 ? '#4caf50' : '#f44336'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Incident Heatmap */}
        {trackSvgPath && incidentLocations.length > 0 && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
            <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Shield size={16} className="text-[var(--border-accent)]" /> Incident Hotspots (All Races)
            </h3>
            <IncidentHeatmap
              svgPath={trackSvgPath}
              incidents={incidentLocations}
              sectorBoundaries={sectorBoundaries}
              trackName={trackDisplayName || trackName}
              width={500}
              height={400}
            />
          </div>
        )}

        {/* Cars used at this track */}
        {carsUsed.length > 0 && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
            <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Car size={16} className="text-[var(--border-accent)]" /> Cars Driven Here
            </h3>
            <div className="space-y-2">
              {carsUsed.map(({ car, count }) => (
                <div key={car} className="flex items-center justify-between px-3 py-2 rounded bg-[var(--bg-panel)]">
                  <Link href={`/drive/car/${encodeURIComponent(car)}`} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors font-medium">
                    {car}
                  </Link>
                  <span className="text-xs text-[var(--text-muted)]">{count} race{count !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Races */}
        {recentSessions.length > 0 && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
            <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wider mb-4">Recent Races</h3>
            <div className="space-y-2">
              {recentSessions.map(s => {
                const pos = s.finishPosition
                const isDNF = !pos || pos === 0
                return (
                  <Link
                    key={s.id}
                    href={`/drive/race/${s.id}`}
                    className="flex items-center justify-between px-3 py-2.5 rounded bg-[var(--bg-panel)] hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`font-bold text-sm w-10 ${isDNF ? 'text-purple-400' : pos === 1 ? 'text-yellow-400' : pos! <= 3 ? 'text-amber-400' : 'text-[var(--text)]'}`} style={{ fontFamily: 'var(--ff-display)' }}>
                        {isDNF ? 'DNF' : `P${pos}`}
                      </span>
                      <span className="text-sm text-[var(--text-dim)]">{s.carModel}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                      <span>{s.incidentCount}x</span>
                      {s.irDelta !== null && (
                        <span className={s.irDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {s.irDelta >= 0 ? '+' : ''}{s.irDelta} iR
                        </span>
                      )}
                      <span>{formatDate(s.date)}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
