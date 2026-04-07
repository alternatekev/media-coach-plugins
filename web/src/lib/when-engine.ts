export interface TemporalSlice {
  label: string
  sessionCount: number
  avgPosition: number | null
  avgIRatingDelta: number | null
  avgIncidents: number
  winRate: number
  podiumRate: number
  topTenRate: number
}

export interface WhenInsight {
  type: 'positive' | 'negative' | 'neutral'
  text: string
}

export interface WhenProfile {
  byHour: TemporalSlice[]          // 24 slots
  byDayOfWeek: TemporalSlice[]     // 7 slots (Mon=0 through Sun=6)
  bySessionLength: TemporalSlice[]  // Short/Medium/Long
  peakHours: string
  peakDays: string
  worstHours: string
  worstDays: string
  insights: WhenInsight[]
  heatmapData: { day: number; hour: number; score: number; count: number }[]
}

interface RaceSession {
  id: string
  userId: string
  carModel: string
  manufacturer?: string
  category: string
  gameName: string
  trackName?: string | null
  sessionType?: string | null
  finishPosition: number | null
  incidentCount: number | null
  metadata: Record<string, any> | null
  createdAt: Date | string
}

interface RatingHistoryEntry {
  id: string
  userId: string
  category: string
  iRating: number
  safetyRating: string
  license: string
  prevIRating: number | null
  prevSafetyRating?: string | null
  prevLicense?: string | null
  sessionType?: string | null
  trackName?: string | null
  carModel?: string | null
  createdAt: Date | string
}

function createEmptyTemporalSlice(label: string): TemporalSlice {
  return {
    label,
    sessionCount: 0,
    avgPosition: null,
    avgIRatingDelta: null,
    avgIncidents: 0,
    winRate: 0,
    podiumRate: 0,
    topTenRate: 0,
  }
}

function getHourLabel(hour: number): string {
  if (hour === 0) return '12a'
  if (hour < 12) return `${hour}a`
  if (hour === 12) return '12p'
  return `${hour - 12}p`
}

function getDayLabel(day: number): string {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return days[day] || 'Unknown'
}

function getSessionLengthBucket(completedLaps: number | null | undefined): 'Short' | 'Medium' | 'Long' {
  if (!completedLaps) return 'Short'
  if (completedLaps < 15) return 'Short'
  if (completedLaps <= 30) return 'Medium'
  return 'Long'
}

function findClosestRatingHistory(
  sessionDate: Date,
  ratingHistory: RatingHistoryEntry[]
): RatingHistoryEntry | null {
  let closest: RatingHistoryEntry | null = null
  let minDiff = Infinity

  for (const entry of ratingHistory) {
    const entryDate = new Date(entry.createdAt)
    const diff = Math.abs(entryDate.getTime() - sessionDate.getTime())

    if (diff < minDiff) {
      minDiff = diff
      closest = entry
    }
  }

  return closest
}

