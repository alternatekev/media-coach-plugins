import { auth } from '@/lib/auth'
import { db, schema } from '@/db'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { getCarImage } from '@/lib/commentary-images'
import CarAffinityPage from './CarAffinityPage'

export const metadata = {
  title: 'Cars | Pro Drive',
  description: 'Car affinity analytics'
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

  // Build brand colors and logos lookups
  const brandColors: Record<string, string> = {}
  const brandLogos: Record<string, { name: string; logoSvg: string | null; logoPng: string | null; color: string | null }> = {}
  for (const logo of logos) {
    if (logo.brandColorHex) {
      brandColors[logo.brandKey] = logo.brandColorHex
    }
    brandLogos[logo.brandKey] = {
      name: logo.brandName,
      logoSvg: logo.logoSvg,
      logoPng: logo.logoPng,
      color: logo.brandColorHex,
    }
  }

  // Pick a random car from user's sessions for the hero image
  const uniqueCarModels = [...new Set(raceSessions.map(s => s.carModel))]
  let heroImageUrl: string | null = null

  const shuffled = [...uniqueCarModels].sort(() => Math.random() - 0.5)
  for (const carModel of shuffled) {
    const img = getCarImage(carModel)
    if (img) {
      heroImageUrl = img
      break
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
    <CarAffinityPage
      sessions={serializedSessions as any}
      brandColors={brandColors}
      brandLogos={brandLogos}
      heroImageUrl={heroImageUrl}
    />
  )
}
