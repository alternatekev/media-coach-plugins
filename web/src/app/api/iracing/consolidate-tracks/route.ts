import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db, schema } from '@/db'
import { eq, and, lt } from 'drizzle-orm'
import { consolidateUserTracks } from '@/lib/resolve-track'

/**
 * POST /api/iracing/consolidate-tracks
 *
 * Re-resolves every race session's trackName against the track_maps table.
 * Merges duplicates like "Autodromo Nazionale Monza" and "Monza" into
 * whichever name is actually stored in track_maps.
 *
 * Also:
 * - Normalizes legacy categories (sports_car, formula → road)
 * - Removes bogus rating history entries from practice sessions (iRating ≤ 100)
 */
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const user_ext = session.user as Record<string, unknown>
  const discordId = user_ext.discordId as string
  if (!discordId) {
    return NextResponse.json({ error: 'No Discord ID in session' }, { status: 401 })
  }

  const users = await db.select().from(schema.users)
    .where(eq(schema.users.discordId, discordId)).limit(1)
  if (users.length === 0) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const userId = users[0].id

  try {
    // 1. Re-resolve track names
    const trackResult = await consolidateUserTracks(userId)

    // 2. Merge legacy sports_car → road (formula stays separate)
    let categoriesMerged = 0
    for (const legacyCat of ['sports_car', 'sportscar']) {
      const r1 = await db.update(schema.raceSessions)
        .set({ category: 'road' })
        .where(and(eq(schema.raceSessions.userId, userId), eq(schema.raceSessions.category, legacyCat)))
        .returning()
      const r2 = await db.update(schema.ratingHistory)
        .set({ category: 'road' })
        .where(and(eq(schema.ratingHistory.userId, userId), eq(schema.ratingHistory.category, legacyCat)))
        .returning()
      const r3 = await db.update(schema.driverRatings)
        .set({ category: 'road' })
        .where(and(eq(schema.driverRatings.userId, userId), eq(schema.driverRatings.category, legacyCat)))
        .returning()
      categoriesMerged += r1.length + r2.length + r3.length
    }

    // 3. Remove bogus rating history entries (iRating ≤ 100 = practice placeholder data)
    const bogusDeleted = await db.delete(schema.ratingHistory)
      .where(and(
        eq(schema.ratingHistory.userId, userId),
        lt(schema.ratingHistory.iRating, 101),
      ))
      .returning()

    return NextResponse.json({
      success: true,
      tracks: trackResult,
      categoriesMerged,
      bogusRatingsDeleted: bogusDeleted.length,
    })
  } catch (err: any) {
    console.error('[consolidate-tracks] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
