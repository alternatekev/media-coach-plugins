import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/plugin-auth'
import { db, schema } from '@/db'
import { eq, and } from 'drizzle-orm'
import { buildTrackLookup, resolveTrackName, consolidateUserTracks } from '@/lib/resolve-track'
import { resolveIRacingTrackId } from '@/data/iracing-track-map'

/**
 * POST /api/iracing/latest — Import only the latest recent races from iRacing
 *
 * Called by the overlay after a race ends. The overlay polls the SimHub plugin
 * for recent races until the just-finished race appears, then sends the delta
 * here. We only insert NEW races that don't already exist (deduped by subsessionId).
 *
 * This is a lightweight variant of /api/iracing/import that skips career summary
 * and chart data — it only processes recentRaces.
 *
 * Auth: Bearer token (plugin auth)
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'missing_token' }, { status: 401 })
  }

  const result = await validateToken(authHeader.slice(7))
  if (!result) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 })
  }

  const userId = result.user.id

  try {
    const body = await request.json()
    const { custId, displayName, recentRaces } = body

    if (!custId || !Array.isArray(recentRaces)) {
      return NextResponse.json({ error: 'Missing custId or recentRaces' }, { status: 400 })
    }

    let sessionsImported = 0
    let ratingsImported = 0
    const errors: string[] = []

    // Load existing sessions — build dedup set from BOTH gameId AND subsessionId
    // so we catch auto-synced sessions (which store iRacing SessionID as gameId
    // and SubSessionID as subsessionId) as well as prior /api/iracing/latest imports
    // No limit: fetch all sessions for accurate dedup even with large session counts
    const existingSessions = await db.select({
      id: schema.raceSessions.id,
      metadata: schema.raceSessions.metadata,
    }).from(schema.raceSessions)
      .where(eq(schema.raceSessions.userId, userId))

    // Map subsessionId → existing row ID for auto-synced sessions we should upgrade
    const autoSyncedBySubId = new Map<string, string>()
    const knownIds = new Set<string>()
    for (const s of existingSessions) {
      const meta = s.metadata as Record<string, unknown> | null
      if (meta?.gameId) knownIds.add(String(meta.gameId))
      if (meta?.subsessionId) {
        knownIds.add(String(meta.subsessionId))
        // Track auto-synced sessions so we can upgrade them with richer API data
        if (meta?.source === 'overlay_autosync') {
          autoSyncedBySubId.set(String(meta.subsessionId), s.id)
        }
      }
    }

    // Build track lookup once for resolving all races in this batch
    const trackLookup = await buildTrackLookup()
    let sessionsUpgraded = 0

    for (const race of recentRaces) {
      try {
        const subsessionId = String(race.subsession_id || race.subsessionId || '')
        if (!subsessionId) continue

        const category = detectCategory(race.series_name || race.seriesName || '')

        const iracingTrackName = race.track?.track_name || race.track_name || race.trackName || 'Unknown'
        const iracingTrackConfig = race.track?.config_name || race.track_config || undefined
        const resolvedTrackName = resolveTrackName(trackLookup, iracingTrackName, iracingTrackConfig) || iracingTrackName

        const apiMetadata = {
          source: 'iracing_latest' as const,
          subsessionId: Number(subsessionId),
          gameId: subsessionId,
          iracingTrackName,
          iracingTrackConfig,
          prodriveTrackId: resolveIRacingTrackId(iracingTrackName, iracingTrackConfig),
          seriesName: race.series_name || race.seriesName || '',
          seasonName: race.season_name || race.seasonName || '',
          preRaceIRating: race.oldi_rating ?? race.old_irating ?? race.oldIRating ?? 0,
          postRaceIRating: race.newi_rating ?? race.new_irating ?? race.newIRating ?? 0,
          actualIRatingDelta: (race.newi_rating ?? race.new_irating ?? race.newIRating ?? 0)
            - (race.oldi_rating ?? race.old_irating ?? race.oldIRating ?? 0),
          preRaceSR: (race.old_sub_level ?? race.oldSubLevel ?? 0) / 100,
          postRaceSR: (race.new_sub_level ?? race.newSubLevel ?? 0) / 100,
          startPosition: race.starting_position ?? race.start_position ?? race.startingPosition ?? 0,
          completedLaps: race.laps_complete ?? race.laps ?? race.lapsComplete ?? 0,
          lapsLed: race.laps_led ?? race.lapsLed ?? 0,
          champPoints: race.champ_points ?? race.champPoints ?? 0,
          strengthOfField: race.strength_of_field ?? race.sof ?? race.strengthOfField ?? 0,
          startedAt: race.session_start_time || race.start_time || race.sessionStartTime || null,
        }

        // Check if we already have this race from auto-sync — upgrade it with API data
        const autoSyncId = autoSyncedBySubId.get(subsessionId)
        if (autoSyncId) {
          // Upgrade the auto-synced session with richer API data + resolved track name
          await db.update(schema.raceSessions).set({
            trackName: resolvedTrackName,
            category,
            finishPosition: race.finish_position ?? race.finishPosition ?? null,
            incidentCount: race.incidents ?? null,
            metadata: apiMetadata,
            createdAt: race.session_start_time || race.start_time
              ? new Date(race.session_start_time || race.start_time)
              : undefined,
          }).where(eq(schema.raceSessions.id, autoSyncId))
          sessionsUpgraded++
          // Mark as known so we don't re-insert
          knownIds.add(subsessionId)
          continue
        }

        // Already imported via a prior /api/iracing/latest or /api/iracing/import call — skip
        if (knownIds.has(subsessionId)) continue

        // New race — insert
        await db.insert(schema.raceSessions).values({
          userId,
          carModel: race.car_name || race.carName || 'Unknown',
          manufacturer: null,
          category,
          trackName: resolvedTrackName,
          sessionType: category,
          finishPosition: race.finish_position ?? race.finishPosition ?? null,
          incidentCount: race.incidents ?? null,
          metadata: apiMetadata,
          createdAt: race.session_start_time || race.start_time
            ? new Date(race.session_start_time || race.start_time)
            : new Date(),
        })
        sessionsImported++
        knownIds.add(subsessionId)

        // Also insert a rating_history entry for each new race with rating deltas
        const postIR = race.newi_rating ?? race.new_irating ?? race.newIRating ?? 0
        const preIR = race.oldi_rating ?? race.old_irating ?? race.oldIRating ?? 0
        const postSR = (race.new_sub_level ?? race.newSubLevel ?? 0) / 100
        const preSR = (race.old_sub_level ?? race.oldSubLevel ?? 0) / 100

        if (postIR > 0) {
          try {
            await db.insert(schema.ratingHistory).values({
              userId,
              category,
              iRating: Math.round(postIR),
              safetyRating: postSR.toFixed(2),
              license: race.new_license_level ? licenseFromLevel(race.new_license_level) : 'R',
              prevIRating: preIR > 0 ? Math.round(preIR) : null,
              prevSafetyRating: preSR > 0 ? preSR.toFixed(2) : null,
              sessionType: category,
              trackName: resolvedTrackName !== 'Unknown' ? resolvedTrackName : null,
              carModel: race.car_name || race.carName || null,
              createdAt: race.session_start_time || race.start_time
                ? new Date(race.session_start_time || race.start_time)
                : new Date(),
            })
            ratingsImported++
          } catch {
            // May be duplicate — skip
          }
        }
      } catch (err: any) {
        errors.push(`Race ${race.subsession_id || '?'}: ${err.message}`)
      }
    }

    // Consolidate any old sessions with mismatched track names or stale categories
    if (sessionsImported > 0 || sessionsUpgraded > 0) {
      try {
        await consolidateUserTracks(userId)
      } catch {}

      // Merge legacy sports_car → road (iRacing merged these in 2024 S2)
      try {
        for (const legacyCat of ['sports_car', 'sportscar']) {
          await db.update(schema.raceSessions)
            .set({ category: 'road' })
            .where(and(eq(schema.raceSessions.userId, userId), eq(schema.raceSessions.category, legacyCat)))
          await db.update(schema.ratingHistory)
            .set({ category: 'road' })
            .where(and(eq(schema.ratingHistory.userId, userId), eq(schema.ratingHistory.category, legacyCat)))
          await db.update(schema.driverRatings)
            .set({ category: 'road' })
            .where(and(eq(schema.driverRatings.userId, userId), eq(schema.driverRatings.category, legacyCat)))
        }
      } catch {}

      try {
        await db.update(schema.iracingAccounts).set({
          lastImportAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(schema.iracingAccounts.userId, userId))
      } catch {}
    }

    return NextResponse.json({
      success: true,
      imported: {
        sessions: sessionsImported,
        upgraded: sessionsUpgraded,
        ratings: ratingsImported,
      },
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err: any) {
    console.error('[iracing/latest] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

function detectCategory(seriesName: string): string {
  const s = (seriesName || '').toLowerCase()
  if (s.includes('dirt') && s.includes('oval')) return 'dirt_oval'
  if (s.includes('dirt') && s.includes('road')) return 'dirt_road'
  if (s.includes('dirt')) return 'dirt_road'
  if (s.includes('oval') || s.includes('nascar') || s.includes('indycar') || s.includes('stock')) return 'oval'
  if (s.includes('formula') || s.includes('f1') || s.includes('ir-04') || s.includes('ir04')
    || s.includes('super formula') || s.includes('w series')) return 'formula'
  // iRacing merged road + sports car into a single "road" license in 2024 S2
  return 'road'
}

function licenseFromLevel(level: number): string {
  if (level >= 18) return 'P'
  if (level >= 16) return 'A'
  if (level >= 12) return 'B'
  if (level >= 8) return 'C'
  if (level >= 4) return 'D'
  return 'R'
}
