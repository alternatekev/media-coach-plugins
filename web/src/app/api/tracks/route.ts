import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/db'
import { eq } from 'drizzle-orm'
import { resolveIRacingTrackId } from '@/data/iracing-track-map'

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
  const configName = request.nextUrl.searchParams.get('config') || undefined

  if (!trackName) {
    return NextResponse.json({ error: 'trackName query param required' }, { status: 400 })
  }

  const selectFields = {
    trackId: schema.trackMaps.trackId,
    trackName: schema.trackMaps.trackName,
    displayName: schema.trackMaps.displayName,
    sectorCount: schema.trackMaps.sectorCount,
    sectorBoundaries: schema.trackMaps.sectorBoundaries,
    svgPath: schema.trackMaps.svgPath,
    rawCsv: schema.trackMaps.rawCsv,
  }

  // If a config hint is provided (multi-config venue), try it as a direct trackId
  // first — the raw SimHub TrackId (e.g. "nurburgring gp") often IS the DB key.
  // This must run before the trackName match, which is ambiguous for multi-config
  // venues (e.g. "Nürburgring Nordschleife" could be GP, Nordschleife, or Combined).
  let results = configName
    ? await db
        .select(selectFields)
        .from(schema.trackMaps)
        .where(eq(schema.trackMaps.trackId, configName.toLowerCase().trim()))
        .limit(1)
    : []

  // Try alternate separator for the config hint (spaces ↔ dashes)
  if (results.length === 0 && configName) {
    const configLower = configName.toLowerCase().trim()
    const altConfig = configLower.includes('-')
      ? configLower.replace(/-/g, ' ')
      : configLower.replace(/ /g, '-')
    if (altConfig !== configLower) {
      results = await db
        .select(selectFields)
        .from(schema.trackMaps)
        .where(eq(schema.trackMaps.trackId, altConfig))
        .limit(1)
    }
  }

  // Try exact match on trackName (game-provided name)
  if (results.length === 0) {
    results = await db
      .select(selectFields)
      .from(schema.trackMaps)
      .where(eq(schema.trackMaps.trackName, trackName.trim()))
      .limit(1)
  }

  // Fall back to iRacing track mapping → Pro Drive trackId
  if (results.length === 0) {
    const mappedId = resolveIRacingTrackId(trackName.trim(), configName)
    results = await db
      .select(selectFields)
      .from(schema.trackMaps)
      .where(eq(schema.trackMaps.trackId, mappedId))
      .limit(1)

    // Some DB entries use spaces (e.g. "nurburgring gp" from manual uploads)
    // while mappings use dashes (e.g. "nurburgring-gp" from slugify).
    // Try the alternate separator if exact match failed.
    if (results.length === 0) {
      const altId = mappedId.includes('-')
        ? mappedId.replace(/-/g, ' ')
        : mappedId.replace(/ /g, '-')
      if (altId !== mappedId) {
        results = await db
          .select(selectFields)
          .from(schema.trackMaps)
          .where(eq(schema.trackMaps.trackId, altId))
          .limit(1)
      }
    }
  }

  // Last resort: raw slug match
  if (results.length === 0) {
    const slug = trackName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    if (slug !== trackName.trim()) {
      results = await db
        .select(selectFields)
        .from(schema.trackMaps)
        .where(eq(schema.trackMaps.trackId, slug))
        .limit(1)
    }
  }

  if (results.length === 0) {
    return NextResponse.json({ trackName, displayName: trackName, trackId: null, sectorCount: 3, sectorBoundaries: null, svgPath: null, rawCsv: null })
  }

  const track = results[0]
  const parsedBoundaries = track.sectorBoundaries ? JSON.parse(track.sectorBoundaries) : null
  return NextResponse.json({
    trackId: track.trackId,
    trackName: track.trackName,
    displayName: track.displayName || track.trackName,
    sectorCount: track.sectorCount,
    sectorBoundaries: parsedBoundaries,
    svgPath: track.svgPath ?? null,
    rawCsv: track.rawCsv ?? null,
  })
}
