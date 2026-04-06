-- Add game_name column to race_sessions for multi-game filtering
ALTER TABLE race_sessions ADD COLUMN IF NOT EXISTS game_name VARCHAR(64) DEFAULT 'iracing';

-- Backfill existing sessions using metadata
UPDATE race_sessions
SET game_name = COALESCE(LOWER(metadata->>'gameName'), 'iracing')
WHERE game_name = 'iracing' OR game_name IS NULL;

-- Index for game-based queries
CREATE INDEX IF NOT EXISTS idx_race_sessions_game_name ON race_sessions(game_name);
