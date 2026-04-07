export interface DriverDNA {
  consistency: number      // 0-100, low lap time / position variance
  racecraft: number        // 0-100, positions gained, top finishes
  cleanness: number        // 0-100, inverse incident rate
  endurance: number        // 0-100, performance in longer sessions
  adaptability: number     // 0-100, breadth of cars/tracks
  improvement: number      // 0-100, iRating trend (50 = stable)
  wetWeather: number       // 0-100, placeholder at 50
  experience: number       // 0-100, total laps/races driven
}

export interface DNAInsight {
  dimension: keyof DriverDNA
  label: string
  value: number
  description: string
  trend: 'improving' | 'declining' | 'stable'
}

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

/**
 * Compute standard deviation of an array of numbers
 */
function stddev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  return Math.sqrt(variance)
}

/**
 * Compute linear regression slope for iRating over time
 */
function computeRatingSlope(ratingHistory: RatingData[]): number {
  if (ratingHistory.length < 2) return 0

  const sorted = [...ratingHistory].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  const n = sorted.length
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0

  sorted.forEach((rating, i) => {
    const x = i // time index
    const y = rating.iRating
    sumX += x
    sumY += y
    sumXY += x * y
    sumX2 += x * x
  })

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  return slope
}

/**
 * Main function to compute DriverDNA from sessions and rating history
 */
export function computeDriverDNA(sessions: SessionData[], ratingHistory: RatingData[]): DriverDNA {
  // CONSISTENCY: Group by trackName, compute stddev of finishPositions per track, average
  const trackSessions = new Map<string | null, number[]>()
  sessions.forEach((session) => {
    if (session.finishPosition !== null) {
      if (!trackSessions.has(session.trackName)) {
        trackSessions.set(session.trackName, [])
      }
      trackSessions.get(session.trackName)!.push(session.finishPosition)
    }
  })

  let consistencyScore = 50
  const tracksWithData = Array.from(trackSessions.values()).filter((positions) => positions.length >= 2)
  if (tracksWithData.length > 0) {
    const stddevs = tracksWithData.map((positions) => stddev(positions))
    const avgStddev = stddevs.reduce((a, b) => a + b, 0) / stddevs.length
    // stddev 0 = 100, stddev 5+ = 0, linear scale
    consistencyScore = Math.max(0, Math.min(100, 100 - (avgStddev / 5) * 100))
  }

  // RACECRAFT: Count top-5 finishes with weighting, cap at 100
  let racecraftScore = 50
  const sessionsWithPosition = sessions.filter((s) => s.finishPosition !== null)
  if (sessionsWithPosition.length > 0) {
    let weightedFinishes = 0
    sessionsWithPosition.forEach((session) => {
      const pos = session.finishPosition!
      if (pos === 1) weightedFinishes += 3
      else if (pos === 2) weightedFinishes += 2
      else if (pos === 3) weightedFinishes += 1.5
      else if (pos <= 5) weightedFinishes += 0.5
    })
    racecraftScore = Math.min(100, (weightedFinishes / sessionsWithPosition.length) * 100)
  }

  // CLEANNESS: avg incidents, scale from 8 avg
  let cleannessScore = 50
  const sessionsWithIncidents = sessions.filter((s) => s.incidentCount !== null)
  if (sessionsWithIncidents.length > 0) {
    const avgIncidents = sessionsWithIncidents.reduce((sum, s) => sum + s.incidentCount!, 0) / sessionsWithIncidents.length
    cleannessScore = Math.max(0, (1 - avgIncidents / 8) * 100)
  }

  // ENDURANCE: sessions with completedLaps > 20, or fallback to totalLaps
  let enduranceScore = 50
  let longSessionCount = 0
  sessions.forEach((session) => {
    const meta = session.metadata || {}
    if (meta.completedLaps && meta.completedLaps > 20) {
      longSessionCount++
    } else if (meta.totalLaps && meta.totalLaps > 20) {
      longSessionCount++
    }
  })
  if (sessions.length > 0) {
    enduranceScore = (longSessionCount / sessions.length) * 100
  }

  // ADAPTABILITY: unique cars × unique tracks
  const uniqueCars = new Set(sessions.map((s) => s.carModel)).size
  const uniqueTracks = new Set(sessions.map((s) => s.trackName)).size
  const adaptabilityScore = Math.min(
    100,
    (Math.log2(uniqueCars * uniqueTracks + 1) / Math.log2(50)) * 100
  )

  // IMPROVEMENT: linear slope of iRating, normalized to 50-100 (positive) or 0-50 (negative)
  let improvementScore = 50
  if (ratingHistory.length >= 3) {
    const slope = computeRatingSlope(ratingHistory)
    if (slope > 0) {
      // Normalize positive slope: assume +20 iRating per session = max improvement
      improvementScore = Math.min(100, 50 + (slope / 20) * 50)
    } else {
      // Normalize negative slope
      improvementScore = Math.max(0, 50 + (slope / 20) * 50)
    }
  }

  // WET WEATHER: placeholder
  const wetWeatherScore = 50

  // EXPERIENCE: total laps or session count
  let experienceScore = 50
  let totalLaps = 0
  sessions.forEach((session) => {
    if (session.metadata?.completedLaps) {
      totalLaps += session.metadata.completedLaps
    }
  })
  if (totalLaps > 0) {
    experienceScore = Math.min(100, (Math.log10(totalLaps + 1) / Math.log10(5000)) * 100)
  } else {
    // Fallback to session count
    experienceScore = Math.min(100, (Math.log10(sessions.length + 1) / Math.log10(200)) * 100)
  }

  return {
    consistency: consistencyScore,
    racecraft: racecraftScore,
    cleanness: cleannessScore,
    endurance: enduranceScore,
    adaptability: adaptabilityScore,
    improvement: improvementScore,
    wetWeather: wetWeatherScore,
    experience: experienceScore,
  }
}