export function computeWhenProfile(
  sessions: RaceSession[],
  ratingHistory: RatingHistoryEntry[]
): WhenProfile {
  // Initialize 24-hour slices
  const byHour: TemporalSlice[] = Array.from({ length: 24 }, (_, i) =>
    createEmptyTemporalSlice(getHourLabel(i))
  )

  // Initialize 7-day slices (Mon=0 through Sun=6)
  const byDayOfWeek: TemporalSlice[] = Array.from({ length: 7 }, (_, i) =>
    createEmptyTemporalSlice(getDayLabel(i))
  )

  // Initialize session length slices
  const bySessionLength: TemporalSlice[] = [
    createEmptyTemporalSlice('Short'),
    createEmptyTemporalSlice('Medium'),
    createEmptyTemporalSlice('Long'),
  ]

  // Aggregate data
  const hourData: { positions: number[]; deltas: number[]; incidents: number[] }[] = Array.from({ length: 24 }, () => ({
    positions: [],
    deltas: [],
    incidents: [],
  }))
  const dayData: { positions: number[]; deltas: number[]; incidents: number[] }[] = Array.from({ length: 7 }, () => ({
    positions: [],
    deltas: [],
    incidents: [],
  }))
  const lengthData: { positions: number[]; deltas: number[]; incidents: number[] }[] = [
    { positions: [], deltas: [], incidents: [] },
    { positions: [], deltas: [], incidents: [] },
    { positions: [], deltas: [], incidents: [] },
  ]

  const heatmapDataMap: Map<string, { score: number; count: number; scores: number[] }> = new Map()

  for (const session of sessions) {
    const sessionDate = new Date(session.createdAt)
    const hour = sessionDate.getHours()
    const day = (sessionDate.getDay() + 6) % 7 // Convert Sun=0 to Mon=0
    const completedLaps = session.metadata?.completedLaps as number | null
    const preRaceIRating = session.metadata?.preRaceIRating as number | null

    // Find iRating delta
    let iRatingDelta: number | null = null
    if (preRaceIRating !== null && preRaceIRating !== undefined) {
      const closest = findClosestRatingHistory(sessionDate, ratingHistory)
      if (closest && closest.prevIRating) {
        iRatingDelta = closest.iRating - closest.prevIRating
      }
    }

    // Extract metrics
    const position = session.finishPosition ?? null
    const incidents = session.incidentCount ?? 0
    const lengthBucket = getSessionLengthBucket(completedLaps)
    const lengthIdx = lengthBucket === 'Short' ? 0 : lengthBucket === 'Medium' ? 1 : 2

    // Add to hourly data
    if (position !== null) hourData[hour].positions.push(position)
    if (iRatingDelta !== null) hourData[hour].deltas.push(iRatingDelta)
    hourData[hour].incidents.push(incidents)

    // Add to daily data
    if (position !== null) dayData[day].positions.push(position)
    if (iRatingDelta !== null) dayData[day].deltas.push(iRatingDelta)
    dayData[day].incidents.push(incidents)

    // Add to session length data
    if (position !== null) lengthData[lengthIdx].positions.push(position)
    if (iRatingDelta !== null) lengthData[lengthIdx].deltas.push(iRatingDelta)
    lengthData[lengthIdx].incidents.push(incidents)

    // Add to heatmap
    const heatKey = `${day}-${hour}`
    const existing = heatmapDataMap.get(heatKey) || { score: 0, count: 0, scores: [] }
    if (iRatingDelta !== null) {
      existing.scores.push(iRatingDelta)
    } else if (position !== null) {
      // Fallback: normalize position (lower is better)
      existing.scores.push((100 - Math.min(position, 100)) / 100)
    } else {
      // Fallback: inverse incident rate
      existing.scores.push(1 / (1 + incidents / 10))
    }
    existing.count += 1
    heatmapDataMap.set(heatKey, existing)
  }

  // Compute averages for hour
  for (let i = 0; i < 24; i++) {
    const h = hourData[i]
    byHour[i].sessionCount = h.positions.length + h.deltas.length + h.incidents.length
    byHour[i].avgPosition = h.positions.length > 0 ? h.positions.reduce((a, b) => a + b, 0) / h.positions.length : null
    byHour[i].avgIRatingDelta = h.deltas.length > 0 ? h.deltas.reduce((a, b) => a + b, 0) / h.deltas.length : null
    byHour[i].avgIncidents = h.incidents.length > 0 ? h.incidents.reduce((a, b) => a + b, 0) / h.incidents.length : 0
    byHour[i].winRate = h.positions.filter(p => p === 1).length / Math.max(h.positions.length, 1)
    byHour[i].podiumRate = h.positions.filter(p => p >= 1 && p <= 3).length / Math.max(h.positions.length, 1)
    byHour[i].topTenRate = h.positions.filter(p => p >= 1 && p <= 10).length / Math.max(h.positions.length, 1)
  }

  // Compute averages for day of week
  for (let i = 0; i < 7; i++) {
    const d = dayData[i]
    byDayOfWeek[i].sessionCount = d.positions.length + d.deltas.length + d.incidents.length
    byDayOfWeek[i].avgPosition = d.positions.length > 0 ? d.positions.reduce((a, b) => a + b, 0) / d.positions.length : null
    byDayOfWeek[i].avgIRatingDelta = d.deltas.length > 0 ? d.deltas.reduce((a, b) => a + b, 0) / d.deltas.length : null
    byDayOfWeek[i].avgIncidents = d.incidents.length > 0 ? d.incidents.reduce((a, b) => a + b, 0) / d.incidents.length : 0
    byDayOfWeek[i].winRate = d.positions.filter(p => p === 1).length / Math.max(d.positions.length, 1)
    byDayOfWeek[i].podiumRate = d.positions.filter(p => p >= 1 && p <= 3).length / Math.max(d.positions.length, 1)
    byDayOfWeek[i].topTenRate = d.positions.filter(p => p >= 1 && p <= 10).length / Math.max(d.positions.length, 1)
  }

  // Compute averages for session length
  for (let i = 0; i < 3; i++) {
    const l = lengthData[i]
    bySessionLength[i].sessionCount = l.positions.length + l.deltas.length + l.incidents.length
    bySessionLength[i].avgPosition = l.positions.length > 0 ? l.positions.reduce((a, b) => a + b, 0) / l.positions.length : null
    bySessionLength[i].avgIRatingDelta = l.deltas.length > 0 ? l.deltas.reduce((a, b) => a + b, 0) / l.deltas.length : null
    bySessionLength[i].avgIncidents = l.incidents.length > 0 ? l.incidents.reduce((a, b) => a + b, 0) / l.incidents.length : 0
    bySessionLength[i].winRate = l.positions.filter(p => p === 1).length / Math.max(l.positions.length, 1)
    bySessionLength[i].podiumRate = l.positions.filter(p => p >= 1 && p <= 3).length / Math.max(l.positions.length, 1)
    bySessionLength[i].topTenRate = l.positions.filter(p => p >= 1 && p <= 10).length / Math.max(l.positions.length, 1)
  }

  // Compute heatmap data with normalization
  const allScores = Array.from(heatmapDataMap.values()).flatMap(d => d.scores)
  const minScore = Math.min(...allScores, 0)
  const maxScore = Math.max(...allScores, 1)
  const scoreRange = maxScore - minScore || 1

  const heatmapData: { day: number; hour: number; score: number; count: number }[] = []
  heatmapDataMap.forEach((data, key) => {
    const [day, hour] = key.split('-').map(Number)
    const avgScore = data.scores.length > 0 ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length : 0
    const normalizedScore = (avgScore - minScore) / scoreRange
    heatmapData.push({ day, hour, score: Math.max(0, Math.min(1, normalizedScore)), count: data.count })
  })

  // Find peak and worst hours/days
  const peakHourIdx = byHour.reduce((bestIdx, slice, idx) => {
    const bestSlice = byHour[bestIdx]
    const bestScore = (bestSlice.avgIRatingDelta ?? 0) + bestSlice.podiumRate * 50
    const currentScore = (slice.avgIRatingDelta ?? 0) + slice.podiumRate * 50
    return currentScore > bestScore ? idx : bestIdx
  }, 0)

  const worstHourIdx = byHour.reduce((worstIdx, slice, idx) => {
    const worstSlice = byHour[worstIdx]
    const worstScore = (worstSlice.avgIRatingDelta ?? 0) + worstSlice.podiumRate * 50
    const currentScore = (slice.avgIRatingDelta ?? 0) + slice.podiumRate * 50
    return currentScore < worstScore ? idx : worstIdx
  }, 0)

  const peakDayIdx = byDayOfWeek.reduce((bestIdx, slice, idx) => {
    const bestSlice = byDayOfWeek[bestIdx]
    const bestScore = (bestSlice.avgIRatingDelta ?? 0) + bestSlice.podiumRate * 50
    const currentScore = (slice.avgIRatingDelta ?? 0) + slice.podiumRate * 50
    return currentScore > bestScore ? idx : bestIdx
  }, 0)

  const worstDayIdx = byDayOfWeek.reduce((worstIdx, slice, idx) => {
    const worstSlice = byDayOfWeek[worstIdx]
    const worstScore = (worstSlice.avgIRatingDelta ?? 0) + worstSlice.podiumRate * 50
    const currentScore = (slice.avgIRatingDelta ?? 0) + slice.podiumRate * 50
    return currentScore < worstScore ? idx : worstIdx
  }, 0)

  return {
    byHour,
    byDayOfWeek,
    bySessionLength,
    peakHours: byHour[peakHourIdx].label,
    peakDays: byDayOfWeek[peakDayIdx].label,
    worstHours: byHour[worstHourIdx].label,
    worstDays: byDayOfWeek[worstDayIdx].label,
    insights: [],
    heatmapData,
  }
}

