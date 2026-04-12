import { normalizeForComparison, tokenize, jaccardSimilarity } from '@/lib/fuzzy-match'

/**
 * Input types for the scoring engine
 */

export interface SessionInput {
  id: string
  carModel: string
  manufacturer: string | null
  category: string
  gameName: string
  trackName: string | null
  sessionType: string | null
  finishPosition: number | null
  incidentCount: number | null
  metadata: {
    completedLaps?: number
    totalLaps?: number
    bestLapTime?: number
    preRaceIRating?: number
    estimatedIRatingDelta?: number
    startedAt?: string
    finishedAt?: string
  } | null
  createdAt: Date
}

export interface RatingInput {
  category: string
  iRating: number
  safetyRating: string
  license: string
  prevIRating: number | null
  prevSafetyRating: string | null
  prevLicense: string | null
  trackName: string | null
  carModel: string | null
  createdAt: Date
}

export interface DriverRatingInput {
  category: string
  iRating: number
  safetyRating: string
  license: string
}

export interface IRacingSchedule {
  season_id: number
  series_id: number
  series_name: string
  season_name: string
  official: boolean
  fixed_setup: boolean
  license_group: number
  license_group_name: string
  min_license_level: number
  track_types: Array<{ track_type: string }>
  schedules: Array<{
    race_week_num: number
    track: {
      track_id: number
      track_name: string
      config_name: string | null
      category: string
    }
    race_time_descriptors: Array<{
      repeating: boolean
      session_minutes: number
      session_times?: string[]
      day_offset?: number[]
      first_session_time?: string
      repeat_minutes?: number
    }>
    race_lap_limit?: number
    race_time_limit?: number
  }>
  car_classes: Array<{
    short_name: string
    name: string
    car_class_id: number
  }>
  start_date: string
}

/**
 * Output type
 */

export interface RaceSuggestion {
  seriesName: string
  trackName: string
  trackConfig: string | null
  category: string
  licenseClass: string
  isOfficial: boolean
  isFixed: boolean
  nextStartTime: Date
  minutesUntilStart: number
  sessionMinutes: number
  repeatMinutes: number | null
  score: number
  scoreBreakdown: {
    trackFamiliarity: number
    trackIncidentRate: number
    carFamiliarity: number
    timeOfDay: number
    dayOfWeek: number
    ratingTrend: number
  }
  strategy: {
    type: 'pitlane' | 'conservative' | 'careful' | 'form' | 'steady'
    text: string
  }
  commentary: string
}

/**
 * Internal helper types
 */

interface TimeOfDayScore {
  hour: number
  avgIncidentsPerLap: number
  sessionCount: number
}

interface DayOfWeekScore {
  dayOfWeek: number
  avgIncidentsPerLap: number
  sessionCount: number
}

interface RatingTrendData {
  avgIRatingDelta: number
  avgSafetyRatingDelta: number
  count: number
}

/**
 * Helper: License level mapping
 */
function licenseTolevel(license: string): number {
  const mapping: Record<string, number> = {
    R: 1,
    D: 5,
    C: 9,
    B: 13,
    A: 17,
    P: 25, // Pro license
  }
  return mapping[license] || 0
}

/**
 * Helper: Convert iRacing license level (1-20) to license class name
 */
function licenseLevelToClass(level: number): string {
  if (level <= 4) return 'Rookie'
  if (level <= 8) return 'D'
  if (level <= 12) return 'C'
  if (level <= 16) return 'B'
  return 'A'
}

/**
 * Helper: Fuzzy track name matching
 */
function tracksMatch(track1: string | null, track2: string | null): boolean {
  if (!track1 || !track2) return false
  const norm1 = normalizeForComparison(track1)
  const norm2 = normalizeForComparison(track2)
  return norm1 === norm2
}

/**
 * Helper: Fuzzy car model matching via Jaccard similarity
 */
function carsMatch(car1: string, car2: string, threshold = 0.6): boolean {
  const tokens1 = tokenize(car1)
  const tokens2 = tokenize(car2)
  const similarity = jaccardSimilarity(tokens1, tokens2)
  return similarity >= threshold
}

/**
 * Compute incidents per lap for a session
 */
function incidentsPerLap(session: SessionInput): number {
  const completedLaps = session.metadata?.completedLaps || 1
  const incidentCount = session.incidentCount || 0
  return incidentCount / Math.max(completedLaps, 1)
}

/**
 * Count races at a specific track
 */
function countTracksRaces(
  sessions: SessionInput[],
  targetTrack: string | null,
): number {
  if (!targetTrack) return 0
  return sessions.filter(s => tracksMatch(s.trackName, targetTrack)).length
}

