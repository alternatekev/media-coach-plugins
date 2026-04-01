import commentaryCars from '@/data/commentary_cars.json'
import commentaryTracks from '@/data/commentary_tracks.json'

interface CarsData {
  version: string
  description: string
  cars: Record<string, { displayName: string; images?: string[] }>
}

interface TracksData {
  version: string
  description: string
  tracks: Record<string, { displayName: string; images?: string[] }>
}

const cars = commentaryCars as CarsData
const tracks = commentaryTracks as TracksData

/**
 * Fuzzy match a car model string against the commentary cars database.
 * Returns the first image URL from the matching car, or null if no match.
 * Matching is case-insensitive and looks for substring matches.
 */
export function getCarImage(carModel: string): string | null {
  if (!carModel) return null

  const modelLower = carModel.toLowerCase()

  // Try to find a matching car key using substring matching
  for (const [key, carData] of Object.entries(cars.cars)) {
    if (modelLower.includes(key)) {
      if (carData.images && carData.images.length > 0) {
        return carData.images[0]
      }
    }
  }

  return null
}

/**
 * Fuzzy match a track name string against the commentary tracks database.
 * Returns the first image URL from the matching track, or null if no match.
 * Matches against both the key and displayName, case-insensitive.
 */
export function getTrackImage(trackName: string): string | null {
  if (!trackName) return null

  const trackLower = trackName.toLowerCase()

  // Try to find a matching track key or displayName using substring matching
  for (const [key, trackData] of Object.entries(tracks.tracks)) {
    if (
      trackLower.includes(key) ||
      key.includes(trackLower) ||
      trackData.displayName.toLowerCase().includes(trackLower) ||
      trackLower.includes(trackData.displayName.toLowerCase())
    ) {
      if (trackData.images && trackData.images.length > 0) {
        return trackData.images[0]
      }
    }
  }

  return null
}
