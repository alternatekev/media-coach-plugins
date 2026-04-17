import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db, schema } from '@/db'
import { eq } from 'drizzle-orm'

/**
 * POST /api/ratings/reset — Delete all iRacing rating data for the current user.
 * Uses web session auth (Discord login), not plugin token.
 */
export async function POST() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const discordId = (session.user as Record<string, unknown>).discordId as string
  if (!discordId) {
    return NextResponse.json({ error: 'No Discord ID in session' }, { status: 401 })
  }

  // Find the user row
  const users = await db.select().from(schema.users)
    .where(eq(schema.users.discordId, discordId))
    .limit(1)

  if (users.length === 0) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const userId = users[0].id

  // Delete ALL iRacing data for this user
  // raceSessions deletion cascades to lap_telemetry + session_behavior via FK
  const sessionsDeleted = await db.delete(schema.raceSessions)
    .where(eq(schema.raceSessions.userId, userId))
    .returning()

  const historyDeleted = await db.delete(schema.ratingHistory)
    .where(eq(schema.ratingHistory.userId, userId))
    .returning()

  const ratingsDeleted = await db.delete(schema.driverRatings)
    .where(eq(schema.driverRatings.userId, userId))
    .returning()

  const accountsDeleted = await db.delete(schema.iracingAccounts)
    .where(eq(schema.iracingAccounts.userId, userId))
    .returning()

  return NextResponse.json({
    success: true,
    deleted: {
      sessionRows: sessionsDeleted.length,
      historyRows: historyDeleted.length,
      ratingRows: ratingsDeleted.length,
      accountRows: accountsDeleted.length,
    },
  })
}