/**
 * Compute Track Familiarity score (0-25)
 */
function scoreTrackFamiliarity(
  sessions: SessionInput[],
  targetTrack: string | null,
): number {
  const count = countTracksRaces(sessions, targetTrack)
  if (count === 0) return 0
  if (count >= 5) return 25
  if (count >= 3) return 20
  if (count === 2) return 15
  return 8
}

/**
 * Compute Track Incident Rate score (0-25)
 * Compares incidents/lap at track vs overall average
 */
function scoreTrackIncidentRate(
  sessions: SessionInput[],
  targetTrack: string | null,
): number {
  // Overall avg incidents/lap
  if (sessions.length === 0) return 10 // neutral
  const overallAvg =
    sessions.reduce((sum, s) => sum + incidentsPerLap(s), 0) / sessions.length

  // Track-specific avg
  const trackSessions = sessions.filter(s => tracksMatch(s.trackName, targetTrack))
  if (trackSessions.length === 0) return 10 // neutral

  const trackAvg =
    trackSessions.reduce((sum, s) => sum + incidentsPerLap(s), 0) /
    trackSessions.length

  if (overallAvg === 0) return 15 // can't compute ratio

  const ratio = trackAvg / overallAvg

  if (ratio < 0.5) return 25
  if (ratio < 0.8) return 20
  if (ratio < 1.0) return 15
  if (ratio < 1.2) return 10
  if (ratio < 1.5) return 5
  return 0
}

/**
 * Compute Car Familiarity score (0-15)
 * Check if any car in history matches car classes in series
 */
function scoreCarFamiliarity(
  sessions: SessionInput[],
  carClasses: Array<{ name: string }>,
): number {
  if (carClasses.length === 0) return 0

  const raceCount: Record<string, number> = {}
  for (const session of sessions) {
    for (const carClass of carClasses) {
      if (carsMatch(session.carModel, carClass.name, 0.6)) {
        raceCount[carClass.name] = (raceCount[carClass.name] || 0) + 1
      }
    }
  }

  const maxRaces = Math.max(...Object.values(raceCount), 0)

  if (maxRaces >= 5) return 15
  if (maxRaces >= 3) return 12
  if (maxRaces >= 1) return 6
  return 0
}

/**
 * Compute Time-of-Day Factor score (0-10)
 */
function scoreTimeOfDay(sessions: SessionInput[]): number {
  if (sessions.length < 5) return 5 // insufficient data

  const hourBuckets: Record<number, number[]> = {}

  for (const session of sessions) {
    const startDate = new Date(
      session.metadata?.startedAt || session.createdAt.toISOString(),
    )
    const hour = startDate.getUTCHours()
    const ipl = incidentsPerLap(session)

    if (!hourBuckets[hour]) {
      hourBuckets[hour] = []
    }
    hourBuckets[hour].push(ipl)
  }

  // Compute avg incidents/lap per hour
  const hourScores: TimeOfDayScore[] = Object.entries(hourBuckets).map(
    ([hour, incidents]) => ({
      hour: parseInt(hour, 10),
      avgIncidentsPerLap: incidents.reduce((a, b) => a + b, 0) / incidents.length,
      sessionCount: incidents.length,
    }),
  )

  // Sort by avg incidents/lap (ascending = best)
  hourScores.sort((a, b) => a.avgIncidentsPerLap - b.avgIncidentsPerLap)

  // Find quartile for first hour
  const bestHour = hourScores[0].hour
  const percentile = hourScores.findIndex(h => h.hour === bestHour) / hourScores.length

  if (percentile <= 0.25) return 10
  if (percentile <= 0.5) return 7
  if (percentile <= 0.75) return 4
  return 0
}

/**
 * Compute Day-of-Week Factor score (0-10)
 */
