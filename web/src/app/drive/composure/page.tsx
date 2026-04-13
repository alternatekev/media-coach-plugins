import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db, schema } from '@/db'
import { eq, desc, and } from 'drizzle-orm'
import { ComposureTrendsClient } from './ComposureTrendsClient'

// ── Types ────────────────────────────────────────────────────────────────────

type SessionWithBehavior = {
  id: string
  createdAt: Date
  incidentCount: number
  metadata: {
    preRaceSR?: number
    postRaceSR?: number
    preRaceIRating?: number
    postRaceIRating?: number
    completedLaps?: number
    startedAt?: string
    seriesName?: string
  }
  behavior: {
    avgRageScore: number
    rageSpikes: number
    cooldownsTriggered: number
    cleanLaps: number
    totalLaps: number
    closePassCount: number
    offTrackCount: number
    tailgatingSeconds: number
    retaliationAttempts: number
    totalRageRecoverySeconds: number
  }
  trackName?: string | null
}

// ── Server Component ─────────────────────────────────────────────────────────

export default async function ComposureTrendsPage() {
  // Auth check
  const session = await auth()
  if (!session?.user) redirect('/drive')

  const user_ext = session.user as Record<string, unknown>
  const discordId = user_ext.discordId as string

  // Look up user
  const dbUser = await db.query.users.findFirst({
    where: eq(schema.users.discordId, discordId),
  })

  if (!dbUser) redirect('/drive')

  // Fetch all race sessions with behavior data for this user
  const sessions = await db
    .select({
      id: schema.raceSessions.id,
      createdAt: schema.raceSessions.createdAt,
      incidentCount: schema.raceSessions.incidentCount,
      metadata: schema.raceSessions.metadata,
      trackName: schema.raceSessions.trackName,
      behaviorId: schema.sessionBehavior.id,
      avgRageScore: schema.sessionBehavior.avgRageScore,
      rageSpikes: schema.sessionBehavior.rageSpikes,
      cooldownsTriggered: schema.sessionBehavior.cooldownsTriggered,
      cleanLaps: schema.sessionBehavior.cleanLaps,
      totalLaps: schema.sessionBehavior.totalLaps,
      closePassCount: schema.sessionBehavior.closePassCount,
      offTrackCount: schema.sessionBehavior.offTrackCount,
      tailgatingSeconds: schema.sessionBehavior.tailgatingSeconds,
      retaliationAttempts: schema.sessionBehavior.retaliationAttempts,
      totalRageRecoverySeconds: schema.sessionBehavior.totalRageRecoverySeconds,
    })
    .from(schema.raceSessions)
    .leftJoin(
      schema.sessionBehavior,
      eq(schema.raceSessions.id, schema.sessionBehavior.sessionId)
    )
    .where(eq(schema.raceSessions.userId, dbUser.id))
    .orderBy(desc(schema.raceSessions.createdAt))
    .limit(100)

  // Transform to combined format
  const formattedSessions: SessionWithBehavior[] = sessions.map(row => ({
    id: row.id,
    createdAt: row.createdAt,
    incidentCount: row.incidentCount ?? 0,
    metadata: (row.metadata as any) || {},
    trackName: row.trackName,
    behavior: {
      avgRageScore: row.avgRageScore ?? 0,
      rageSpikes: row.rageSpikes ?? 0,
      cooldownsTriggered: row.cooldownsTriggered ?? 0,
      cleanLaps: row.cleanLaps ?? 0,
      totalLaps: row.totalLaps ?? 0,
      closePassCount: row.closePassCount ?? 0,
      offTrackCount: row.offTrackCount ?? 0,
      tailgatingSeconds: row.tailgatingSeconds ?? 0,
      retaliationAttempts: row.retaliationAttempts ?? 0,
      totalRageRecoverySeconds: row.totalRageRecoverySeconds ?? 0,
    },
  }))

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <ComposureTrendsClient sessions={formattedSessions} />
      </div>
    </div>
  )
}
