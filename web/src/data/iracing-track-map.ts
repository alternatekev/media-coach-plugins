/**
 * Maps iRacing track names (from their Data API) to Pro Drive track IDs.
 *
 * iRacing's `member_recent_races` returns track names that don't match
 * our master track list or what SimHub reports. This table bridges the gap.
 *
 * Two levels of mapping:
 * 1. IRACING_TRACK_CONFIG_MAP: track_name + config_name → trackId (for configs that map to different tracks)
 * 2. IRACING_TRACK_MAP: track_name → trackId (fallback when config doesn't matter)
 */

// Config-specific overrides: "trackName|configName" → Pro Drive trackId
export const IRACING_TRACK_CONFIG_MAP: Record<string, string> = {
  'Autodromo Nazionale Monza|Grand Prix': 'monza-full',
  'Autodromo Nazionale Monza|Grand Prix without chicane': 'monza-full',
  'Autodromo Nazionale Monza|Full Course': 'monza-full',
  'Autodromo Nazionale Monza|Junior': 'monza-chicanes',
  'Autodromo Nazionale Monza|Combined': 'monza-chicanes',
  'Autodromo Nazionale Monza|Combined without chicane': 'monza-full',
  'Nürburgring Nordschleife|Industriefahrten': 'nurburgring-nordschleife',
  'Nürburgring Nordschleife|Grand-Prix-Strecke': 'nurburgring-gp',
  'Nürburgring Nordschleife|Combined': 'nurburgring-combined',
}