function scoreDayOfWeek(sessions: SessionInput[]): number {
  if (sessions.length < 5) return 5 // insufficient data

  const dayBuckets: Record<number, number[]> = {}

  for (const session of sessions) {
    const startDate = new Date(
      session.metadata?.startedAt || session.createdAt.toISOString(),
    )
    const dayOfWeek = startDate.getUTCDay() // 0=Sunday, 1=Monday, ... 6=Saturday
    const ipl = incidentsPerLap(session)

    if (!dayBuckets[dayOfWeek]) {
      dayBuckets[dayOfWeek] = []
    }
    dayBuckets[dayOfWeek].push(ipl)
  }

  // Compute avg incidents/lap per day
  const dayScores: DayOfWeekScore[] = Object.entries(dayBuckets).map(
    ([day, incidents]) => ({
      dayOfWeek: parseInt(day, 10),
      avgIncidentsPerLap: incidents.reduce((a, b) => a + b, 0) / incidents.length,
      sessionCount: incidents.length,
    }),
  )

  // Sort by avg incidents/lap (ascending = best)
  dayScores.sort((a, b) => a.avgIncidentsPerLap - b.avgIncidentsPerLap)

  // Find quartile for best day
  const bestDay = dayScores[0].dayOfWeek
  const percentile = dayScores.findIndex(d => d.dayOfWeek === bestDay) / dayScores.length

  if (percentile <= 0.25) return 10
  if (percentile <= 0.5) return 7
  if (percentile <= 0.75) return 4
  return 0
}

/**
 * Compute Rating Trend score (0-15)
 * From last 5 rating history entries in matching category
 */
function scoreRatingTrend(
  ratingHistory: RatingInput[],
  category: string,
): number {
  const categoryHistory = ratingHistory
    .filter(r => r.category === category)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  if (categoryHistory.length === 0) return 8 // unknown

  // Compute avg iR and SR deltas
  let totalIRDelta = 0
  let totalSRDelta = 0
  let validEntries = 0

  for (const entry of categoryHistory) {
    if (entry.prevIRating !== null) {
      totalIRDelta += entry.iRating - entry.prevIRating
      validEntries++
    }
    if (entry.prevSafetyRating !== null) {
      const srCurrent = parseFloat(entry.safetyRating)
      const srPrev = parseFloat(entry.prevSafetyRating)
      if (!isNaN(srCurrent) && !isNaN(srPrev)) {
        totalSRDelta += srCurrent - srPrev
      }
    }
  }

  const avgIRDelta = validEntries > 0 ? totalIRDelta / validEntries : 0
  const avgSRDelta = validEntries > 0 ? totalSRDelta / validEntries : 0

  let score = 0

  // iR trend scoring
  if (avgIRDelta >= 0) {
    score += 8
  } else if (avgIRDelta >= -30) {
    score += 4
  }
  // else score += 0

  // SR trend scoring
  if (avgSRDelta >= 0) {
    score += 7
  } else if (avgSRDelta >= -0.05) {
    score += 3
  }
  // else score += 0

  return Math.min(score, 15)
}

/**
 * Determine strategy based on rating history
 */
function computeStrategy(
  ratingHistory: RatingInput[],
  category: string,
): { type: 'pitlane' | 'conservative' | 'careful' | 'form' | 'steady'; text: string } {
  const categoryHistory = ratingHistory
    .filter(r => r.category === category)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  if (categoryHistory.length === 0) {
    return {
      type: 'steady',
      text: 'Steady approach — focus on finishing well',
    }
  }

  let totalIRDelta = 0
  let totalSRDelta = 0
  let validIREntries = 0
  let validSREntries = 0

  for (const entry of categoryHistory) {
    if (entry.prevIRating !== null) {
      totalIRDelta += entry.iRating - entry.prevIRating
      validIREntries++
    }
    if (entry.prevSafetyRating !== null) {
      const srCurrent = parseFloat(entry.safetyRating)
      const srPrev = parseFloat(entry.prevSafetyRating)
      if (!isNaN(srCurrent) && !isNaN(srPrev)) {
        totalSRDelta += srCurrent - srPrev
        validSREntries++
      }
    }
  }

  const avgIRDelta = validIREntries > 0 ? totalIRDelta / validIREntries : 0
  const avgSRDelta = validSREntries > 0 ? totalSRDelta / validSREntries : 0

  if (avgIRDelta < -30 && avgSRDelta < 0) {
    return {
      type: 'pitlane',
      text: 'Start from pit lane — focus on clean, incident-free laps',
    }
  }

  if (avgIRDelta < -30 && avgSRDelta >= 0) {
    return {
      type: 'conservative',
      text: 'Conservative start — avoid lap-1 chaos, build rhythm',
    }
  }

  if (avgIRDelta >= -30 && avgSRDelta < -0.05) {
    return {
      type: 'careful',
      text: 'Careful with contact — pace is there but incidents are costly',
    }
  }

  if (avgIRDelta >= 0 && avgSRDelta >= 0) {
    return {
      type: 'form',
      text: 'You\'re on form — fight for position from the grid',
    }
  }

  return {
    type: 'steady',
    text: 'Steady approach — focus on finishing well',
  }
}

/**
 * Generate commentary for a race suggestion
 */
