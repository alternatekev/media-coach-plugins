import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/plugin-auth'
import { db, schema } from '@/db'
import { eq, desc, and } from 'drizzle-orm'
import { buildTrackLookup, resolveTrackName } from '@/lib/resolve-track'

/**
 * POST /api/sessions — Record a completed race session
 * Auth: Bearer token (from RaceCor.io Pro Drive plugin auth)
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

  try {
    const body = await request.json()

    const {
      preRaceIRating, preRaceSR, preRaceLicense,
      carModel, trackName, sessionType, gameId, gameName,
      finishPosition, incidentCount, completedLaps, totalLaps,
      bestLapTime, estimatedIRatingDelta,
      fieldSize,
      startedAt, finishedAt,
      isPracticeSession, practiceData
    } = body

    // Validate required fields
    if (!carModel || !trackName || !sessionType) {
      return NextResponse.json({ error: 'Missing required session fields' }, { status: 400 })
    }

    // Reject empty sessions (no laps completed and no best lap time)
    if ((!completedLaps || completedLaps <= 0) && (!bestLapTime || bestLapTime <= 0)) {
      return NextResponse.json({ error: 'Empty session — no laps completed' }, { status: 422 })
    }

    // Determine game and whether it's iRacing
    const normalizedGameName = (gameName || 'iRacing').trim()
    const isIRacing = normalizedGameName.toLowerCase() === 'iracing'

    // ── Resolve track name to canonical form (same as /api/iracing/latest) ──
    let resolvedTrack = trackName
    try {
      const trackLookup = await buildTrackLookup()
      resolvedTrack = resolveTrackName(trackLookup, trackName, undefined, normalizedGameName) || trackName
    } catch {
      // Track resolution is best-effort — fall back to raw name
    }

    // ── Dedup: skip if a session with this gameId or subsessionId already exists ──
    // ACEvo sessions use gameId-based dedup (SimHub provides a session identifier).
    // iRacing sessions use subsessionId for unique session identification.
    // Both are tracked in metadata for dedup purposes.
    if (gameId || body.subsessionId) {
      const existingWithMeta = await db.select({
        id: schema.raceSessions.id,
        metadata: schema.raceSessions.metadata,
      }).from(schema.raceSessions)
        .where(eq(schema.raceSessions.userId, result.user.id))
        .limit(500)

      // Collect all known IDs from existing sessions (gameId + subsessionId)
      const knownIds = new Set<string>()
      for (const s of existingWithMeta) {
        const meta = s.metadata as Record<string, unknown> | null
        if (meta?.gameId) knownIds.add(String(meta.gameId))
        if (meta?.subsessionId) knownIds.add(String(meta.subsessionId))
      }

      if (gameId && knownIds.has(String(gameId))) {
        return NextResponse.json({ success: true, sessionId: null, deduplicated: true, reason: 'gameId' })
      }
      if (body.subsessionId && knownIds.has(String(body.subsessionId))) {
        return NextResponse.json({ success: true, sessionId: null, deduplicated: true, reason: 'subsessionId' })
      }
    }

    // Insert session (race or practice/qualifying/warmup)
    const session = await db.insert(schema.raceSessions).values({
      userId: result.user.id,
      carModel: carModel || 'Unknown',
      manufacturer: null, // Could be extracted from carModel later
      category: _detectCategory(sessionType),
      gameName: isIRacing ? 'iracing' : normalizedGameName.toLowerCase(),
      trackName: resolvedTrack,
      sessionType,
      finishPosition: finishPosition || null,
      incidentCount: incidentCount || null,
      metadata: {
        source: 'overlay_autosync',
        gameId,
        subsessionId: body.subsessionId || null,
        gameName: normalizedGameName,
        rawTrackName: trackName !== resolvedTrack ? trackName : undefined,
        preRaceIRating,
        preRaceSR,
        preRaceLicense,
        completedLaps,
        totalLaps,
        bestLapTime,
        estimatedIRatingDelta,
        fieldSize: fieldSize || null,
        startedAt,
        finishedAt,
        // Practice/qualifying session data (null for race sessions)
        ...(isPracticeSession ? {
          isPracticeSession: true,
          practiceData: practiceData || null,
        } : {})
      }
    }).returning()

    // Only insert rating history and update driverRatings for iRacing RACE sessions
    // with real ratings. Practice/qualifying sessions often report iRating 1 / SR 0.01
    // which are placeholder values — skip those entirely.
    const isPracticeOrQual = (sessionType || '').toLowerCase().includes('practice')
      || (sessionType || '').toLowerCase().includes('qual')
      || (sessionType || '').toLowerCase().includes('warmup')
    const hasRealRatings = preRaceIRating > 100 && preRaceSR > 0.5

    if (isIRacing && !isPracticeOrQual && hasRealRatings) {
      await db.insert(schema.ratingHistory).values({
        userId: result.user.id,
        category: _detectCategory(sessionType),
        iRating: preRaceIRating || 0,
        safetyRating: String(preRaceSR || 0),
        license: preRaceLicense || 'R',
        sessionType,
        trackName: resolvedTrack,
        carModel
      })
    }

    // Update current ratings only for iRacing race sessions with real ratings
    if (isIRacing && !isPracticeOrQual && hasRealRatings) {
      const category = _detectCategory(sessionType)
      const existing = await db.select().from(schema.driverRatings)
        .where(eq(schema.driverRatings.userId, result.user.id))
        .limit(1)

      if (existing.length > 0) {
        await db.update(schema.driverRatings).set({
          iRating: preRaceIRating,
          safetyRating: String(preRaceSR || 0),
          license: preRaceLicense || 'R',
          updatedAt: new Date()
        }).where(eq(schema.driverRatings.id, existing[0].id))
      } else {
        await db.insert(schema.driverRatings).values({
          userId: result.user.id,
          category,
          iRating: preRaceIRating,
          safetyRating: String(preRaceSR || 0),
          license: preRaceLicense || 'R'
        })
      }
    }

    return NextResponse.json({ success: true, sessionId: session[0]?.id })
  } catch (err) {
    console.error('[sessions] POST error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

function _detectCategory(sessionType: string): string {
  const st = (sessionType || '').toLowerCase()
  if (st.includes('oval') && !st.includes('road')) return 'oval'
  if (st.includes('dirt') && st.includes('road')) return 'dirt_road'
  if (st.includes('dirt') && st.includes('oval')) return 'dirt_oval'
  return 'road'
}

/**
 * GET /api/sessions — Get session history for the authenticated user
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'missing_token' }, { status: 401 })
  }

  const result = await validateToken(authHeader.slice(7))
  if (!result) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 })
  }

  const sessions = await db.select().from(schema.raceSessions)
    .where(eq(schema.raceSessions.userId, result.user.id))
    .orderBy(desc(schema.raceSessions.createdAt))
    .limit(100)

  return NextResponse.json({ sessions })
}

/**
 * DELETE /api/sessions — Delete a session by ID (or purge empty sessions)
 * Query params:
 *   ?id=<sessionId>      — delete a specific session
 *   ?purge=empty          — delete all sessions with 0 laps and no best lap time
 */
