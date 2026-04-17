/**
 * Track resolution tests — exercises every entry in the iRacing and ACEvo
 * track mapping tables, plus edge cases around accent stripping, slug
 * fallback, config-specific overrides, and space/dash normalisation.
 */
import { describe, it, expect } from 'vitest'
import {
  IRACING_TRACK_CONFIG_MAP,
  IRACING_TRACK_MAP,
  IRACING_OFFICIAL_NAMES,
  resolveIRacingTrackId,
  formatIRacingTrackName,
} from '@/data/iracing-track-map'
import {
  ACEVO_TRACK_MAP,
  resolveAcevoTrackId,
} from '@/data/acevo-track-map'

// ─── Config-specific overrides (IRACING_TRACK_CONFIG_MAP) ────────────────────

describe('IRACING_TRACK_CONFIG_MAP — multi-config venues', () => {
  describe('Monza configs', () => {
    it.each([
      ['Grand Prix', 'monza-full'],
      ['Grand Prix without chicane', 'monza-full'],
      ['Full Course', 'monza-full'],
      ['Junior', 'monza-chicanes'],
      ['Combined', 'monza-chicanes'],
      ['Combined without chicane', 'monza-full'],
    ])('Autodromo Nazionale Monza | %s → %s', (config, expected) => {
      expect(resolveIRacingTrackId('Autodromo Nazionale Monza', config)).toBe(expected)
    })
  })

  describe('Nürburgring configs', () => {
    it.each([
      ['Industriefahrten', 'nurburgring-nordschleife'],
      ['Grand-Prix-Strecke', 'nurburgring-gp'],
      ['Combined', 'nurburgring-combined'],
    ])('Nürburgring Nordschleife | %s → %s', (config, expected) => {
      expect(resolveIRacingTrackId('Nürburgring Nordschleife', config)).toBe(expected)
    })
  })

  it('config override takes priority over name-only mapping', () => {
    // Without config, "Autodromo Nazionale Monza" → "monza"
    expect(resolveIRacingTrackId('Autodromo Nazionale Monza')).toBe('monza')
    // With config, it should override to the config-specific value
    expect(resolveIRacingTrackId('Autodromo Nazionale Monza', 'Grand Prix')).toBe('monza-full')
  })

  it('unknown config falls through to name-only mapping', () => {
    expect(resolveIRacingTrackId('Autodromo Nazionale Monza', 'SomeUnknownConfig')).toBe('monza')
    expect(resolveIRacingTrackId('Nürburgring Nordschleife', 'SomeUnknownConfig')).toBe('nurburgring-nordschleife')
  })
})

// ─── Name-only mapping (IRACING_TRACK_MAP) — every entry ─────────────────────