export const IRACING_TRACK_MAP: Record<string, string> = {
  // ── Exact or near-exact matches ──
  'Circuit de Spa-Francorchamps': 'spa-francorchamps',
  'Silverstone Circuit': 'silverstone',
  'Watkins Glen International': 'watkins-glen',
  'WeatherTech Raceway Laguna Seca': 'laguna-seca',
  'Laguna Seca': 'laguna-seca',
  'Road America': 'road-america',
  'Daytona International Speedway': 'daytona',
  'Indianapolis Motor Speedway': 'indianapolis',
  'Nürburgring Nordschleife': 'nurburgring-nordschleife',
  'Nurburgring Nordschleife': 'nurburgring-nordschleife',
  'Suzuka International Racing Course': 'suzuka',
  'Mount Panorama Circuit': 'mount-panorama',
  'Mount Panorama Motor Racing Circuit': 'mount-panorama',
  'Circuit of the Americas': 'circuit-of-americas',
  'Circuit des 24 Heures du Mans': 'le-mans',
  'Le Mans': 'le-mans',
  'Brands Hatch': 'brands-hatch',
  'Brands Hatch Circuit': 'brands-hatch',
  'Bristol Motor Speedway': 'bristol',
  'Charlotte Motor Speedway': 'charlotte',
  'Las Vegas Motor Speedway': 'las-vegas',
  'Michigan International Speedway': 'michigan',
  'Martinsville Speedway': 'martinsville',
  'Talladega Superspeedway': 'talladega',
  'Pocono Raceway': 'pocono',
  'Eldora Speedway': 'eldora',
  'Knoxville Raceway': 'knoxville',
  'Long Beach Street Circuit': 'long-beach',
  'Circuit Park Zandvoort': 'zandvoort',
  'Hungaroring': 'hungaroring',
  'Donington Park Racing Circuit': 'donington-park',
  'Donington Park': 'donington-park',
  'Okayama International Circuit': 'okayama',
  'Lime Rock Park': 'lime-rock',
  'Sonoma Raceway': 'sonoma',
  'Barber Motorsports Park': 'barber-motorsports',
  'Virginia International Raceway': 'virginia-international',
  'Oulton Park Circuit': 'oulton-park',
  'Snetterton Circuit': 'snetterton',
  'Knockhill Racing Circuit': 'knockhill',
  'Red Bull Ring': 'red-bull-ring',
  'Fuji Speedway': 'fuji',
  'Bahrain International Circuit': 'bahrain',
  'Sebring International Raceway': 'sebring',
  'Michelin Raceway Road Atlanta': 'road-atlanta',
  'Road Atlanta': 'road-atlanta',
  'Hockenheimring': 'hockenheim',
  'Hockenheimring Baden-Württemberg': 'hockenheim',
  'Phillip Island Grand Prix Circuit': 'phillip-island',
  'Phillip Island Circuit': 'phillip-island',
  'Misano World Circuit Marco Simoncelli': 'misano',

  // ── iRacing names that differ from Pro Drive ──
  'Autodromo Nazionale Monza': 'monza',
  'Autodromo Nazionale di Monza': 'monza',
  'Autodromo Internazionale Enzo e Dino Ferrari': 'imola',
  'Autódromo José Carlos Pace': 'interlagos',
  'Autodromo Jose Carlos Pace': 'interlagos',
  'Autódromo Hermanos Rodríguez': 'mexico-city',
  'Autodromo Hermanos Rodriguez': 'mexico-city',
  'mexicocity gp': 'mexico-city',
  'Autodromo Internacional do Algarve': 'portimao',
  'Autódromo Internacional do Algarve': 'portimao',
  'Circuit Paul Ricard': 'paul-ricard',
  'Jeddah Corniche Circuit': 'jeddah',
  'Lusail International Circuit': 'lusail',

  // ── Tracks from user's actual data ──
  'Adelaide Street Circuit': 'adelaide',
  'Circuito de Navarra': 'navarra',
  'Miami International Autodrome': 'miami',
  'Motorsport Arena Oschersleben': 'oschersleben',
  'St. Petersburg Grand Prix': 'st-petersburg',

  // ── Raw overlay / SimHub slugs (sent by the plugin as trackName) ──
  'SONOMA 2025 NASCARLONG': 'sonoma',
  'sonoma-2025-nascarlong-nascar-long': 'sonoma',
  'sonoma-2025-sportscaralt-sports-car-course-alt': 'sonoma',
  'sonoma-2025-sportscar-sports-car-course': 'sonoma',
  'sonoma-2025-irl12-indycar-2012-2018': 'sonoma',
  'sonoma-rallycross-rallycross': 'sonoma',
  'sonoma-cup-cup-historic': 'sonoma',

  // ── Common iRacing tracks not yet in master list ──
  'Twin Ring Motegi': 'motegi',
  'Tsukuba Circuit': 'tsukuba',
  'Nürburgring Grand-Prix-Strecke': 'nurburgring-gp',
  'Nürburgring Combined': 'nurburgring-combined',
  'Canadian Tire Motorsport Park': 'mosport',
  'Circuit Gilles Villeneuve': 'montreal',
  'Yas Marina Circuit': 'yas-marina',
  'Shanghai International Circuit': 'shanghai',
  'Mugello Circuit': 'mugello',
  'Autodromo Nazionale Monza 1966': 'monza',
  'Mid-Ohio Sports Car Course': 'mid-ohio',
  'Detroit Grand Prix at Belle Isle': 'detroit',
  'Nashville Superspeedway': 'nashville-super',
  'Nashville Street Circuit': 'nashville-street',
  'Circuit de Barcelona-Catalunya': 'barcelona',
  'Nürburgring Grand Prix + Nordschleife': 'nurburgring-combined',
  'Imola': 'imola',
}

/**
 * Canonical iRacing official name for each Pro Drive trackId.
 * This is the name iRacing uses in their Data API — best for Wikimedia lookups.
 * When multiple iRacing names map to the same trackId, this picks the most official one.
 */