function generateCommentary(
  suggestion: Omit<RaceSuggestion, 'commentary'>,
  trackFamiliarityCount: number,
): string {
  const familiarityLevel =
    trackFamiliarityCount === 0
      ? 'new track'
      : trackFamiliarityCount === 1
        ? 'familiar'
        : 'well-known'

  const incidentStatus =
    suggestion.scoreBreakdown.trackIncidentRate >= 25
      ? 'strong track record'
      : suggestion.scoreBreakdown.trackIncidentRate >= 15
        ? 'solid record'
        : suggestion.scoreBreakdown.trackIncidentRate >= 10
          ? 'variable record'
          : 'needs improvement'

  const raceInterval =
    suggestion.repeatMinutes === null
      ? `next race in ${suggestion.minutesUntilStart} minutes`
      : `races repeat every ${suggestion.repeatMinutes} minutes`

  return `${suggestion.licenseClass}-class series with a ${familiarityLevel}. You have a ${incidentStatus} here — ${raceInterval}.`
}

/**
 * Parse session time from iRacing format (HH:MM:SS UTC)
 */
function parseUTCTime(timeStr: string | undefined): number {
  if (!timeStr) return 0 // midnight UTC
  const [hours, minutes, seconds] = timeStr.split(':').map(Number)
  return (hours || 0) * 60 + (minutes || 0) + (seconds || 0) / 60
}

/**
 * Find next race start time from race_time_descriptor
 */
function findNextRaceStart(
  descriptor: IRacingSchedule['schedules'][0]['race_time_descriptors'][0],
  now: Date,
): { nextStart: Date; repeatMinutes: number | null } | null {
  // For repeating sessions
  if (descriptor.repeating && descriptor.day_offset && descriptor.first_session_time) {
    const dayOffset = descriptor.day_offset
    const firstSessionMinutes = parseUTCTime(descriptor.first_session_time)
    const repeatMinutes = descriptor.repeat_minutes || 0

    // Current UTC day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
    let currentDayOfWeek = now.getUTCDay()
    const currentHourOfDay = now.getUTCHours()
    const currentMinuteOfDay = currentHourOfDay * 60 + now.getUTCMinutes()

    // Find next matching day and time
    for (let daysAhead = 0; daysAhead < 14; daysAhead++) {
      const checkDate = new Date(now)
      checkDate.setUTCDate(checkDate.getUTCDate() + daysAhead)
      const checkDayOfWeek = checkDate.getUTCDay()

      if (dayOffset.includes(checkDayOfWeek)) {
        // Check if we can fit a session start on this day
        const candidateDate = new Date(checkDate)
        candidateDate.setUTCHours(Math.floor(firstSessionMinutes / 60))
        candidateDate.setUTCMinutes(firstSessionMinutes % 60)
        candidateDate.setUTCSeconds(0)

        // If it's today, check if we need a future session
        if (daysAhead === 0) {
          // Try to find a future session time on this day
          let sessionTime = candidateDate.getTime()
          while (sessionTime < now.getTime()) {
            sessionTime += repeatMinutes * 60 * 1000
          }
          const minutesUntil = (sessionTime - now.getTime()) / (60 * 1000)
          if (minutesUntil >= 5 && minutesUntil <= 120) {
            return {
              nextStart: new Date(sessionTime),
              repeatMinutes: repeatMinutes || null,
            }
          }
        } else {
          // Future day: just use first session time
          const minutesUntil = (candidateDate.getTime() - now.getTime()) / (60 * 1000)
          if (minutesUntil >= 5 && minutesUntil <= 120) {
            return {
              nextStart: candidateDate,
              repeatMinutes: repeatMinutes || null,
            }
          }
        }
      }
    }
  }

  // For non-repeating sessions
  if (!descriptor.repeating && descriptor.session_times) {
    for (const sessionTimeStr of descriptor.session_times) {
      const sessionStart = new Date(sessionTimeStr)
      const minutesUntil = (sessionStart.getTime() - now.getTime()) / (60 * 1000)
      if (minutesUntil >= 5 && minutesUntil <= 120) {
        return {
          nextStart: sessionStart,
          repeatMinutes: null,
        }
      }
    }
  }

  return null
}

/**
 * Main export function
 */