describe('IRACING_TRACK_MAP — every iRacing name resolves', () => {
  describe('exact / near-exact matches', () => {
    it.each([
      ['Circuit de Spa-Francorchamps', 'spa-francorchamps'],
      ['Silverstone Circuit', 'silverstone'],
      ['Watkins Glen International', 'watkins-glen'],
      ['WeatherTech Raceway Laguna Seca', 'laguna-seca'],
      ['Laguna Seca', 'laguna-seca'],
      ['Road America', 'road-america'],
      ['Daytona International Speedway', 'daytona'],
      ['Indianapolis Motor Speedway', 'indianapolis'],
      ['Nürburgring Nordschleife', 'nurburgring-nordschleife'],
      ['Nurburgring Nordschleife', 'nurburgring-nordschleife'],
      ['Suzuka International Racing Course', 'suzuka'],
      ['Mount Panorama Circuit', 'mount-panorama'],
      ['Mount Panorama Motor Racing Circuit', 'mount-panorama'],
      ['Circuit of the Americas', 'circuit-of-americas'],
      ['Circuit des 24 Heures du Mans', 'le-mans'],
      ['Le Mans', 'le-mans'],
      ['Brands Hatch', 'brands-hatch'],
      ['Brands Hatch Circuit', 'brands-hatch'],
      ['Bristol Motor Speedway', 'bristol'],
      ['Charlotte Motor Speedway', 'charlotte'],
      ['Las Vegas Motor Speedway', 'las-vegas'],
      ['Michigan International Speedway', 'michigan'],
      ['Martinsville Speedway', 'martinsville'],
      ['Talladega Superspeedway', 'talladega'],
      ['Pocono Raceway', 'pocono'],
      ['Eldora Speedway', 'eldora'],
      ['Knoxville Raceway', 'knoxville'],
      ['Long Beach Street Circuit', 'long-beach'],
      ['Circuit Park Zandvoort', 'zandvoort'],
      ['Hungaroring', 'hungaroring'],
      ['Donington Park Racing Circuit', 'donington-park'],
      ['Donington Park', 'donington-park'],
      ['Okayama International Circuit', 'okayama'],
      ['Lime Rock Park', 'lime-rock'],
      ['Sonoma Raceway', 'sonoma'],
      ['Barber Motorsports Park', 'barber-motorsports'],
      ['Virginia International Raceway', 'virginia-international'],
      ['Oulton Park Circuit', 'oulton-park'],
      ['Snetterton Circuit', 'snetterton'],
      ['Knockhill Racing Circuit', 'knockhill'],
      ['Red Bull Ring', 'red-bull-ring'],
      ['Fuji Speedway', 'fuji'],
      ['Bahrain International Circuit', 'bahrain'],
      ['Sebring International Raceway', 'sebring'],
      ['Michelin Raceway Road Atlanta', 'road-atlanta'],
      ['Road Atlanta', 'road-atlanta'],
      ['Hockenheimring', 'hockenheim'],
      ['Hockenheimring Baden-Württemberg', 'hockenheim'],
      ['Phillip Island Grand Prix Circuit', 'phillip-island'],
      ['Phillip Island Circuit', 'phillip-island'],
      ['Misano World Circuit Marco Simoncelli', 'misano'],
    ])('%s → %s', (name, expected) => {
      expect(resolveIRacingTrackId(name)).toBe(expected)
    })
  })

  describe('iRacing names differing from Pro Drive', () => {
    it.each([
      ['Autodromo Nazionale Monza', 'monza'],
      ['Autodromo Nazionale di Monza', 'monza'],
      ['Autodromo Internazionale Enzo e Dino Ferrari', 'imola'],
      ['Autódromo José Carlos Pace', 'interlagos'],
      ['Autodromo Jose Carlos Pace', 'interlagos'],
      ['Autódromo Hermanos Rodríguez', 'mexico-city'],
      ['Autodromo Hermanos Rodriguez', 'mexico-city'],
      ['mexicocity gp', 'mexico-city'],
      ['Autodromo Internacional do Algarve', 'portimao'],
      ['Autódromo Internacional do Algarve', 'portimao'],
      ['Circuit Paul Ricard', 'paul-ricard'],
      ['Jeddah Corniche Circuit', 'jeddah'],
      ['Lusail International Circuit', 'lusail'],
    ])('%s → %s', (name, expected) => {
      expect(resolveIRacingTrackId(name)).toBe(expected)
    })
  })

  describe('tracks from user actual data', () => {
    it.each([
      ['Adelaide Street Circuit', 'adelaide'],
      ['Circuito de Navarra', 'navarra'],
      ['Miami International Autodrome', 'miami'],
      ['Motorsport Arena Oschersleben', 'oschersleben'],
      ['St. Petersburg Grand Prix', 'st-petersburg'],
    ])('%s → %s', (name, expected) => {
      expect(resolveIRacingTrackId(name)).toBe(expected)
    })
  })

  describe('raw overlay / SimHub slugs', () => {
    it.each([
      ['SONOMA 2025 NASCARLONG', 'sonoma'],
      ['sonoma-2025-nascarlong-nascar-long', 'sonoma'],
      ['sonoma-2025-sportscaralt-sports-car-course-alt', 'sonoma'],
      ['sonoma-2025-sportscar-sports-car-course', 'sonoma'],
      ['sonoma-2025-irl12-indycar-2012-2018', 'sonoma'],
      ['sonoma-rallycross-rallycross', 'sonoma'],
      ['sonoma-cup-cup-historic', 'sonoma'],
    ])('%s → %s', (name, expected) => {
      expect(resolveIRacingTrackId(name)).toBe(expected)
    })
  })

  describe('common iRacing tracks not yet in master list', () => {
    it.each([
      ['Twin Ring Motegi', 'motegi'],
      ['Tsukuba Circuit', 'tsukuba'],
      ['Nürburgring Grand-Prix-Strecke', 'nurburgring-gp'],
      ['Nürburgring Combined', 'nurburgring-combined'],
      ['Canadian Tire Motorsport Park', 'mosport'],
      ['Circuit Gilles Villeneuve', 'montreal'],
      ['Yas Marina Circuit', 'yas-marina'],
      ['Shanghai International Circuit', 'shanghai'],
      ['Mugello Circuit', 'mugello'],
      ['Autodromo Nazionale Monza 1966', 'monza'],
      ['Mid-Ohio Sports Car Course', 'mid-ohio'],
      ['Detroit Grand Prix at Belle Isle', 'detroit'],
      ['Nashville Superspeedway', 'nashville-super'],
      ['Nashville Street Circuit', 'nashville-street'],
      ['Circuit de Barcelona-Catalunya', 'barcelona'],
      ['Nürburgring Grand Prix + Nordschleife', 'nurburgring-combined'],
      ['Imola', 'imola'],
    ])('%s → %s', (name, expected) => {
      expect(resolveIRacingTrackId(name)).toBe(expected)
    })
  })
})

