import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/db'
import { eq } from 'drizzle-orm'

/**
 * GET /api/tracks?trackName=xxx — Resolve track metadata and map data.
 *
 * Public endpoint (no auth) used by the plugin to load track maps and
 * display names without requiring a local CSV file on disk.
 *
 * Returns: { trackName, displayName, trackId, sectorCount, sectorBoundaries, rawCsv }
 * rawCsv is the WorldX,WorldZ,LapDistPct CSV used by TrackMapProvider to build the SVG outline.
 * displayName and rawCsv are null if not set.
 */
export async function GET(request: NextRequest) {
  const trackName = request.nextUrl.searchParams.get('trackName')

  if (!trackName) {
    return NextResponse.json({ error: 'trackName query param required' }, { status: 400 })
  }

  const selectFields = {
    trackId: schema.trackMaps.trackId,
    trackName: schema.trackMaps.trackName,
    displayName: schema.trackMaps.displayName,
    sectorCount: schema.trackMaps.sectorCount,
    sectorBoundaries: schema.trackMaps.sectorBoundaries,
    rawCsv: schema.trackMaps.rawCsv,
  }

  // Try exact match on trackName first (game-provided name)
  let results = await db
    .select(selectFields)
    .from(schema.trackMaps)
    .where(eq(schema.trackMaps.trackName, trackName.trim()))
    .limit(1)

  // Fall back to trackId slug match
  if (results.length === 0) {
    const slug = trackName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    results = await db
      .select(selectFields)
      .from(schema.trackMaps)
      .where(eq(schema.trackMaps.trackId, slug))
      .limit(1)
  }

  if (results.length === 0) {
    return NextResponse.json({ trackName, displayName: trackName, trackId: null, sectorCount: 3, sectorBoundaries: null, rawCsv: null })
  }

  const track = results[0]
  const parsedBoundaries = track.sectorBoundaries ? JSON.parse(track.sectorBoundaries) : null
  return NextResponse.json({
    trackId: track.trackId,
    trackName: track.trackName,
    displayName: track.displayName || track.trackName,
    sectorCount: track.sectorCount,
    sectorBoundaries: parsedBoundaries,
    rawCsv: track.rawCsv ?? null,
  })
}
