import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db, schema } from '@/db'
import { eq, desc } from 'drizzle-orm'
import DriverDNAPage from './DriverDNAPage'

export const metadata = {
  title: 'Driver DNA | Pro Drive',
  description: 'Your unique racing profile and performance insights',
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

  // Fetch all race sessions for this user
  const raceSessions = await db.select().from(schema.raceSessions)
    .where(eq(schema.raceSessions.userId, dbUser.id))
    .orderBy(desc(schema.raceSessions.createdAt))

  // Fetch all rating history for this user
  const ratingHistory = await db.select().from(schema.ratingHistory)
    .where(eq(schema.ratingHistory.userId, dbUser.id))
    .orderBy(desc(schema.ratingHistory.createdAt))

  // Serialize dates to strings for client component
  const serializedSessions = raceSessions.map((s) => ({
    ...s,
    metadata: (s.metadata ?? null) as Record<string, any> | null,
    createdAt: s.createdAt.toISOString(),
  }))

  const serializedRatings = ratingHistory.map((r) => ({
    ...r,
    prevIRating: r.prevIRating ?? 0,
    createdAt: r.createdAt.toISOString(),
  }))

  return <DriverDNAPage sessions={serializedSessions} ratingHistory={serializedRatings} />
}
