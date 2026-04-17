import { db, schema } from '@/db'
import { eq } from 'drizzle-orm'
import { resolveIRacingTrackId } from '@/data/iracing-track-map'
import { resolveAcevoTrackId } from '@/data/acevo-track-map'

export interface TrackLookup {
  trackById: Map<string, string>
  trackByName: Map<string, string>
  trackByDisplay: Map<string, string>
}

/** Load all tracks from the DB and build lookup maps. */
export async function buildTrackLookup(): Promise<TrackLookup> {
  const allTracks = await db.select({
    trackId: schema.trackMaps.trackId,
    trackName: schema.trackMaps.trackName,
    displayName: schema.trackMaps.displayName,
  }).from(schema.trackMaps)

  const trackById = new Map<string, string>()
  const trackByName = new Map<string, string>()
  const trackByDisplay = new Map<string, string>()

  for (const t of allTracks) {
    trackById.set(t.trackId, t.trackName)
    trackByName.set(t.trackName.toLowerCase(), t.trackName)
    if (t.displayName) trackByDisplay.set(t.displayName.toLowerCase(), t.trackName)
  }

  return { trackById, trackByName, trackByDisplay }
}

/**
 * Resolve any track name to the canonical trackName stored in our DB.
 * Tries: exact name → displayName → game-specific mapping (iRacing/ACEvo) → partial match → keyword match.
 * Returns null if no match found.
 */
export function resolveTrackName(
  lookup: TrackLookup,
  rawName: string,
  configName?: string,
  gameName?: string,
): string | null {
  const { trackById, trackByName, trackByDisplay } = lookup
  const lower = rawName.toLowerCase()

  // 1. Exact match on DB trackName
  if (trackByName.has(lower)) return trackByName.get(lower)!

  // 2. Match on displayName
  if (trackByDisplay.has(lower)) return trackByDisplay.get(lower)!

  // 3. Game-specific mapping
  let mappedId: string | null = null
  if (gameName?.toLowerCase() === 'acevo') {
    mappedId = resolveAcevoTrackId(rawName) || null
  } else {
    // Default to iRacing mapping for backward compatibility
    mappedId = resolveIRacingTrackId(rawName, configName)
  }
  if (mappedId && trackById.has(mappedId)) return trackById.get(mappedId)!

  // 4. Partial match — name contains a DB name or vice versa
  for (const [dbLower, dbName] of trackByName) {
    if (dbLower.includes(lower) || lower.includes(dbLower)) return dbName
  }
  for (const [dbLower, dbName] of trackByDisplay) {
    if (dbLower.includes(lower) || lower.includes(dbLower)) return dbName
  }

  // 5. Slug normalization — strip year/config suffixes and try mapping again
  //    e.g. "sonoma-2025-nascarlong-nascar-long" → "sonoma" → check trackById
  const slugLower = rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  // Try progressively shorter slug prefixes (drop trailing segments)
  const slugParts = slugLower.split('-')
  for (let len = slugParts.length; len >= 1; len--) {
    const prefix = slugParts.slice(0, len).join('-')
    // Skip pure numbers (years like "2025")
    if (/^\d+$/.test(prefix)) continue
    if (trackById.has(prefix)) return trackById.get(prefix)!
  }

  // 6. Word-level matching — any significant non-numeric word from the input appears in a trackId
  const words = rawName.split(/[\s,.-]+/).filter(w => w.length > 3 && !/^\d+$/.test(w)).map(w => w.toLowerCase())
  for (const word of words) {
    for (const [dbId, dbName] of trackById) {
      if (dbId.includes(word)) return dbName
    }
  }

  return null
}

/**
 * Consolidate all race sessions for a user — re-resolve every trackName
 * against the current track_maps table.
 */
export async function consolidateUserTracks(userId: string): Promise<{
  updated: number
  unmatched: number
  changes: Record<string, string>
  unmatchedTracks: string[]
}> {
  const lookup = await buildTrackLookup()

  const allSessions = await db.select({
    id: schema.raceSessions.id,
    trackName: schema.raceSessions.trackName,
    metadata: schema.raceSessions.metadata,
  }).from(schema.raceSessions)
    .where(eq(schema.raceSessions.userId, userId))

  let updated = 0
  let unmatched = 0
  const changes: Record<string, string> = {}
  const unmatchedTracks = new Set<string>()

  for (const s of allSessions) {
    const meta = s.metadata as Record<string, unknown> | null
    const configName = (meta?.trackConfig as string) || undefined
    const resolved = resolveTrackName(lookup, s.trackName || '', configName)

    if (resolved && resolved !== s.trackName) {
      changes[s.trackName || ''] = resolved
      await db.update(schema.raceSessions)
        .set({ trackName: resolved })
        .where(eq(schema.raceSessions.id, s.id))
      updated++
    } else if (!resolved) {
      unmatchedTracks.add(s.trackName || 'Unknown')
      unmatched++
    }
  }

  return { updated, unmatched, changes, unmatchedTracks: [...unmatchedTracks] }
}
