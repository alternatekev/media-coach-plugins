import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db, schema } from '@/db'
import { eq, desc } from 'drizzle-orm'
import CareerAtlas from './CareerAtlas'

export default async function CareerPage() {
  const session = await auth()
  if (!session?.user) redirect('/drive')

  const user_ext = session.user as Record<string, unknown>
  const discordId = user_ext.discordId as string
  if (!discordId) redirect('/drive')

  const users = await db.select().from(schema.users).where(eq(schema.users.discordId, discordId)).limit(1)
  if (users.length === 0) redirect('/drive')
  const dbUser = users[0]

  // Fetch ALL race sessions
  const sessions = await db.select().from(schema.raceSessions)
    .where(eq(schema.raceSessions.userId, dbUser.id))
    .orderBy(desc(schema.raceSessions.createdAt))

  // Fetch ALL rating history
  const ratingHistory = await db.select().from(schema.ratingHistory)
    .where(eq(schema.ratingHistory.userId, dbUser.id))
    .orderBy(desc(schema.ratingHistory.createdAt))

  // Fetch current ratings
  const currentRatings = await db.select().from(schema.driverRatings)
    .where(eq(schema.driverRatings.userId, dbUser.id))

  return <CareerAtlas
    sessions={JSON.parse(JSON.stringify(sessions))}
    ratingHistory={JSON.parse(JSON.stringify(ratingHistory))}
    currentRatings={JSON.parse(JSON.stringify(currentRatings))}
  />
}