export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'missing_token' }, { status: 401 })
  }

  const result = await validateToken(authHeader.slice(7))
  if (!result) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('id')
  const purge = searchParams.get('purge')

  try {
    if (sessionId) {
      // Delete a specific session (must belong to this user)
      const deleted = await db.delete(schema.raceSessions)
        .where(and(
          eq(schema.raceSessions.id, sessionId),
          eq(schema.raceSessions.userId, result.user.id)
        ))
        .returning()

      if (deleted.length === 0) {
        return NextResponse.json({ error: 'Session not found or not yours' }, { status: 404 })
      }
      return NextResponse.json({ success: true, deleted: deleted.length })
    }

    if (purge === 'empty') {
      // Purge all empty sessions (0 laps, no meaningful data) for this user
      // First find them, then delete
      const allSessions = await db.select().from(schema.raceSessions)
        .where(eq(schema.raceSessions.userId, result.user.id))

      const emptySessions = allSessions.filter(s => {
        const meta = s.metadata as Record<string, unknown> | null
        const laps = meta?.completedLaps as number | undefined
        const best = meta?.bestLapTime as number | undefined
        return (!laps || laps <= 0) && (!best || best <= 0)
      })

      let deletedCount = 0
      for (const s of emptySessions) {
        await db.delete(schema.raceSessions)
          .where(and(
            eq(schema.raceSessions.id, s.id),
            eq(schema.raceSessions.userId, result.user.id)
          ))
        deletedCount++
      }

      return NextResponse.json({ success: true, purged: deletedCount, total: allSessions.length })
    }

    return NextResponse.json({ error: 'Provide ?id=<sessionId> or ?purge=empty' }, { status: 400 })
  } catch (err) {
    console.error('[sessions] DELETE error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