export function computeNextRaceIdeas(
  sessions: SessionInput[],
  ratingHistory: RatingInput[],
  driverRatings: DriverRatingInput[],
  schedule: IRacingSchedule[],
): RaceSuggestion[] {
  const now = new Date()
  const suggestions: RaceSuggestion[] = []

  // Build a map of category -> driver current license
  const driverLicenseMap = new Map<string, number>()
  for (const rating of driverRatings) {
    driverLicenseMap.set(rating.category, licenseTolevel(rating.license))
  }

  // Filter sessions to relevant categories
  const categoriesWithData = new Set(driverRatings.map(r => r.category))

  // Process each season in the schedule
  for (const season of schedule) {
    // Check if driver has a license for this season's license group
    const driverHasLicense = Array.from(categoriesWithData).some(category => {
      const driverLevel = driverLicenseMap.get(category) || 0
      return driverLevel >= season.min_license_level
    })

    if (!driverHasLicense) {
      continue
    }

    // Process each schedule in this season
    for (const scheduleItem of season.schedules) {
      const track = scheduleItem.track
      const category = track.category || 'road'

      // Check if driver has data for this category
      if (!categoriesWithData.has(category)) {
        continue
      }

      const driverLevel = driverLicenseMap.get(category) || 0
      if (driverLevel < season.min_license_level) {
        continue
      }

      // Find next race start time from race time descriptors
      let bestNextStart: { nextStart: Date; repeatMinutes: number | null } | null = null
      for (const descriptor of scheduleItem.race_time_descriptors) {
        const candidate = findNextRaceStart(descriptor, now)
        if (candidate) {
          if (
            !bestNextStart ||
            candidate.nextStart.getTime() < bestNextStart.nextStart.getTime()
          ) {
            bestNextStart = candidate
          }
        }
      }

      if (!bestNextStart) {
        continue
      }

      // Get sessions for this category only
      const categorySessions = sessions.filter(s => s.category === category)

      // Compute all scoring components
      const trackFamiliarityScore = scoreTrackFamiliarity(
        categorySessions,
        track.track_name,
      )
      const trackIncidentScore = scoreTrackIncidentRate(
        categorySessions,
        track.track_name,
      )
      const carFamiliarityScore = scoreCarFamiliarity(categorySessions, season.car_classes)
      const timeOfDayScore = scoreTimeOfDay(categorySessions)
      const dayOfWeekScore = scoreDayOfWeek(categorySessions)
      const ratingTrendScore = scoreRatingTrend(ratingHistory, category)

      const totalScore =
        trackFamiliarityScore +
        trackIncidentScore +
        carFamiliarityScore +
        timeOfDayScore +
        dayOfWeekScore +
        ratingTrendScore

      const minutesUntilStart =
        (bestNextStart.nextStart.getTime() - now.getTime()) / (60 * 1000)

      const strategy = computeStrategy(ratingHistory, category)

      const licenseClass = licenseLevelToClass(season.min_license_level)

      const trackFamiliarityCount = countTracksRaces(categorySessions, track.track_name)

      const suggestion: RaceSuggestion = {
        seriesName: season.series_name,
        trackName: track.track_name,
        trackConfig: track.config_name,
        category,
        licenseClass,
        isOfficial: season.official,
        isFixed: season.fixed_setup,
        nextStartTime: bestNextStart.nextStart,
        minutesUntilStart,
        sessionMinutes: scheduleItem.race_time_descriptors[0].session_minutes || 60,
        repeatMinutes: bestNextStart.repeatMinutes,
        score: Math.round(totalScore),
        scoreBreakdown: {
          trackFamiliarity: trackFamiliarityScore,
          trackIncidentRate: trackIncidentScore,
          carFamiliarity: carFamiliarityScore,
          timeOfDay: timeOfDayScore,
          dayOfWeek: dayOfWeekScore,
          ratingTrend: ratingTrendScore,
        },
        strategy,
        commentary: generateCommentary(
          {
            seriesName: season.series_name,
            trackName: track.track_name,
            trackConfig: track.config_name,
            category,
            licenseClass,
            isOfficial: season.official,
            isFixed: season.fixed_setup,
            nextStartTime: bestNextStart.nextStart,
            minutesUntilStart,
            sessionMinutes: scheduleItem.race_time_descriptors[0].session_minutes || 60,
            repeatMinutes: bestNextStart.repeatMinutes,
            score: Math.round(totalScore),
            scoreBreakdown: {
              trackFamiliarity: trackFamiliarityScore,
              trackIncidentRate: trackIncidentScore,
              carFamiliarity: carFamiliarityScore,
              timeOfDay: timeOfDayScore,
              dayOfWeek: dayOfWeekScore,
              ratingTrend: ratingTrendScore,
            },
            strategy,
          },
          trackFamiliarityCount,
        ),
      }

      suggestions.push(suggestion)
    }
  }

  // Sort by score descending and return top 5
  return suggestions.sort((a, b) => b.score - a.score).slice(0, 5)
}
