import { useState, useEffect, useRef, useMemo } from 'react';
import { useTelemetry } from '@hooks/useTelemetry';
import styles from './LeaderboardPanel.module.css';

/**
 * Leaderboard entry format from JSON: [pos, name, irating, bestLap, lastLap, gapToPlayer, inPit, isPlayer]
 */
type LeaderboardRawEntry = [
  pos: number,
  name: string,
  irating: number,
  bestLap: number,
  lastLap: number,
  gapToPlayer: number,
  inPit: number,
  isPlayer: number
];

interface DriverLapHistory {
  lastLaps: number[];
}

/**
 * Abbreviate iRating: 1500 -> "1.5k", 1000 -> "1.0k"
 */
function abbreviateIRating(ir: number): string {
  if (ir >= 1000) {
    return (ir / 1000).toFixed(1) + 'k';
  }
  return ir.toString();
}

/**
 * Format lap time in seconds to MM:SS.sss or similar
 */
function formatLapTime(seconds: number): string {
  if (seconds <= 0 || !isFinite(seconds)) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(3).padStart(6, '0')}`;
}

/**
 * Format gap to player: negative = ahead (green), positive = behind (red)
 */
function formatGap(gap: number): string {
  if (gap === 0) return '—';
  if (Math.abs(gap) < 0.001) return '0.000';
  const sign = gap > 0 ? '+' : '';
  return sign + gap.toFixed(3);
}

/**
 * Simple SVG sparkline for last 12 lap times
 */
function LapSparkline({ lapTimes }: { lapTimes: number[] }) {
  if (lapTimes.length === 0) {
    return <svg className={styles.lbSpark} />;
  }

  // Use last 12 laps
  const data = lapTimes.slice(-12);
  const minLap = Math.min(...data);
  const maxLap = Math.max(...data);
  const range = maxLap - minLap || minLap;

  // Normalize to 0-1
  const normalized = data.map((t) => (range > 0 ? (t - minLap) / range : 0.5));

  // SVG viewBox: 44x14
  // Points: 44px wide, split evenly among laps
  const width = 44;
  const height = 14;
  const pointSpacing = width / Math.max(data.length - 1, 1);

  const points = normalized
    .map((n, i) => `${i * pointSpacing},${height - n * height}`)
    .join(' ');

  return (
    <svg
      className={styles.lbSpark}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default function LeaderboardPanel() {
  const { telemetry } = useTelemetry();

  const [startPosition, setStartPosition] = useState<number | null>(null);
  const lapHistoryRef = useRef<Map<number, DriverLapHistory>>(new Map());

  // Parse leaderboard JSON
  const leaderboard = useMemo(() => {
    try {
      if (!telemetry.leaderboardJson) return [];
      const parsed = JSON.parse(telemetry.leaderboardJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [telemetry.leaderboardJson]);

  // Track starting positions from first valid leaderboard
  useEffect(() => {
    if (startPosition === null && leaderboard.length > 0) {
      const playerEntry = leaderboard.find((e: LeaderboardRawEntry) => e[7]);
      if (playerEntry) {
        setStartPosition(playerEntry[0]);
      }
    }
  }, [leaderboard, startPosition]);

  // Update lap history as we get new laps
  useEffect(() => {
    leaderboard.forEach((entry: LeaderboardRawEntry) => {
      const pos = entry[0];
      const lastLap = entry[4];

      if (lastLap > 0) {
        const history = lapHistoryRef.current.get(pos) || { lastLaps: [] };

        // Only add if it's a new lap time (avoid duplicates)
        if (history.lastLaps.length === 0 || history.lastLaps[history.lastLaps.length - 1] !== lastLap) {
          history.lastLaps = [...history.lastLaps, lastLap];
          lapHistoryRef.current.set(pos, history);
        }
      }
    });
  }, [leaderboard]);

  if (!leaderboard.length) {
    return (
      <div className={styles.leaderboardPanel}>
        <div style={{ padding: '8px', fontSize: '10px', color: 'var(--text-dim)' }}>
          No leaderboard data
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.leaderboardPanel} ${styles.lbTopLeft}`}>
      <div className={styles.lbScroll}>
        {leaderboard.map((entry: LeaderboardRawEntry) => {
          const [pos, name, irating, bestLap, lastLap, gapToPlayer, inPit, isPlayer] = entry;
          const isPlayerRow = isPlayer > 0;
          const isP1 = pos === 1;
          const isInPit = inPit > 0;

          // Determine position relative to start
          let positionClass = '';
          if (startPosition !== null && !isPlayerRow) {
            if (pos < startPosition) {
              positionClass = styles.lbAhead || '';
            } else if (pos > startPosition) {
              positionClass = styles.lbBehind || '';
            }
          }

          // Determine lap quality
          let lapClass = '';
          if (lastLap > 0) {
            if (bestLap > 0 && Math.abs(lastLap - bestLap) < 0.001) {
              lapClass = styles.lapPb || '';
            } else if (bestLap > 0 && lastLap < bestLap * 1.02) {
              lapClass = styles.lapFast || '';
            } else {
              lapClass = styles.lapSlow || '';
            }
          }

          const gapClass = gapToPlayer < 0 ? styles.gapAhead : styles.gapBehind;

          const lapHistory = lapHistoryRef.current.get(pos) || { lastLaps: [] };

          return (
            <div
              key={`${pos}-${name}`}
              className={`
                ${styles.lbRow}
                ${isPlayerRow ? styles.lbPlayer : ''}
                ${isP1 ? styles.lbP1 : ''}
                ${positionClass}
                ${isInPit ? styles.lbPit : ''}
              `}
            >
              <div className={styles.lbPos}>{pos}</div>
              <div className={styles.lbName}>{name}</div>
              <div className={`${styles.lbLap} ${lapClass}`}>{formatLapTime(lastLap)}</div>
              <div className={styles.lbIr}>{abbreviateIRating(irating)}</div>
              <div className={`${styles.lbGap} ${gapClass}`}>{formatGap(gapToPlayer)}</div>
              <LapSparkline lapTimes={lapHistory.lastLaps} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
