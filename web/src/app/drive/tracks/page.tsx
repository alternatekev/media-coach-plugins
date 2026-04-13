import { auth } from '@/lib/auth'
import { db, schema } from '@/db'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { getTrackImage } from '@/lib/commentary-images'
import TrackMasteryPage from './TrackMasteryPage'

export const metadata = {
  title: 'Tracks | Pro Drive',
  description: 'Track mastery analytics'
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

  // Pick a random track for the hero image
  const uniqueTrackNames = [...new Set(raceSessions.map(s => s.trackName).filter(Boolean))]
  let heroImageUrl: string | null = null
  let heroSvgPath: string | null = null
  let heroTrackName: string | null = null

  // Try to find a track with an image
  const shuffled = [...uniqueTrackNames].sort(() => Math.random() - 0.5)
  for (const tn of shuffled) {
    if (!tn) continue
    const img = getTrackImage(tn)
    if (img) {
      heroImageUrl = img
      heroTrackName = tn
      break
    }
  }

  // Try to get the SVG path for the hero track (or any track)
  if (heroTrackName || uniqueTrackNames.length > 0) {
    const maps = await db
      .select({ trackName: schema.trackMaps.trackName, svgPath: schema.trackMaps.svgPath })
      .from(schema.trackMaps)

    // Prefer the hero track's SVG, fall back to any
    const targetName = heroTrackName || uniqueTrackNames[0]
    const match = maps.find(m => m.trackName.toLowerCase() === (targetName || '').toLowerCase())
    if (match) heroSvgPath = match.svgPath
    if (!heroSvgPath && maps.length > 0) {
      // Try any random map
      const randomMap = maps[Math.floor(Math.random() * maps.length)]
      heroSvgPath = randomMap.svgPath
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
      heroImageUrl={heroImageUrl}
      heroSvgPath={heroSvgPath}
    />
  )
}
