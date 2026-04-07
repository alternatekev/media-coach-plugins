import { auth } from '@/lib/auth'
import { db, schema } from '@/db'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import TrackMasteryPage from './TrackMasteryPage'

export const metadata = {
  title: 'Tracks & Cars | Pro Drive',
  description: 'Track mastery and car affinity analytics'
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
  const raceSessions = await db
    .select()
    .from(schema.raceSessions)
    .where(eq(schema.raceSessions.userId, dbUser.id))

  // Fetch car logos for brand colors
  const logos = await db
    .select()
    .from(schema.carLogos)

  // Build brand colors lookup: brandKey -> hex color
  const brandColors: Record<string, string> = {}
  for (const logo of logos) {
    if (logo.brandColorHex) {
      brandColors[logo.brandKey] = logo.brandColorHex
    }
  }

  // Serialize race sessions (convert Date objects to ISO strings)
  const serializedSessions = raceSessions.map(s => ({
    ...s,
    manufacturer: s.manufacturer || undefined,
    metadata: (s.metadata ?? null) as Record<string, any> | null,
    createdAt: s.createdAt.toISOString()
  }))

  return (
    <TrackMasteryPage
      sessions={serializedSessions as any}
      brandColors={brandColors}
    />
  )
}
