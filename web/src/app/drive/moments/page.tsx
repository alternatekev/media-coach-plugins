import { auth } from '@/lib/auth'
import { db, schema } from '@/db'
import { eq, desc } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import MomentsPage from './MomentsPage'
import type { SessionRecord, RatingRecord } from '@/lib/moments'

export const metadata = {
  title: 'Moments - RaceCor.io Pro Drive',
  description: 'Your racing highlights and achievements',
}

export default async function Page() {
  const session = await auth()
  if (!session?.user) redirect('/drive')

  const user_ext = session.user as Record<string, unknown>
  const discordId = user_ext.discordId as string
  if (!discordId) redirect('/drive')

  const users = await db.select().from(schema.users).where(eq(schema.users.discordId, discordId)).limit(1)
  if (users.length === 0) redirect('/drive')
  const dbUser = users[0]

  // Fetch sessions
  const sessions = await db
    .select()
    .from(schema.raceSessions)
    .where(eq(schema.raceSessions.userId, dbUser.id))
    .orderBy(desc(schema.raceSessions.createdAt))

  // Fetch rating history
  const ratingHistory = await db
    .select()
    .from(schema.ratingHistory)
    .where(eq(schema.ratingHistory.userId, dbUser.id))
    .orderBy(desc(schema.ratingHistory.createdAt))

  // Type the sessions and ratingHistory for the client component
  const typedSessions: SessionRecord[] = sessions.map((s) => ({
    id: s.id,
    carModel: s.carModel,
    trackName: s.trackName || 'Unknown Track',
    finishPosition: s.finishPosition || undefined,
    incidentCount: s.incidentCount || 0,
    metadata: s.metadata ? (typeof s.metadata === 'string' ? JSON.parse(s.metadata) : s.metadata) as SessionRecord['metadata'] : undefined,
    createdAt: s.createdAt,
    gameName: s.gameName || 'iracing',
    sessionType: s.sessionType || 'race',
  }))

  const typedRatingHistory: RatingRecord[] = ratingHistory.map((r) => ({
    iRating: r.iRating,
    prevIRating: r.prevIRating ?? 0,
    prevLicense: r.prevLicense || undefined,
    license: r.license,
    createdAt: r.createdAt,
  }))

  return <MomentsPage sessions={typedSessions} ratingHistory={typedRatingHistory} />
}