/**
 * Generate insights for each DNA dimension
 */
export function generateInsights(
  dna: DriverDNA,
  sessions: SessionData[],
  ratingHistory: RatingData[]
): DNAInsight[] {
  const computeTrend = (dimension: keyof DriverDNA): 'improving' | 'declining' | 'stable' => {
    const recentSessions = sessions.slice(-10)
    const previousSessions = sessions.slice(-20, -10)

    if (recentSessions.length === 0 || previousSessions.length === 0) return 'stable'

    let recentScore = 0
    let previousScore = 0

    if (dimension === 'consistency') {
      const computeConsistency = (sessionList: SessionData[]) => {
        const trackMap = new Map<string | null, number[]>()
        sessionList.forEach((s) => {
          if (s.finishPosition !== null) {
            if (!trackMap.has(s.trackName)) {
              trackMap.set(s.trackName, [])
            }
            trackMap.get(s.trackName)!.push(s.finishPosition)
          }
        })
        const tracks = Array.from(trackMap.values()).filter((p) => p.length >= 2)
        if (tracks.length === 0) return 50
        const stddevs = tracks.map((p) => stddev(p))
        const avgStd = stddevs.reduce((a, b) => a + b) / stddevs.length
        return Math.max(0, Math.min(100, 100 - (avgStd / 5) * 100))
      }
      recentScore = computeConsistency(recentSessions)
      previousScore = computeConsistency(previousSessions)
    } else if (dimension === 'racecraft') {
      const computeRacecraft = (sessionList: SessionData[]) => {
        const withPos = sessionList.filter((s) => s.finishPosition !== null)
        if (withPos.length === 0) return 50
        let weighted = 0
        withPos.forEach((s) => {
          const p = s.finishPosition!
          if (p === 1) weighted += 3
          else if (p === 2) weighted += 2
          else if (p === 3) weighted += 1.5
          else if (p <= 5) weighted += 0.5
        })
        return Math.min(100, (weighted / withPos.length) * 100)
      }
      recentScore = computeRacecraft(recentSessions)
      previousScore = computeRacecraft(previousSessions)
    } else if (dimension === 'cleanness') {
      const computeCleanness = (sessionList: SessionData[]) => {
        const withIncidents = sessionList.filter((s) => s.incidentCount !== null)
        if (withIncidents.length === 0) return 50
        const avgInc = withIncidents.reduce((sum, s) => sum + s.incidentCount!, 0) / withIncidents.length
        return Math.max(0, (1 - avgInc / 8) * 100)
      }
      recentScore = computeCleanness(recentSessions)
      previousScore = computeCleanness(previousSessions)
    } else if (dimension === 'endurance') {
      const computeEndurance = (sessionList: SessionData[]) => {
        let count = 0
        sessionList.forEach((s) => {
          const m = s.metadata || {}
          if ((m.completedLaps && m.completedLaps > 20) || (m.totalLaps && m.totalLaps > 20)) {
            count++
          }
        })
        return sessionList.length > 0 ? (count / sessionList.length) * 100 : 50
      }
      recentScore = computeEndurance(recentSessions)
      previousScore = computeEndurance(previousSessions)
    } else if (dimension === 'improvement') {
      const recentRatings = ratingHistory.slice(-10)
      const previousRatings = ratingHistory.slice(-20, -10)
      if (recentRatings.length >= 2) {
        const recentSlope = computeRatingSlope(recentRatings)
        recentScore = recentSlope > 0 ? Math.min(100, 50 + (recentSlope / 20) * 50) : Math.max(0, 50 + (recentSlope / 20) * 50)
      } else {
        recentScore = 50
      }
      if (previousRatings.length >= 2) {
        const prevSlope = computeRatingSlope(previousRatings)
        previousScore = prevSlope > 0 ? Math.min(100, 50 + (prevSlope / 20) * 50) : Math.max(0, 50 + (prevSlope / 20) * 50)
      } else {
        previousScore = 50
      }
    } else {
      return 'stable'
    }

    const diff = recentScore - previousScore
    if (diff > 5) return 'improving'
    if (diff < -5) return 'declining'
    return 'stable'
  }

  const descriptions: Record<keyof DriverDNA, (score: number) => string> = {
    consistency: (score) => {
      if (score >= 85) return 'Your finishing positions are remarkably consistent — you rarely have outlier results'
      if (score >= 70) return 'Your results are fairly stable across different tracks and conditions'
      if (score >= 50) return 'Your consistency is moderate — some variance in your performances'
      return 'Your results vary quite a bit — focus on replicating your best performances'
    },
    racecraft: (score) => {
      if (score >= 80) return 'An expert wheel-to-wheel competitor — you consistently finish in the top positions'
      if (score >= 65) return 'You excel in racing situations and regularly claim podium positions'
      if (score >= 50) return 'You have solid racecraft fundamentals — keep working on your competitive edge'
      return 'Focus on race strategy and positioning — there is room to gain here'
    },
    cleanness: (score) => {
      if (score >= 85) return 'Exceptional cleanliness — your incident rate is outstanding'
      if (score >= 70) return 'You race cleanly — low incident rate and strong race awareness'
      if (score >= 50) return 'Your incident rate is reasonable, but there is room for improvement'
      return 'Your incident rate is above average — focus on survival and the results will follow'
    },
    endurance: (score) => {
      if (score >= 80) return 'You excel in longer races — consistency and pace over distance is your strength'
      if (score >= 60) return 'You handle multi-lap races well — pace and fuel management are solid'
      if (score >= 50) return 'You participate in some longer events — keep building your stamina'
      return 'You typically race shorter formats — try longer events to build endurance skills'
    },
    adaptability: (score) => {
      if (score >= 85) return 'You are a true all-rounder — equally at home in any car on any track'
      if (score >= 70) return 'You have driven a wide variety of cars and tracks — a versatile competitor'
      if (score >= 50) return 'You have experience across several cars and tracks — keep exploring'
      return 'You focus on specific cars and tracks — expanding your range will help you grow'
    },
    improvement: (score) => {
      if (score >= 85) return 'Your iRating is climbing steeply — you are improving very rapidly'
      if (score >= 65) return 'Your iRating trend is climbing steadily — you are getting faster'
      if (score >= 50) return 'Your iRating is stable — you have reached a consistent skill level'
      return 'Your iRating trend is declining — focus on fundamentals to reverse course'
    },
    wetWeather: (score) => {
      return 'Wet weather data coming soon — improve your performance when conditions get slippery'
    },
    experience: (score) => {
      if (score >= 85) return 'Vast experience — you have logged thousands of laps'
      if (score >= 70) return 'Solid experience base — you have driven hundreds of laps'
      if (score >= 50) return 'Moderate experience — keep racking up miles to build muscle memory'
      return 'You are relatively new to racing — every lap is valuable learning'
    },
  }

  const labels: Record<keyof DriverDNA, string> = {
    consistency: 'Consistency',
    racecraft: 'Racecraft',
    cleanness: 'Cleanness',
    endurance: 'Endurance',
    adaptability: 'Adaptability',
    improvement: 'Improvement',
    wetWeather: 'Wet Weather',
    experience: 'Experience',
  }

  return [
    { dimension: 'consistency', label: labels.consistency, value: dna.consistency, description: descriptions.consistency(dna.consistency), trend: computeTrend('consistency') },
    { dimension: 'racecraft', label: labels.racecraft, value: dna.racecraft, description: descriptions.racecraft(dna.racecraft), trend: computeTrend('racecraft') },
    { dimension: 'cleanness', label: labels.cleanness, value: dna.cleanness, description: descriptions.cleanness(dna.cleanness), trend: computeTrend('cleanness') },
    { dimension: 'endurance', label: labels.endurance, value: dna.endurance, description: descriptions.endurance(dna.endurance), trend: computeTrend('endurance') },
    { dimension: 'adaptability', label: labels.adaptability, value: dna.adaptability, description: descriptions.adaptability(dna.adaptability), trend: computeTrend('adaptability') },
    { dimension: 'improvement', label: labels.improvement, value: dna.improvement, description: descriptions.improvement(dna.improvement), trend: computeTrend('improvement') },
    { dimension: 'wetWeather', label: labels.wetWeather, value: dna.wetWeather, description: descriptions.wetWeather(dna.wetWeather), trend: computeTrend('wetWeather') },
    { dimension: 'experience', label: labels.experience, value: dna.experience, description: descriptions.experience(dna.experience), trend: computeTrend('experience') },
  ]
}

/**
 * Determine driver archetype based on DNA
 */
export function getDriverArchetype(dna: DriverDNA): { name: string; description: string } {
  if (dna.consistency > 70 && dna.cleanness > 70) {
    return {
      name: 'The Professor',
      description: 'Methodical and precise. You extract performance through consistency and clean racing.',
    }
  }

  if (dna.racecraft > 70 && dna.experience > 60) {
    return {
      name: 'The Racer',
      description: 'A natural wheel-to-wheel competitor. You thrive in battle and find positions others cannot.',
    }
  }

  if (dna.adaptability > 70) {
    return {
      name: 'The Chameleon',
      description: 'Equally at home in any car on any track. Your adaptability is your superpower.',
    }
  }

  if (dna.improvement > 70 && dna.experience < 50) {
    return {
      name: 'The Rising Star',
      description: 'Your trajectory is steep. You are learning fast and the ceiling is high.',
    }
  }

  if (dna.endurance > 70 && dna.cleanness > 60) {
    return {
      name: 'The Marathoner',
      description: 'Built for the long haul. You finish races and you finish them well.',
    }
  }

  return {
    name: 'The Competitor',
    description: 'A well-rounded driver with room to grow in every dimension.',
  }
}
