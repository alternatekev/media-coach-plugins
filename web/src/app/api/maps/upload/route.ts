import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/db'
import { eq } from 'drizzle-orm'
import { validateToken } from '@/lib/plugin-auth'

/**
 * POST /api/maps/upload — Upload a user-recorded track map CSV.
 * Authenticated via plugin Bearer token.
 * The server normalises the CSV to SVG and stores it in the global pool.
 *
 * Expected body: {
 *   trackId: string,       // canonical identifier
 *   trackName: string,     // human-readable name
 *   rawCsv: string,        // CSV: "worldX,worldZ,lapDistPct" per line
 *   gameName?: string,     // source sim (default: "iracing")
 *   trackLengthKm?: number
 * }
 *
 * Server-side normalisation: scales CSV world coords to 0–100 SVG viewBox
 * and generates Catmull-Rom → cubic Bézier SVG path.
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
    const { trackId, trackName, rawCsv, gameName, trackLengthKm } = body

    if (!trackId || !trackName || !rawCsv) {
      return NextResponse.json({ error: 'Missing required fields: trackId, trackName, rawCsv' }, { status: 400 })
    }

    const normalizedTrackId = trackId.toLowerCase().trim()

    // Check if already exists
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

    // Parse CSV and normalise
    const lines = rawCsv.trim().split('\n').filter((l: string) => l.trim().length > 0)
    if (lines.length < 10) {
      return NextResponse.json({ error: 'Track map too small (need at least 10 points)' }, { status: 400 })
    }

    const points: { x: number; z: number; pct: number }[] = []
    for (const line of lines) {
      const parts = line.split(',').map((s: string) => parseFloat(s.trim()))
      if (parts.length >= 3 && parts.every(n => !isNaN(n))) {
        points.push({ x: parts[0], z: parts[1], pct: parts[2] })
      }
    }

    if (points.length < 10) {
      return NextResponse.json({ error: 'Could not parse enough valid CSV points' }, { status: 400 })
    }

    // Sort by lapDistPct
    points.sort((a, b) => a.pct - b.pct)

    // Normalise to 0–100 SVG viewBox with 5% padding
    const minX = Math.min(...points.map(p => p.x))
    const maxX = Math.max(...points.map(p => p.x))
    const minZ = Math.min(...points.map(p => p.z))
    const maxZ = Math.max(...points.map(p => p.z))
    const rangeX = maxX - minX || 1
    const rangeZ = maxZ - minZ || 1
    const scale = 90 / Math.max(rangeX, rangeZ)
    const offsetX = 5 + (90 - rangeX * scale) / 2
    const offsetZ = 5 + (90 - rangeZ * scale) / 2

    const normalized = points.map(p => ({
      x: (p.x - minX) * scale + offsetX,
      y: (p.z - minZ) * scale + offsetZ,
    }))

    // Generate SVG path using Catmull-Rom → cubic Bézier
    const svgPath = catmullRomToSvg(normalized)

    // Insert
    const result = await db.insert(schema.trackMaps).values({
      trackId: normalizedTrackId,
      trackName: trackName.trim(),
      svgPath,
      pointCount: points.length,
      rawCsv: rawCsv.trim(),
      contributorId: tokenResult.user.id,
      gameName: (gameName || 'iracing').toLowerCase().trim(),
      trackLengthKm: trackLengthKm ? Number(trackLengthKm) : null,
    }).returning({ id: schema.trackMaps.id })

    return NextResponse.json({
      success: true,
      status: 'created',
      trackId: normalizedTrackId,
      mapId: result[0].id,
      pointCount: points.length,
    }, { status: 201 })

  } catch (err) {
    if ((err as Error).message?.includes('unique constraint')) {
      return NextResponse.json({ success: true, status: 'exists', message: 'Track map already exists' })
    }
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

/**
 * Convert array of {x, y} points to SVG path using Catmull-Rom → cubic Bézier.
 * Produces smooth curves matching the C# TrackMapProvider output.
 */
function catmullRomToSvg(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  const n = pts.length
  const parts: string[] = [`M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`]

  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]

    // Catmull-Rom to cubic Bézier control points
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    parts.push(`C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`)
  }

  parts.push('Z')
  return parts.join(' ')
}
