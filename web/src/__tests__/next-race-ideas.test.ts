/**
 * Tests for the Next Race Ideas scoring engine
 *
 * Covers the individual scoring functions that were fixed/added:
 *   - scoreTimeOfDay: now compares race hour against driver's best hours
 *   - scoreDayOfWeek: now compares race day against driver's best days
 *   - scoreCarFamiliarity: improved car-to-class matching
 *   - scoreCarPerformance: new — evaluates driver performance in matched cars
 *   - scoreRatingTrend: rescaled from 0-15 to 0-10
 */

import { describe, it, expect } from 'vitest'
import { _testing, type SessionInput, type RatingInput, type RaceSuggestion } from '@/lib/next-race-ideas'

const {
  scoreTimeOfDay,
  scoreDayOfWeek,
  scoreCarFamiliarity,
  scoreCarPerformance,
  scoreRatingTrend,
  sessionMatchesCarClass,
  findMatchedCarSessions,
  scoreTrackFamiliarity,
  scoreTrackIncidentRate,
  diversifySelections,
} = _testing

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<SessionInput> & { carModel: string }): SessionInput {
  return {
    id: crypto.randomUUID(),
    carModel: overrides.carModel,
    manufacturer: overrides.manufacturer ?? null,
    category: overrides.category ?? 'road',
    gameName: overrides.gameName ?? 'iracing',
    trackName: overrides.trackName ?? 'Spa-Francorchamps',
    sessionType: overrides.sessionType ?? 'race',
    finishPosition: overrides.finishPosition ?? null,
    incidentCount: overrides.incidentCount ?? 2,
    metadata: overrides.metadata ?? { completedLaps: 20, startedAt: '2026-03-15T14:00:00Z' },
    createdAt: overrides.createdAt ?? new Date('2026-03-15T14:00:00Z'),
  }
}

function makeSessionAtHour(hour: number, incidents: number, laps: number = 20): SessionInput {
  const date = new Date(`2026-03-15T${String(hour).padStart(2, '0')}:00:00Z`)
  return makeSession({
    carModel: 'BMW M4 GT3',
    incidentCount: incidents,
    metadata: { completedLaps: laps, startedAt: date.toISOString() },
    createdAt: date,
  })
}

function makeSessionOnDay(dayOfWeek: number, incidents: number, laps: number = 20): SessionInput {
  // 2026-03-15 is a Sunday (0). Offset to target day.
  const baseDate = new Date('2026-03-15T14:00:00Z') // Sunday
  const offset = (dayOfWeek - baseDate.getUTCDay() + 7) % 7
  const date = new Date(baseDate)
  date.setUTCDate(date.getUTCDate() + offset)
  return makeSession({
    carModel: 'BMW M4 GT3',
    incidentCount: incidents,
    metadata: { completedLaps: laps, startedAt: date.toISOString() },
    createdAt: date,
  })
}

function makeRating(overrides: Partial<RatingInput>): RatingInput {
  return {
    category: overrides.category ?? 'road',
    iRating: overrides.iRating ?? 1500,
    safetyRating: overrides.safetyRating ?? '3.50',
    license: overrides.license ?? 'C',
    prevIRating: overrides.prevIRating ?? null,
    prevSafetyRating: overrides.prevSafetyRating ?? null,
    prevLicense: overrides.prevLicense ?? null,
    trackName: overrides.trackName ?? null,
    carModel: overrides.carModel ?? null,
    createdAt: overrides.createdAt ?? new Date('2026-03-15T14:00:00Z'),
  }
}

// ── sessionMatchesCarClass ───────────────────────────────────────────────────

describe('sessionMatchesCarClass', () => {
  it('matches when class short_name appears as token in car model', () => {
    const session = makeSession({ carModel: 'BMW M4 GT3' })
    expect(sessionMatchesCarClass(session, { name: 'GT3 Class', short_name: 'GT3' })).toBe(true)
  })

  it('matches when class name tokens appear in car model', () => {
    const session = makeSession({ carModel: 'Porsche 911 GT3 R' })
    expect(sessionMatchesCarClass(session, { name: 'GT3', short_name: 'GT3' })).toBe(true)
  })

  it('does not match unrelated cars and classes', () => {
    const session = makeSession({ carModel: 'Skip Barber Formula 2000' })
    expect(sessionMatchesCarClass(session, { name: 'GT3 Class', short_name: 'GT3' })).toBe(false)
  })

  it('handles multi-word short names', () => {
    const session = makeSession({ carModel: 'Dallara LMP2' })
    expect(sessionMatchesCarClass(session, { name: 'LMP2 Prototype', short_name: 'LMP2' })).toBe(true)
  })

  it('filters generic words from class name matching', () => {
    // "Class" alone shouldn't cause false positives
    const session = makeSession({ carModel: 'Mazda MX-5 Cup' })
    expect(sessionMatchesCarClass(session, { name: 'GT3 Class', short_name: 'GT3' })).toBe(false)
  })
})

