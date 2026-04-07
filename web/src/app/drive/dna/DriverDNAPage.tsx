'use client'

import { useMemo } from 'react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { Target, Swords, Shield, Timer, Shuffle, TrendingUp, CloudRain, Star, TrendingDown, Minus } from 'lucide-react'
import { computeDriverDNA, generateInsights, getDriverArchetype } from '@/lib/driver-dna'

interface SessionData {
  finishPosition: number | null
  incidentCount: number | null
  metadata: Record<string, any> | null
  carModel: string
  trackName: string | null
  gameName: string | null
  createdAt: string
}

interface RatingData {
  iRating: number
  prevIRating: number | null
  createdAt: string
}

interface Props {
  sessions: SessionData[]
  ratingHistory: RatingData[]
}

const dimensionIcons: Record<string, React.ReactNode> = {
  consistency: <Target className="w-5 h-5" />,
  racecraft: <Swords className="w-5 h-5" />,
  cleanness: <Shield className="w-5 h-5" />,
  endurance: <Timer className="w-5 h-5" />,
  adaptability: <Shuffle className="w-5 h-5" />,
  improvement: <TrendingUp className="w-5 h-5" />,
  wetWeather: <CloudRain className="w-5 h-5" />,
  experience: <Star className="w-5 h-5" />,
}

export default function DriverDNAPage({ sessions, ratingHistory }: Props) {
  const { dna, insights, archetype, hasData } = useMemo(() => {
    const computedDNA = computeDriverDNA(sessions, ratingHistory)
    const computedInsights = generateInsights(computedDNA, sessions, ratingHistory)
    const computedArchetype = getDriverArchetype(computedDNA)
    const hasEnoughData = sessions.length >= 3

    return {
      dna: computedDNA,
      insights: computedInsights,
      archetype: computedArchetype,
      hasData: hasEnoughData,
    }
  }, [sessions, ratingHistory])

  // Prepare radar chart data, skip wetWeather if it's at default 50
  const radarData = useMemo(() => {
    const data = [
      { dimension: 'Consistency', value: dna.consistency, fullMark: 100 },
      { dimension: 'Racecraft', value: dna.racecraft, fullMark: 100 },
      { dimension: 'Cleanness', value: dna.cleanness, fullMark: 100 },
      { dimension: 'Endurance', value: dna.endurance, fullMark: 100 },
      { dimension: 'Adaptability', value: dna.adaptability, fullMark: 100 },
      { dimension: 'Improvement', value: dna.improvement, fullMark: 100 },
      // Skip wetWeather if default 50, or show grayed out
      dna.wetWeather !== 50 ? { dimension: 'Wet Weather', value: dna.wetWeather, fullMark: 100 } : null,
      { dimension: 'Experience', value: dna.experience, fullMark: 100 },
    ].filter(Boolean)
    return data
  }, [dna])

  if (!hasData) {
    return (
      <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text)' }}>
              Driver DNA
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Your unique racing profile and performance insights
            </p>
          </div>

          {/* Empty state */}
          <div
            className="rounded-lg p-12 text-center"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderWidth: '1px' }}
          >
            <div className="mb-6 opacity-50">
              <Target className="w-16 h-16 mx-auto" style={{ color: 'var(--k10-red)' }} />
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text)' }}>
              Complete at least 3 races to generate your Driver DNA profile
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              You currently have {sessions.length} race{sessions.length !== 1 ? 's' : ''} logged. Keep racing and your profile will unlock!
            </p>
          </div>

          {/* Grayed out radar for visual reference */}
          <div className="mt-12 rounded-lg p-8" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderWidth: '1px' }}>
            <div className="opacity-30">
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                  <PolarRadiusAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} domain={[0, 100]} />
                  <Radar name="Driver DNA" dataKey="value" stroke="#e53935" fill="#e53935" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text)' }}>
            Driver DNA
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-lg font-semibold" style={{ color: 'var(--k10-red)' }}>
              {archetype.name}
            </p>
            <p style={{ color: 'var(--text-secondary)' }}>
              {archetype.description}
            </p>
          </div>
        </div>

        {/* Radar Chart */}
        <div
          className="rounded-lg p-8 mb-12"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderWidth: '1px' }}
        >
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis dataKey="dimension" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
              <PolarRadiusAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'var(--text)' }}
              />
              <Radar name="Driver DNA" dataKey="value" stroke="#e53935" fill="#e53935" fillOpacity={0.25} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Dimension Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {insights.map((insight) => {
            const icon = dimensionIcons[insight.dimension]
            const trendIcon =
              insight.trend === 'improving' ? (
                <TrendingUp className="w-4 h-4" style={{ color: '#4caf50' }} />
              ) : insight.trend === 'declining' ? (
                <TrendingDown className="w-4 h-4" style={{ color: '#f44336' }} />
              ) : (
                <Minus className="w-4 h-4" style={{ color: '#9e9e9e' }} />
              )

            const trendLabel =
              insight.trend === 'improving' ? 'Improving' : insight.trend === 'declining' ? 'Declining' : 'Stable'
            const trendColor =
              insight.trend === 'improving' ? '#4caf50' : insight.trend === 'declining' ? '#f44336' : '#9e9e9e'

            return (
              <div
                key={insight.dimension}
                className="rounded-lg p-6"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderWidth: '1px' }}
              >
                {/* Header: Icon + Name + Numeric Score */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div style={{ color: 'var(--k10-red)' }}>{icon}</div>
                    <h3 className="font-semibold" style={{ color: 'var(--text)' }}>
                      {insight.label}
                    </h3>
                  </div>
                  <span className="text-lg font-bold" style={{ color: 'var(--k10-red)' }}>
                    {Math.round(insight.value)}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--border)' }}
                  >
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${insight.value}%`,
                        background: `linear-gradient(90deg, var(--k10-red), rgba(229, 57, 53, 0.6))`,
                      }}
                    />
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs mb-3" style={{ color: 'var(--text-dim)' }}>
                  {insight.description}
                </p>

                {/* Trend Badge */}
                <div className="flex items-center gap-1 w-fit px-2 py-1 rounded-full" style={{ backgroundColor: `${trendColor}15` }}>
                  {trendIcon}
                  <span className="text-xs font-medium" style={{ color: trendColor }}>
                    {trendLabel}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