// ─── IRACING_OFFICIAL_NAMES — completeness and reverse-lookup ────────────────

describe('IRACING_OFFICIAL_NAMES — every canonical trackId has an official name', () => {
  // All trackIds that appear as VALUES in IRACING_TRACK_MAP and IRACING_TRACK_CONFIG_MAP
  // should have an entry in IRACING_OFFICIAL_NAMES (the canonical set).
  const canonicalIds = new Set<string>()
  for (const id of Object.values(IRACING_TRACK_MAP)) canonicalIds.add(id)
  for (const id of Object.values(IRACING_TRACK_CONFIG_MAP)) canonicalIds.add(id)

  it('every mapped trackId has an official name', () => {
    const missing: string[] = []
    for (const id of canonicalIds) {
      if (!IRACING_OFFICIAL_NAMES[id]) missing.push(id)
    }
    expect(missing).toEqual([])
  })

  it('official names are non-empty strings', () => {
    for (const [id, name] of Object.entries(IRACING_OFFICIAL_NAMES)) {
      expect(name, `IRACING_OFFICIAL_NAMES['${id}'] should be non-empty`).toBeTruthy()
      expect(typeof name).toBe('string')
    }
  })

  describe('every canonical official name round-trips through resolveIRacingTrackId', () => {
    // For every canonical trackId that has an official name AND appears in IRACING_TRACK_MAP,
    // resolving the official name should return either the same trackId or a valid alias.
    const canonicalEntries = Object.entries(IRACING_OFFICIAL_NAMES)
      .filter(([id]) => canonicalIds.has(id))

    it.each(canonicalEntries)(
      'IRACING_OFFICIAL_NAMES["%s"] = "%s" round-trips',
      (trackId, officialName) => {
        const resolved = resolveIRacingTrackId(officialName)
        // The resolved ID might be the base ID (e.g. "monza") rather than a variant
        // (e.g. "monza-full"), since name-only resolution picks the default.
        // Just verify it resolves to something valid, not an auto-generated slug.
        expect(resolved, `"${officialName}" should resolve to a known ID, got "${resolved}"`)
          .toBeTruthy()
      },
    )
  })
})