// ── scoreTimeOfDay ───────────────────────────────────────────────────────────

describe('scoreTimeOfDay', () => {
  it('returns 5 with insufficient data', () => {
    const sessions = [makeSessionAtHour(14, 2)]
    const raceTime = new Date('2026-03-20T14:00:00Z')
    expect(scoreTimeOfDay(sessions, raceTime)).toBe(5)
  })

  it('scores high when race hour matches driver best hour', () => {
    // Driver is cleanest at hour 20 (1 inc), worst at hour 10 (10 inc)
    const sessions = [
      makeSessionAtHour(20, 1),
      makeSessionAtHour(20, 1),
      makeSessionAtHour(10, 10),
      makeSessionAtHour(10, 8),
      makeSessionAtHour(14, 4),
      makeSessionAtHour(14, 5),
    ]
    // Race at hour 20 — driver's best
    const raceTime = new Date('2026-03-20T20:00:00Z')
    expect(scoreTimeOfDay(sessions, raceTime)).toBe(10)
  })

  it('scores low when race hour matches driver worst hour', () => {
    const sessions = [
      makeSessionAtHour(20, 1),
      makeSessionAtHour(20, 1),
      makeSessionAtHour(10, 10),
      makeSessionAtHour(10, 8),
      makeSessionAtHour(14, 4),
      makeSessionAtHour(14, 5),
    ]
    // Race at hour 10 — driver's worst
    const raceTime = new Date('2026-03-20T10:00:00Z')
    expect(scoreTimeOfDay(sessions, raceTime)).toBeLessThanOrEqual(4)
  })

  it('returns 5 when no data exists for the race hour', () => {
    const sessions = [
      makeSessionAtHour(20, 1),
      makeSessionAtHour(20, 2),
      makeSessionAtHour(14, 3),
      makeSessionAtHour(14, 4),
      makeSessionAtHour(10, 5),
    ]
    // Race at hour 8 — no data
    const raceTime = new Date('2026-03-20T08:00:00Z')
    expect(scoreTimeOfDay(sessions, raceTime)).toBe(5)
  })
})

// ── scoreDayOfWeek ───────────────────────────────────────────────────────────

describe('scoreDayOfWeek', () => {
  it('returns 5 with insufficient data', () => {
    const sessions = [makeSessionOnDay(0, 2)]
    const raceTime = new Date('2026-03-15T14:00:00Z') // Sunday
    expect(scoreDayOfWeek(sessions, raceTime)).toBe(5)
  })

  it('scores high when race day matches driver best day', () => {
    // Driver is cleanest on Saturday (day 6), worst on Monday (day 1)
    const sessions = [
      makeSessionOnDay(6, 1),
      makeSessionOnDay(6, 1),
      makeSessionOnDay(1, 10),
      makeSessionOnDay(1, 8),
      makeSessionOnDay(3, 4),
      makeSessionOnDay(3, 5),
    ]
    // Race on Saturday — driver's best
    const saturdayDate = new Date('2026-03-21T14:00:00Z') // Saturday
    expect(scoreDayOfWeek(sessions, saturdayDate)).toBe(10)
  })

  it('scores low when race day matches driver worst day', () => {
    const sessions = [
      makeSessionOnDay(6, 1),
      makeSessionOnDay(6, 1),
      makeSessionOnDay(1, 10),
      makeSessionOnDay(1, 8),
      makeSessionOnDay(3, 4),
      makeSessionOnDay(3, 5),
    ]
    // Race on Monday — driver's worst
    const mondayDate = new Date('2026-03-16T14:00:00Z') // Monday
    expect(scoreDayOfWeek(sessions, mondayDate)).toBeLessThanOrEqual(4)
  })
})

// ── scoreCarFamiliarity ──────────────────────────────────────────────────────