export function generateWhenInsights(profile: WhenProfile): WhenInsight[] {
  const insights: WhenInsight[] = []

  // Find peak and worst hours
  const peakHour = profile.byHour.find(h => h.label === profile.peakHours)!
  const worstHour = profile.byHour.find(h => h.label === profile.worstHours)!

  // Compare best time slot vs worst (iRating delta)
  if (peakHour.avgIRatingDelta !== null && worstHour.avgIRatingDelta !== null) {
    const diff = peakHour.avgIRatingDelta - worstHour.avgIRatingDelta
    if (Math.abs(diff) > 20) {
      const direction = diff > 0 ? 'gain' : 'lose'
      const absValue = Math.abs(diff).toFixed(0)
      insights.push({
        type: diff > 0 ? 'positive' : 'negative',
        text: `You ${direction} an average of ${direction === 'gain' ? '+' : '-'}${absValue} iRating during ${profile.peakHours} but lose ${(worstHour.avgIRatingDelta < 0 ? worstHour.avgIRatingDelta.toFixed(0) : '-' + worstHour.avgIRatingDelta.toFixed(0))} during ${profile.worstHours}`,
      })
    }
  }

  // Day comparison
  const peakDay = profile.byDayOfWeek.find(d => d.label === profile.peakDays)!
  const weekdayDays = profile.byDayOfWeek.filter((_, i) => i < 5)
  const weekendDays = profile.byDayOfWeek.filter((_, i) => i >= 5)

  const peakDayPodiumRate = peakDay.podiumRate
  const weekdayAvgPodium = weekdayDays.length > 0 ? weekdayDays.reduce((sum, d) => sum + d.podiumRate, 0) / weekdayDays.length : 0
  const weekendAvgPodium = weekendDays.length > 0 ? weekendDays.reduce((sum, d) => sum + d.podiumRate, 0) / weekendDays.length : 0

  if (weekendAvgPodium - weekdayAvgPodium > 0.15) {
    insights.push({
      type: 'positive',
      text: `Weekends are your strongest days - your podium rate is ${(weekendAvgPodium * 100).toFixed(0)}% vs ${(weekdayAvgPodium * 100).toFixed(0)}% on weekdays`,
    })
  } else if (weekdayAvgPodium - weekendAvgPodium > 0.15) {
    insights.push({
      type: 'positive',
      text: `You perform better on weekdays - your podium rate is ${(weekdayAvgPodium * 100).toFixed(0)}% vs ${(weekendAvgPodium * 100).toFixed(0)}% on weekends`,
    })
  }

  // Session length comparison
  const shortPerf = profile.bySessionLength[0].podiumRate + (profile.bySessionLength[0].avgIRatingDelta ?? 0) / 100
  const mediumPerf = profile.bySessionLength[1].podiumRate + (profile.bySessionLength[1].avgIRatingDelta ?? 0) / 100
  const longPerf = profile.bySessionLength[2].podiumRate + (profile.bySessionLength[2].avgIRatingDelta ?? 0) / 100

  const maxPerf = Math.max(shortPerf, mediumPerf, longPerf)
  if (shortPerf === maxPerf) {
    insights.push({
      type: 'neutral',
      text: 'You perform best in short races - consider focusing on sprint formats',
    })
  } else if (mediumPerf === maxPerf) {
    insights.push({
      type: 'neutral',
      text: 'You perform best in medium-length races - you have good stamina and consistency',
    })
  } else if (longPerf === maxPerf) {
    insights.push({
      type: 'positive',
      text: 'You perform best in long races - your endurance and consistency shine in extended competitions',
    })
  }

  // Incident pattern
  const peakHourIncidents = worstHour.avgIncidents
  const avgIncidents = profile.byHour.reduce((sum, h) => sum + h.avgIncidents, 0) / profile.byHour.length
  if (peakHourIncidents > avgIncidents * 1.5) {
    insights.push({
      type: 'negative',
      text: `Your incident rate spikes during ${profile.worstHours} - fatigue or focus issues may be a factor`,
    })
  }

  return insights.slice(0, 6)
}