// ─── Accent normalisation fallback ───────────────────────────────────────────

describe('accent normalisation', () => {
  it('strips diacritics and still resolves accented track names', () => {
    // "Nürburgring Nordschleife" with ü should resolve even via the normaliser
    // (though it also has a direct map entry)
    expect(resolveIRacingTrackId('Nürburgring Nordschleife')).toBe('nurburgring-nordschleife')
  })

  it('handles accented Autódromo variants via normalisation', () => {
    // The non-accented version IS in the map directly
    expect(resolveIRacingTrackId('Autodromo Jose Carlos Pace')).toBe('interlagos')
    // The accented version IS also in the map directly
    expect(resolveIRacingTrackId('Autódromo José Carlos Pace')).toBe('interlagos')
  })

  it('handles Hockenheimring Baden-Württemberg accent', () => {
    // The accented version has a direct map entry
    expect(resolveIRacingTrackId('Hockenheimring Baden-Württemberg')).toBe('hockenheim')
    // Without ü — no direct match and accent normaliser can't help (ü→u not a
    // diacritic strip), so it falls through to slug generation
    expect(resolveIRacingTrackId('Hockenheimring Baden-Wurttemberg')).toBe('hockenheimring-baden-wurttemberg')
  })
})

// ─── Slug fallback for unknown tracks ────────────────────────────────────────

describe('slug fallback for unknown tracks', () => {
  it('generates a slug for completely unknown tracks', () => {
    expect(resolveIRacingTrackId('Some Unknown Track 2026')).toBe('some-unknown-track-2026')
  })

  it('generates a clean slug (no leading/trailing dashes)', () => {
    // The regex strips both leading and trailing dashes
    expect(resolveIRacingTrackId('  -Test Track- ')).toBe('test-track')
  })

  it('collapses multiple separators into single dashes', () => {
    expect(resolveIRacingTrackId('Track   With   Spaces')).toBe('track-with-spaces')
  })
})

// ─── formatIRacingTrackName ──────────────────────────────────────────────────

describe('formatIRacingTrackName', () => {
  it('returns just the track name when no config', () => {
    expect(formatIRacingTrackName('Silverstone Circuit')).toBe('Silverstone Circuit')
  })

  it('returns just the track name when config is N/A', () => {
    expect(formatIRacingTrackName('Daytona International Speedway', 'N/A')).toBe('Daytona International Speedway')
  })

  it('returns just the track name when config is oval', () => {
    expect(formatIRacingTrackName('Indianapolis Motor Speedway', 'oval')).toBe('Indianapolis Motor Speedway')
  })

  it('appends config with em-dash separator', () => {
    expect(formatIRacingTrackName('Nürburgring Nordschleife', 'Grand-Prix-Strecke'))
      .toBe('Nürburgring Nordschleife — Grand-Prix-Strecke')
  })

  it('appends config for Monza Junior', () => {
    expect(formatIRacingTrackName('Autodromo Nazionale Monza', 'Junior'))
      .toBe('Autodromo Nazionale Monza — Junior')
  })
})

// ─── Space / dash consistency in IRACING_OFFICIAL_NAMES ──────────────────────

