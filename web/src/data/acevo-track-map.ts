/**
 * Maps Assetto Corsa EVO track IDs (from SimHub) to Pro Drive track IDs.
 *
 * AC EVO reports track names in Kunos-style format. This table bridges those raw IDs
 * to our canonical master-tracks.json IDs.
 *
 * Single-level mapping: ACEvo raw ID → Pro Drive trackId
 */

export const ACEVO_TRACK_MAP: Record<string, string> = {
  // Kunos track ID slugs → Pro Drive trackId
  'ks_mugello': 'mugello',
  'ks_brands_hatch': 'brands-hatch',
  'imola': 'imola',
  'ks_monza66': 'monza',
  'spa': 'spa-francorchamps',
  'ks_nurburgring': 'nurburgring',
  'ks_nordschleife': 'nurburgring-nordschleife',
  'ks_laguna_seca': 'laguna-seca',
  'suzuka_circuit': 'suzuka',
  'mount_panorama': 'mount-panorama',
  'paul_ricard': 'paul-ricard',
  'ks_red_bull_ring': 'red-bull-ring',
  'ks_hungaroring': 'hungaroring',
  'zandvoort': 'zandvoort',
  'kyalami': 'kyalami',
  'indianapolis_road': 'indianapolis',
}

/**
 * Resolve an AC EVO track ID to a Pro Drive track ID.
 */
export function resolveAcevoTrackId(acevoTrackId: string): string | null {
  const lower = acevoTrackId.toLowerCase().trim()

  // Exact match first
  if (ACEVO_TRACK_MAP[lower]) {
    return ACEVO_TRACK_MAP[lower]
  }

  // Try without 'ks_' prefix if present
  if (lower.startsWith('ks_')) {
    const unprefixed = lower.slice(3)
    if (ACEVO_TRACK_MAP[unprefixed]) {
      return ACEVO_TRACK_MAP[unprefixed]
    }
  }

  // Partial match — try to find a key that contains the input or vice versa
  for (const [key, value] of Object.entries(ACEVO_TRACK_MAP)) {
    if (key.includes(lower) || lower.includes(key)) {
      return value
    }
  }

  return null
}
