import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/db'
import { eq } from 'drizzle-orm'
import { validateToken } from '@/lib/plugin-auth'

/**
 * POST /api/maps — Push a recorded track map from the plugin.
 * Authenticated via plugin Bearer token. Only accepts maps for tracks
 * that don't already exist in the global pool (first upload wins).
 *
 * Expected body: {
 *   trackId: string,      // canonical identifier (e.g. "sebring international")
 *   trackName: string,     // human-readable name
 *   rawCsv: string,        // CSV data: "worldX,worldZ,lapDistPct\n..."
 *   svgPath: string,       // pre-normalized SVG path string (M...C...Z)
 *   pointCount: number,    // number of sampled points
 *   gameName?: string,     // source sim (default: "iracing")
 *   trackLengthKm?: number // optional track length
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate via plugin token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 })
    }
    const tokenResult = await validateToken(authHeader.slice(7))
    if (!tokenResult) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const body = await request.json()
    const { trackId, trackName, rawCsv, svgPath, pointCount, gameName, trackLengthKm } = body

    // Validate required fields
    if (!trackId || !trackName || !rawCsv || !svgPath || !pointCount) {
      return NextResponse.json({ error: 'Missing required fields: trackId, trackName, rawCsv, svgPath, pointCount' }, { status: 400 })
    }

    // Normalize trackId (lowercase, trimmed)
    const normalizedTrackId = trackId.toLowerCase().trim()

    // Check if track already exists — first upload wins
    const existing = await db.select({ id: schema.trackMaps.id })
      .from(schema.trackMaps)
      .where(eq(schema.trackMaps.trackId, normalizedTrackId))
      .limit(1)

    if (existing.length > 0) {
      return NextResponse.json({
        success: true,
        status: 'exists',
        message: 'Track map already exists in pool',
        trackId: normalizedTrackId,
      })
    }

    // Validate CSV format (should have at least 10 points)
    const csvLines = rawCsv.trim().split('\n').filter((l: string) => l.trim().length > 0)
    if (csvLines.length < 10) {
      return NextResponse.json({ error: 'Track map too small (need at least 10 points)' }, { status: 400 })
    }

    // Validate SVG path starts with M
    if (!svgPath.trim().startsWith('M')) {
      return NextResponse.json({ error: 'Invalid SVG path (must start with M)' }, { status: 400 })
    }

    // Generate SVG preview
    const svgPreview = generateSvgPreview(svgPath.trim(), trackName.trim())

    // Insert new map
    const result = await db.insert(schema.trackMaps).values({
      trackId: normalizedTrackId,
      trackName: trackName.trim(),
      svgPath: svgPath.trim(),
      pointCount: Number(pointCount),
      rawCsv: rawCsv.trim(),
      contributorId: tokenResult.user.id,
      gameName: (gameName || 'iracing').toLowerCase().trim(),
      trackLengthKm: trackLengthKm ? Number(trackLengthKm) : null,
      svgPreview,
    }).returning({ id: schema.trackMaps.id })

    return NextResponse.json({
      success: true,
      status: 'created',
      trackId: normalizedTrackId,
      mapId: result[0].id,
    }, { status: 201 })

  } catch (err) {
    if ((err as Error).message?.includes('unique constraint')) {
      // Race condition: another request inserted the same track
      return NextResponse.json({ success: true, status: 'exists', message: 'Track map already exists' })
    }
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

/**
 * GET /api/maps?trackId=xxx — Fetch a track map by ID.
 * GET /api/maps?list=true — List all available track IDs.
 * No authentication required — maps are a shared public resource.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const trackId = searchParams.get('trackId')
  const list = searchParams.get('list')

  // List mode: return all available track IDs
  if (list === 'true') {
    const maps = await db.select({
      trackId: schema.trackMaps.trackId,
      trackName: schema.trackMaps.trackName,
      pointCount: schema.trackMaps.pointCount,
      gameName: schema.trackMaps.gameName,
      trackLengthKm: schema.trackMaps.trackLengthKm,
      svgPreview: schema.trackMaps.svgPreview,
      updatedAt: schema.trackMaps.updatedAt,
    }).from(schema.trackMaps).orderBy(schema.trackMaps.trackName)

    return NextResponse.json({ tracks: maps })
  }

  // Single track mode
  if (!trackId) {
    return NextResponse.json({ error: 'trackId or list=true required' }, { status: 400 })
  }

  const normalizedId = trackId.toLowerCase().trim()
  const rows = await db.select({
    trackId: schema.trackMaps.trackId,
    trackName: schema.trackMaps.trackName,
    svgPath: schema.trackMaps.svgPath,
    pointCount: schema.trackMaps.pointCount,
    gameName: schema.trackMaps.gameName,
    trackLengthKm: schema.trackMaps.trackLengthKm,
    svgPreview: schema.trackMaps.svgPreview,
    updatedAt: schema.trackMaps.updatedAt,
  }).from(schema.trackMaps)
    .where(eq(schema.trackMaps.trackId, normalizedId))
    .limit(1)

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Track map not found' }, { status: 404 })
  }

  return NextResponse.json(rows[0])
}

/** Generate a standalone SVG preview image for a track map. */
function generateSvgPreview(svgPath: string, trackName: string): string {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200">',
    '  <rect width="100" height="100" fill="#1a1a1a" rx="4"/>',
    `  <path d="${svgPath}" fill="none" stroke="#ee3633" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"/>`,
    `  <text x="50" y="94" text-anchor="middle" fill="#ffffff" fill-opacity="0.5" font-family="Barlow Condensed, sans-serif" font-size="5">${trackName}</text>`,
    '</svg>',
  ].join('\n')
}