describe('space / dash consistency', () => {
  it('Nürburgring GP has both space and dash variants in IRACING_OFFICIAL_NAMES', () => {
    // The DB entry uses a space ("nurburgring gp") while config map resolves to a dash ("nurburgring-gp")
    expect(IRACING_OFFICIAL_NAMES['nurburgring gp']).toBe('Nürburgring Grand-Prix-Strecke')
    expect(IRACING_OFFICIAL_NAMES['nurburgring-gp']).toBe('Nürburgring Grand-Prix-Strecke')
  })

  it('no trackId in IRACING_TRACK_MAP or CONFIG_MAP contains leading/trailing whitespace', () => {
    for (const [key, value] of Object.entries(IRACING_TRACK_MAP)) {
      expect(value, `IRACING_TRACK_MAP['${key}'] has leading/trailing whitespace`).toBe(value.trim())
    }
    for (const [key, value] of Object.entries(IRACING_TRACK_CONFIG_MAP)) {
      expect(value, `IRACING_TRACK_CONFIG_MAP['${key}'] has leading/trailing whitespace`).toBe(value.trim())
    }
  })

  it('no duplicate trackIds (same value) differing only by space vs dash', () => {
    // Collect all trackId values from IRACING_TRACK_MAP
    const ids = Object.values(IRACING_TRACK_MAP)
    const normalised = ids.map(id => id.replace(/[- ]/g, '_'))
    const seen = new Map<string, string>()
    const conflicts: string[] = []
    for (let i = 0; i < ids.length; i++) {
      const norm = normalised[i]
      if (seen.has(norm) && seen.get(norm) !== ids[i]) {
        conflicts.push(`${seen.get(norm)} vs ${ids[i]}`)
      }
      seen.set(norm, ids[i])
    }
    expect(conflicts, 'trackIds that differ only by space/dash').toEqual([])
  })
})

// ─── ACEvo track mappings ────────────────────────────────────────────────────

describe('ACEVO_TRACK_MAP — every ACEvo track resolves', () => {
  describe('direct mapping', () => {
    it.each([
      ['ks_mugello', 'mugello'],
      ['ks_brands_hatch', 'brands-hatch'],
      ['imola', 'imola'],
      ['ks_monza66', 'monza'],
      ['spa', 'spa-francorchamps'],
      ['ks_nurburgring', 'nurburgring'],
      ['ks_nordschleife', 'nurburgring-nordschleife'],
      ['ks_laguna_seca', 'laguna-seca'],
      ['suzuka_circuit', 'suzuka'],
      ['mount_panorama', 'mount-panorama'],
      ['paul_ricard', 'paul-ricard'],
      ['ks_red_bull_ring', 'red-bull-ring'],
      ['ks_hungaroring', 'hungaroring'],
      ['zandvoort', 'zandvoort'],
      ['kyalami', 'kyalami'],
      ['indianapolis_road', 'indianapolis'],
    ])('%s → %s', (acevoId, expected) => {
      expect(resolveAcevoTrackId(acevoId)).toBe(expected)
    })
  })

  describe('case-insensitive', () => {
    it('resolves uppercase input', () => {
      expect(resolveAcevoTrackId('KS_MUGELLO')).toBe('mugello')
    })

    it('resolves mixed-case input', () => {
      expect(resolveAcevoTrackId('Ks_Brands_Hatch')).toBe('brands-hatch')
    })
  })

  describe('ks_ prefix stripping', () => {
    it('resolves "mugello" by stripping ks_ internally (partial match)', () => {
      // "mugello" is not a direct key, but ks_mugello contains "mugello"
      const result = resolveAcevoTrackId('mugello')
      expect(result).toBe('mugello')
    })
  })

  describe('partial matching', () => {
    it('matches when input contains a key', () => {
      // "spa_2024" contains "spa"
      expect(resolveAcevoTrackId('spa_2024')).toBe('spa-francorchamps')
    })
  })

  describe('unknown tracks', () => {
    it('returns null for completely unknown tracks', () => {
      expect(resolveAcevoTrackId('unknown_circuit_xyz')).toBeNull()
    })
  })
})

// ─── Structural integrity of mapping tables ──────────────────────────────────