describe('scoreCarFamiliarity', () => {
  it('returns 0 with no car classes', () => {
    const sessions = [makeSession({ carModel: 'BMW M4 GT3' })]
    expect(scoreCarFamiliarity(sessions, [])).toBe(0)
  })

  it('returns 0 with no matching sessions', () => {
    const sessions = [makeSession({ carModel: 'Skip Barber Formula 2000' })]
    expect(scoreCarFamiliarity(sessions, [{ name: 'GT3 Class', short_name: 'GT3' }])).toBe(0)
  })

  it('scores based on count of matching sessions', () => {
    const gt3Class = { name: 'GT3 Class', short_name: 'GT3' }
    const oneSess = [makeSession({ carModel: 'BMW M4 GT3' })]
    const threeSess = Array.from({ length: 3 }, () => makeSession({ carModel: 'BMW M4 GT3' }))
    const fiveSess = Array.from({ length: 5 }, () => makeSession({ carModel: 'Porsche 911 GT3 R' }))
    const tenSess = Array.from({ length: 10 }, () => makeSession({ carModel: 'BMW M4 GT3' }))

    expect(scoreCarFamiliarity(oneSess, [gt3Class])).toBe(3)
    expect(scoreCarFamiliarity(threeSess, [gt3Class])).toBe(6)
    expect(scoreCarFamiliarity(fiveSess, [gt3Class])).toBe(8)
    expect(scoreCarFamiliarity(tenSess, [gt3Class])).toBe(10)
  })
})

// ── scoreCarPerformance ──────────────────────────────────────────────────────

describe('scoreCarPerformance', () => {
  it('returns 0 with no car classes', () => {
    expect(scoreCarPerformance([], [])).toBe(0)
  })

  it('returns 5 (neutral) with insufficient matched sessions', () => {
    const sessions = [makeSession({ carModel: 'BMW M4 GT3', incidentCount: 2 })]
    expect(scoreCarPerformance(sessions, [{ name: 'GT3', short_name: 'GT3' }])).toBe(5)
  })

  it('scores high when driver has low incidents in matched cars', () => {
    const gt3Class = { name: 'GT3', short_name: 'GT3' }
    // GT3 sessions: very clean (1 inc / 20 laps = 0.05 inc/lap)
    const gt3Sessions = Array.from({ length: 5 }, () =>
      makeSession({ carModel: 'BMW M4 GT3', incidentCount: 1, metadata: { completedLaps: 20 } }),
    )
    // Other sessions: messy (10 inc / 20 laps = 0.5 inc/lap)
    const otherSessions = Array.from({ length: 5 }, () =>
      makeSession({ carModel: 'Skip Barber Formula 2000', incidentCount: 10, metadata: { completedLaps: 20 } }),
    )
    const allSessions = [...gt3Sessions, ...otherSessions]
    const score = scoreCarPerformance(allSessions, [gt3Class])
    expect(score).toBeGreaterThanOrEqual(7)
  })

  it('scores low when driver has high incidents in matched cars', () => {
    const gt3Class = { name: 'GT3', short_name: 'GT3' }
    // GT3 sessions: very messy (15 inc / 20 laps)
    const gt3Sessions = Array.from({ length: 5 }, () =>
      makeSession({ carModel: 'BMW M4 GT3', incidentCount: 15, metadata: { completedLaps: 20 } }),
    )
    // Other sessions: clean (1 inc / 20 laps)
    const otherSessions = Array.from({ length: 5 }, () =>
      makeSession({ carModel: 'Skip Barber Formula 2000', incidentCount: 1, metadata: { completedLaps: 20 } }),
    )
    const allSessions = [...gt3Sessions, ...otherSessions]
    const score = scoreCarPerformance(allSessions, [gt3Class])
    expect(score).toBeLessThanOrEqual(4)
  })
})

// ── scoreRatingTrend ─────────────────────────────────────────────────────────

