/**
 * Seed script: import bundled track map CSVs into the database.
 * Reads CSV files from the plugin's trackmaps directory, normalises them,
 * generates SVG path + preview, and inserts into the track_maps table.
 *
 * Usage: npx tsx scripts/seed-track-maps.ts
 */

import { readFileSync, readdirSync } from 'fs'
import { join, basename } from 'path'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../src/db/schema'
import { eq } from 'drizzle-orm'

const TRACKMAPS_DIR = join(__dirname, '../../racecor-plugin/simhub-plugin/k10-motorsports-data/trackmaps')

interface Point {
  x: number
  z: number
  pct: number
}

function parseCsv(content: string): Point[] {
  const lines = content.trim().split('\n').filter(l => l.trim().length > 0)
  const points: Point[] = []
  for (const line of lines) {
    const parts = line.split(',').map(s => parseFloat(s.trim()))
    if (parts.length >= 3 && parts.every(n => !isNaN(n))) {
      points.push({ x: parts[0], z: parts[1], pct: parts[2] })
    }
  }
  return points.sort((a, b) => a.pct - b.pct)
}

function normalise(points: Point[]): { x: number; y: number }[] {
  const minX = Math.min(...points.map(p => p.x))
  const maxX = Math.max(...points.map(p => p.x))
  const minZ = Math.min(...points.map(p => p.z))
  const maxZ = Math.max(...points.map(p => p.z))
  const rangeX = (maxX - minX) || 1
  const rangeZ = (maxZ - minZ) || 1
  const scale = 90 / Math.max(rangeX, rangeZ)
  const offsetX = 5 + (90 - rangeX * scale) / 2
  const offsetZ = 5 + (90 - rangeZ * scale) / 2

  return points.map(p => ({
    x: (p.x - minX) * scale + offsetX,
    y: (p.z - minZ) * scale + offsetZ,
  }))
}

function catmullRomToSvg(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  const n = pts.length
  const parts: string[] = [`M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`]

  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    parts.push(`C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`)
  }

  parts.push('Z')
  return parts.join(' ')
}

function generateSvgPreview(svgPath: string, trackName: string): string {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200">',
    '  <rect width="100" height="100" fill="#1a1a1a" rx="4"/>',
    `  <path d="${svgPath}" fill="none" stroke="#ee3633" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"/>`,
    `  <text x="50" y="94" text-anchor="middle" fill="#ffffff" fill-opacity="0.5" font-family="Barlow Condensed, sans-serif" font-size="5">${trackName}</text>`,
    '</svg>',
  ].join('\n')
}

async function main() {
  const dbUrl = process.env.k10_DATABASE_URL
  if (!dbUrl) {
    console.error('Set k10_DATABASE_URL environment variable')
    process.exit(1)
  }

  const sql = neon(dbUrl)
  const db = drizzle(sql, { schema })

  const files = readdirSync(TRACKMAPS_DIR).filter(f => f.endsWith('.csv'))
  console.log(`Found ${files.length} track map CSVs to import`)

  let imported = 0
  let skipped = 0

  for (const file of files) {
    const trackId = basename(file, '.csv')
    const normalizedId = trackId.toLowerCase().trim()

    // Check if already exists
    const existing = await db.select({ id: schema.trackMaps.id })
      .from(schema.trackMaps)
      .where(eq(schema.trackMaps.trackId, normalizedId))
      .limit(1)

    if (existing.length > 0) {
      console.log(`  ⏭  ${trackId} — already in DB`)
      skipped++
      continue
    }

    const csvContent = readFileSync(join(TRACKMAPS_DIR, file), 'utf8')
    const points = parseCsv(csvContent)

    if (points.length < 10) {
      console.log(`  ⚠  ${trackId} — too few points (${points.length}), skipping`)
      skipped++
      continue
    }

    const normalized = normalise(points)
    const svgPath = catmullRomToSvg(normalized)
    const displayName = trackId.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    const svgPreview = generateSvgPreview(svgPath, displayName)

    await db.insert(schema.trackMaps).values({
      trackId: normalizedId,
      trackName: displayName,
      svgPath,
      pointCount: points.length,
      rawCsv: csvContent.trim(),
      gameName: 'iracing',
      svgPreview,
    })

    console.log(`  ✓  ${displayName} — ${points.length} points`)
    imported++
  }

  console.log(`\nDone: ${imported} imported, ${skipped} skipped`)
}

main().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