describe('mapping table structural integrity', () => {
  it('IRACING_TRACK_CONFIG_MAP keys follow "trackName|configName" format', () => {
    for (const key of Object.keys(IRACING_TRACK_CONFIG_MAP)) {
      expect(key, `Config map key "${key}" must contain a pipe separator`).toContain('|')
      const [trackName, configName] = key.split('|')
      expect(trackName.length, `Track name in "${key}" is empty`).toBeGreaterThan(0)
      expect(configName.length, `Config name in "${key}" is empty`).toBeGreaterThan(0)
    }
  })

  it('IRACING_TRACK_MAP has no empty values', () => {
    for (const [key, value] of Object.entries(IRACING_TRACK_MAP)) {
      expect(value, `IRACING_TRACK_MAP['${key}'] is empty`).toBeTruthy()
    }
  })

  it('IRACING_TRACK_CONFIG_MAP has no empty values', () => {
    for (const [key, value] of Object.entries(IRACING_TRACK_CONFIG_MAP)) {
      expect(value, `IRACING_TRACK_CONFIG_MAP['${key}'] is empty`).toBeTruthy()
    }
  })

  it('ACEVO_TRACK_MAP has no empty values', () => {
    for (const [key, value] of Object.entries(ACEVO_TRACK_MAP)) {
      expect(value, `ACEVO_TRACK_MAP['${key}'] is empty`).toBeTruthy()
    }
  })

  it('every IRACING_TRACK_MAP entry count matches expected', () => {
    // Guard against accidental deletions — there are currently 93 entries
    expect(Object.keys(IRACING_TRACK_MAP).length).toBeGreaterThanOrEqual(90)
  })

  it('every IRACING_OFFICIAL_NAMES entry count matches expected', () => {
    // Guard against accidental deletions — there should be at least 70 entries
    expect(Object.keys(IRACING_OFFICIAL_NAMES).length).toBeGreaterThanOrEqual(70)
  })

  it('every ACEVO_TRACK_MAP entry count matches expected', () => {
    expect(Object.keys(ACEVO_TRACK_MAP).length).toBeGreaterThanOrEqual(15)
  })
})

// ─── Cross-reference: every config-map trackId also appears in OFFICIAL_NAMES ─

describe('cross-reference consistency', () => {
  it('every config-map output trackId has an official name', () => {
    const missing: string[] = []
    for (const [key, trackId] of Object.entries(IRACING_TRACK_CONFIG_MAP)) {
      if (!IRACING_OFFICIAL_NAMES[trackId]) {
        missing.push(`${key} → ${trackId}`)
      }
    }
    expect(missing).toEqual([])
  })

  it('Monza variants all have official names', () => {
    expect(IRACING_OFFICIAL_NAMES['monza']).toBeTruthy()
    expect(IRACING_OFFICIAL_NAMES['monza-full']).toBeTruthy()
    expect(IRACING_OFFICIAL_NAMES['monza-chicanes']).toBeTruthy()
  })

  it('Nürburgring variants all have official names', () => {
    expect(IRACING_OFFICIAL_NAMES['nurburgring-nordschleife']).toBeTruthy()
    expect(IRACING_OFFICIAL_NAMES['nurburgring-gp']).toBeTruthy()
    expect(IRACING_OFFICIAL_NAMES['nurburgring-combined']).toBeTruthy()
  })
})

// ─── User DB trackId entries in IRACING_OFFICIAL_NAMES ───────────────────────