describe('scoreRatingTrend', () => {
  it('returns 5 (neutral) with no history', () => {
    expect(scoreRatingTrend([], 'road')).toBe(5)
  })

  it('scores max (10) when both iR and SR are trending up', () => {
    const history = Array.from({ length: 5 }, (_, i) =>
      makeRating({
        category: 'road',
        iRating: 1500 + i * 50,
        prevIRating: 1500 + (i - 1) * 50,
        safetyRating: (3.0 + i * 0.1).toFixed(2),
        prevSafetyRating: (3.0 + (i - 1) * 0.1).toFixed(2),
        createdAt: new Date(Date.now() - i * 86400000),
      }),
    )
    expect(scoreRatingTrend(history, 'road')).toBe(10)
  })

  it('scores 0 when both iR and SR are trending down hard', () => {
    const history = Array.from({ length: 5 }, (_, i) =>
      makeRating({
        category: 'road',
        iRating: 1500 - i * 100,
        prevIRating: 1500 - (i - 1) * 100,
        safetyRating: (3.0 - i * 0.2).toFixed(2),
        prevSafetyRating: (3.0 - (i - 1) * 0.2).toFixed(2),
        createdAt: new Date(Date.now() - i * 86400000),
      }),
    )
    expect(scoreRatingTrend(history, 'road')).toBe(0)
  })

  it('caps at 10', () => {
    const history = Array.from({ length: 5 }, (_, i) =>
      makeRating({
        category: 'road',
        iRating: 2000 + i * 200,
        prevIRating: 2000 + (i - 1) * 200,
        safetyRating: (4.0 + i * 0.1).toFixed(2),
        prevSafetyRating: (4.0 + (i - 1) * 0.1).toFixed(2),
        createdAt: new Date(Date.now() - i * 86400000),
      }),
    )
    expect(scoreRatingTrend(history, 'road')).toBeLessThanOrEqual(10)
  })

  it('ignores other categories', () => {
    const history = [
      makeRating({
        category: 'oval',
        iRating: 2000,
        prevIRating: 1000,
        safetyRating: '4.99',
        prevSafetyRating: '1.00',
      }),
    ]
    // No road history → neutral
    expect(scoreRatingTrend(history, 'road')).toBe(5)
  })
})

// ── scoreTrackFamiliarity (unchanged, sanity check) ──────────────────────────

describe('scoreTrackFamiliarity', () => {
  it('returns 0 for unknown track', () => {
    expect(scoreTrackFamiliarity([], 'Monza')).toBe(0)
  })

  it('returns 25 for 5+ races at track', () => {
    const sessions = Array.from({ length: 6 }, () =>
      makeSession({ carModel: 'BMW M4 GT3', trackName: 'Spa-Francorchamps' }),
    )
    expect(scoreTrackFamiliarity(sessions, 'Spa-Francorchamps')).toBe(25)
  })
})

// ── scoreTrackIncidentRate (unchanged, sanity check) ─────────────────────────

describe('scoreTrackIncidentRate', () => {
  it('returns neutral (10) with no sessions', () => {
    expect(scoreTrackIncidentRate([], 'Monza')).toBe(10)
  })

  it('scores high when track incidents are lower than overall', () => {
    const trackSessions = Array.from({ length: 3 }, () =>
      makeSession({ carModel: 'BMW M4 GT3', trackName: 'Spa-Francorchamps', incidentCount: 1, metadata: { completedLaps: 20 } }),
    )
    const otherSessions = Array.from({ length: 3 }, () =>
      makeSession({ carModel: 'BMW M4 GT3', trackName: 'Monza', incidentCount: 10, metadata: { completedLaps: 20 } }),
    )
    const all = [...trackSessions, ...otherSessions]
    expect(scoreTrackIncidentRate(all, 'Spa-Francorchamps')).toBeGreaterThanOrEqual(20)
  })
})

// ── diversifySelections ──────────────────────────────────────────────────────

function makeSuggestion(overrides: Partial<RaceSuggestion>): RaceSuggestion {
  return {
    seriesName: overrides.seriesName ?? 'Test Series',
    trackName: overrides.trackName ?? 'Test Track',
    trackConfig: overrides.trackConfig ?? null,
    category: overrides.category ?? 'road',
    licenseClass: overrides.licenseClass ?? 'C',
    isOfficial: overrides.isOfficial ?? true,
    isFixed: overrides.isFixed ?? false,
    carClassNames: overrides.carClassNames ?? [],
    seasonId: overrides.seasonId ?? 1000,
    seriesId: overrides.seriesId ?? 100,
    nextStartTime: overrides.nextStartTime ?? new Date('2026-04-11T20:00:00Z'),
    minutesUntilStart: overrides.minutesUntilStart ?? 30,
    sessionMinutes: overrides.sessionMinutes ?? 30,
    repeatMinutes: overrides.repeatMinutes ?? null,
    score: overrides.score ?? 50,
    scoreBreakdown: overrides.scoreBreakdown ?? {
      trackFamiliarity: 10, trackIncidentRate: 10, carFamiliarity: 5,
      carPerformance: 5, timeOfDay: 5, dayOfWeek: 5, ratingTrend: 5, licenseLevel: 5,
    },
    strategy: overrides.strategy ?? { type: 'steady', text: 'Steady' },
    commentary: overrides.commentary ?? 'Test commentary',
  }
}