export const IRACING_OFFICIAL_NAMES: Record<string, string> = {
  'spa-francorchamps': 'Circuit de Spa-Francorchamps',
  'silverstone': 'Silverstone Circuit',
  'watkins-glen': 'Watkins Glen International',
  'laguna-seca': 'WeatherTech Raceway Laguna Seca',
  'road-america': 'Road America',
  'daytona': 'Daytona International Speedway',
  'indianapolis': 'Indianapolis Motor Speedway',
  'nurburgring-nordschleife': 'Nürburgring Nordschleife',
  'nurburgring-gp': 'Nürburgring Grand-Prix-Strecke',
  'nurburgring-combined': 'Nürburgring Combined',
  'suzuka': 'Suzuka International Racing Course',
  'mount-panorama': 'Mount Panorama Circuit',
  'circuit-of-americas': 'Circuit of the Americas',
  'le-mans': 'Circuit des 24 Heures du Mans',
  'brands-hatch': 'Brands Hatch Circuit',
  'bristol': 'Bristol Motor Speedway',
  'charlotte': 'Charlotte Motor Speedway',
  'las-vegas': 'Las Vegas Motor Speedway',
  'michigan': 'Michigan International Speedway',
  'martinsville': 'Martinsville Speedway',
  'talladega': 'Talladega Superspeedway',
  'pocono': 'Pocono Raceway',
  'eldora': 'Eldora Speedway',
  'knoxville': 'Knoxville Raceway',
  'long-beach': 'Long Beach Street Circuit',
  'imola': 'Autodromo Internazionale Enzo e Dino Ferrari',
  'zandvoort': 'Circuit Park Zandvoort',
  'hungaroring': 'Hungaroring',
  'donington-park': 'Donington Park Racing Circuit',
  'okayama': 'Okayama International Circuit',
  'lime-rock': 'Lime Rock Park',
  'sonoma': 'Sonoma Raceway',
  'barber-motorsports': 'Barber Motorsports Park',
  'virginia-international': 'Virginia International Raceway',
  'oulton-park': 'Oulton Park Circuit',
  'snetterton': 'Snetterton Circuit',
  'knockhill': 'Knockhill Racing Circuit',
  'red-bull-ring': 'Red Bull Ring',
  'monza': 'Autodromo Nazionale Monza',
  'monza-full': 'Autodromo Nazionale Monza',
  'monza-chicanes': 'Autodromo Nazionale Monza',
  'fuji': 'Fuji Speedway',
  'bahrain': 'Bahrain International Circuit',
  'sebring': 'Sebring International Raceway',
  'road-atlanta': 'Michelin Raceway Road Atlanta',
  'hockenheim': 'Hockenheimring',
  'phillip-island': 'Phillip Island Grand Prix Circuit',
  'misano': 'Misano World Circuit Marco Simoncelli',
  'interlagos': 'Autódromo José Carlos Pace',
  'mexico-city': 'Autódromo Hermanos Rodríguez',
  'portimao': 'Autódromo Internacional do Algarve',
  'paul-ricard': 'Circuit Paul Ricard',
  'jeddah': 'Jeddah Corniche Circuit',
  'lusail': 'Lusail International Circuit',
  'adelaide': 'Adelaide Street Circuit',
  'navarra': 'Circuito de Navarra',
  'miami': 'Miami International Autodrome',
  'oschersleben': 'Motorsport Arena Oschersleben',
  'st-petersburg': 'St. Petersburg Grand Prix',
  'motegi': 'Twin Ring Motegi',
  'tsukuba': 'Tsukuba Circuit',
  'mosport': 'Canadian Tire Motorsport Park',
  'montreal': 'Circuit Gilles Villeneuve',
  'yas-marina': 'Yas Marina Circuit',
  'shanghai': 'Shanghai International Circuit',
  'mugello': 'Mugello Circuit',
  'mid-ohio': 'Mid-Ohio Sports Car Course',
  'detroit': 'Detroit Grand Prix at Belle Isle',
  'nashville-super': 'Nashville Superspeedway',
  'nashville-street': 'Nashville Street Circuit',
  'barcelona': 'Circuit de Barcelona-Catalunya',
  'cota': 'Circuit of the Americas',

  // ── User's actual DB trackIds (SHTL uploads with year/config slugs) ──
  'oschersleben-gp': 'Motorsport Arena Oschersleben',
  'oulton-international': 'Oulton Park Circuit',
  'stpete': 'St. Petersburg Grand Prix',
  'nurburgring nordschleife': 'Nürburgring Nordschleife',
  'bathurst': 'Mount Panorama Circuit',
  'suzuka grandprix': 'Suzuka International Racing Course',
  'sebring-international': 'Sebring International Raceway',
  'daytona-2011-road-road-course': 'Daytona International Speedway',
  'daytona-2011-oval-oval': 'Daytona International Speedway',
  'barber-2026': 'Barber Motorsports Park',
  'brandshatch grandprix': 'Brands Hatch Circuit',
  'lemans full': 'Circuit des 24 Heures du Mans',
  'miami-gp-grand-prix': 'Miami International Autodrome',
  'navarra speedlong': 'Circuito de Navarra',
  'barcelona-gp-full-course': 'Circuit de Barcelona-Catalunya',
  'barcelona-historic-historic-circa-95': 'Circuit de Barcelona-Catalunya',
  'cadwell-full-full-circuit': 'Cadwell Park',
  'charlotte-2025-roval2025-2025-roval': 'Charlotte Motor Speedway',
  'chicago-2023-chicago': 'Chicago Street Course',
  'crandon-full-crandon-off-road-full': 'Crandon International Raceway',
  'fuji-gp-grand-prix': 'Fuji Speedway',
  'hockenheim-gp-grand-prix': 'Hockenheimring',
  'hungaroring-grand-prix': 'Hungaroring',
  'mexicocity gp': 'Autódromo Hermanos Rodríguez',
  'monza-combinedchicanes': 'Autodromo Nazionale Monza',
  'limerock-2019-gp-grand-prix': 'Lime Rock Park',
  'lagunaseca': 'WeatherTech Raceway Laguna Seca',
  'imola-gp': 'Autodromo Internazionale Enzo e Dino Ferrari',
  'interlagos-gp-grand-prix': 'Autódromo José Carlos Pace',
  'indianapolis-2022-ovalnascar-stock-car-oval': 'Indianapolis Motor Speedway',
  'nurburgring gp': 'Nürburgring Grand-Prix-Strecke',
  'nurburgring-gp': 'Nürburgring Grand-Prix-Strecke',
  'nurburgring-combinedlong': 'Nürburgring Combined',
  'nurburgring-gpnochicane': 'Nürburgring Grand-Prix-Strecke',
  'adelaide-street-circuit': 'Adelaide Street Circuit',
  'zolder-alt-alternate': 'Circuit Zolder',
  'spa-2024-up-grand-prix': 'Circuit de Spa-Francorchamps',
  'spa-2024-bike-bike': 'Circuit de Spa-Francorchamps',
  'willow-international': 'Willow Springs International Raceway',
  'zandvoort-2023-gp-grand-prix': 'Circuit Park Zandvoort',
  'virginia-2022-full-full-course': 'Virginia International Raceway',
  'virginia-2022-north-north': 'Virginia International Raceway',
  'watkinsglen-2021-fullcourse-boot': 'Watkins Glen International',
  'rudskogen': 'Rudskogen Motorsenter',
  'sonoma-2025-sportscaralt-sports-car-course-alt': 'Sonoma Raceway',
  'sonoma-2025-sportscar-sports-car-course': 'Sonoma Raceway',
  'sonoma-2025-nascarlong-nascar-long': 'Sonoma Raceway',
  'sonoma-2025-irl12-indycar-2012-2018': 'Sonoma Raceway',
  'sonoma-rallycross-rallycross': 'Sonoma Raceway',
  'sonoma-cup-cup-historic': 'Sonoma Raceway',
  'silverstone-2019-gp-arena-grand-prix': 'Silverstone Circuit',
  'roadatlanta-full-full-course': 'Michelin Raceway Road Atlanta',
  'roadamerica-full-full-course': 'Road America',
  'phillipisland': 'Phillip Island Grand Prix Circuit',
  'oran-south-south': 'Oran Park Raceway',
  'okayama-full-full-course': 'Okayama International Circuit',
  'spielberg-gp-grand-prix': 'Red Bull Ring',
  'tsukuba-2kfull': 'Tsukuba Circuit',
}

/**
 * Resolve an iRacing track name + config to a Pro Drive track ID.
 * Checks config-specific overrides first, then falls back to name-only mapping.
 */
export function resolveIRacingTrackId(iracingTrackName: string, configName?: string): string {
  // Config-specific lookup first (handles monza-full vs monza-chicanes etc.)
  if (configName) {
    const configKey = `${iracingTrackName}|${configName}`
    if (IRACING_TRACK_CONFIG_MAP[configKey]) {
      return IRACING_TRACK_CONFIG_MAP[configKey]
    }
  }

  // Name-only lookup
  if (IRACING_TRACK_MAP[iracingTrackName]) {
    return IRACING_TRACK_MAP[iracingTrackName]
  }

  // Try without accented characters
  const normalized = iracingTrackName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (IRACING_TRACK_MAP[normalized]) {
    return IRACING_TRACK_MAP[normalized]
  }

  // Generate a slug as fallback
  return normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Build a display-friendly track name from iRacing data.
 * Includes config if it adds meaningful info.
 */
export function formatIRacingTrackName(
  trackName: string,
  configName?: string,
): string {
  if (!configName || configName === 'N/A' || configName === 'oval') {
    return trackName
  }
  return `${trackName} — ${configName}`
}
