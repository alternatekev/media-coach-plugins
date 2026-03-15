/**
 * Leaderboard types for displaying race standings and position history.
 */

/**
 * A single leaderboard entry representing a driver's current state and history.
 */
export interface LeaderboardEntry {
  // Current state
  position: number;
  name: string;
  carNumber: string | number;
  isPlayer: boolean;
  classColor: string;

  // Current lap
  lapNumber: number;
  currentLapTime: number;
  bestLapTime: number;
  lastLapTime: number;
  sessionBestLapTime?: number;

  // Gap to leader/player
  gap: number;
  gapDisplay: string;

  // iRating
  iRating: number;
  iRatingDisplay: string;

  // Position history for sparklines (lap-by-lap deltas)
  positionHistory?: number[];
  lapTimeHistory?: number[];
  gapHistory?: number[];
}

/**
 * Parsed leaderboard JSON from the plugin's Leaderboard property.
 */
export interface ParsedLeaderboard {
  entries: LeaderboardEntry[];
  playerPosition: number;
  sessionTime: number;
  totalCars: number;
}

/**
 * Type guard for leaderboard entry.
 */
export function isLeaderboardEntry(obj: unknown): obj is LeaderboardEntry {
  if (typeof obj !== 'object' || obj === null) return false;
  const e = obj as Record<string, unknown>;
  return (
    typeof e.position === 'number' &&
    typeof e.name === 'string' &&
    typeof e.isPlayer === 'boolean'
  );
}
