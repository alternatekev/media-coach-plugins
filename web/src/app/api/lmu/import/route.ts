import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/plugin-auth'
import { db, schema } from '@/db'
import { eq } from 'drizzle-orm'

/**
 * POST /api/lmu/import — Receive bulk LMU session history from XML results parsing
 *
 * The SimHub plugin scans LMU's UserData/Log/Results/ directory, parses XML
 * result files, and POSTs the parsed session data here for storage.
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
    const { driverName, sessions } = body

    if (!Array.isArray(sessions)) {
      return NextResponse.json({ error: 'Missing sessions array' }, { status: 400 })
    }

    let sessionsImported = 0
    const errors: string[] = []

    // Load existing sessions to deduplicate by gameId
    const existingSessions = await db.select().from(schema.raceSessions)
      .where(eq(schema.raceSessions.userId, userId))
      .limit(1000)

    const existingGameIds = new Set(
      existingSessions
        .map(s => (s.metadata as Record<string, unknown>)?.gameId)
        .filter(Boolean)
        .map(String)
    )

    for (const session of sessions) {
      try {
        const gameId = String(session.gameId || '')
        if (!gameId || existingGameIds.has(gameId)) continue

        await db.insert(schema.raceSessions).values({
          userId,
          carModel: session.carName || 'Unknown',
          manufacturer: session.manufacturer || null,
          category: 'road', // LMU is all road racing (prototypes + GT)
          gameName: 'lmu',
          trackName: session.trackName || 'Unknown',
          sessionType: session.sessionType || 'Race',
          finishPosition: session.finishPosition ?? null,
          incidentCount: session.penalties ?? null,
          metadata: {
            source: 'lmu_import',
            gameId,
            gameName: 'LMU',
            driverName: session.driverName || driverName || '',
            carClass: session.carClass || '',
            completedLaps: session.completedLaps || 0,
            totalLaps: session.totalLaps || 0,
            bestLapTime: session.bestLapTime || 0,
            penalties: session.penalties || 0,
            pitstops: session.pitstops || 0,
            dnfReason: session.dnfReason || null,
            gridPosition: session.gridPosition || 0,
            totalDrivers: session.totalDrivers || 0,
            sessionLength: session.sessionLength || '',
            weather: session.weather || '',
            trackEvent: session.trackEvent || '',
            modName: session.modName || '',
            laps: session.laps || [],
            startedAt: session.startedAt || null,
            finishedAt: session.finishedAt || null,
          },
          createdAt: session.startedAt ? new Date(session.startedAt) : new Date(),
        })
        sessionsImported++
      } catch (err: any) {
        errors.push(`Session ${session.gameId || '?'}: ${err.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      imported: { sessions: sessionsImported },
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err: any) {
    console.error('[lmu/import] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
