import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/db'
import { eq } from 'drizzle-orm'
import { validateToken } from '@/lib/plugin-auth'

/**
 * DELETE /api/maps/reset?trackId=xxx — Remove a track map from the global pool.
 * Admin-only: only the configured admin Discord ID can delete maps from the DB.
 * The overlay also resets the local plugin cache independently.
 */

const ADMIN_DISCORD_ID = process.env.K10_ADMIN_DISCORD_ID || ''

export async function DELETE(request: NextRequest) {
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

    // Admin check
    if (!ADMIN_DISCORD_ID || tokenResult.user.discordId !== ADMIN_DISCORD_ID) {
      return NextResponse.json({ error: 'Admin access required to reset global maps' }, { status: 403 })
    }

    const trackId = request.nextUrl.searchParams.get('trackId')
    if (!trackId) {
      return NextResponse.json({ error: 'trackId required' }, { status: 400 })
    }

    const normalizedId = trackId.toLowerCase().trim()
    const deleted = await db.delete(schema.trackMaps)
      .where(eq(schema.trackMaps.trackId, normalizedId))
      .returning({ id: schema.trackMaps.id })

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Track map not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, trackId: normalizedId })
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