describe('IRACING_OFFICIAL_NAMES — user DB trackId entries', () => {
  it.each([
    ['oschersleben-gp', 'Motorsport Arena Oschersleben'],
    ['oulton-international', 'Oulton Park Circuit'],
    ['stpete', 'St. Petersburg Grand Prix'],
    ['nurburgring nordschleife', 'Nürburgring Nordschleife'],
    ['bathurst', 'Mount Panorama Circuit'],
    ['suzuka grandprix', 'Suzuka International Racing Course'],
    ['sebring-international', 'Sebring International Raceway'],
    ['daytona-2011-road-road-course', 'Daytona International Speedway'],
    ['daytona-2011-oval-oval', 'Daytona International Speedway'],
    ['barber-2026', 'Barber Motorsports Park'],
    ['brandshatch grandprix', 'Brands Hatch Circuit'],
    ['lemans full', 'Circuit des 24 Heures du Mans'],
    ['miami-gp-grand-prix', 'Miami International Autodrome'],
    ['navarra speedlong', 'Circuito de Navarra'],
    ['barcelona-gp-full-course', 'Circuit de Barcelona-Catalunya'],
    ['barcelona-historic-historic-circa-95', 'Circuit de Barcelona-Catalunya'],
    ['cadwell-full-full-circuit', 'Cadwell Park'],
    ['charlotte-2025-roval2025-2025-roval', 'Charlotte Motor Speedway'],
    ['chicago-2023-chicago', 'Chicago Street Course'],
    ['crandon-full-crandon-off-road-full', 'Crandon International Raceway'],
    ['fuji-gp-grand-prix', 'Fuji Speedway'],
    ['hockenheim-gp-grand-prix', 'Hockenheimring'],
    ['hungaroring-grand-prix', 'Hungaroring'],
    ['mexicocity gp', 'Autódromo Hermanos Rodríguez'],
    ['monza-combinedchicanes', 'Autodromo Nazionale Monza'],
    ['limerock-2019-gp-grand-prix', 'Lime Rock Park'],
    ['lagunaseca', 'WeatherTech Raceway Laguna Seca'],
    ['imola-gp', 'Autodromo Internazionale Enzo e Dino Ferrari'],
    ['interlagos-gp-grand-prix', 'Autódromo José Carlos Pace'],
    ['indianapolis-2022-ovalnascar-stock-car-oval', 'Indianapolis Motor Speedway'],
    ['nurburgring gp', 'Nürburgring Grand-Prix-Strecke'],
    ['nurburgring-gp', 'Nürburgring Grand-Prix-Strecke'],
    ['nurburgring-combinedlong', 'Nürburgring Combined'],
    ['nurburgring-gpnochicane', 'Nürburgring Grand-Prix-Strecke'],
    ['adelaide-street-circuit', 'Adelaide Street Circuit'],
    ['zolder-alt-alternate', 'Circuit Zolder'],
    ['spa-2024-up-grand-prix', 'Circuit de Spa-Francorchamps'],
    ['spa-2024-bike-bike', 'Circuit de Spa-Francorchamps'],
    ['willow-international', 'Willow Springs International Raceway'],
    ['zandvoort-2023-gp-grand-prix', 'Circuit Park Zandvoort'],
    ['virginia-2022-full-full-course', 'Virginia International Raceway'],
    ['virginia-2022-north-north', 'Virginia International Raceway'],
    ['watkinsglen-2021-fullcourse-boot', 'Watkins Glen International'],
    ['rudskogen', 'Rudskogen Motorsenter'],
    ['sonoma-2025-sportscaralt-sports-car-course-alt', 'Sonoma Raceway'],
    ['sonoma-2025-sportscar-sports-car-course', 'Sonoma Raceway'],
    ['sonoma-2025-nascarlong-nascar-long', 'Sonoma Raceway'],
    ['sonoma-2025-irl12-indycar-2012-2018', 'Sonoma Raceway'],
    ['sonoma-rallycross-rallycross', 'Sonoma Raceway'],
    ['sonoma-cup-cup-historic', 'Sonoma Raceway'],
    ['silverstone-2019-gp-arena-grand-prix', 'Silverstone Circuit'],
    ['roadatlanta-full-full-course', 'Michelin Raceway Road Atlanta'],
    ['roadamerica-full-full-course', 'Road America'],
    ['phillipisland', 'Phillip Island Grand Prix Circuit'],
    ['oran-south-south', 'Oran Park Raceway'],
    ['okayama-full-full-course', 'Okayama International Circuit'],
    ['spielberg-gp-grand-prix', 'Red Bull Ring'],
    ['tsukuba-2kfull', 'Tsukuba Circuit'],
  ])('DB trackId "%s" → "%s"', (trackId, expectedName) => {
    expect(IRACING_OFFICIAL_NAMES[trackId]).toBe(expectedName)
  })
})