describe('diversifySelections', () => {
  it('spreads across license classes (one per class first)', () => {
    const suggestions = [
      makeSuggestion({ licenseClass: 'C', category: 'road', seriesName: 'GT3 1', seriesId: 101, score: 80, trackName: 'Spa', nextStartTime: new Date('2026-04-11T20:00:00Z') }),
      makeSuggestion({ licenseClass: 'C', category: 'road', seriesName: 'GT3 2', seriesId: 102, score: 75, trackName: 'Monza', nextStartTime: new Date('2026-04-11T20:05:00Z') }),
      makeSuggestion({ licenseClass: 'D', category: 'road', seriesName: 'MX5', seriesId: 103, score: 70, trackName: 'Laguna Seca', nextStartTime: new Date('2026-04-11T20:10:00Z') }),
      makeSuggestion({ licenseClass: 'C', category: 'oval', seriesName: 'Oval C', seriesId: 104, score: 65, trackName: 'Daytona', nextStartTime: new Date('2026-04-11T20:15:00Z') }),
      makeSuggestion({ licenseClass: 'B', category: 'road', seriesName: 'LMP2', seriesId: 105, score: 60, trackName: 'Watkins Glen', nextStartTime: new Date('2026-04-11T20:20:00Z') }),
    ]

    const result = diversifySelections(suggestions, 5)
    expect(result).toHaveLength(5)

    // Pass 1 picks one per license class (highest score from each): C→GT3 1, D→MX5, B→LMP2
    // Pass 2 backfills: GT3 2, Oval C (different series + different tracks)
    const seriesNames = result.map(s => s.seriesName)
    expect(seriesNames).toContain('GT3 1')  // C class pick
    expect(seriesNames).toContain('MX5')    // D class pick
    expect(seriesNames).toContain('LMP2')   // B class pick

    // No duplicate series
    const seriesIds = result.map(s => s.seriesId)
    expect(new Set(seriesIds).size).toBe(5)
  })

  it('deduplicates series and tracks across picks', () => {
    const suggestions = [
      makeSuggestion({ licenseClass: 'C', seriesId: 101, score: 90, trackName: 'Spa', seriesName: 'Series A', nextStartTime: new Date('2026-04-11T20:00:00Z') }),
      makeSuggestion({ licenseClass: 'D', seriesId: 102, score: 85, trackName: 'Spa', seriesName: 'Series B', nextStartTime: new Date('2026-04-11T20:01:00Z') }),
      makeSuggestion({ licenseClass: 'B', seriesId: 103, score: 80, trackName: 'Monza', seriesName: 'Series C', nextStartTime: new Date('2026-04-11T20:02:00Z') }),
      makeSuggestion({ licenseClass: 'A', seriesId: 104, score: 70, trackName: 'Laguna Seca', seriesName: 'Series D', nextStartTime: new Date('2026-04-11T20:03:00Z') }),
    ]

    const result = diversifySelections(suggestions, 3)
    expect(result).toHaveLength(3)

    // Pass 1: C→Series A (Spa), D→Series B skipped (Spa duplicate), B→Series C (Monza), then D needs pass 2
    // Series B shares track with Series A so it's skipped in pass 1 and 2
    // Series D picked instead for the 3rd slot
    const seriesNames = result.map(s => s.seriesName)
    expect(seriesNames).toContain('Series A')  // C class
    expect(seriesNames).toContain('Series C')  // B class
    // 3rd pick: Series D (A class, unique track) since Series B shares Spa track
    expect(seriesNames).toContain('Series D')
  })

  it('returns sorted by soonest start time', () => {
    const suggestions = [
      makeSuggestion({ licenseClass: 'B', seriesId: 101, score: 80, trackName: 'Spa', nextStartTime: new Date('2026-04-11T21:00:00Z') }),
      makeSuggestion({ licenseClass: 'C', seriesId: 102, score: 70, trackName: 'Monza', nextStartTime: new Date('2026-04-11T20:00:00Z') }),
      makeSuggestion({ licenseClass: 'D', seriesId: 103, score: 60, trackName: 'Laguna Seca', nextStartTime: new Date('2026-04-11T20:30:00Z') }),
    ]

    const result = diversifySelections(suggestions, 3)
    // All 3 picked (different license classes, series, tracks)
    // Then sorted by start time
    expect(result[0].licenseClass).toBe('C')  // 20:00 — soonest
    expect(result[1].licenseClass).toBe('D')  // 20:30
    expect(result[2].licenseClass).toBe('B')  // 21:00 — latest
  })
})
